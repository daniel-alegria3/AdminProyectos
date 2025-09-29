-- ============================================================================
-- EXTENDED SCHEMA - ACTIVITY LOGGING SYSTEM
-- ============================================================================

-- Activity log table to track all system changes
CREATE TABLE `ActivityLog` (
  id_log int PRIMARY KEY AUTO_INCREMENT,
  id_user int, -- User who performed the action
  action_type enum('CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'UNASSIGN', 'STATUS_CHANGE') NOT NULL,
  entity_type enum('USER', 'PROJECT', 'TASK', 'FILE', 'PROJECT_ASSIGNMENT', 'TASK_ASSIGNMENT') NOT NULL,
  entity_id int NOT NULL, -- ID of the affected entity
  old_values JSON, -- Previous values (for updates)
  new_values JSON, -- New values (for creates/updates)
  description varchar(512), -- Human-readable description
  timestamp datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address varchar(45), -- User's IP address

  FOREIGN KEY (id_user) REFERENCES `User`(id_user),
  INDEX idx_user_timestamp (id_user, timestamp),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_timestamp (timestamp)
);

-- ============================================================================
-- ADMIN USER MANAGEMENT PROCEDURES
-- ============================================================================

-- Admin: Create user with activity logging
DELIMITER $$
CREATE PROCEDURE Admin_CreateUser(
    IN p_admin_user_id INT,
    IN p_name VARCHAR(128),
    IN p_email VARCHAR(128),
    IN p_password VARCHAR(128),
    IN p_phone_number VARCHAR(64),
    IN p_is_admin BOOLEAN,
    IN p_ip_address VARCHAR(45)
)
BEGIN
    DECLARE v_new_user_id INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Check if current user is admin
    IF NOT EXISTS (SELECT 1 FROM User WHERE id_user = p_admin_user_id AND is_admin = TRUE AND status = 'ENABLED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Access denied: Admin privileges required';
    END IF;

    -- Validate email format
    IF p_email NOT REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid email format';
    END IF;

    -- Create user
    INSERT INTO User (name, email, password, phone_number, is_admin)
    VALUES (p_name, p_email, p_password, p_phone_number, IFNULL(p_is_admin, FALSE));

    SET v_new_user_id = LAST_INSERT_ID();

    -- Log activity
    INSERT INTO ActivityLog (id_user, action_type, entity_type, entity_id, new_values, description, ip_address)
    VALUES (
        p_admin_user_id,
        'CREATE',
        'USER',
        v_new_user_id,
        JSON_OBJECT('name', p_name, 'email', p_email, 'is_admin', IFNULL(p_is_admin, FALSE), 'status', 'ENABLED'),
        CONCAT('Admin created new user: ', p_name, ' (', p_email, ')'),
        p_ip_address
    );

    COMMIT;
    SELECT v_new_user_id as user_id, 'User created successfully' as message;
END$$

-- Admin: Edit user with activity logging
CREATE PROCEDURE Admin_EditUser(
    IN p_admin_user_id INT,
    IN p_target_user_id INT,
    IN p_name VARCHAR(128),
    IN p_email VARCHAR(128),
    IN p_phone_number VARCHAR(64),
    IN p_status ENUM('ENABLED', 'DISABLED'),
    IN p_is_admin BOOLEAN,
    IN p_ip_address VARCHAR(45)
)
BEGIN
    DECLARE v_old_name VARCHAR(128);
    DECLARE v_old_email VARCHAR(128);
    DECLARE v_old_phone VARCHAR(64);
    DECLARE v_old_status ENUM('ENABLED', 'DISABLED');
    DECLARE v_old_is_admin BOOLEAN;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Check if current user is admin
    IF NOT EXISTS (SELECT 1 FROM User WHERE id_user = p_admin_user_id AND is_admin = TRUE AND status = 'ENABLED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Access denied: Admin privileges required';
    END IF;

    -- Get old values for logging
    SELECT name, email, phone_number, status, is_admin
    INTO v_old_name, v_old_email, v_old_phone, v_old_status, v_old_is_admin
    FROM User WHERE id_user = p_target_user_id;

    -- Validate email format if provided
    IF p_email IS NOT NULL AND p_email NOT REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid email format';
    END IF;

    -- Update user
    UPDATE User SET
        name = IFNULL(p_name, name),
        email = IFNULL(p_email, email),
        phone_number = IFNULL(p_phone_number, phone_number),
        status = IFNULL(p_status, status),
        is_admin = IFNULL(p_is_admin, is_admin)
    WHERE id_user = p_target_user_id;

    -- Log activity
    INSERT INTO ActivityLog (id_user, action_type, entity_type, entity_id, old_values, new_values, description, ip_address)
    VALUES (
        p_admin_user_id,
        'UPDATE',
        'USER',
        p_target_user_id,
        JSON_OBJECT('name', v_old_name, 'email', v_old_email, 'phone_number', v_old_phone, 'status', v_old_status, 'is_admin', v_old_is_admin),
        JSON_OBJECT('name', IFNULL(p_name, v_old_name), 'email', IFNULL(p_email, v_old_email), 'phone_number', IFNULL(p_phone_number, v_old_phone), 'status', IFNULL(p_status, v_old_status), 'is_admin', IFNULL(p_is_admin, v_old_is_admin)),
        CONCAT('Admin updated user: ', IFNULL(p_name, v_old_name)),
        p_ip_address
    );

    COMMIT;
    SELECT ROW_COUNT() as affected_rows, 'User updated successfully' as message;
END$$

-- Admin: Delete user (soft delete by disabling)
CREATE PROCEDURE Admin_DeleteUser(
    IN p_admin_user_id INT,
    IN p_target_user_id INT,
    IN p_ip_address VARCHAR(45)
)
BEGIN
    DECLARE v_user_name VARCHAR(128);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Check if current user is admin
    IF NOT EXISTS (SELECT 1 FROM User WHERE id_user = p_admin_user_id AND is_admin = TRUE AND status = 'ENABLED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Access denied: Admin privileges required';
    END IF;

    -- Cannot delete self
    IF p_admin_user_id = p_target_user_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot delete your own account';
    END IF;

    -- Get user name for logging
    SELECT name INTO v_user_name FROM User WHERE id_user = p_target_user_id;

    -- Soft delete by disabling
    UPDATE User SET status = 'DISABLED' WHERE id_user = p_target_user_id;

    -- Log activity
    INSERT INTO ActivityLog (id_user, action_type, entity_type, entity_id, description, ip_address)
    VALUES (
        p_admin_user_id,
        'DELETE',
        'USER',
        p_target_user_id,
        CONCAT('Admin deleted user: ', v_user_name),
        p_ip_address
    );

    COMMIT;
    SELECT ROW_COUNT() as affected_rows, 'User deleted successfully' as message;
END$$

-- ============================================================================
-- TASK STATE MANAGEMENT FOR ASSIGNED USERS
-- ============================================================================

-- User: Change task status (only for assigned users)
CREATE PROCEDURE User_ChangeTaskStatus(
    IN p_user_id INT,
    IN p_task_id INT,
    IN p_new_status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
    IN p_ip_address VARCHAR(45)
)
BEGIN
    DECLARE v_old_status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
    DECLARE v_task_title VARCHAR(256);
    DECLARE v_project_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Check if user is enabled
    IF NOT EXISTS (SELECT 1 FROM User WHERE id_user = p_user_id AND status = 'ENABLED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Access denied: User account disabled';
    END IF;

    -- Check if user is assigned to the task
    IF NOT EXISTS (SELECT 1 FROM TaskAssignment WHERE id_task = p_task_id AND id_user = p_user_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Access denied: User not assigned to this task';
    END IF;

    -- Get current task info
    SELECT t.status, t.title, t.id_project
    INTO v_old_status, v_task_title, v_project_id
    FROM Task t
    WHERE t.id_task = p_task_id;

    -- Validate status transition
    IF v_old_status = 'COMPLETED' AND p_new_status != 'COMPLETED' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot change status of completed task';
    END IF;

    IF v_old_status = 'CANCELLED' AND p_new_status != 'CANCELLED' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot change status of cancelled task';
    END IF;

    -- Update task status
    UPDATE Task SET status = p_new_status WHERE id_task = p_task_id;

    -- Log activity
    INSERT INTO ActivityLog (id_user, action_type, entity_type, entity_id, old_values, new_values, description, ip_address)
    VALUES (
        p_user_id,
        'STATUS_CHANGE',
        'TASK',
        p_task_id,
        JSON_OBJECT('status', v_old_status),
        JSON_OBJECT('status', p_new_status),
        CONCAT('Changed task status from ', v_old_status, ' to ', p_new_status, ': ', v_task_title),
        p_ip_address
    );

    COMMIT;
    SELECT ROW_COUNT() as affected_rows,
           CONCAT('Task status updated to ', p_new_status) as message;
END$$

-- ============================================================================
-- PROJECT AND TASK VIEWING PROCEDURES
-- ============================================================================

-- Get tasks per project with user filter option
CREATE PROCEDURE GetTasksByProjectAndUser(
    IN p_project_id INT,
    IN p_filter_user_id INT -- NULL to see all tasks, specific ID to filter by user
)
BEGIN
    IF p_filter_user_id IS NULL THEN
        -- Show all tasks in project
        SELECT
            t.*,
            GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') as assigned_users,
            COUNT(DISTINCT tf.id_file) as file_count
        FROM Task t
        LEFT JOIN TaskAssignment ta ON t.id_task = ta.id_task
        LEFT JOIN User u ON ta.id_user = u.id_user AND u.status = 'ENABLED'
        LEFT JOIN TaskFile tf ON t.id_task = tf.id_task
        WHERE t.id_project = p_project_id
        GROUP BY t.id_task
        ORDER BY t.status, t.start_date, t.title;
    ELSE
        -- Show tasks assigned to specific user in project
        SELECT
            t.*,
            GROUP_CONCAT(DISTINCT u2.name ORDER BY u2.name SEPARATOR ', ') as assigned_users,
            COUNT(DISTINCT tf.id_file) as file_count,
            'ASSIGNED' as user_relation
        FROM Task t
        JOIN TaskAssignment ta1 ON t.id_task = ta1.id_task AND ta1.id_user = p_filter_user_id
        LEFT JOIN TaskAssignment ta2 ON t.id_task = ta2.id_task
        LEFT JOIN User u2 ON ta2.id_user = u2.id_user AND u2.status = 'ENABLED'
        LEFT JOIN TaskFile tf ON t.id_task = tf.id_task
        WHERE t.id_project = p_project_id
        GROUP BY t.id_task
        ORDER BY t.status, t.start_date, t.title;
    END IF;
END$$

-- Get all tasks for a user across all their projects
CREATE PROCEDURE GetUserTasksAllProjects(IN p_user_id INT) -- TODO: yoink this in the future
BEGIN
    SELECT
        p.id_project,
        p.title as project_title,
        p.start_date as project_start,
        p.end_date as project_end,
        t.id_task,
        t.title as task_title,
        t.description,
        t.start_date as task_start,
        t.end_date as task_end,
        t.status,
        COUNT(DISTINCT tf.id_file) as file_count,
        GROUP_CONCAT(DISTINCT u2.name ORDER BY u2.name SEPARATOR ', ') as other_assigned_users,
        CASE
            WHEN t.end_date < NOW() AND t.status NOT IN ('COMPLETED', 'CANCELLED') THEN 'OVERDUE'
            WHEN t.start_date <= NOW() AND t.end_date >= NOW() THEN 'CURRENT'
            WHEN t.start_date > NOW() THEN 'UPCOMING'
            ELSE 'NO_DEADLINE'
        END as timeline_status
    FROM TaskAssignment ta1
    JOIN Task t ON ta1.id_task = t.id_task
    JOIN Project p ON t.id_project = p.id_project
    LEFT JOIN TaskAssignment ta2 ON t.id_task = ta2.id_task AND ta2.id_user != p_user_id
    LEFT JOIN User u2 ON ta2.id_user = u2.id_user AND u2.status = 'ENABLED'
    LEFT JOIN TaskFile tf ON t.id_task = tf.id_task
    WHERE ta1.id_user = p_user_id
    GROUP BY p.id_project, p.title, p.start_date, p.end_date, t.id_task, t.title, t.description, t.start_date, t.end_date, t.status
    ORDER BY
        FIELD(timeline_status, 'OVERDUE', 'CURRENT', 'UPCOMING', 'NO_DEADLINE'),
        FIELD(t.status, 'IN_PROGRESS', 'PENDING', 'COMPLETED', 'CANCELLED'),
        t.end_date,
        p.title,
        t.title;
END$$

-- Get project overview with task distribution per user
CREATE PROCEDURE GetProjectTaskDistribution(IN p_project_id INT)
BEGIN
    -- Project summary
    SELECT
        p.*,
        COUNT(DISTINCT pa.id_user) as team_size,
        COUNT(DISTINCT t.id_task) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.id_task END) as completed_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'IN_PROGRESS' THEN t.id_task END) as in_progress_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'PENDING' THEN t.id_task END) as pending_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'CANCELLED' THEN t.id_task END) as cancelled_tasks,
        ROUND(COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.id_task END) * 100.0 / NULLIF(COUNT(DISTINCT t.id_task), 0), 2) as completion_percentage
    FROM Project p
    LEFT JOIN ProjectAssignment pa ON p.id_project = pa.id_project
    LEFT JOIN Task t ON p.id_project = t.id_project
    WHERE p.id_project = p_project_id
    GROUP BY p.id_project;

    -- Task distribution per user
    SELECT
        u.id_user,
        u.name,
        u.email,
        COUNT(DISTINCT t.id_task) as total_assigned_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.id_task END) as completed_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'IN_PROGRESS' THEN t.id_task END) as in_progress_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'PENDING' THEN t.id_task END) as pending_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'CANCELLED' THEN t.id_task END) as cancelled_tasks,
        ROUND(COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.id_task END) * 100.0 / NULLIF(COUNT(DISTINCT t.id_task), 0), 2) as completion_percentage
    FROM ProjectAssignment pa
    JOIN User u ON pa.id_user = u.id_user
    LEFT JOIN TaskAssignment ta ON u.id_user = ta.id_user
    LEFT JOIN Task t ON ta.id_task = t.id_task AND t.id_project = p_project_id
    WHERE pa.id_project = p_project_id AND u.status = 'ENABLED'
    GROUP BY u.id_user, u.name, u.email
    ORDER BY total_assigned_tasks DESC, u.name;
END$$

-- ============================================================================
-- ENHANCED PROJECT/TASK CREATION WITH LOGGING
-- ============================================================================

-- Create project with logging
CREATE PROCEDURE CreateProjectWithLog(
    IN p_user_id INT,
    IN p_title VARCHAR(256),
    IN p_start_date DATETIME,
    IN p_end_date DATETIME,
    IN p_ip_address VARCHAR(45)
)
BEGIN
    DECLARE v_project_id INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Check if user is enabled
    IF NOT EXISTS (SELECT 1 FROM User WHERE id_user = p_user_id AND status = 'ENABLED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Access denied: User account disabled';
    END IF;

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
    VALUES (v_project_id, p_user_id);

    -- Log project creation
    INSERT INTO ActivityLog (id_user, action_type, entity_type, entity_id, new_values, description, ip_address)
    VALUES (
        p_user_id,
        'CREATE',
        'PROJECT',
        v_project_id,
        JSON_OBJECT('title', p_title, 'start_date', p_start_date, 'end_date', p_end_date),
        CONCAT('Created project: ', p_title),
        p_ip_address
    );

    -- Log project assignment
    INSERT INTO ActivityLog (id_user, action_type, entity_type, entity_id, new_values, description, ip_address)
    VALUES (
        p_user_id,
        'ASSIGN',
        'PROJECT_ASSIGNMENT',
        v_project_id,
        JSON_OBJECT('project_id', v_project_id, 'user_id', p_user_id),
        CONCAT('Auto-assigned as project creator to: ', p_title),
        p_ip_address
    );

    COMMIT;
    SELECT v_project_id as project_id, 'Project created successfully' as message;
END$$

-- Create task with logging
CREATE PROCEDURE CreateTaskWithLog(
    IN p_user_id INT,
    IN p_project_id INT,
    IN p_title VARCHAR(256),
    IN p_description VARCHAR(256),
    IN p_start_date DATETIME,
    IN p_end_date DATETIME,
    IN p_assigned_user_id INT,
    IN p_ip_address VARCHAR(45)
)
BEGIN
    DECLARE v_task_id INT;
    DECLARE v_project_title VARCHAR(256);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Check if user is enabled and assigned to project
    IF NOT EXISTS (
        SELECT 1 FROM ProjectAssignment pa
        JOIN User u ON pa.id_user = u.id_user
        WHERE pa.id_project = p_project_id AND pa.id_user = p_user_id AND u.status = 'ENABLED'
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Access denied: User not assigned to project or account disabled';
    END IF;

    -- Get project title for logging
    SELECT title INTO v_project_title FROM Project WHERE id_project = p_project_id;

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
        IF NOT EXISTS (SELECT 1 FROM ProjectAssignment WHERE id_project = p_project_id AND id_user = p_assigned_user_id) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Assigned user must be part of the project';
        END IF;

        INSERT INTO TaskAssignment (id_task, id_user)
        VALUES (v_task_id, p_assigned_user_id);

        -- Log task assignment
        INSERT INTO ActivityLog (id_user, action_type, entity_type, entity_id, new_values, description, ip_address)
        VALUES (
            p_user_id,
            'ASSIGN',
            'TASK_ASSIGNMENT',
            v_task_id,
            JSON_OBJECT('task_id', v_task_id, 'user_id', p_assigned_user_id),
            CONCAT('Assigned task "', p_title, '" to user (ID: ', p_assigned_user_id, ') in project: ', v_project_title),
            p_ip_address
        );
    END IF;

    -- Log task creation
    INSERT INTO ActivityLog (id_user, action_type, entity_type, entity_id, new_values, description, ip_address)
    VALUES (
        p_user_id,
        'CREATE',
        'TASK',
        v_task_id,
        JSON_OBJECT('title', p_title, 'description', p_description, 'project_id', p_project_id, 'start_date', p_start_date, 'end_date', p_end_date),
        CONCAT('Created task "', p_title, '" in project: ', v_project_title),
        p_ip_address
    );

    COMMIT;
    SELECT v_task_id as task_id, 'Task created successfully' as message;
END$$

-- ============================================================================
-- ACTIVITY LOG QUERIES
-- ============================================================================

-- Get activity log for a specific user
CREATE PROCEDURE GetUserActivityLog(
    IN p_user_id INT,
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SELECT
        al.*,
        u.name as user_name,
        CASE al.entity_type
            WHEN 'USER' THEN (SELECT name FROM User WHERE id_user = al.entity_id)
            WHEN 'PROJECT' THEN (SELECT title FROM Project WHERE id_project = al.entity_id)
            WHEN 'TASK' THEN (SELECT title FROM Task WHERE id_task = al.entity_id)
            ELSE CONCAT(al.entity_type, ' #', al.entity_id)
        END as entity_name
    FROM ActivityLog al
    JOIN User u ON al.id_user = u.id_user
    WHERE al.id_user = p_user_id
    ORDER BY al.timestamp DESC
    LIMIT IFNULL(p_limit, 50) OFFSET IFNULL(p_offset, 0);
END$$

-- Get activity log for a specific project
CREATE PROCEDURE GetProjectActivityLog(
    IN p_project_id INT,
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SELECT
        al.*,
        u.name as user_name,
        CASE al.entity_type
            WHEN 'USER' THEN (SELECT name FROM User WHERE id_user = al.entity_id)
            WHEN 'PROJECT' THEN (SELECT title FROM Project WHERE id_project = al.entity_id)
            WHEN 'TASK' THEN (SELECT title FROM Task WHERE id_task = al.entity_id)
            ELSE CONCAT(al.entity_type, ' #', al.entity_id)
        END as entity_name
    FROM ActivityLog al
    JOIN User u ON al.id_user = u.id_user
    WHERE (al.entity_type = 'PROJECT' AND al.entity_id = p_project_id)
       OR (al.entity_type = 'TASK' AND al.entity_id IN (SELECT id_task FROM Task WHERE id_project = p_project_id))
       OR (al.entity_type IN ('PROJECT_ASSIGNMENT', 'TASK_ASSIGNMENT') AND JSON_EXTRACT(al.new_values, '$.project_id') = p_project_id)
    ORDER BY al.timestamp DESC
    LIMIT IFNULL(p_limit, 50) OFFSET IFNULL(p_offset, 0);
END$$

-- Get system-wide activity log (admin only)
CREATE PROCEDURE Admin_GetSystemActivityLog(
    IN p_admin_user_id INT,
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    -- Check if current user is admin
    IF NOT EXISTS (SELECT 1 FROM User WHERE id_user = p_admin_user_id AND is_admin = TRUE AND status = 'ENABLED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Access denied: Admin privileges required';
    END IF;

    SELECT
        al.*,
        u.name as user_name,
        CASE al.entity_type
            WHEN 'USER' THEN (SELECT name FROM User WHERE id_user = al.entity_id)
            WHEN 'PROJECT' THEN (SELECT title FROM Project WHERE id_project = al.entity_id)
            WHEN 'TASK' THEN (SELECT title FROM Task WHERE id_task = al.entity_id)
            ELSE CONCAT(al.entity_type, ' #', al.entity_id)
        END as entity_name
    FROM ActivityLog al
    JOIN User u ON al.id_user = u.id_user
    ORDER BY al.timestamp DESC
    LIMIT IFNULL(p_limit, 100) OFFSET IFNULL(p_offset, 0);
END$$

DELIMITER ;

-- ============================================================================
-- EXAMPLE USAGE
-- ============================================================================

/*
-- Admin creates a user
CALL Admin_CreateUser(1, 'Jane Smith', 'jane@example.com', 'hashed_password', '+1987654321', FALSE, '192.168.1.100');

-- Admin edits a user
CALL Admin_EditUser(1, 2, 'Jane Doe', NULL, '+1987654322', 'ENABLED', FALSE, '192.168.1.100');

-- User changes task status
CALL User_ChangeTaskStatus(2, 1, 'IN_PROGRESS', '192.168.1.101');

-- Create project with logging
CALL CreateProjectWithLog(2, 'Mobile App Development', '2024-02-01 09:00:00', '2024-08-30 17:00:00', '192.168.1.101');

-- Create task with logging
CALL CreateTaskWithLog(2, 1, 'Setup Development Environment', 'Install and configure development tools', '2024-02-01 09:00:00', '2024-02-05 17:00:00', 2, '192.168.1.101');

-- Get all tasks for a user across projects
CALL GetUserTasksAllProjects(2);

-- Get project task distribution
CALL GetProjectTaskDistribution(1);

-- Get tasks by project (all tasks)
CALL GetTasksByProjectAndUser(1, NULL);

-- Get tasks by project for specific user
CALL GetTasksByProjectAndUser(1, 2);

-- Get user activity log
CALL GetUserActivityLog(2, 20, 0);

-- Get project activity log
CALL GetProjectActivityLog(1, 20, 0);

-- Admin gets system activity log
CALL Admin_GetSystemActivityLog(1, 50, 0);
*/
