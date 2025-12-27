const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'mariadbuser',
  password: 'mariadbuser',
  database: 'AdminProyectos_BD',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = db;

