DELIMITER //

--------------------------------------------------------------------------------
--- AUDIT LOG TRIGGERS
--------------------------------------------------------------------------------

--- PROJECT TRIGGERS

CREATE TRIGGER project_create_audit
AFTER INSERT ON `Project`
FOR EACH ROW
BEGIN
    INSERT INTO `AuditLog` (entity_type, entity_id, action, id_user, new_values, timestamp)
    VALUES (
        'PROJECT',
        NEW.id_project,
        'CREATE',
        @user_id,
        JSON_OBJECT(
            'title', NEW.title,
            'visibility', NEW.visibility,
            'description', NEW.description,
            'start_date', NEW.start_date,
            'end_date', NEW.end_date
        ),
        NOW()
    );
END//

CREATE TRIGGER project_update_audit
AFTER UPDATE ON `Project`
FOR EACH ROW
BEGIN
    INSERT INTO `AuditLog` (entity_type, entity_id, action, id_user, old_values, new_values, timestamp)
    VALUES (
        'PROJECT',
        NEW.id_project,
        'UPDATE',
        @user_id,
        JSON_OBJECT(
            'title', OLD.title,
            'visibility', OLD.visibility,
            'description', OLD.description,
            'start_date', OLD.start_date,
            'end_date', OLD.end_date
        ),
        JSON_OBJECT(
            'title', NEW.title,
            'visibility', NEW.visibility,
            'description', NEW.description,
            'start_date', NEW.start_date,
            'end_date', NEW.end_date
        ),
        NOW()
    );
END//

CREATE TRIGGER project_delete_audit
BEFORE DELETE ON `Project`
FOR EACH ROW
BEGIN
    INSERT INTO `AuditLog` (entity_type, entity_id, action, id_user, old_values, timestamp)
    VALUES (
        'PROJECT',
        OLD.id_project,
        'DELETE',
        @user_id,
        JSON_OBJECT(
            'title', OLD.title,
            'visibility', OLD.visibility,
            'description', OLD.description,
            'start_date', OLD.start_date,
            'end_date', OLD.end_date
        ),
        NOW()
    );
END//

--------------------------------------------------------------------------------

--- TASK TRIGGERS

CREATE TRIGGER task_create_audit
AFTER INSERT ON `Task`
FOR EACH ROW
BEGIN
    INSERT INTO `AuditLog` (entity_type, entity_id, action, id_user, new_values, timestamp)
    VALUES (
        'TASK',
        NEW.id_task,
        'CREATE',
        @user_id,
        JSON_OBJECT(
            'id_project', NEW.id_project,
            'title', NEW.title,
            'description', NEW.description,
            'start_date', NEW.start_date,
            'end_date', NEW.end_date,
            'progress_status', NEW.progress_status
        ),
        NOW()
    );
END//

CREATE TRIGGER task_update_audit
AFTER UPDATE ON `Task`
FOR EACH ROW
BEGIN
    INSERT INTO `AuditLog` (entity_type, entity_id, action, id_user, old_values, new_values, timestamp)
    VALUES (
        'TASK',
        NEW.id_task,
        'UPDATE',
        @user_id,
        JSON_OBJECT(
            'id_project', OLD.id_project,
            'title', OLD.title,
            'description', OLD.description,
            'start_date', OLD.start_date,
            'end_date', OLD.end_date,
            'progress_status', OLD.progress_status
        ),
        JSON_OBJECT(
            'id_project', NEW.id_project,
            'title', NEW.title,
            'description', NEW.description,
            'start_date', NEW.start_date,
            'end_date', NEW.end_date,
            'progress_status', NEW.progress_status
        ),
        NOW()
    );
END//

CREATE TRIGGER task_delete_audit
BEFORE DELETE ON `Task`
FOR EACH ROW
BEGIN
    INSERT INTO `AuditLog` (entity_type, entity_id, action, id_user, old_values, timestamp)
    VALUES (
        'TASK',
        OLD.id_task,
        'DELETE',
        @user_id,
        JSON_OBJECT(
            'id_project', OLD.id_project,
            'title', OLD.title,
            'description', OLD.description,
            'start_date', OLD.start_date,
            'end_date', OLD.end_date,
            'progress_status', OLD.progress_status
        ),
        NOW()
    );
END//

--------------------------------------------------------------------------------

DELIMITER ;
SHOW TRIGGERS;
