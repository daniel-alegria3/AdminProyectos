#!/bin/bash
set -euo pipefail

db_user="mariadbuser"
db_passwd="mariadbuser"
db_name="AdminProyectos_BD"
db_ipaddr="localhost"

sudo mariadb -v <<EOF
CREATE DATABASE IF NOT EXISTS \`${db_name}\`;

DROP USER IF EXISTS '${db_user}'@'${db_ipaddr}';
CREATE USER '${db_user}'@'${db_ipaddr}' IDENTIFIED BY '${db_passwd}';

GRANT SELECT,INSERT,UPDATE,DELETE,EXECUTE
ON \`${db_name}\`.*
TO '${db_user}'@'${db_ipaddr}';

FLUSH PRIVILEGES;
EOF
