DELIMITER //

--------------------------------------------------------------------------------
--- USER PROCEDURES
--------------------------------------------------------------------------------

CREATE PROCEDURE RegisterUser(
  in p_name varchar(128),
  in p_email varchar(128),
  in p_password varchar(128),
  in p_phone_number varchar(64),
  in p_is_admin boolean
)
BEGIN
  DECLARE EXIT HANDLER FOR 1062  -- ER_DUP_ENTRY
  BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'User with this email already exists';
  END;

  INSERT INTO `User` (name, email, password, phone_number, is_admin)
    VALUES (p_name, p_email, p_password, p_phone_number, p_is_admin);

  SELECT
    LAST_INSERT_ID() as user_id,
    'User created successfully' as message;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE LoginUser(
  IN p_email varchar(128),
  IN p_password varchar(128)
)
BEGIN
  DECLARE EXIT HANDLER FOR NOT FOUND
  BEGIN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid email or password';
  END;

  SELECT
    id_user as user_id,
    is_admin,
    status = 'ENABLED' AS is_enabled,
    'Login successful' as message
  FROM `User`
  WHERE email = p_email
    AND password = p_password
    AND status = 'ENABLED';
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
  IN p_user_id int,
  IN p_status varchar(16)
)
BEGIN
  -- TODO: enforce `status` enum hierarchy
  -- TODO: have rule so only 'OWNER' can change `status`?

  -- Handler for repeated entry in ProjectAssignment
  DECLARE EXIT HANDLER FOR 1062
  BEGIN
    IF p_status IS NOT NULL THEN
      UPDATE ProjectAssignment
        SET status = p_status
        WHERE id_project = p_project_id
        AND id_user = p_user_id;
      SELECT 'User assignment updated' AS message;
    ELSE
      SELECT 'No update performed: status not provided' AS message;
    END IF;
  END;

  -- Intercept invalid ENUM value
  DECLARE EXIT HANDLER FOR 1265  -- ER_TRUNCATED_WRONG_VALUE_FOR_FIELD
  BEGIN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid status: must be one of the ENUM values defined in ProjectAssignment.status';
  END;

  -- Handle foreign key violation
  DECLARE EXIT HANDLER FOR 1452
  BEGIN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid project or user';
  END;

  IF p_status IS NOT NULL THEN
    INSERT INTO ProjectAssignment (id_project, id_user, status)
      VALUES (p_project_id, p_user_id, p_status);
  ELSE
    INSERT INTO ProjectAssignment (id_project, id_user)
      VALUES (p_project_id, p_user_id);
  END IF;

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
  in p_assigned_user_id int,
  in p_assigned_status varchar(16)
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

    IF p_assigned_status IS NOT NULL THEN
      INSERT INTO TaskAssignment (id_task, id_user, status)
        VALUES (v_task_id, p_assigned_user_id, p_assigned_status);
    ELSE
      INSERT INTO TaskAssignment (id_task, id_user)
        VALUES (v_task_id, p_assigned_user_id);
    END IF;
  END IF;

  SELECT v_task_id as task_id, 'Task created successfully' as message;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE AssignUserToTask(
  in p_task_id int,
  in p_user_id int,
  in p_status varchar(16)
)
BEGIN
  -- TODO: enforce `status` enum hierarchy
  -- TODO: have rule so only 'OWNER' can change `status`?

  -- Handler for repeated entry in TaskAssignment
  DECLARE EXIT HANDLER FOR 1062
  BEGIN
    IF p_status IS NOT NULL THEN
      UPDATE TaskAssignment SET status = p_status
        WHERE id_task = p_task_id AND id_user = p_user_id;
      SELECT 'User task assignment updated' AS message;
    ELSE
      SELECT 'No update performed: status not provided' AS message;
    END IF;
  END;

  -- Intercept invalid ENUM value
  DECLARE EXIT HANDLER FOR 1265  -- ER_TRUNCATED_WRONG_VALUE_FOR_FIELD
  BEGIN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid status: must be one of the ENUM values defined in TaskAssignment.status';
  END;

  -- Handle foreign key violation
  DECLARE EXIT HANDLER FOR 1452
  BEGIN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid task or user';
  END;

  -- Attempt to insert new assignment
  IF p_status IS NOT NULL THEN
    INSERT INTO TaskAssignment (id_task, id_user, status)
      VALUES (p_task_id, p_user_id, p_status);
  ELSE
    INSERT INTO TaskAssignment (id_task, id_user)
      VALUES (p_task_id, p_user_id);
  END IF;

  SELECT 'User assigned to task' AS message;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE UpdateTaskStatus(
  in p_task_id int,
  in p_status varchar(16)
)
BEGIN
  -- TODO: have rule so only 'OWNER' can change `status`?

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
  in p_extension varchar(16),
  in p_data LONGBLOB,
  in p_size int UNSIGNED
)
BEGIN
  -- TODO: add a way to track which user uploaded which file?
  INSERT INTO `File` (name, extension, data, size)
  VALUES (p_name, p_extension, p_data, p_size);

  SELECT LAST_INSERT_ID() AS id_file, 'File uploaded successfully' AS message;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE DownloadFile (
    IN p_id_file INT
)
BEGIN
    SELECT
        f.id_file,
        CONCAT(f.name, '.', f.extension) AS filename,
        f.data
    FROM `File` f
    WHERE f.id_file = p_id_file;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE AttachFileToProject(
  in p_project_id int,
  in p_file_id int
)
BEGIN
  -- TODO: have rule so only 'OWNER'|'MEMBER' can attach file?

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
  -- TODO: have rule so only 'OWNER'|'MEMBER' can attach file?

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
  -- TODO: have rule so only 'OWNER'|'MEMBER' get tasks?
  SELECT
    t.*,
    JSON_ARRAYAGG(
      JSON_OBJECT('user_id', u.id_user, 'name', u.name, 'is_enabled', u.status = 'ENABLED')
    ) AS assigned_users,
    COUNT(DISTINCT tf.id_file) AS file_count,
    p.title AS project_title
    FROM Task t
    INNER JOIN TaskAssignment ta_self
      ON t.id_task = ta_self.id_task
      AND ta_self.id_user = p_user_id
    LEFT JOIN TaskAssignment ta ON t.id_task = ta.id_task
    LEFT JOIN `User` u ON ta.id_user = u.id_user
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
  -- TODO: have rule so only 'OWNER'|'MEMBER' get tasks?
  SELECT
    t.*,
    JSON_ARRAYAGG(
      JSON_OBJECT('user_id', u.id_user, 'name', u.name, 'status', u.status)
    ) AS assigned_users,
    COUNT(DISTINCT tf.id_file) AS file_count
    FROM Task t
    LEFT JOIN TaskAssignment ta ON t.id_task = ta.id_task
    LEFT JOIN `User` u ON ta.id_user = u.id_user
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

CREATE PROCEDURE GetTaskFilenames (
    IN p_id_task INT
)
BEGIN
    SELECT
        f.id_file,
        CONCAT(f.name, '.', f.extension) AS filename,
        f.name,
        f.extension,
        f.size,
        f.uploaded_at
    FROM TaskFile tf
    JOIN `File` f ON tf.id_file = f.id_file
    WHERE p_id_task IS NULL OR tf.id_task = p_id_task;
END; //

--------------------------------------------------------------------------------

DELIMITER ;
SHOW PROCEDURE STATUS WHERE Db = DATABASE();
