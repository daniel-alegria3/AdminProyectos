DELIMITER //

--########## Procedimientos almacenados Usuario
CREATE PROCEDURE EJEMPLO(
    IN variable VARCHAR(100)
)
BEGIN
  -- TODO: implementar
END;
//

CREATE PROCEDURE TEMPORAL(
    IN in_mail VARCHAR(255),
    IN in_password_encrypted VARCHAR(255)
)
BEGIN
  -- TODO: implementar
END;
//

DELIMITER ;

SHOW PROCEDURE STATUS WHERE Db = DATABASE();
