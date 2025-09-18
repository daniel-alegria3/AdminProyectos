CREATE TABLE `User` (
  id_user int PRIMARY KEY AUTO_INCREMENT,
  name varchar(128) NOT NULL,
  email varchar(128) NOT NULL UNIQUE,
  password varchar(128) NOT NULL,
  phone_number varchar(64),
  status enum('ENABLED', 'DISABLED') DEFAULT 'ENABLED' NOT NULL,
  is_admin boolean NOT NULL
);

--------------------------------------------------------------------------------

CREATE TABLE `Project` (
  id_project int PRIMARY KEY AUTO_INCREMENT,
  title varchar(256) NOT NULL,
  start_date datetime,
  end_date datetime
);

CREATE TABLE `ProjectAssignment` (
  id_project int, -- <<FK>>
  id_user int, -- <<FK>>

  PRIMARY KEY (id_project, id_user),
  FOREIGN KEY (id_project) REFERENCES `Project`(id_project),
  FOREIGN KEY (id_user) REFERENCES `User`(id_user)
);

--------------------------------------------------------------------------------

CREATE TABLE `Task` (
  id_task int PRIMARY KEY AUTO_INCREMENT,
  id_project int, -- <<FK>>
  title varchar(256) NOT NULL,
  description VARCHAR(256),
  start_date datetime,
  end_date datetime,
  status enum('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
    DEFAULT 'PENDING' NOT NULL,

  FOREIGN KEY (id_project) REFERENCES Project(id_project)
);

CREATE TABLE `TaskAssignment` (
  id_task int, -- <<PK, FK>>
  id_user int, -- <<PK, FK>>

  PRIMARY KEY (id_task, id_user),
  FOREIGN KEY (id_task) REFERENCES `Task`(id_task),
  FOREIGN KEY (id_user) REFERENCES `User`(id_user)
);

--------------------------------------------------------------------------------

CREATE TABLE `FileAllowedFormats` (
  mime_type varchar(128) PRIMARY KEY,
  extension varchar(16) NOT NULL,
  description varchar(256)
);

CREATE TABLE `File` (
  id_file int AUTO_INCREMENT PRIMARY KEY,
  name varchar(256) NOT NULL,
  data longblob NOT NULL,
  size int UNSIGNED NOT NULL,
  mime_type varchar(128), -- <<FK>>
  uploaded_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (mime_type) REFERENCES `FileAllowedFormats`(mime_type)
);

CREATE TABLE `ProjectFile` (
  id_project int, -- <<PK, FK>>
  id_file int, -- <<PK, FK>>

  PRIMARY KEY (id_project, id_file),
  FOREIGN KEY (id_project) REFERENCES `Project`(id_project),
  FOREIGN KEY (id_file) REFERENCES `File`(id_file)
);

CREATE TABLE `TaskFile` (
  id_task int, -- <<PK, FK>>
  id_file int, -- <<PK, FK>>

  PRIMARY KEY (id_task, id_file),
  FOREIGN KEY (id_task) REFERENCES `Task`(id_task),
  FOREIGN KEY (id_file) REFERENCES `File`(id_file)
);

--------------------------------------------------------------------------------
