import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

import { AdminService, User, CreateUserData, UpdateUserData, ApiResponse } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;
  const API_BASE = 'http://localhost:5000';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [provideZonelessChangeDetection(), AdminService],
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('getAllUsers', () => {
    it('should fetch all users successfully', (done) => {
      const mockUsers: User[] = [
        {
          user_id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          phone_number: '1234567890',
          is_enabled: true,
          is_admin: true,
        },
        {
          user_id: 2,
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone_number: '0987654321',
          is_enabled: true,
          is_admin: false,
        },
      ];

      const mockResponse: ApiResponse<User[]> = {
        success: true,
        message: 'Users retrieved successfully',
        data: mockUsers,
      };

      service.getAllUsers().subscribe((response) => {
        expect(response.success).toBe(true);
        expect(response.data).toEqual(mockUsers);
        expect(response.data?.length).toBe(2);
        done();
      });

      const req = httpMock.expectOne(`${API_BASE}/user`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle empty user list', (done) => {
      const mockResponse: ApiResponse<User[]> = {
        success: true,
        message: 'No users found',
        data: [],
      };

      service.getAllUsers().subscribe((response) => {
        expect(response.data).toEqual([]);
        expect(response.data?.length).toBe(0);
        done();
      });

      const req = httpMock.expectOne(`${API_BASE}/user`);
      req.flush(mockResponse);
    });

    it('should handle HTTP error when fetching users', (done) => {
      service.getAllUsers().subscribe(
        () => {
          fail('should have failed with 500 error');
        },
        (error) => {
          expect(error.status).toBe(500);
          done();
        }
      );

      const req = httpMock.expectOne(`${API_BASE}/user`);
      req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should send request with credentials', () => {
      const mockResponse: ApiResponse<User[]> = {
        success: true,
        message: 'Users retrieved successfully',
        data: [],
      };

      service.getAllUsers().subscribe();

      const req = httpMock.expectOne(`${API_BASE}/user`);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });
  });

  describe('createUser', () => {
    it('should create a user successfully', (done) => {
      const createUserData: CreateUserData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'securePassword123',
        phone_number: '5551234567',
        is_admin: false,
      };

      const mockCreatedUser: User = {
        user_id: 3,
        name: 'New User',
        email: 'newuser@example.com',
        phone_number: '5551234567',
        is_enabled: true,
        is_admin: false,
      };

      const mockResponse: ApiResponse<User> = {
        success: true,
        message: 'User created successfully',
        data: mockCreatedUser,
      };

      service.createUser(createUserData).subscribe((response) => {
        expect(response.success).toBe(true);
        expect(response.data?.user_id).toBe(3);
        expect(response.data?.name).toBe('New User');
        done();
      });

      const req = httpMock.expectOne(`${API_BASE}/admin/user`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createUserData);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle user creation error - duplicate email', (done) => {
      const createUserData: CreateUserData = {
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'password123',
      };

      service.createUser(createUserData).subscribe(
        () => {
          fail('should have failed with 409 conflict');
        },
        (error) => {
          expect(error.status).toBe(409);
          done();
        }
      );

      const req = httpMock.expectOne(`${API_BASE}/admin/user`);
      req.flush('Email already exists', { status: 409, statusText: 'Conflict' });
    });

    it('should handle validation errors during user creation', (done) => {
      const createUserData: CreateUserData = {
        name: 'Invalid User',
        email: 'invalid-email',
        password: 'pass',
      };

      service.createUser(createUserData).subscribe(
        () => {
          fail('should have failed with 400 bad request');
        },
        (error) => {
          expect(error.status).toBe(400);
          done();
        }
      );

      const req = httpMock.expectOne(`${API_BASE}/admin/user`);
      req.flush('Invalid email format', { status: 400, statusText: 'Bad Request' });
    });

    it('should send request with credentials', () => {
      const createUserData: CreateUserData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const mockResponse: ApiResponse<User> = {
        success: true,
        message: 'User created successfully',
        data: {
          user_id: 1,
          name: 'Test User',
          email: 'test@example.com',
          is_enabled: true,
          is_admin: false,
        },
      };

      service.createUser(createUserData).subscribe();

      const req = httpMock.expectOne(`${API_BASE}/admin/user`);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', (done) => {
      const updateUserData: UpdateUserData = {
        user_id: 1,
        name: 'Updated Name',
        email: 'updated@example.com',
        phone_number: '5559876543',
      };

      const mockUpdatedUser: User = {
        user_id: 1,
        name: 'Updated Name',
        email: 'updated@example.com',
        phone_number: '5559876543',
        is_enabled: true,
        is_admin: true,
      };

      const mockResponse: ApiResponse<User> = {
        success: true,
        message: 'User updated successfully',
        data: mockUpdatedUser,
      };

      service.updateUser(updateUserData).subscribe((response) => {
        expect(response.success).toBe(true);
        expect(response.data?.name).toBe('Updated Name');
        expect(response.data?.email).toBe('updated@example.com');
        done();
      });

      const req = httpMock.expectOne(`${API_BASE}/admin/user`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(updateUserData);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should update only specific user fields', (done) => {
      const updateUserData: UpdateUserData = {
        user_id: 2,
        name: 'Partially Updated',
      };

      const mockResponse: ApiResponse<User> = {
        success: true,
        message: 'User updated successfully',
        data: {
          user_id: 2,
          name: 'Partially Updated',
          email: 'jane@example.com',
          is_enabled: true,
          is_admin: false,
        },
      };

      service.updateUser(updateUserData).subscribe((response) => {
        expect(response.data?.name).toBe('Partially Updated');
        done();
      });

      const req = httpMock.expectOne(`${API_BASE}/admin/user`);
      expect(req.request.body).toEqual(updateUserData);
      req.flush(mockResponse);
    });

    it('should handle user not found error', (done) => {
      const updateUserData: UpdateUserData = {
        user_id: 999,
        name: 'Non-existent User',
      };

      service.updateUser(updateUserData).subscribe(
        () => {
          fail('should have failed with 404 not found');
        },
        (error) => {
          expect(error.status).toBe(404);
          done();
        }
      );

      const req = httpMock.expectOne(`${API_BASE}/admin/user`);
      req.flush('User not found', { status: 404, statusText: 'Not Found' });
    });

    it('should send request with credentials', () => {
      const updateUserData: UpdateUserData = {
        user_id: 1,
        name: 'Test Update',
      };

      const mockResponse: ApiResponse<User> = {
        success: true,
        message: 'User updated successfully',
        data: {
          user_id: 1,
          name: 'Test Update',
          email: 'test@example.com',
          is_enabled: true,
          is_admin: false,
        },
      };

      service.updateUser(updateUserData).subscribe();

      const req = httpMock.expectOne(`${API_BASE}/admin/user`);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', (done) => {
      const userId = 1;

      const mockResponse: ApiResponse<{ deleted_user_id: number }> = {
        success: true,
        message: 'User deleted successfully',
        data: { deleted_user_id: userId },
      };

      service.deleteUser(userId).subscribe((response) => {
        expect(response.success).toBe(true);
        expect(response.data?.deleted_user_id).toBe(userId);
        done();
      });

      const req = httpMock.expectOne(`${API_BASE}/admin/user`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body).toEqual({ user_id: userId });
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle deletion of non-existent user', (done) => {
      const userId = 999;

      service.deleteUser(userId).subscribe(
        () => {
          fail('should have failed with 404 not found');
        },
        (error) => {
          expect(error.status).toBe(404);
          done();
        }
      );

      const req = httpMock.expectOne(`${API_BASE}/admin/user`);
      req.flush('User not found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle server error during deletion', (done) => {
      const userId = 1;

      service.deleteUser(userId).subscribe(
        () => {
          fail('should have failed with 500 error');
        },
        (error) => {
          expect(error.status).toBe(500);
          done();
        }
      );

      const req = httpMock.expectOne(`${API_BASE}/admin/user`);
      req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should send request with credentials', () => {
      const userId = 1;

      const mockResponse: ApiResponse<{ deleted_user_id: number }> = {
        success: true,
        message: 'User deleted successfully',
        data: { deleted_user_id: userId },
      };

      service.deleteUser(userId).subscribe();

      const req = httpMock.expectOne(`${API_BASE}/admin/user`);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });
  });

  describe('updateUserStatus', () => {
    it('should update user account status successfully', (done) => {
      const userId = 1;
      const accountStatus = 'active';

      const mockResponse: ApiResponse<void> = {
        success: true,
        message: 'User status updated successfully',
      };

      service.updateUserStatus(userId, accountStatus).subscribe((response) => {
        expect(response.success).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${API_BASE}/admin/user/account_status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({
        user_id: userId,
        account_status: accountStatus,
      });
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle various account status values', () => {
      const userId = 2;
      const statusValues = ['active', 'inactive', 'suspended', 'pending'];

      statusValues.forEach((status) => {
        const mockResponse: ApiResponse<void> = {
          success: true,
          message: 'User status updated successfully',
        };

        service.updateUserStatus(userId, status).subscribe();

        const req = httpMock.expectOne(`${API_BASE}/admin/user/account_status`);
        expect(req.request.body.account_status).toBe(status);
        req.flush(mockResponse);
      });
    });

    it('should handle user not found error during status update', (done) => {
      const userId = 999;
      const accountStatus = 'inactive';

      service.updateUserStatus(userId, accountStatus).subscribe(
        () => {
          fail('should have failed with 404 not found');
        },
        (error) => {
          expect(error.status).toBe(404);
          done();
        }
      );

      const req = httpMock.expectOne(`${API_BASE}/admin/user/account_status`);
      req.flush('User not found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle invalid status value', (done) => {
      const userId = 1;
      const accountStatus = 'invalid_status';

      service.updateUserStatus(userId, accountStatus).subscribe(
        () => {
          fail('should have failed with 400 bad request');
        },
        (error) => {
          expect(error.status).toBe(400);
          done();
        }
      );

      const req = httpMock.expectOne(`${API_BASE}/admin/user/account_status`);
      req.flush('Invalid account status', { status: 400, statusText: 'Bad Request' });
    });

    it('should send request with credentials', () => {
      const userId = 1;
      const accountStatus = 'active';

      const mockResponse: ApiResponse<void> = {
        success: true,
        message: 'User status updated successfully',
      };

      service.updateUserStatus(userId, accountStatus).subscribe();

      const req = httpMock.expectOne(`${API_BASE}/admin/user/account_status`);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });
  });

  describe('Integration Tests', () => {
    it('should handle multiple sequential operations', (done) => {
      const createUserData: CreateUserData = {
        name: 'Integration Test User',
        email: 'integration@example.com',
        password: 'testPassword123',
      };

      const createResponse: ApiResponse<User> = {
        success: true,
        message: 'User created successfully',
        data: {
          user_id: 10,
          name: 'Integration Test User',
          email: 'integration@example.com',
          is_enabled: true,
          is_admin: false,
        },
      };

      // Step 1: Create user
      service.createUser(createUserData).subscribe((response) => {
        expect(response.data?.user_id).toBe(10);

        // Step 2: Update user status
        service.updateUserStatus(10, 'active').subscribe((statusResponse) => {
          expect(statusResponse.success).toBe(true);

          // Step 3: Fetch all users to verify
          service.getAllUsers().subscribe((allUsersResponse) => {
            expect(allUsersResponse.data?.length).toBeGreaterThan(0);
            done();
          });

          const getAllReq = httpMock.expectOne(`${API_BASE}/user`);
          getAllReq.flush({
            success: true,
            message: 'Users retrieved',
            data: [createResponse.data],
          });
        });

        const statusReq = httpMock.expectOne(`${API_BASE}/admin/user/account_status`);
        statusReq.flush({ success: true, message: 'Status updated' });
      });

      const createReq = httpMock.expectOne(`${API_BASE}/admin/user`);
      createReq.flush(createResponse);
    });

    it('should handle create and update workflow', (done) => {
      const createData: CreateUserData = {
        name: 'Workflow User',
        email: 'workflow@example.com',
        password: 'password123',
        is_admin: false,
      };

      const createdUser: User = {
        user_id: 5,
        name: 'Workflow User',
        email: 'workflow@example.com',
        is_enabled: true,
        is_admin: false,
      };

      const updateData: UpdateUserData = {
        user_id: 5,
        name: 'Updated Workflow User',
      };

      const updatedUser: User = {
        user_id: 5,
        name: 'Updated Workflow User',
        email: 'workflow@example.com',
        is_enabled: true,
        is_admin: false,
      };

      // Create user
      service.createUser(createData).subscribe(() => {
        // Update created user
        service.updateUser(updateData).subscribe((updateResponse) => {
          expect(updateResponse.data?.name).toBe('Updated Workflow User');
          done();
        });

        const updateReq = httpMock.expectOne(`${API_BASE}/admin/user`);
        updateReq.flush({ success: true, message: 'Updated', data: updatedUser });
      });

      const createReq = httpMock.expectOne(`${API_BASE}/admin/user`);
      createReq.flush({ success: true, message: 'Created', data: createdUser });
    });

    it('should handle create and delete workflow', (done) => {
      const createData: CreateUserData = {
        name: 'Delete Test User',
        email: 'delete@example.com',
        password: 'password123',
      };

      const createdUser: User = {
        user_id: 7,
        name: 'Delete Test User',
        email: 'delete@example.com',
        is_enabled: true,
        is_admin: false,
      };

      // Create user
      service.createUser(createData).subscribe(() => {
        // Delete created user
        service.deleteUser(7).subscribe((deleteResponse) => {
          expect(deleteResponse.data?.deleted_user_id).toBe(7);
          done();
        });

        const deleteReq = httpMock.expectOne(`${API_BASE}/admin/user`);
        deleteReq.flush({ success: true, message: 'Deleted', data: { deleted_user_id: 7 } });
      });

      const createReq = httpMock.expectOne(`${API_BASE}/admin/user`);
      createReq.flush({ success: true, message: 'Created', data: createdUser });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', (done) => {
      service.getAllUsers().subscribe(
        () => {
          fail('should have failed with network error');
        },
        (error) => {
          expect(error).toBeDefined();
          done();
        }
      );

      const req = httpMock.expectOne(`${API_BASE}/user`);
      req.error(new ErrorEvent('Network error'));
    });

    it('should handle timeout errors', (done) => {
      service.createUser({
        name: 'Test',
        email: 'test@example.com',
        password: 'password123',
      }).subscribe(
        () => {
          fail('should have failed');
        },
        (error) => {
          expect(error).toBeDefined();
          done();
        }
      );

      const req = httpMock.expectOne(`${API_BASE}/admin/user`);
      req.error(new ErrorEvent('Timeout'));
    });

    it('should handle 401 unauthorized error', (done) => {
      service.getAllUsers().subscribe(
        () => {
          fail('should have failed with 401');
        },
        (error) => {
          expect(error.status).toBe(401);
          done();
        }
      );

      const req = httpMock.expectOne(`${API_BASE}/user`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle 403 forbidden error', (done) => {
      service.deleteUser(1).subscribe(
        () => {
          fail('should have failed with 403');
        },
        (error) => {
          expect(error.status).toBe(403);
          done();
        }
      );

      const req = httpMock.expectOne(`${API_BASE}/admin/user`);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });
  });
});
