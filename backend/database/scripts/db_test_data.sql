-- Test Data Script for Project Management System
-- This script creates sample data to test all stored procedures
-- Note: Tables should be created and cleaned before running this script

-- Reset AUTO_INCREMENT counters
ALTER TABLE User AUTO_INCREMENT = 1;
ALTER TABLE Project AUTO_INCREMENT = 1;
ALTER TABLE Task AUTO_INCREMENT = 1;
ALTER TABLE File AUTO_INCREMENT = 1;

-- Handle errors gracefully during testing
SET sql_mode = '';

--------------------------------------------------------------------------------
-- INSERT FILE ALLOWED FORMATS
--------------------------------------------------------------------------------
INSERT INTO FileAllowedFormats (mime_type, extension, description) VALUES
('application/pdf', 'pdf', 'PDF Document'),
('application/msword', 'doc', 'Microsoft Word Document'),
(
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'docx',
  'Microsoft Word Document (OpenXML)'),
('image/png', 'png', 'PNG Image'),
('image/jpeg', 'jpg', 'JPEG Image');

--------------------------------------------------------------------------------
-- TEST USER PROCEDURES
--------------------------------------------------------------------------------

-- Test CreateUser procedure
CALL CreateUser('Alice Johnson', 'alice@company.com', 'hashed_password_1', '+1-555-0101', TRUE);
CALL CreateUser('Bob Smith', 'bob@company.com', 'hashed_password_2', '+1-555-0102', FALSE);
CALL CreateUser('Carol Williams', 'carol@company.com', 'hashed_password_3', '+1-555-0103', FALSE);
CALL CreateUser('David Brown', 'david@company.com', 'hashed_password_4', '+1-555-0104', FALSE);
CALL CreateUser('Eve Davis', 'eve@company.com', 'hashed_password_5', '+1-555-0105', FALSE);
CALL CreateUser('Frank Wilson', 'frank@company.com', 'hashed_password_6', '+1-555-0106', FALSE);

-- Test UpdateUserStatus procedure
CALL UpdateUserStatus(6, 'DISABLED'); -- Disable Frank Wilson

-- Verify users created
SELECT 'Users created:' AS info;
SELECT id_user, name, email, status, is_admin FROM User ORDER BY id_user;

--------------------------------------------------------------------------------
-- TEST PROJECT PROCEDURES
--------------------------------------------------------------------------------

-- Test CreateProject procedure
CALL CreateProject('Website Redesign', '2024-01-15 09:00:00', '2024-04-15 17:00:00', 1); -- Alice as creator
CALL CreateProject('Mobile App Development', '2024-02-01 08:00:00', '2024-06-30 18:00:00', 2); -- Bob as creator
CALL CreateProject('Database Migration', '2024-03-01 10:00:00', '2024-05-31 16:00:00', 1); -- Alice as creator

-- Test AssignUserToProject procedure
CALL AssignUserToProject(1, 2); -- Assign Bob to Website Redesign
CALL AssignUserToProject(1, 3); -- Assign Carol to Website Redesign
CALL AssignUserToProject(1, 4); -- Assign David to Website Redesign

CALL AssignUserToProject(2, 1); -- Assign Alice to Mobile App
CALL AssignUserToProject(2, 3); -- Assign Carol to Mobile App
CALL AssignUserToProject(2, 5); -- Assign Eve to Mobile App

CALL AssignUserToProject(3, 2); -- Assign Bob to Database Migration
CALL AssignUserToProject(3, 4); -- Assign David to Database Migration

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
CALL CreateTask(1, 'UI/UX Design', 'Create wireframes and mockups', '2024-01-16 09:00:00', '2024-02-15 17:00:00', 3); -- Carol
CALL CreateTask(1, 'Frontend Development', 'Implement responsive design', '2024-02-16 09:00:00', '2024-03-31 17:00:00', 2); -- Bob
CALL CreateTask(1, 'Backend Integration', 'Connect frontend to APIs', '2024-03-01 09:00:00', '2024-04-10 17:00:00', 4); -- David
CALL CreateTask(1, 'Testing & QA', 'Comprehensive testing phase', '2024-04-01 09:00:00', '2024-04-14 17:00:00', NULL); -- No assignment yet

-- Mobile App tasks
CALL CreateTask(2, 'App Architecture', 'Define app structure and components', '2024-02-02 08:00:00', '2024-02-29 18:00:00', 1); -- Alice
CALL CreateTask(2, 'iOS Development', 'Develop iOS version', '2024-03-01 08:00:00', '2024-05-31 18:00:00', 5); -- Eve
CALL CreateTask(2, 'Android Development', 'Develop Android version', '2024-03-01 08:00:00', '2024-05-31 18:00:00', 3); -- Carol
CALL CreateTask(2, 'API Development', 'Build backend APIs', '2024-02-15 08:00:00', '2024-04-30 18:00:00', 1); -- Alice

-- Database Migration tasks
CALL CreateTask(3, 'Schema Analysis', 'Analyze current database structure', '2024-03-02 10:00:00', '2024-03-15 16:00:00', 2); -- Bob
CALL CreateTask(3, 'Migration Scripts', 'Write data migration scripts', '2024-03-16 10:00:00', '2024-04-15 16:00:00', 4); -- David
CALL CreateTask(3, 'Data Validation', 'Validate migrated data', '2024-04-16 10:00:00', '2024-05-15 16:00:00', 2); -- Bob

-- Test UpdateTaskStatus procedure
CALL UpdateTaskStatus(1, 'COMPLETED'); -- UI/UX Design completed
CALL UpdateTaskStatus(2, 'IN_PROGRESS'); -- Frontend Development in progress
CALL UpdateTaskStatus(5, 'IN_PROGRESS'); -- App Architecture in progress
CALL UpdateTaskStatus(9, 'COMPLETED'); -- Schema Analysis completed

-- Add additional task assignments (multiple users per task)
INSERT INTO TaskAssignment (id_task, id_user) VALUES
(4, 1), -- Alice also assigned to Testing & QA
(7, 1), -- Alice also assigned to Android Development
(11, 4); -- David also assigned to Data Validation

-- Verify tasks
SELECT 'Tasks created:' AS info;
SELECT t.id_task, t.title, t.status, p.title AS project_title
FROM Task t
JOIN Project p ON t.id_project = p.id_project
ORDER BY p.id_project, t.id_task;

--------------------------------------------------------------------------------
-- TEST FILE PROCEDURES
--------------------------------------------------------------------------------

-- Test UploadFile procedure (using dummy data for LONGBLOB)
CALL UploadFile('project_requirements.pdf', 0x89504E470D0A1A0A, 245760, 'application/pdf');
CALL UploadFile('wireframes.png', 0x89504E470D0A1A0A, 1048576, 'image/png');
CALL UploadFile('database_diagram.png', 0x504B0304, 524288, 'image/png');
CALL UploadFile('api_documentation.docx', 0x504B0304, 131072, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
CALL UploadFile('test_plan.doc', 0x546869732069732061, 8192, 'application/msword');
CALL UploadFile('app_mockups.jpg', 0xFFD8FFE0, 2097152, 'image/jpeg');

-- Test AttachFileToProject procedure
CALL AttachFileToProject(1, 1); -- project_requirements.pdf to Website Redesign
CALL AttachFileToProject(1, 2); -- wireframes.png to Website Redesign
CALL AttachFileToProject(2, 4); -- api_documentation.docx to Mobile App
CALL AttachFileToProject(2, 6); -- app_mockups.jpg to Mobile App
CALL AttachFileToProject(3, 3); -- database_diagram.png to Database Migration

-- Test AttachFileToTask procedure
CALL AttachFileToTask(1, 2); -- wireframes.png to UI/UX Design task
CALL AttachFileToTask(4, 5); -- test_plan.doc to Testing & QA task
CALL AttachFileToTask(5, 4); -- api_documentation.docx to App Architecture task
CALL AttachFileToTask(6, 6); -- app_mockups.jpg to iOS Development task
CALL AttachFileToTask(9, 3); -- database_diagram.png to Schema Analysis task

-- Verify files
SELECT 'Files uploaded and attached:' AS info;
SELECT f.id_file, f.name, f.mime_type, f.size
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
-- CALL AssignUserToProject(1, 6);

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
-- CALL AssignUserToProject(1, 2);

SELECT 'NOTE: Error test calls are commented out to allow script completion.' AS info;
SELECT 'Uncomment individual lines above to test specific error scenarios.' AS info;

--------------------------------------------------------------------------------
-- FINAL DATA SUMMARY
--------------------------------------------------------------------------------

SELECT 'FINAL DATA SUMMARY:' AS info;
SELECT '==================' AS info;

SELECT 'Total Users:' AS metric, COUNT(*) AS count FROM User
UNION ALL
SELECT 'Enabled Users:', COUNT(*) FROM User WHERE status = 'ENABLED'
UNION ALL
SELECT 'Admin Users:', COUNT(*) FROM User WHERE is_admin = TRUE
UNION ALL
SELECT 'Total Projects:', COUNT(*) FROM Project
UNION ALL
SELECT 'Total Tasks:', COUNT(*) FROM Task
UNION ALL
SELECT 'Completed Tasks:', COUNT(*) FROM Task WHERE status = 'COMPLETED'
UNION ALL
SELECT 'In Progress Tasks:', COUNT(*) FROM Task WHERE status = 'IN_PROGRESS'
UNION ALL
SELECT 'Total Files:', COUNT(*) FROM File
UNION ALL
SELECT 'Project Assignments:', COUNT(*) FROM ProjectAssignment
UNION ALL
SELECT 'Task Assignments:', COUNT(*) FROM TaskAssignment;

SELECT '--- Test Data Script Completed Successfully ---' AS info;

--------------------------------------------------------------------------------
-- At the end of script
--------------------------------------------------------------------------------
SET sql_mode = DEFAULT;
