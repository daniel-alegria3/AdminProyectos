DELIMITER //

--------------------------------------------------------------------------------
--- USER PROCEDURES
--------------------------------------------------------------------------------

CREATE PROCEDURE CreateUser(
    IN p_name VARCHAR(128),
    IN p_email VARCHAR(128),
    IN p_password VARCHAR(128),
    IN p_phone_number VARCHAR(64),
    IN p_is_admin BOOLEAN,
    IN p_requesting_user_id INT
)
BEGIN
  DECLARE v_is_admin BOOLEAN DEFAULT FALSE;

  -- Check if requesting user is admin
  SELECT is_admin INTO v_is_admin FROM User WHERE id_user = p_requesting_user_id AND account_status = 'ENABLED';

  IF NOT v_is_admin THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Only admins can create users';
  END IF;

  -- Insert new user
  INSERT INTO User (name, email, password, phone_number, is_admin)
  VALUES (p_name, p_email, p_password, p_phone_number, p_is_admin);

  -- Return the created user ID
  SELECT LAST_INSERT_ID() as user_id;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE UpdateUser(
    IN p_user_id INT,
    IN p_requesting_user_id INT,
    IN p_name VARCHAR(128),
    IN p_email VARCHAR(128),
    IN p_phone_number VARCHAR(64),
    IN p_account_status VARCHAR(16)
)
BEGIN
  -- TODO: I won't audit this gpt code (but it looks good). I'm tired boss

  DECLARE v_is_admin BOOLEAN DEFAULT FALSE;
  DECLARE v_target_is_admin BOOLEAN DEFAULT FALSE;

  -- Intercept invalid ENUM value for account_status
  DECLARE EXIT HANDLER FOR 1265  -- ER_TRUNCATED_WRONG_VALUE_FOR_FIELD
  BEGIN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid account_status: must be ENABLED or DISABLED';
  END;

  -- Intercept duplicate email error
  DECLARE EXIT HANDLER FOR 1062  -- ER_DUP_ENTRY
  BEGIN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Email address already exists';
  END;

  -- Check if requesting user exists and get admin status
  SELECT is_admin INTO v_is_admin FROM `User`
    WHERE id_user = p_requesting_user_id
    AND account_status = 'ENABLED'
    LIMIT 1;

  IF v_is_admin IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Requesting user not found or account disabled';
  END IF;

  -- Check if target user exists and get admin status
  SELECT is_admin INTO v_target_is_admin FROM `User`
    WHERE id_user = p_user_id
    LIMIT 1;

  IF v_target_is_admin IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Target user not found';
  END IF;

  -- Authorization logic:
  -- Users can only update themselves (except admin status)
  -- Admins can update any user
  -- Only admins can change admin status
  IF p_requesting_user_id <> p_user_id AND NOT v_is_admin THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'You can only update your own profile unless you are an admin';
  END IF;

  -- Prevent non-admins from changing admin status
  IF p_requesting_user_id <> p_user_id AND NOT v_is_admin AND p_account_status IS NOT NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Only admins can change account status';
  END IF;

  -- Update the user (using COALESCE to only update non-NULL parameters)
  UPDATE `User` SET
    name = COALESCE(p_name, name),
    email = COALESCE(p_email, email),
    phone_number = COALESCE(p_phone_number, phone_number),
    account_status = COALESCE(p_account_status, account_status)
  WHERE id_user = p_user_id;

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'User update failed';
  END IF;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE DeleteUser(
  IN p_user_id INT,
  IN p_requesting_user_id INT
)
BEGIN
  DECLARE v_is_admin BOOLEAN DEFAULT FALSE;
  DECLARE v_target_is_admin BOOLEAN DEFAULT FALSE;

  -- Check if requesting user is admin
  SELECT is_admin INTO v_is_admin
  FROM User
  WHERE id_user = p_requesting_user_id
  AND account_status = 'ENABLED';

  IF NOT v_is_admin THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Only admins can delete users';
  END IF;

  -- Check if target user exists and is admin
  SELECT is_admin INTO v_target_is_admin
  FROM User
  WHERE id_user = p_user_id;

  IF v_target_is_admin IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'User not found';
  END IF;

  -- Prevent deletion of other admins (optional security measure)
  IF v_target_is_admin AND p_user_id != p_requesting_user_id THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Cannot delete other admin accounts';
  END IF;

  -- Delete the user
  DELETE FROM User WHERE id_user = p_user_id;

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'User deletion failed';
  END IF;
END; //

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

  SELECT LAST_INSERT_ID() as user_id;
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
    account_status = 'ENABLED' AS is_enabled
  FROM `User`
  WHERE email = p_email
    AND password = p_password
    -- AND account_status = 'ENABLED'
    ;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE UpdateUserStatus(
  in p_user_id int,
  in p_account_status varchar(16)
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
    SET account_status = p_account_status
    WHERE id_user = p_user_id;

  -- Return
  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid user_id';
  END IF;
END; //

--------------------------------------------------------------------------------
--- PROJECT PROCEDURES
--------------------------------------------------------------------------------

CREATE PROCEDURE CreateProject(
  in p_user_id int,
  in p_title varchar(256),
  in p_start_date datetime,
  in p_end_date datetime
)
BEGIN
  DECLARE v_project_id int;

  -- Create project
  INSERT INTO Project (title, start_date, end_date)
    VALUES (p_title, p_start_date, p_end_date);

  SET v_project_id = LAST_INSERT_ID();

  -- Assign creator to project
  INSERT INTO ProjectAssignment (id_project, id_user, role)
    VALUES (v_project_id, p_user_id, "OWNER");

  SELECT v_project_id as project_id;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE UpdateProject(
    IN p_project_id INT,
    IN p_user_id INT,
    IN p_title VARCHAR(256),
    IN p_visibility VARCHAR(16),
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
  DECLARE v_role VARCHAR(16);

  -- Check if the user is the project owner
  SELECT role
    INTO v_role
    FROM ProjectAssignment
    WHERE id_project = p_project_id
    AND id_user = p_user_id
    LIMIT 1;

  IF v_role IS NULL OR v_role <> 'OWNER' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Only project owners can update project details';
  END IF;

  -- Update the project
  UPDATE Project SET
    title      = COALESCE(p_title, title),
    visibility = COALESCE(p_visibility, visibility),
    start_date = COALESCE(p_start_date, start_date),
    end_date   = COALESCE(p_end_date, end_date)
  WHERE id_project = p_project_id;

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Project not found';
  END IF;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE AssignUserToProject(
  in p_project_id int,
  in p_user_id int,
  in p_assigned_user_id int,
  in p_role varchar(16)
)
BEGIN
  DECLARE v_role VARCHAR(16);

  -- Handler for repeated entry in ProjectAssignment
  DECLARE EXIT HANDLER FOR 1062
  BEGIN
    IF p_role IS NOT NULL THEN
      UPDATE ProjectAssignment SET role = p_role
        WHERE id_project = p_project_id AND id_user = p_assigned_user_id;
    ELSE
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No update performed: role not provided';
    END IF;
  END;

  -- Intercept invalid ENUM value
  DECLARE EXIT HANDLER FOR 1265  -- ER_TRUNCATED_WRONG_VALUE_FOR_FIELD
  BEGIN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid role: must be one of the ENUM values defined in ProjectAssignment.role';
  END;

  -- Handle foreign key violation
  DECLARE EXIT HANDLER FOR 1452
  BEGIN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid project or user';
  END;

  -- Check if the user is the project owner
  SELECT role
    INTO v_role
    FROM ProjectAssignment
    WHERE id_project = p_project_id
    AND id_user = p_user_id
    LIMIT 1;

  IF v_role IS NULL OR v_role <> 'OWNER' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Only project owners can update project details';
  END IF;

  IF p_role IS NOT NULL THEN
    INSERT INTO ProjectAssignment (id_project, id_user, role)
      VALUES (p_project_id, p_assigned_user_id, p_role);
  ELSE
    INSERT INTO ProjectAssignment (id_project, id_user)
      VALUES (p_project_id, p_assigned_user_id);
  END IF;
END; //


--------------------------------------------------------------------------------

CREATE PROCEDURE GetAllProjects(
  in p_user_id int
)
BEGIN
  SELECT
    p.*,
    pa.role,
    COUNT(DISTINCT pa.id_user) AS member_count,
    COUNT(DISTINCT t.id_task) AS task_count,
    COUNT(DISTINCT pf.id_file) AS file_count
  FROM Project p
  LEFT JOIN ProjectAssignment pa ON p.id_project = pa.id_project
    AND pa.id_user = p_user_id
  LEFT JOIN Task t ON p.id_project = t.id_project
  LEFT JOIN ProjectFile pf ON p.id_project = pf.id_project
  WHERE
    CASE
      WHEN p_user_id IS NULL THEN p.visibility = 'PUBLIC' -- TODO: integrate `visibility` check in rest of SP
      ELSE pa.id_user = p_user_id
    END
  GROUP BY p.id_project, pa.role
  ORDER BY p.start_date DESC;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE GetProjectDetails(
  in p_project_id int
)
BEGIN
  -- TODO: have rule so only 'OWNER'|'MEMBER' get project details?

  DECLARE v_members JSON;
  DECLARE v_files   JSON;

  -- Members (guaranteed at least 1)
  SELECT
    JSON_ARRAYAGG(
      JSON_OBJECT( 'id_user', u.id_user, 'name', u.name, 'email', u.email, 'role', pa.role)
    )
    INTO v_members
    FROM ProjectAssignment pa
    JOIN `User` u ON pa.id_user = u.id_user
    WHERE pa.id_project = p_project_id;

  -- Files (maybe none)
  SELECT
    COALESCE(
      JSON_ARRAYAGG(
        JSON_OBJECT( 'file_id', f.id_file, 'filename', CONCAT(f.name, '.', f.extension), 'size', f.size)), JSON_ARRAY()
    )
    INTO v_files
    FROM ProjectFile pf
    JOIN `File` f ON f.id_file = pf.id_file
    WHERE pf.id_project = p_project_id;

  -- Final select (1 row)
  SELECT
    p.id_project,
    p.title,
    p.visibility,
    p.start_date,
    p.end_date,
    v_members AS members,
    v_files   AS files
    FROM Project p
    WHERE p.id_project = p_project_id;
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
  in p_assigned_role varchar(16)
)
BEGIN
  -- TODO: have rule so only 'OWNER'|'MEMBER' create task?

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

    IF p_assigned_role IS NOT NULL THEN
      INSERT INTO TaskAssignment (id_task, id_user, role)
        VALUES (v_task_id, p_assigned_user_id, p_assigned_role);
    ELSE
      INSERT INTO TaskAssignment (id_task, id_user)
        VALUES (v_task_id, p_assigned_user_id);
    END IF;
  END IF;

  SELECT v_task_id as task_id;
END; //

--------------------------------------------------------------------------------

DELIMITER //

CREATE PROCEDURE GetTaskDetails (
  in p_task_id int
)
BEGIN
  -- TODO: have rule so only 'OWNER'|'MEMBER' get task details?

  DECLARE v_members JSON;
  DECLARE v_files   JSON;

  -- Members (could be 0)
  SELECT
    COALESCE(
      JSON_ARRAYAGG(
        JSON_OBJECT( 'user_id', u.id_user, 'name', u.name, 'is_enabled', u.account_status = 'ENABLED')
      ), JSON_ARRAY()
    )
    INTO v_members
    FROM TaskAssignment ta
    JOIN `User` u ON ta.id_user = u.id_user
    WHERE ta.id_task = p_task_id;

  -- Files (could be 0)
  SELECT
    COALESCE(
      JSON_ARRAYAGG(
        JSON_OBJECT( 'file_id', f.id_file, 'filename', CONCAT(f.name, '.', f.extension), 'size', f.size)
      ), JSON_ARRAY()
    )
    INTO v_files
    FROM TaskFile tf
    JOIN `File` f ON f.id_file = tf.id_file
    WHERE tf.id_task = p_task_id;

  -- Final row
  SELECT
    t.*,
    v_members AS members,
    v_files   AS files,
    p.title   AS project_title
    FROM Task t
    JOIN Project p ON t.id_project = p.id_project
    WHERE t.id_task = p_task_id;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE AssignUserToTask(
  in p_task_id int,
  in p_user_id int,
  in p_assigned_user_id int,
  in p_role varchar(16)
)
BEGIN
  DECLARE v_role VARCHAR(16);

  -- Handler for repeated entry in TaskAssignment
  DECLARE EXIT HANDLER FOR 1062
  BEGIN
    IF p_role IS NOT NULL THEN
      UPDATE TaskAssignment SET role = p_role
        WHERE id_task = p_task_id AND id_user = p_assigned_user_id;
    ELSE
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No update performed: role not provided';
    END IF;
  END;

  -- Intercept invalid ENUM value
  DECLARE EXIT HANDLER FOR 1265  -- ER_TRUNCATED_WRONG_VALUE_FOR_FIELD
  BEGIN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid role: must be one of the ENUM values defined in TaskAssignment.role';
  END;

  -- Handle foreign key violation
  DECLARE EXIT HANDLER FOR 1452
  BEGIN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid task or user';
  END;


  -- Check if the user is the task owner
  SELECT role
    INTO v_role
    FROM TaskAssignment
    WHERE id_task = p_task_id
    AND id_user = p_user_id
    LIMIT 1;

  IF v_role IS NULL OR v_role <> 'OWNER' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Only project owners can update project details';
  END IF;

  -- Attempt to insert new assignment
  IF p_role IS NOT NULL THEN
    INSERT INTO TaskAssignment (id_task, id_user, role)
      VALUES (p_task_id, p_assigned_user_id, p_role);
  ELSE
    INSERT INTO TaskAssignment (id_task, id_user)
      VALUES (p_task_id, p_assigned_user_id);
  END IF;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE UpdateTaskStatus(
  in p_task_id int,
  in p_progress_status varchar(16)
)
BEGIN
  -- TODO: have rule so only 'OWNER' can change `progress_status`?

  -- Intercept invalid ENUM value
  DECLARE EXIT HANDLER FOR 1265  -- ER_TRUNCATED_WRONG_VALUE_FOR_FIELD
  BEGIN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid progress_status: must be one of the ENUM values defined in Task.progress_status';
  END;

  UPDATE Task
    SET progress_status = p_progress_status
    WHERE id_task = p_task_id;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE GetTasksByUser (
  in p_user_id int,
  in p_filter_project_id int -- NULL to see all tasks for user
)
BEGIN
  -- TODO: have rule so only 'OWNER'|'MEMBER' get tasks?
  SELECT
    t.*,
    COUNT(DISTINCT u.id_user) AS member_count,
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
    ORDER BY t.progress_status, t.start_date, t.title;
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
    COUNT(DISTINCT u.id_user) AS member_count,
    COUNT(DISTINCT tf.id_file) AS file_count
    FROM Task t
    LEFT JOIN TaskAssignment ta ON t.id_task = ta.id_task
      AND (p_filter_user_id IS NULL OR ta.id_user = p_filter_user_id)
    LEFT JOIN `User` u ON ta.id_user = u.id_user
    LEFT JOIN TaskFile tf ON t.id_task = tf.id_task
    WHERE t.id_project = p_project_id
    GROUP BY t.id_task
    ORDER BY t.progress_status, t.start_date, t.title;
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

  SELECT LAST_INSERT_ID() AS file_id;
END; //

--------------------------------------------------------------------------------

CREATE PROCEDURE DownloadFile (
    IN p_id_file INT
)
BEGIN
  SELECT
    f.id_file,
    CONCAT(f.name, '.', f.extension) AS filename,
    f.extension,
    f.data,
    f.size
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
END; //

--------------------------------------------------------------------------------
--- UTILITY PROCEDURES
--------------------------------------------------------------------------------

CREATE PROCEDURE GetTaskFilenames (
  IN p_id_task INT
)
BEGIN
  -- TODO: made reduntant to GetTaskDetails
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

CREATE PROCEDURE GetProjectFilenames (
    IN p_id_project INT
)
BEGIN
  -- TODO: made reduntant to GetProjectDetails
  SELECT
    f.id_file,
    CONCAT(f.name, '.', f.extension) AS filename,
    f.name,
    f.extension,
    f.size,
    f.uploaded_at
    FROM ProjectFile pf
    JOIN `File` f ON pf.id_file = f.id_file
    WHERE p_id_project IS NULL OR pf.id_project = p_id_project;
END; //

--------------------------------------------------------------------------------

DELIMITER ;
SHOW PROCEDURE STATUS WHERE Db = DATABASE();
