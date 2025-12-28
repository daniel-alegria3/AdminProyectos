CREATE TABLE `User` (
  id_user int PRIMARY KEY AUTO_INCREMENT,
  name varchar(128) NOT NULL,
  email varchar(128) NOT NULL UNIQUE,
  password varchar(128) NOT NULL,
  phone_number varchar(64),
  account_status enum('ENABLED', 'DISABLED') DEFAULT 'ENABLED' NOT NULL,
  is_admin boolean DEFAULT FALSE NOT NULL
);

--------------------------------------------------------------------------------

CREATE TABLE `Project` (
  id_project int PRIMARY KEY AUTO_INCREMENT,
  title varchar(256) NOT NULL,
  visibility enum('PUBLIC', 'PRIVATE') DEFAULT 'PUBLIC' NOT NULL,
  description varchar(1024),
  start_date datetime,
  end_date datetime
);

CREATE TABLE `ProjectAssignment` (
  id_project int, -- <<FK>>
  id_user int, -- <<FK>>
  role enum('OWNER', 'MEMBER', 'REVIEWER') DEFAULT 'MEMBER' NOT NULL,

  PRIMARY KEY (id_project, id_user),
  FOREIGN KEY (id_project) REFERENCES `Project`(id_project) ON DELETE CASCADE,
  FOREIGN KEY (id_user) REFERENCES `User`(id_user) ON DELETE CASCADE
);

--------------------------------------------------------------------------------

CREATE TABLE `Task` (
  id_task int PRIMARY KEY AUTO_INCREMENT,
  id_project int, -- <<FK>>
  title varchar(256) NOT NULL,
  description VARCHAR(256),
  start_date datetime,
  end_date datetime,
  progress_status enum('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
    DEFAULT 'PENDING' NOT NULL,

  FOREIGN KEY (id_project) REFERENCES Project(id_project) ON DELETE CASCADE
);

CREATE TABLE `TaskAssignment` (
  id_task int, -- <<PK, FK>>
  id_user int, -- <<PK, FK>>
  role enum('OWNER', 'MEMBER') DEFAULT 'MEMBER' NOT NULL,

  PRIMARY KEY (id_task, id_user),
  FOREIGN KEY (id_task) REFERENCES `Task`(id_task) ON DELETE CASCADE,
  FOREIGN KEY (id_user) REFERENCES `User`(id_user) ON DELETE CASCADE
);

--------------------------------------------------------------------------------

CREATE TABLE `File` (
  id_file int PRIMARY KEY AUTO_INCREMENT,
  name varchar(256) NOT NULL,
  extension varchar(16) NOT NULL,
  data longblob NOT NULL,
  size int UNSIGNED NOT NULL,
  uploaded_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `ProjectFile` (
  id_project int, -- <<PK, FK>>
  id_file int, -- <<PK, FK>>

  PRIMARY KEY (id_project, id_file),
  FOREIGN KEY (id_project) REFERENCES `Project`(id_project) ON DELETE CASCADE,
  FOREIGN KEY (id_file) REFERENCES `File`(id_file) ON DELETE CASCADE
);

CREATE TABLE `TaskFile` (
  id_task int, -- <<PK, FK>>
  id_file int, -- <<PK, FK>>

  PRIMARY KEY (id_task, id_file),
  FOREIGN KEY (id_task) REFERENCES `Task`(id_task) ON DELETE CASCADE,
  FOREIGN KEY (id_file) REFERENCES `File`(id_file) ON DELETE CASCADE
);

--------------------------------------------------------------------------------
