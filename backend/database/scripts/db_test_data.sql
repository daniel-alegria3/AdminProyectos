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
CALL RegisterUser('Alice Johnson', 'alice@company.com', 'hashed_password_1', '+1-555-0101', TRUE);
CALL RegisterUser('Bob Smith', 'bob@company.com', 'hashed_password_2', '+1-555-0102', FALSE);
CALL RegisterUser('Carol Williams', 'carol@company.com', 'hashed_password_3', '+1-555-0103', FALSE);
CALL RegisterUser('David Brown', 'david@company.com', 'hashed_password_4', '+1-555-0104', FALSE);
CALL RegisterUser('Eve Davis', 'eve@company.com', 'hashed_password_5', '+1-555-0105', FALSE);
CALL RegisterUser('Frank Wilson', 'frank@company.com', 'hashed_password_6', '+1-555-0106', FALSE);

-- Test UpdateUserStatus procedure
CALL UpdateUserStatus(6, 'DISABLED'); -- Disable Frank Wilson

-- Verify users created
SELECT 'Users created:' AS info;
SELECT id_user, name, email, account_status, is_admin FROM User ORDER BY id_user;

--------------------------------------------------------------------------------
-- TEST PROJECT PROCEDURES
--------------------------------------------------------------------------------

-- Test CreateProject procedure
CALL CreateProject(1, 'Website Redesign', 'PUBLIC', 'Algo sobre website redesign', '2024-01-15 09:00:00', '2024-04-15 17:00:00'); -- Alice as creator
CALL CreateProject(2, 'Mobile App Development', 'PUBLIC', 'Algo sobre mobile app dev', '2024-02-01 08:00:00', '2024-06-30 18:00:00'); -- Bob as creator
CALL CreateProject(1, 'Database Migration', 'PUBLIC', 'Algo sobre database migration', '2024-03-01 10:00:00', '2024-05-31 16:00:00'); -- Alice as creator

-- Test AssignUserToProject procedure
CALL AssignUserToProject(1, 1, 3, "OWNER"); -- Assign Carol to Website Redesign
CALL AssignUserToProject(1, 1, 4, "MEMBER"); -- Assign David to Website Redesign

CALL AssignUserToProject(2, 2, 3, "MEMBER"); -- Assign Carol to Mobile App
CALL AssignUserToProject(2, 2, 5, "REVIEWER"); -- Assign Eve to Mobile App

CALL AssignUserToProject(3, 1, 2, "MEMBER"); -- Assign Bob to Database Migration
CALL AssignUserToProject(3, 1, 4, "MEMBER"); -- Assign David to Database Migration

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

-- Test CreateTask procedure (with assignments)
-- Website Redesign tasks
CALL CreateTask(1, 'UI/UX Design', 'Create wireframes and mockups', '2024-01-16 09:00:00', '2024-02-15 17:00:00', 3, "OWNER"); -- Carol
SET @task_ui_ux = LAST_INSERT_ID();
CALL CreateTask(1, 'Frontend Development', 'Implement responsive design', '2024-02-16 09:00:00', '2024-03-31 17:00:00', 3, "OWNER"); -- Carol
SET @task_frontend = LAST_INSERT_ID();
CALL CreateTask(1, 'Backend Integration', 'Connect frontend to APIs', '2024-03-01 09:00:00', '2024-04-10 17:00:00', 4, "OWNER"); -- David
SET @task_backend = LAST_INSERT_ID();
CALL CreateTask(1, 'Testing & QA', 'Comprehensive testing phase', '2024-04-01 09:00:00', '2024-04-14 17:00:00', 4, "OWNER");
SET @task_testing = LAST_INSERT_ID();


-- Mobile App tasks
CALL CreateTask(2, 'App Architecture', 'Define app structure and components', '2024-02-02 08:00:00', '2024-02-29 18:00:00', 3, "OWNER"); -- Carol
SET @task_architecture = LAST_INSERT_ID();
CALL CreateTask(2, 'iOS Development', 'Develop iOS version', '2024-03-01 08:00:00', '2024-05-31 18:00:00', 3, "MEMBER"); -- Carol
SET @task_ios = LAST_INSERT_ID();
CALL CreateTask(2, 'Android Development', 'Develop Android version', '2024-03-01 08:00:00', '2024-05-31 18:00:00', 5, "OWNER"); -- Eve
SET @task_android = LAST_INSERT_ID();
CALL CreateTask(2, 'API Development', 'Build backend APIs', '2024-02-15 08:00:00', '2024-04-30 18:00:00', 5, "OWNER"); -- Eve
SET @task_api = LAST_INSERT_ID();

-- Database Migration tasks
CALL CreateTask(3, 'Schema Analysis', 'Analyze current database structure', '2024-03-02 10:00:00', '2024-03-15 16:00:00', 2, "OWNER"); -- Bob
SET @task_schema = LAST_INSERT_ID();
CALL CreateTask(3, 'Migration Scripts', 'Write data migration scripts', '2024-03-16 10:00:00', '2024-04-15 16:00:00', 2, "OWNER"); -- Bob
SET @task_migration = LAST_INSERT_ID();
CALL CreateTask(3, 'Data Validation', 'Validate migrated data', '2024-04-16 10:00:00', '2024-05-15 16:00:00', 4, "OWNER"); -- David
SET @task_validation = LAST_INSERT_ID();

-- Test UpdateTaskStatus procedure
CALL UpdateTaskStatus(@task_ui_ux, 'COMPLETED'); -- UI/UX Design completed
CALL UpdateTaskStatus(@task_frontend, 'IN_PROGRESS'); -- Frontend Development in progress
CALL UpdateTaskStatus(@task_architecture, 'IN_PROGRESS'); -- App Architecture in progress
CALL UpdateTaskStatus(@task_schema, 'COMPLETED'); -- Schema Analysis completed

-- Test AssignUserToTask procedure using captured task IDs
SELECT 'Testing AssignUserToTask procedure:' AS info;

CALL AssignUserToTask(@task_testing, 4, 1, 'MEMBER');
CALL AssignUserToTask(@task_android, 5, 1, 'MEMBER');
CALL AssignUserToTask(@task_validation, 4, 4, 'MEMBER');
CALL AssignUserToTask(@task_ui_ux, 3, 2, 'MEMBER');
-- CALL AssignUserToTask(@task_ios, 2, 3, NULL); -- no update cause no `role` provided
CALL AssignUserToTask(@task_android, 5, 5, 'MEMBER');

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
CALL UploadFile('wireframes', 'png', 0x89504E470D0A1A0A, 1048576);
CALL UploadFile('database_diagram', 'png', 0x504B0304, 524288);
CALL UploadFile('api_documentation', 'docx', 0x504B0304, 131072);
CALL UploadFile('test_plan', 'doc', 0x546869732069732061, 8192);
CALL UploadFile('app_mockups', 'jpg', 0xFFD8FFE0, 2097152);

-- Test DownloadFile procedure
SELECT 'Download test for project_requirements.pdf (file_id=1):' AS info;
CALL DownloadFile(1);
CALL DownloadFile(2);
CALL DownloadFile(3);

-- Test AttachFileToProject procedure
CALL AttachFileToProject(1, 1); -- project_requirements.pdf to Website Redesign
CALL AttachFileToProject(1, 2); -- wireframes.png to Website Redesign
CALL AttachFileToProject(2, 4); -- api_documentation.docx to Mobile App
CALL AttachFileToProject(2, 6); -- app_mockups.jpg to Mobile App
-- CALL AttachFileToProject(3, 3); -- database_diagram.png to Database Migration

-- Test AttachFileToTask procedure
CALL AttachFileToTask(1, 2); -- wireframes.png to UI/UX Design task
CALL AttachFileToTask(4, 5); -- test_plan.doc to Testing & QA task
CALL AttachFileToTask(5, 4); -- api_documentation.docx to App Architecture task
CALL AttachFileToTask(6, 6); -- app_mockups.jpg to iOS Development task
CALL AttachFileToTask(9, 3); -- database_diagram.png to Schema Analysis task

-- Test GetTaskFilenames procedure
CALL GetTaskFilenames(1);
CALL GetTaskFilenames(4);
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
SELECT 'Tasks for Alice (user_id=1):' AS info;
CALL GetTasksByUser(1, NULL);

SELECT 'Tasks for Bob in Website Redesign project (user_id=2, project_id=1):' AS info;
CALL GetTasksByUser(2, 1);

-- Test GetTasksByProject procedure
SELECT 'All tasks in Website Redesign project (project_id=1):' AS info;
CALL GetTasksByProject(1, NULL);

SELECT 'Tasks assigned to Carol in Mobile App project (project_id=2, user_id=3):' AS info;
CALL GetTasksByProject(2, 3);

--------------------------------------------------------------------------------
-- ERROR HANDLING TEST SCENARIOS
--------------------------------------------------------------------------------

SELECT 'TESTING ERROR SCENARIOS (Expected to fail):' AS info;
SELECT '================================================' AS info;

-- Test 1: Try to assign disabled user to project (should fail with error)
SELECT '1. Testing assignment of disabled user (Frank Wilson - user_id=6):' AS test_info;
-- This should produce: ERROR 1644 (45000): User does not exist or is disabled
-- CALL AssignUserToProject(1, 1, 6);

-- Test 2: Try to create task with user not assigned to project (should fail)
SELECT '2. Testing task creation with unassigned user (Eve not in project 1):' AS test_info;
-- This should produce: ERROR 1644 (45000): User must be assigned to project first
-- CALL CreateTask(1, 'Invalid Task', 'This should fail', '2024-05-01 09:00:00', '2024-05-31 17:00:00', 5);

-- Test 3: Try to update task with invalid status (should fail)
SELECT '3. Testing invalid task status update:' AS test_info;
-- This should produce: ERROR 1644 (45000): Invalid status: must be one of the ENUM values...
-- CALL UpdateTaskStatus(1, 'INVALID_STATUS');

-- Test 4: Try to assign user already assigned to project (should fail)
SELECT '4. Testing duplicate project assignment (Bob already in project 1):' AS test_info;
-- This should produce: ERROR 1644 (45000): User is already assigned to this project
-- CALL AssignUserToProject(1, 1, 2);

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
CALL GetAllProjects(1);
CALL GetAllProjects(3);
CALL GetAllProjects(NULL);

-- Test GetProjectDetails procedure
SELECT 'Testing GetProjectDetails procedure:' AS info;
CALL GetProjectDetails(1);
CALL GetProjectDetails(2);
CALL GetProjectDetails(3);

-- Test GetTaskDetails procedure
SELECT 'Testing GetTaskDetails procedure:' AS info;
CALL GetTaskDetails(1);
CALL GetTaskDetails(2);
CALL GetTaskDetails(3);

-- Test GetProjectFilenames procedure
SELECT 'Testing GetProjectFilenames procedure:' AS info;
CALL GetProjectFilenames(1);
CALL GetProjectFilenames(2);
CALL GetProjectFilenames(3);

SELECT 'All project files:' AS info;
CALL GetProjectFilenames(NULL);

--------------------------------------------------------------------------------
-- ADDITIONAL TEST DATA FOR NEW PROCEDURES
--------------------------------------------------------------------------------

-- Add some projects with different visibility settings to test GetAllProjects
CALL CreateProject(1, 'Internal Security Audit', 'PUBLIC', 'Algo sobre internal sec audit', '2024-05-01 09:00:00', '2024-07-31 17:00:00');
SET @private_project = LAST_INSERT_ID();

-- Update project visibility (you'll need an UpdateProjectVisibility procedure or manual UPDATE)
-- For now, we'll assume projects are PUBLIC by default as per your schema

-- Create additional project assignments to test role-based access
CALL AssignUserToProject(@private_project, 1, 2, "OWNER");
CALL AssignUserToProject(@private_project, 1, 5, "REVIEWER");

-- Add more files to test GetProjectFilenames with different projects
CALL UploadFile('security_checklist', 'xlsx', 0x504B0304, 65536);
SET @security_file = LAST_INSERT_ID();

CALL AttachFileToProject(@private_project, @security_file);

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

