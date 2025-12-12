-- Test Data Script for Project Management System
-- This script creates sample data to test all stored procedures
-- Note: Tables should be created and cleaned before running this script

-- Reset AUTO_INCREMENT counters
ALTER TABLE User AUTO_INCREMENT = 1;
ALTER TABLE Project AUTO_INCREMENT = 1;
ALTER TABLE Task AUTO_INCREMENT = 1;
ALTER TABLE `File` AUTO_INCREMENT = 1;

-- Handle errors gracefully during testing
SET sql_mode = '';

--------------------------------------------------------------------------------
-- TEST USER PROCEDURES
--------------------------------------------------------------------------------

-- Test RegisterUser procedure
CALL RegisterUser('Alice Johnson', 'alice@company.com', 'alicepass', '+1-555-0101', TRUE);
SET @user_alice = LAST_INSERT_ID();

CALL RegisterUser('Bob Smith', 'bob@company.com', 'bobpass', '+1-555-0102', FALSE);
SET @user_bob = LAST_INSERT_ID();

CALL RegisterUser('Carol Williams', 'carol@company.com', 'carolpass', '+1-555-0103', FALSE);
SET @user_carol = LAST_INSERT_ID();

CALL RegisterUser('David Brown', 'david@company.com', 'davidpass', '+1-555-0104', FALSE);
SET @user_david = LAST_INSERT_ID();

CALL RegisterUser('Eve Davis', 'eve@company.com', 'evepass', '+1-555-0105', FALSE);
SET @user_eve = LAST_INSERT_ID();

CALL RegisterUser('Frank Wilson', 'frank@company.com', 'frankpass', '+1-555-0106', FALSE);
SET @user_frank = LAST_INSERT_ID();

-- Test UpdateUserStatus procedure (Admin only)
CALL UpdateUserStatus(@user_frank, 'DISABLED'); -- Disable Frank Wilson

-- Verify users created
SELECT 'Users created:' AS info;
SELECT id_user, name, email, account_status, is_admin FROM User ORDER BY id_user;

--------------------------------------------------------------------------------
-- TEST PROJECT PROCEDURES
--------------------------------------------------------------------------------

-- Test CreateProject procedure (parameter order changed: p_creator_user_id moved to end)
CALL CreateProject('(1) Website Redesign', 'PRIVATE', 'Algo sobre website redesign', '2024-01-15 09:00:00', '2024-04-15 17:00:00', @user_alice); -- Alice as creator
SET @project_website = LAST_INSERT_ID();

CALL CreateProject('(2) Mobile App Development', 'PRIVATE', 'Algo sobre mobile app dev', '2024-02-01 08:00:00', '2024-06-30 18:00:00', @user_bob); -- Bob as creator
SET @project_mobile = LAST_INSERT_ID();

CALL CreateProject('(3) Database Migration', 'PRIVATE', 'Algo sobre database migration', '2024-03-01 10:00:00', '2024-05-31 16:00:00', @user_alice); -- Alice as creator
SET @project_database = LAST_INSERT_ID();

-- Test AssignUserToProject procedure (parameter order changed: p_requesting_user_id moved to end)
CALL AssignUserToProject(@project_website, @user_carol, "OWNER", @user_alice); -- Assign Carol to Website Redesign (Alice requesting)
CALL AssignUserToProject(@project_website, @user_david, "MEMBER", @user_alice); -- Assign David to Website Redesign (Alice requesting)

CALL AssignUserToProject(@project_mobile, @user_carol, "MEMBER", @user_bob); -- Assign Carol to Mobile App (Bob requesting)
CALL AssignUserToProject(@project_mobile, @user_eve, "REVIEWER", @user_bob); -- Assign Eve to Mobile App (Bob requesting)

CALL AssignUserToProject(@project_database, @user_bob, "MEMBER", @user_alice); -- Assign Bob to Database Migration (Alice requesting)
CALL AssignUserToProject(@project_database, @user_david, "MEMBER", @user_alice); -- Assign David to Database Migration (Alice requesting)

-- Verify projects and assignments
SELECT 'Projects and assignments:' AS info;
SELECT p.id_project, p.title, u.name AS assigned_user
FROM Project p
JOIN ProjectAssignment pa ON p.id_project = pa.id_project
JOIN User u ON pa.id_user = u.id_user
ORDER BY p.id_project, u.name;

--------------------------------------------------------------------------------
-- TEST TASK PROCEDURES
--------------------------------------------------------------------------------

-- Test CreateTask procedure (parameter order changed: p_creator_user_id moved to end)
-- Website Redesign tasks
CALL CreateTask(@project_website, 'UI/UX Design', 'Create wireframes and mockups', '2024-01-16 09:00:00', '2024-02-15 17:00:00', @user_carol, "OWNER", @user_alice); -- Carol (Alice requesting)
SET @task_ui_ux = LAST_INSERT_ID();

CALL CreateTask(@project_website, 'Frontend Development', 'Implement responsive design', '2024-02-16 09:00:00', '2024-03-31 17:00:00', @user_carol, "OWNER", @user_alice); -- Carol (Alice requesting)
SET @task_frontend = LAST_INSERT_ID();

CALL CreateTask(@project_website, 'Backend Integration', 'Connect frontend to APIs', '2024-03-01 09:00:00', '2024-04-10 17:00:00', @user_david, "OWNER", @user_alice); -- David (Alice requesting)
SET @task_backend = LAST_INSERT_ID();

CALL CreateTask(@project_website, 'Testing & QA', 'Comprehensive testing phase', '2024-04-01 09:00:00', '2024-04-14 17:00:00', @user_david, "OWNER", @user_alice); -- David (Alice requesting)
SET @task_testing = LAST_INSERT_ID();

-- Mobile App tasks
CALL CreateTask(@project_mobile, 'App Architecture', 'Define app structure and components', '2024-02-02 08:00:00', '2024-02-29 18:00:00', @user_carol, "OWNER", @user_bob); -- Carol (Bob requesting)
SET @task_architecture = LAST_INSERT_ID();

CALL CreateTask(@project_mobile, 'iOS Development', 'Develop iOS version', '2024-03-01 08:00:00', '2024-05-31 18:00:00', @user_carol, "MEMBER", @user_bob); -- Carol (Bob requesting)
SET @task_ios = LAST_INSERT_ID();

CALL CreateTask(@project_mobile, 'Android Development', 'Develop Android version', '2024-03-01 08:00:00', '2024-05-31 18:00:00', @user_eve, "OWNER", @user_bob); -- Eve (Bob requesting)
SET @task_android = LAST_INSERT_ID();

CALL CreateTask(@project_mobile, 'API Development', 'Build backend APIs', '2024-02-15 08:00:00', '2024-04-30 18:00:00', @user_eve, "OWNER", @user_bob); -- Eve (Bob requesting)
SET @task_api = LAST_INSERT_ID();

-- Database Migration tasks
CALL CreateTask(@project_database, 'Schema Analysis', 'Analyze current database structure', '2024-03-02 10:00:00', '2024-03-15 16:00:00', @user_bob, "OWNER", @user_alice); -- Bob (Alice requesting)
SET @task_schema = LAST_INSERT_ID();

CALL CreateTask(@project_database, 'Migration Scripts', 'Write data migration scripts', '2024-03-16 10:00:00', '2024-04-15 16:00:00', @user_bob, "OWNER", @user_alice); -- Bob (Alice requesting)
SET @task_migration = LAST_INSERT_ID();

CALL CreateTask(@project_database, 'Data Validation', 'Validate migrated data', '2024-04-16 10:00:00', '2024-05-15 16:00:00', @user_david, "OWNER", @user_alice); -- David (Alice requesting)
SET @task_validation = LAST_INSERT_ID();

-- Test UpdateTaskStatus procedure (p_requesting_user_id parameter added)
CALL UpdateTaskStatus(@task_ui_ux, 'COMPLETED', @user_carol); -- UI/UX Design completed (Carol requesting)
CALL UpdateTaskStatus(@task_frontend, 'IN_PROGRESS', @user_carol); -- Frontend Development in progress (Carol requesting)
CALL UpdateTaskStatus(@task_architecture, 'IN_PROGRESS', @user_carol); -- App Architecture in progress (Carol requesting)
CALL UpdateTaskStatus(@task_schema, 'COMPLETED', @user_bob); -- Schema Analysis completed (Bob requesting)

-- Test AssignUserToTask procedure (parameter order changed: p_requesting_user_id moved to end)
SELECT 'Testing AssignUserToTask procedure:' AS info;

CALL AssignUserToTask(@task_testing, @user_alice, 'MEMBER', @user_david); -- David requesting
CALL AssignUserToTask(@task_android, @user_alice, 'MEMBER', @user_eve); -- Eve requesting
CALL AssignUserToTask(@task_validation, @user_david, 'MEMBER', @user_david); -- David requesting (updating their own role)
CALL AssignUserToTask(@task_ui_ux, @user_bob, 'MEMBER', @user_carol); -- Carol requesting
-- CALL AssignUserToTask(@task_ios, @user_bob, NULL, @user_carol); -- no update cause no `role` provided
CALL AssignUserToTask(@task_android, @user_eve, 'MEMBER', @user_eve); -- Eve requesting (updating their own role)

-- Display captured task IDs for verification
SELECT 'Captured Task IDs:' AS info;
SELECT
    @task_ui_ux as 'UI/UX Design',
    @task_frontend as 'Frontend Development',
    @task_backend as 'Backend Integration',
    @task_testing as 'Testing & QA',
    @task_architecture as 'App Architecture',
    @task_ios as 'iOS Development',
    @task_android as 'Android Development',
    @task_api as 'API Development',
    @task_schema as 'Schema Analysis',
    @task_migration as 'Migration Scripts',
    @task_validation as 'Data Validation';

-- Verify tasks
SELECT 'Tasks created:' AS info;
SELECT t.id_task, t.title, t.progress_status, p.title AS project_title
FROM Task t
JOIN Project p ON t.id_project = p.id_project
ORDER BY p.id_project, t.id_task;

--------------------------------------------------------------------------------
-- TEST FILE PROCEDURES
--------------------------------------------------------------------------------

-- Test UploadFile procedure (using dummy data for LONGBLOB)
CALL UploadFile('project_requirements', 'pdf', 0x89504E470D0A1A0A, 245760);
SET @file_requirements = LAST_INSERT_ID();

CALL UploadFile('wireframes', 'png', 0x89504E470D0A1A0A, 1048576);
SET @file_wireframes = LAST_INSERT_ID();

CALL UploadFile('database_diagram', 'png', 0x504B0304, 524288);
SET @file_db_diagram = LAST_INSERT_ID();

CALL UploadFile('api_documentation', 'docx', 0x504B0304, 131072);
SET @file_api_docs = LAST_INSERT_ID();

CALL UploadFile('test_plan', 'doc', 0x546869732069732061, 8192);
SET @file_test_plan = LAST_INSERT_ID();

CALL UploadFile('app_mockups', 'jpg', 0xFFD8FFE0, 2097152);
SET @file_mockups = LAST_INSERT_ID();

-- Test DownloadFile procedure
SELECT 'Download test for project_requirements.pdf:' AS info;
CALL DownloadFile(@file_requirements);
CALL DownloadFile(@file_wireframes);
CALL DownloadFile(@file_db_diagram);

-- Test AttachFileToProject procedure (p_requesting_user_id parameter added)
CALL AttachFileToProject(@project_website, @file_requirements, @user_alice); -- project_requirements.pdf to Website Redesign (Alice requesting)
CALL AttachFileToProject(@project_website, @file_wireframes, @user_alice); -- wireframes.png to Website Redesign (Alice requesting)
CALL AttachFileToProject(@project_mobile, @file_api_docs, @user_bob); -- api_documentation.docx to Mobile App (Bob requesting)
CALL AttachFileToProject(@project_mobile, @file_mockups, @user_bob); -- app_mockups.jpg to Mobile App (Bob requesting)
-- CALL AttachFileToProject(@project_database, @file_db_diagram, @user_alice); -- database_diagram.png to Database Migration (Alice requesting)

-- Test AttachFileToTask procedure (p_requesting_user_id parameter added)
CALL AttachFileToTask(@task_ui_ux, @file_wireframes, @user_carol); -- wireframes.png to UI/UX Design task (Carol requesting)
CALL AttachFileToTask(@task_testing, @file_test_plan, @user_david); -- test_plan.doc to Testing & QA task (David requesting)
CALL AttachFileToTask(@task_architecture, @file_api_docs, @user_carol); -- api_documentation.docx to App Architecture task (Carol requesting)
CALL AttachFileToTask(@task_ios, @file_mockups, @user_carol); -- app_mockups.jpg to iOS Development task (Carol requesting)
CALL AttachFileToTask(@task_schema, @file_db_diagram, @user_bob); -- database_diagram.png to Schema Analysis task (Bob requesting)

-- Test GetTaskFilenames procedure
CALL GetTaskFilenames(@task_ui_ux);
CALL GetTaskFilenames(@task_testing);
CALL GetTaskFilenames(NULL);

-- Verify files
SELECT 'Files uploaded and attached:' AS info;
SELECT f.id_file, f.name, f.extension, f.size
FROM File f
ORDER BY f.id_file;

--------------------------------------------------------------------------------
-- TEST UTILITY PROCEDURES
--------------------------------------------------------------------------------

-- Test GetTasksByUser procedure
SELECT 'Tasks for Alice:' AS info;
CALL GetTasksByUser(@user_alice, NULL);

SELECT 'Tasks for Bob in Website Redesign project:' AS info;
CALL GetTasksByUser(@user_bob, @project_website);

-- Test GetTasksByProject procedure (p_requesting_user_id parameter added)
SELECT 'All tasks in Website Redesign project:' AS info;
CALL GetTasksByProject(@project_website, NULL, @user_alice); -- Alice requesting

SELECT 'Tasks assigned to Carol in Mobile App project:' AS info;
CALL GetTasksByProject(@project_mobile, @user_carol, @user_bob); -- Bob requesting

--------------------------------------------------------------------------------
-- ERROR HANDLING TEST SCENARIOS
--------------------------------------------------------------------------------

SELECT 'TESTING ERROR SCENARIOS (Expected to fail):' AS info;
SELECT '================================================' AS info;

-- Test 1: Try to assign disabled user to project (should fail with error)
SELECT '1. Testing assignment of disabled user (Frank Wilson):' AS test_info;
-- This should produce: ERROR 1644 (45000): User does not exist or is disabled
-- CALL AssignUserToProject(@project_website, @user_frank, "MEMBER", @user_alice);

-- Test 2: Try to create task with user not assigned to project (should fail)
SELECT '2. Testing task creation with unassigned user (Eve not in project 1):' AS test_info;
-- This should produce: ERROR 1644 (45000): User must be assigned to project first
-- CALL CreateTask(@project_website, 'Invalid Task', 'This should fail', '2024-05-01 09:00:00', '2024-05-31 17:00:00', @user_eve, NULL, @user_alice);

-- Test 3: Try to update task with invalid status (should fail)
SELECT '3. Testing invalid task status update:' AS test_info;
-- This should produce: ERROR 1644 (45000): Invalid status: must be one of the ENUM values...
-- CALL UpdateTaskStatus(@task_ui_ux, 'INVALID_STATUS', @user_carol);

-- Test 4: Try to assign user already assigned to project (should fail)
SELECT '4. Testing duplicate project assignment (Bob already in project 3):' AS test_info;
-- This should produce: ERROR 1644 (45000): User is already assigned to this project
-- CALL AssignUserToProject(@project_database, @user_bob, "MEMBER", @user_alice);

-- Test 5: Try to access project details without being a member (should fail)
SELECT '5. Testing unauthorized project details access (Eve not in project 1):' AS test_info;
-- This should produce: ERROR 1644 (45000): Only project owners can update project details
-- CALL GetProjectDetails(@project_website, @user_eve);

-- Test 6: Try to attach file to task without being a member (should fail)
SELECT '6. Testing unauthorized file attachment (Eve not in UI/UX task):' AS test_info;
-- This should produce: ERROR 1644 (45000): Only task owners|members can attach files
-- CALL AttachFileToTask(@task_ui_ux, @file_requirements, @user_eve);

SELECT 'NOTE: Error test calls are commented out to allow script completion.' AS info;
SELECT 'Uncomment individual lines above to test specific error scenarios.' AS info;

--------------------------------------------------------------------------------
-- FINAL DATA SUMMARY
--------------------------------------------------------------------------------

SELECT 'FINAL DATA SUMMARY:' AS info;
SELECT '==================' AS info;

SELECT 'Total Users:' AS metric, COUNT(*) AS count FROM User
UNION ALL
SELECT 'Enabled Users:', COUNT(*) FROM User WHERE account_status = 'ENABLED'
UNION ALL
SELECT 'Admin Users:', COUNT(*) FROM User WHERE is_admin = TRUE
UNION ALL
SELECT 'Total Projects:', COUNT(*) FROM Project
UNION ALL
SELECT 'Total Tasks:', COUNT(*) FROM Task
UNION ALL
SELECT 'Completed Tasks:', COUNT(*) FROM Task WHERE progress_status = 'COMPLETED'
UNION ALL
SELECT 'In Progress Tasks:', COUNT(*) FROM Task WHERE progress_status = 'IN_PROGRESS'
UNION ALL
SELECT 'Total Files:', COUNT(*) FROM File
UNION ALL
SELECT 'Project Assignments:', COUNT(*) FROM ProjectAssignment
UNION ALL
SELECT 'Task Assignments:', COUNT(*) FROM TaskAssignment;

--------------------------------------------------------------------------------
-- TEST NEW PROCEDURES
--------------------------------------------------------------------------------

-- Test GetAllProjects procedure
SELECT 'Testing GetAllProjects procedure:' AS info;
CALL GetAllProjects(@user_alice);
CALL GetAllProjects(@user_carol);
CALL GetAllProjects(NULL);

-- Test GetProjectDetails procedure (p_requesting_user_id parameter added)
SELECT 'Testing GetProjectDetails procedure:' AS info;
CALL GetProjectDetails(@project_website, @user_alice); -- Alice requesting
CALL GetProjectDetails(@project_mobile, @user_bob); -- Bob requesting
CALL GetProjectDetails(@project_database, @user_alice); -- Alice requesting

-- Test GetTaskDetails procedure (p_requesting_user_id parameter added)
SELECT 'Testing GetTaskDetails procedure:' AS info;
CALL GetTaskDetails(@task_ui_ux, @user_carol); -- Carol requesting
CALL GetTaskDetails(@task_architecture, @user_carol); -- Carol requesting
CALL GetTaskDetails(@task_schema, @user_bob); -- Bob requesting

-- Test GetProjectFilenames procedure
SELECT 'Testing GetProjectFilenames procedure:' AS info;
CALL GetProjectFilenames(@project_website);
CALL GetProjectFilenames(@project_mobile);
CALL GetProjectFilenames(@project_database);

SELECT 'All project files:' AS info;
CALL GetProjectFilenames(NULL);

--------------------------------------------------------------------------------
-- ADDITIONAL TEST DATA FOR NEW PROCEDURES
--------------------------------------------------------------------------------

-- Add some projects with different visibility settings to test GetAllProjects
CALL CreateProject('(4) Internal Security Audit', 'PRIVATE', 'Algo sobre internal sec audit', '2024-05-01 09:00:00', '2024-07-31 17:00:00', @user_alice); -- Alice creating
SET @project_security = LAST_INSERT_ID();

-- Update project visibility (you'll need an UpdateProjectVisibility procedure or manual UPDATE)

-- Create additional project assignments to test role-based access
CALL AssignUserToProject(@project_security, @user_bob, "OWNER", @user_alice); -- Alice assigning Bob
CALL AssignUserToProject(@project_security, @user_eve, "REVIEWER", @user_alice); -- Alice assigning Eve

-- Add more files to test GetProjectFilenames with different projects
CALL UploadFile('security_checklist', 'xlsx', 0x504B0304, 65536);
SET @file_security = LAST_INSERT_ID();

CALL AttachFileToProject(@project_security, @file_security, @user_alice); -- Alice requesting

-- Verify the new test data
SELECT 'New test data created:' AS info;
SELECT p.id_project, p.title, COUNT(pa.id_user) as member_count
FROM Project p
LEFT JOIN ProjectAssignment pa ON p.id_project = pa.id_project
GROUP BY p.id_project, p.title
ORDER BY p.id_project;

--------------------------------------------------------------------------------
-- At the end of script
--------------------------------------------------------------------------------
SELECT '--- Test Data Script Completed Successfully ---' AS info;

SET sql_mode = DEFAULT;
