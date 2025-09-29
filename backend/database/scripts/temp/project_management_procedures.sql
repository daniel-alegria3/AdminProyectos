-- ============================================================================
-- USER MANAGEMENT PROCEDURES
-- ============================================================================

-- Create a new user with validation
DELIMITER $$
CREATE PROCEDURE CreateUser( -- YOINKED
    IN p_name VARCHAR(128),
    IN p_email VARCHAR(128),
    IN p_password VARCHAR(128),
    IN p_phone_number VARCHAR(64),
    IN p_is_admin BOOLEAN
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Validate email format (basic check)
    IF p_email NOT REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid email format';
    END IF;

    INSERT INTO User (name, email, password, phone_number, is_admin)
    VALUES (p_name, p_email, p_password, p_phone_number, IFNULL(p_is_admin, FALSE));

    COMMIT;
    SELECT LAST_INSERT_ID() as user_id, 'User created successfully' as message;
END$$

-- Get user details with project count
CREATE PROCEDURE GetUserDetails(IN p_user_id INT) -- IGNORED
BEGIN
    SELECT
        u.*,
        COUNT(pa.id_project) as project_count,
        COUNT(ta.id_task) as task_count
    FROM User u
    LEFT JOIN ProjectAssignment pa ON u.id_user = pa.id_user
    LEFT JOIN TaskAssignment ta ON u.id_user = ta.id_user
    WHERE u.id_user = p_user_id
    GROUP BY u.id_user;
END$$

-- Update user status (enable/disable)
CREATE PROCEDURE UpdateUserStatus( -- YOINKED
    IN p_user_id INT,
    IN p_status ENUM('ENABLED', 'DISABLED')
)
BEGIN
    UPDATE User
    SET status = p_status
    WHERE id_user = p_user_id;

    SELECT ROW_COUNT() as affected_rows,
           CONCAT('User status updated to ', p_status) as message;
END$$

-- ============================================================================
-- PROJECT MANAGEMENT PROCEDURES
-- ============================================================================

-- Create project with automatic assignment to creator
CREATE PROCEDURE CreateProject( -- YOINKED
    IN p_title VARCHAR(256),
    IN p_start_date DATETIME,
    IN p_end_date DATETIME,
    IN p_creator_user_id INT
)
BEGIN
    DECLARE v_project_id INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Validate dates
    IF p_end_date IS NOT NULL AND p_start_date IS NOT NULL AND p_end_date < p_start_date THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'End date cannot be before start date';
    END IF;

    -- Create project
    INSERT INTO Project (title, start_date, end_date)
    VALUES (p_title, p_start_date, p_end_date);

    SET v_project_id = LAST_INSERT_ID();

    -- Assign creator to project
    INSERT INTO ProjectAssignment (id_project, id_user)
    VALUES (v_project_id, p_creator_user_id);

    COMMIT;
    SELECT v_project_id as project_id, 'Project created successfully' as message;
END$$

-- Get project details with team members and task summary
CREATE PROCEDURE GetProjectDetails(IN p_project_id INT) -- TODO: maybe yoink this one in the future?
BEGIN
    -- Project basic info with stats
    SELECT
        p.*,
        COUNT(DISTINCT pa.id_user) as team_size,
        COUNT(DISTINCT t.id_task) as total_tasks,
        COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN t.status = 'PENDING' THEN 1 END) as pending_tasks
    FROM Project p
    LEFT JOIN ProjectAssignment pa ON p.id_project = pa.id_project
    LEFT JOIN Task t ON p.id_project = t.id_project
    WHERE p.id_project = p_project_id
    GROUP BY p.id_project;

    -- Project team members
    SELECT
        u.id_user,
        u.name,
        u.email,
        COUNT(ta.id_task) as assigned_tasks
    FROM ProjectAssignment pa
    JOIN User u ON pa.id_user = u.id_user
    LEFT JOIN Task t ON t.id_project = pa.id_project
    LEFT JOIN TaskAssignment ta ON t.id_task = ta.id_task AND ta.id_user = u.id_user
    WHERE pa.id_project = p_project_id
    GROUP BY u.id_user, u.name, u.email;
END$$

-- Assign user to project
CREATE PROCEDURE AssignUserToProject( -- YOINKED
    IN p_project_id INT,
    IN p_user_id INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Check if user exists and is enabled
    IF NOT EXISTS (SELECT 1 FROM User WHERE id_user = p_user_id AND status = 'ENABLED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User does not exist or is disabled';
    END IF;

    -- Check if project exists
    IF NOT EXISTS (SELECT 1 FROM Project WHERE id_project = p_project_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Project does not exist';
    END IF;

    INSERT IGNORE INTO ProjectAssignment (id_project, id_user)
    VALUES (p_project_id, p_user_id);

    COMMIT;
    SELECT ROW_COUNT() as affected_rows, 'User assigned to project' as message;
END$$

-- ============================================================================
-- TASK MANAGEMENT PROCEDURES
-- ============================================================================

-- Create task with validation
CREATE PROCEDURE CreateTask( -- YOINKED
    IN p_project_id INT,
    IN p_title VARCHAR(256),
    IN p_description VARCHAR(256),
    IN p_start_date DATETIME,
    IN p_end_date DATETIME,
    IN p_assigned_user_id INT
)
BEGIN
    DECLARE v_task_id INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Validate project exists
    IF NOT EXISTS (SELECT 1 FROM Project WHERE id_project = p_project_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Project does not exist';
    END IF;

    -- Validate dates
    IF p_end_date IS NOT NULL AND p_start_date IS NOT NULL AND p_end_date < p_start_date THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'End date cannot be before start date';
    END IF;

    -- Create task
    INSERT INTO Task (id_project, title, description, start_date, end_date)
    VALUES (p_project_id, p_title, p_description, p_start_date, p_end_date);

    SET v_task_id = LAST_INSERT_ID();

    -- Assign user to task if provided
    IF p_assigned_user_id IS NOT NULL THEN
        -- Check if user is assigned to the project
        IF NOT EXISTS (SELECT 1 FROM ProjectAssignment WHERE id_project = p_project_id AND id_user = p_assigned_user_id) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User must be assigned to project first';
        END IF;

        INSERT INTO TaskAssignment (id_task, id_user)
        VALUES (v_task_id, p_assigned_user_id);
    END IF;

    COMMIT;
    SELECT v_task_id as task_id, 'Task created successfully' as message;
END$$

-- Update task status with validation
CREATE PROCEDURE UpdateTaskStatus( -- YOINKED
    IN p_task_id INT,
    IN p_status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
)
BEGIN
    DECLARE v_current_status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

    -- Get current status
    SELECT status INTO v_current_status FROM Task WHERE id_task = p_task_id;

    -- Validate status transition (basic business logic)
    IF v_current_status = 'COMPLETED' AND p_status != 'COMPLETED' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot change status of completed task';
    END IF;

    IF v_current_status = 'CANCELLED' AND p_status != 'CANCELLED' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot change status of cancelled task';
    END IF;

    UPDATE Task
    SET status = p_status
    WHERE id_task = p_task_id;

    SELECT ROW_COUNT() as affected_rows,
           CONCAT('Task status updated to ', p_status) as message;
END$$

-- Get tasks by project with assignee info
CREATE PROCEDURE GetTasksByProject(IN p_project_id INT) -- YOINKED
BEGIN
    SELECT
        t.*,
        GROUP_CONCAT(u.name SEPARATOR ', ') as assigned_users,
        COUNT(tf.id_file) as file_count
    FROM Task t
    LEFT JOIN TaskAssignment ta ON t.id_task = ta.id_task
    LEFT JOIN User u ON ta.id_user = u.id_user
    LEFT JOIN TaskFile tf ON t.id_task = tf.id_task
    WHERE t.id_project = p_project_id
    GROUP BY t.id_task
    ORDER BY t.start_date, t.id_task;
END$$

-- ============================================================================
-- FILE MANAGEMENT PROCEDURES
-- ============================================================================

-- Upload file with validation
CREATE PROCEDURE UploadFile( -- YOINKED
    IN p_name VARCHAR(256),
    IN p_data LONGBLOB,
    IN p_size INT UNSIGNED,
    IN p_mime_type VARCHAR(128)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Validate mime type is allowed
    IF NOT EXISTS (SELECT 1 FROM FileAllowedFormats WHERE mime_type = p_mime_type) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'File format not allowed';
    END IF;

    -- Validate file size (example: max 10MB)
    IF p_size > 10485760 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'File size exceeds maximum allowed (10MB)';
    END IF;

    INSERT INTO File (name, data, size, mime_type)
    VALUES (p_name, p_data, p_size, p_mime_type);

    COMMIT;
    SELECT LAST_INSERT_ID() as file_id, 'File uploaded successfully' as message;
END$$

-- Attach file to project
CREATE PROCEDURE AttachFileToProject( -- YOINKED
    IN p_project_id INT,
    IN p_file_id INT
)
BEGIN
    INSERT IGNORE INTO ProjectFile (id_project, id_file)
    VALUES (p_project_id, p_file_id);

    SELECT ROW_COUNT() as affected_rows, 'File attached to project' as message;
END$$

-- Attach file to task
CREATE PROCEDURE AttachFileToTask( -- YOINKED
    IN p_task_id INT,
    IN p_file_id INT
)
BEGIN
    INSERT IGNORE INTO TaskFile (id_task, id_file)
    VALUES (p_task_id, p_file_id);

    SELECT ROW_COUNT() as affected_rows, 'File attached to task' as message;
END$$

-- ============================================================================
-- REPORTING PROCEDURES -- TODO: yoink all this?
-- ============================================================================

-- Get user workload report
CREATE PROCEDURE GetUserWorkloadReport(IN p_user_id INT)
BEGIN
    SELECT
        p.title as project_title,
        COUNT(t.id_task) as total_tasks,
        COUNT(CASE WHEN t.status = 'PENDING' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN t.status = 'CANCELLED' THEN 1 END) as cancelled_tasks
    FROM ProjectAssignment pa
    JOIN Project p ON pa.id_project = p.id_project
    LEFT JOIN Task t ON t.id_project = p.id_project
    LEFT JOIN TaskAssignment ta ON t.id_task = ta.id_task AND ta.id_user = p_user_id
    WHERE pa.id_user = p_user_id
    GROUP BY p.id_project, p.title
    ORDER BY p.title;
END$$

-- Get project progress report
CREATE PROCEDURE GetProjectProgressReport()
BEGIN
    SELECT
        p.id_project,
        p.title,
        p.start_date,
        p.end_date,
        COUNT(DISTINCT pa.id_user) as team_size,
        COUNT(t.id_task) as total_tasks,
        COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) as completed_tasks,
        ROUND(COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) * 100.0 / NULLIF(COUNT(t.id_task), 0), 2) as completion_percentage,
        COUNT(tf.id_file) as total_files
    FROM Project p
    LEFT JOIN ProjectAssignment pa ON p.id_project = pa.id_project
    LEFT JOIN Task t ON p.id_project = t.id_project
    LEFT JOIN TaskFile tf ON t.id_task = tf.id_task
    GROUP BY p.id_project, p.title, p.start_date, p.end_date
    ORDER BY completion_percentage DESC, p.title;
END$$

-- Get overdue tasks
CREATE PROCEDURE GetOverdueTasks()
BEGIN
    SELECT
        t.id_task,
        t.title,
        t.end_date,
        t.status,
        p.title as project_title,
        GROUP_CONCAT(u.name SEPARATOR ', ') as assigned_users,
        DATEDIFF(NOW(), t.end_date) as days_overdue
    FROM Task t
    JOIN Project p ON t.id_project = p.id_project
    LEFT JOIN TaskAssignment ta ON t.id_task = ta.id_task
    LEFT JOIN User u ON ta.id_user = u.id_user
    WHERE t.end_date < NOW()
      AND t.status NOT IN ('COMPLETED', 'CANCELLED')
    GROUP BY t.id_task, t.title, t.end_date, t.status, p.title
    ORDER BY days_overdue DESC;
END$$

-- ============================================================================
-- UTILITY PROCEDURES
-- ============================================================================

-- Clean up orphaned files
CREATE PROCEDURE CleanupOrphanedFiles()
BEGIN
    DELETE FROM File
    WHERE id_file NOT IN (
        SELECT id_file FROM ProjectFile
        UNION
        SELECT id_file FROM TaskFile
    );

    SELECT ROW_COUNT() as deleted_files, 'Orphaned files cleaned up' as message;
END$$

-- Get system statistics
CREATE PROCEDURE GetSystemStats()
BEGIN
    SELECT
        (SELECT COUNT(*) FROM User WHERE status = 'ENABLED') as active_users,
        (SELECT COUNT(*) FROM User WHERE status = 'DISABLED') as disabled_users,
        (SELECT COUNT(*) FROM Project) as total_projects,
        (SELECT COUNT(*) FROM Task) as total_tasks,
        (SELECT COUNT(*) FROM Task WHERE status = 'COMPLETED') as completed_tasks,
        (SELECT COUNT(*) FROM Task WHERE status = 'IN_PROGRESS') as in_progress_tasks,
        (SELECT COUNT(*) FROM Task WHERE status = 'PENDING') as pending_tasks,
        (SELECT COUNT(*) FROM File) as total_files,
        (SELECT ROUND(SUM(size) / 1048576, 2) FROM File) as total_storage_mb;
END$$

DELIMITER ;

-- ============================================================================
-- EXAMPLE USAGE
-- ============================================================================

/*
-- Create a new user
CALL CreateUser('John Doe', 'john@example.com', 'hashed_password', '+1234567890', FALSE);

-- Create a project
CALL CreateProject('Website Redesign', '2024-01-01 09:00:00', '2024-06-30 17:00:00', 1);

-- Create a task and assign it
CALL CreateTask(1, 'Design Homepage', 'Create new homepage design', '2024-01-01 09:00:00', '2024-01-15 17:00:00', 1);

-- Update task status
CALL UpdateTaskStatus(1, 'IN_PROGRESS');

-- Get project details
CALL GetProjectDetails(1);

-- Get system statistics
CALL GetSystemStats();
*/
