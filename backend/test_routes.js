const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Adjust to your server URL
const API_BASE = `${BASE_URL}/api`; // Adjust to your API base path

class APITester {
  constructor() {
    this.sessionCookie = null;
    this.testData = {
      admin: {
        email: 'admin@test.com',
        password: 'admin123',
        name: 'Test Admin'
      },
      user: {
        email: 'user@test.com',
        password: 'user123',
        name: 'Test User'
      },
      createdUsers: [],
      createdProjects: [],
      createdTasks: []
    };
  }

  // Helper method to make HTTP requests
  async request(method, endpoint, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${API_BASE}${endpoint}`);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'API-Tester/1.0',
          ...headers
        }
      };

      // Add session cookie if available
      if (this.sessionCookie) {
        options.headers['Cookie'] = this.sessionCookie;
      }

      // Add content length for POST/PATCH/PUT requests
      if (data) {
        const jsonData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(jsonData);
      }

      const req = httpModule.request(options, (res) => {
        let responseData = '';

        // Store session cookie from response
        if (res.headers['set-cookie']) {
          this.sessionCookie = res.headers['set-cookie'][0];
        }

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = responseData ? JSON.parse(responseData) : {};

            const response = {
              status: res.statusCode,
              statusText: res.statusMessage,
              data: parsedData,
              headers: res.headers
            };

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(response);
            } else {
              const error = new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`);
              error.response = response;
              reject(error);
            }
          } catch (parseError) {
            const error = new Error(`Failed to parse JSON response: ${parseError.message}`);
            error.response = {
              status: res.statusCode,
              statusText: res.statusMessage,
              data: responseData,
              headers: res.headers
            };
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        console.error(`❌ ${method} ${endpoint} failed:`, error.message);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      // Set timeout
      req.setTimeout(10000);

      // Write data for POST/PATCH/PUT requests
      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  log(message, success = true) {
    console.log(`${success ? '✅' : '❌'} ${message}`);
  }

  // Authentication Tests
  async testUserAuthentication() {
    console.log('\n🔐 Testing User Authentication...');

    try {
      // Test user registration
      const registerResponse = await this.request('POST', '/user/register', this.testData.user);
      this.log('User registration successful');

      // Test user login
      const loginResponse = await this.request('POST', '/user/login', {
        email: this.testData.user.email,
        password: this.testData.user.password
      });
      this.log('User login successful');

      // Test is_admin check (should be false for regular user)
      const isAdminResponse = await this.request('GET', '/user/is_admin');
      this.log(`Admin check: ${isAdminResponse.data.is_admin ? 'Admin' : 'Regular user'}`);

      return true;
    } catch (error) {
      this.log(`User authentication failed: ${error.message}`, false);
      return false;
    }
  }

  async testAdminAuthentication() {
    console.log('\n👑 Testing Admin Authentication...');

    try {
      // Logout current user first
      try {
        await this.request('POST', '/user/logout');
      } catch (error) {
        // Ignore logout errors
      }

      // Register admin (you might need to create admin manually in DB first)
      try {
        await this.request('POST', '/user/register', this.testData.admin);
      } catch (error) {
        // Admin might already exist, continue with login
      }

      // Login as admin
      const loginResponse = await this.request('POST', '/user/login', {
        email: this.testData.admin.email,
        password: this.testData.admin.password
      });
      this.log('Admin login successful');

      // Test is_admin check
      const isAdminResponse = await this.request('GET', '/user/is_admin');
      this.log(`Admin check: ${isAdminResponse.data.is_admin ? 'Admin' : 'Regular user'}`);

      return isAdminResponse.data.is_admin;
    } catch (error) {
      this.log(`Admin authentication failed: ${error.message}`, false);
      return false;
    }
  }

  // Admin User Management Tests
  async testAdminUserManagement() {
    console.log('\n👥 Testing Admin User Management...');

    try {
      // Create a new user
      const createUserData = {
        name: 'Created User',
        email: 'created@test.com',
        password: 'password123',
        phone_number: '1234567890',
        is_admin: false
      };

      const createResponse = await this.request('POST', '/admin/user', createUserData);
      const createdUserId = createResponse.data.data.id_user || createResponse.data.data.user_id;
      this.testData.createdUsers.push(createdUserId);
      this.log('User creation successful');

      // Update user
      const updateResponse = await this.request('PATCH', '/admin/user', {
        user_id: createdUserId,
        name: 'Updated User Name',
        phone_number: '0987654321'
      });
      this.log('User update successful');

      // Update user status
      const statusResponse = await this.request('PATCH', '/admin/user/account_status', {
        user_id: createdUserId,
        account_status: 'DISABLED'
      });
      this.log('User status update successful');

      // Note: Not testing delete to keep test user for other tests
      this.log('Admin user management tests completed');

      return true;
    } catch (error) {
      this.log(`Admin user management failed: ${error.message}`, false);
      return false;
    }
  }

  // User Management Tests
  async testUserManagement() {
    console.log('\n👤 Testing User Management...');

    try {
      // Get all users
      const allUsersResponse = await this.request('GET', '/user');
      this.log(`Retrieved ${allUsersResponse.data.data.length} users`);

      // Get user details (use first user from list)
      if (allUsersResponse.data.data.length > 0) {
        const userId = allUsersResponse.data.data[0].user_id;
        const userDetailsResponse = await this.request('GET', `/user/${userId}`);
        this.log('User details retrieved successfully');
      }

      // Update my user profile
      const updateMyUserResponse = await this.request('PATCH', '/user', {
        name: 'Updated My Name',
        phone_number: '5551234567'
      });
      this.log('My user profile updated successfully');

      return true;
    } catch (error) {
      this.log(`User management failed: ${error.message}`, false);
      return false;
    }
  }

  // Project Management Tests
  async testProjectManagement() {
    console.log('\n📋 Testing Project Management...');

    try {
      // Create a project
      const createProjectData = {
        title: 'Test Project',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const createResponse = await this.request('POST', '/project', createProjectData);
      const projectId = createResponse.data.data.id_project || createResponse.data.data.project_id;
      this.testData.createdProjects.push(projectId);
      this.log('Project creation successful');

      // Update project (Note: This might fail due to route issue mentioned in comments)
      try {
        const updateResponse = await this.request('PATCH', '/project', {
          project_id: projectId,
          title: 'Updated Test Project',
          visibility: 'PUBLIC'
        });
        this.log('Project update successful');
      } catch (error) {
        this.log('Project update failed (expected due to route configuration)', false);
      }

      // Assign user to project
      if (this.testData.createdUsers.length > 0) {
        const assignResponse = await this.request('POST', '/project/assign', {
          project_id: projectId,
          assigned_user_id: this.testData.createdUsers[0],
          role: 'MEMBER'
        });
        this.log('User assigned to project successfully');
      }

      // Get all projects
      const allProjectsResponse = await this.request('GET', '/project');
      this.log(`Retrieved ${allProjectsResponse.data.data.length} projects`);

      // Get my projects
      const myProjectsResponse = await this.request('GET', '/project/mine');
      this.log(`Retrieved ${myProjectsResponse.data.data.length} my projects`);

      // Get project details
      const projectDetailsResponse = await this.request('GET', `/project/${projectId}`);
      this.log('Project details retrieved successfully');

      return true;
    } catch (error) {
      this.log(`Project management failed: ${error.message}`, false);
      return false;
    }
  }

  // Task Management Tests
  async testTaskManagement() {
    console.log('\n✅ Testing Task Management...');

    try {
      if (this.testData.createdProjects.length === 0) {
        this.log('No projects available for task testing', false);
        return false;
      }

      const projectId = this.testData.createdProjects[0];

      // Create a task
      const createTaskData = {
        project_id: projectId,
        title: 'Test Task',
        description: 'This is a test task',
        start_date: '2024-02-01',
        end_date: '2024-02-28',
        assigned_user_id: this.testData.createdUsers[0] || null,
        assigned_role: 'ASSIGNEE'
      };

      const createResponse = await this.request('POST', '/tasks', createTaskData);
      const taskId = createResponse.data.data.id_task || createResponse.data.data.task_id;
      this.testData.createdTasks.push(taskId);
      this.log('Task creation successful');

      // Update task status
      const updateStatusResponse = await this.request('PATCH', '/tasks/progress_status', {
        task_id: taskId,
        progress_status: 'IN_PROGRESS'
      });
      this.log('Task status update successful');

      // Assign user to task
      if (this.testData.createdUsers.length > 0) {
        const assignResponse = await this.request('POST', '/task/assign', {
          task_id: taskId,
          user_id: this.testData.createdUsers[0],
          status: 'ASSIGNEE'
        });
        this.log('User assigned to task successfully');
      }

      // Get project tasks
      const projectTasksResponse = await this.request('GET', `/project/${projectId}/tasks`);
      this.log(`Retrieved ${projectTasksResponse.data.data.length} project tasks`);

      // Get my project tasks
      const myProjectTasksResponse = await this.request('GET', `/project/${projectId}/tasks/mine`);
      this.log(`Retrieved ${myProjectTasksResponse.data.data.length} my project tasks`);

      // Get user tasks (this will likely fail due to the bug in the controller)
      try {
        const userTasksResponse = await this.request('GET', '/tasks');
        this.log('User tasks retrieved successfully');
      } catch (error) {
        this.log('User tasks failed (expected due to undefined variable bug)', false);
      }

      // Get task details
      const taskDetailsResponse = await this.request('GET', `/tasks/${taskId}`);
      this.log('Task details retrieved successfully');

      return true;
    } catch (error) {
      this.log(`Task management failed: ${error.message}`, false);
      return false;
    }
  }

  // Test error handling and edge cases
  async testErrorHandling() {
    console.log('\n🚨 Testing Error Handling...');

    try {
      // Test invalid endpoint
      try {
        await this.request('GET', '/invalid-endpoint');
      } catch (error) {
        this.log('Invalid endpoint correctly returns error');
      }

      // Test missing required parameters
      try {
        await this.request('POST', '/admin/user', {});
      } catch (error) {
        this.log('Missing parameters correctly returns error');
      }

      // Test unauthorized access (logout first)
      const tempCookie = this.sessionCookie;
      this.sessionCookie = null;

      try {
        await this.request('GET', '/user');
      } catch (error) {
        this.log('Unauthorized access correctly returns error');
      }

      // Restore session
      this.sessionCookie = tempCookie;

      return true;
    } catch (error) {
      this.log(`Error handling tests failed: ${error.message}`, false);
      return false;
    }
  }

  // Cleanup - Delete created test data
  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');

    try {
      // Delete created users (as admin)
      for (const userId of this.testData.createdUsers) {
        try {
          await this.request('DELETE', '/admin/user', { user_id: userId });
          this.log(`Deleted user ${userId}`);
        } catch (error) {
          this.log(`Failed to delete user ${userId}: ${error.message}`, false);
        }
      }

      // Note: Projects and tasks might need manual cleanup or CASCADE delete in DB
      this.log('Cleanup completed');
    } catch (error) {
      this.log(`Cleanup failed: ${error.message}`, false);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting API Route Tests...');

    const startTime = Date.now();

    try {
      // Test user authentication first
      await this.testUserAuthentication();

      // Test admin authentication
      const isAdmin = await this.testAdminAuthentication();

      if (isAdmin) {
        // Test admin-only endpoints
        await this.testAdminUserManagement();
      } else {
        console.log('⚠️ Skipping admin tests - current user is not admin');
      }

      // Test general user endpoints
      await this.testUserManagement();

      // Test project management
      await this.testProjectManagement();

      // Test task management
      await this.testTaskManagement();

      // Test error handling
      await this.testErrorHandling();

      // Cleanup
      if (isAdmin) {
        await this.cleanup();
      }

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      console.log(`\n🎉 All tests completed in ${duration}s!`);
      console.log(`\n📊 Test Summary:`);
      console.log(`   Created Users: ${this.testData.createdUsers.length}`);
      console.log(`   Created Projects: ${this.testData.createdProjects.length}`);
      console.log(`   Created Tasks: ${this.testData.createdTasks.length}`);

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
    }
  }

  // Helper method to run individual test categories
  async runTest(testName) {
    console.log(`🚀 Running ${testName} test...`);

    const tests = {
      'auth': () => this.testUserAuthentication(),
      'admin-auth': () => this.testAdminAuthentication(),
      'admin-users': () => this.testAdminUserManagement(),
      'users': () => this.testUserManagement(),
      'projects': () => this.testProjectManagement(),
      'tasks': () => this.testTaskManagement(),
      'errors': () => this.testErrorHandling()
    };

    if (tests[testName]) {
      await tests[testName]();
    } else {
      console.log('❌ Unknown test name. Available tests:', Object.keys(tests).join(', '));
    }
  }
}

// Issues found in the code:
// console.log(`
// ⚠️ ISSUES FOUND IN THE CODE:
//
// 1. generalController.js line 105: Syntax error in condition
//    (!user_id, !account_status) should be (!user_id || !account_status)
//
// 2. generalController.js line 134: Wrong data access
//    data: rows[0][0] should probably be data: rows[0]
//
// 3. generalController.js line 270: Wrong parameter order in CALL
//    AssignUserToProject expects 4 parameters but only 3 are passed
//
// 4. generalController.js line 377: Undefined variable 'user'
//    Should be 'creator_user_id' instead of 'user'
//
// 5. generalRoutes.js line 32: Wrong endpoint path
//    router.patch('/project', ...) should probably be router.patch('/project/:project_id', ...)
//
// Fix these issues before running the tests for better results.
// `);

// Export for use as module or run directly
if (require.main === module) {
  const tester = new APITester();

  // Check for command line arguments
  const args = process.argv.slice(2);
  if (args.length > 0) {
    tester.runTest(args[0]).catch(console.error);
  } else {
    tester.runAllTests().catch(console.error);
  }
}

module.exports = APITester;
