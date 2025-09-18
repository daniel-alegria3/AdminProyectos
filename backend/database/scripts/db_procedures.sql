DELIMITER //

--------------------------------------------------------------------------------
--- USER PROCEDURES
--------------------------------------------------------------------------------

CREATE PROCEDURE CreateUser(
  in p_name varchar(128),
  in p_email varchar(128),
  in p_password varchar(128),
  in p_phone_number varchar(64),
  in p_is_admin boolean
)
BEGIN
  INSERT INTO `User` (name, email, password, phone_number, is_admin)
    VALUES (p_name, p_email, p_password, p_phone_number, p_is_admin);

  SELECT
    LAST_INSERT_ID() as user_id,
    'User created successfully' as message;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE UpdateUserStatus(
  in p_user_id int,
  in p_status varchar(16)
)
BEGIN
  -- Intercept invalid ENUM value
  DECLARE EXIT HANDLER FOR 1265  -- ER_TRUNCATED_WRONG_VALUE_FOR_FIELD
  BEGIN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid status: must be one of the ENUM values defined in User.status';
  END;

  -- Update user status
  UPDATE `User`
    SET status = p_status
    WHERE id_user = p_user_id;

  -- Return
  IF ROW_COUNT() = 0 THEN
    SELECT
      0 AS success,
      CONCAT('No user updated with id ', p_user_id) AS message;
  ELSE
    SELECT
      1 AS success,
      CONCAT('User status updated to ', p_status) AS message;
  END IF;
END; //

--------------------------------------------------------------------------------
--- PROJECT PROCEDURES
--------------------------------------------------------------------------------

CREATE PROCEDURE CreateProject(
  in p_title varchar(256),
  in p_start_date datetime,
  in p_end_date datetime,
  in p_creator_user_id int
)
BEGIN
  DECLARE v_project_id int;

  -- Create project
  INSERT INTO Project (title, start_date, end_date)
    VALUES (p_title, p_start_date, p_end_date);

  SET v_project_id = LAST_INSERT_ID();

  -- Assign creator to project
  INSERT INTO ProjectAssignment (id_project, id_user)
    VALUES (v_project_id, p_creator_user_id);

  SELECT v_project_id as project_id, 'Project created successfully' as message;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE AssignUserToProject(
  IN p_project_id int,
  IN p_user_id int
)
BEGIN
  -- Handler for repeated entry in ProjectAssignment
  DECLARE EXIT HANDLER FOR 1062
  BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'User is already assigned to this project';
  END;

  -- Check if user exists and is enabled
  IF NOT EXISTS (SELECT 1 FROM `User` WHERE id_user = p_user_id AND status = 'ENABLED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User does not exist or is disabled';
  END IF;

  INSERT INTO ProjectAssignment (id_project, id_user)
    VALUES (p_project_id, p_user_id);

  SELECT 'User assigned to project' as message;
END; //

--------------------------------------------------------------------------------
--- TASK PROCEDURES
--------------------------------------------------------------------------------

CREATE PROCEDURE CreateTask(
  in p_project_id int,
  in p_title varchar(256),
  in p_description varchar(256),
  in p_start_date datetime,
  in p_end_date datetime,
  in p_assigned_user_id int
)
BEGIN
  DECLARE v_task_id int;

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

  SELECT v_task_id as task_id, 'Task created successfully' as message;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE UpdateTaskStatus(
  in p_task_id int,
  in p_status varchar(16)
)
BEGIN
  -- Intercept invalid ENUM value
  DECLARE EXIT HANDLER FOR 1265  -- ER_TRUNCATED_WRONG_VALUE_FOR_FIELD
  BEGIN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid status: must be one of the ENUM values defined in Task.status';
  END;

  UPDATE Task
    SET status = p_status
    WHERE id_task = p_task_id;

  SELECT CONCAT('Task status updated to ', p_status) as message;
END; //

--------------------------------------------------------------------------------
--- FILE PROCEDURES
--------------------------------------------------------------------------------

CREATE PROCEDURE UploadFile(
  in p_name varchar(256),
  in p_data longblob,
  in p_size int UNSIGNED,
  in p_mime_type varchar(128)
)
BEGIN
  INSERT INTO `File` (name, data, size, mime_type)
    VALUES (p_name, p_data, p_size, p_mime_type);

  SELECT 'File uploaded successfully' as message;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE AttachFileToProject(
  in p_project_id int,
  in p_file_id int
)
BEGIN
  INSERT INTO ProjectFile (id_project, id_file)
    VALUES (p_project_id, p_file_id);

  SELECT 'File attached to project' as message;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE AttachFileToTask(
  in p_task_id int,
  in p_file_id int
)
BEGIN
  INSERT INTO TaskFile (id_task, id_file)
    VALUES (p_task_id, p_file_id);

  SELECT 'File attached to task' as message;
END; //

--------------------------------------------------------------------------------
--- UTILITY PROCEDURES
--------------------------------------------------------------------------------

CREATE PROCEDURE GetTasksByUser (
  in p_user_id int,
  in p_filter_project_id int -- NULL to see all tasks for user
)
BEGIN
  SELECT
    t.*,
    GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') AS assigned_users,
    COUNT(DISTINCT tf.id_file) AS file_count,
    p.title AS project_title
    FROM Task t
    INNER JOIN TaskAssignment ta_self
      ON t.id_task = ta_self.id_task
      AND ta_self.id_user = p_user_id
    LEFT JOIN TaskAssignment ta ON t.id_task = ta.id_task
    LEFT JOIN `User` u ON ta.id_user = u.id_user AND u.status = 'ENABLED'
    LEFT JOIN TaskFile tf ON t.id_task = tf.id_task
    INNER JOIN Project p ON t.id_project = p.id_project
    WHERE p_filter_project_id IS NULL OR t.id_project = p_filter_project_id
    GROUP BY t.id_task
    ORDER BY t.status, t.start_date, t.title;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE GetTasksByProject (
  in p_project_id int,
  in p_filter_user_id int -- NULL to see all tasks for project
)
BEGIN
  SELECT
    t.*,
    GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') AS assigned_users,
    COUNT(DISTINCT tf.id_file) AS file_count
    FROM Task t
    LEFT JOIN TaskAssignment ta ON t.id_task = ta.id_task
    LEFT JOIN `User` u ON ta.id_user = u.id_user AND u.status = 'ENABLED'
    LEFT JOIN TaskFile tf ON t.id_task = tf.id_task
    WHERE t.id_project = p_project_id
    AND (p_filter_user_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM TaskAssignment ta_exists
        WHERE ta_exists.id_task = t.id_task
        AND ta_exists.id_user = p_filter_user_id
    ))
    GROUP BY t.id_task
    ORDER BY t.status, t.start_date, t.title;
END; //

--------------------------------------------------------------------------------

DELIMITER ;
SHOW PROCEDURE STATUS WHERE Db = DATABASE();
