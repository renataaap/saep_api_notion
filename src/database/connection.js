require('dotenv').config();
const mysql = require('mysql2/promise');

const noRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
const mysqlUrl = process.env.MYSQL_URL;

if (noRailway && !mysqlUrl && !process.env.MYSQLHOST) {
  throw new Error(
    'MySQL não configurado no serviço da aplicação. Crie MYSQL_URL como referência para ${{MySQL.MYSQL_URL}} no Railway.'
  );
}

const credenciais = mysqlUrl
  ? { uri: mysqlUrl }
  : {
      host: noRailway ? process.env.MYSQLHOST : process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
      user: noRailway ? process.env.MYSQLUSER : process.env.DB_USER || process.env.MYSQLUSER || 'root',
      password: noRailway ? process.env.MYSQLPASSWORD : process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
      database: noRailway ? process.env.MYSQLDATABASE : process.env.DB_NAME || process.env.MYSQLDATABASE || 'estoque_saep',
      port: Number(noRailway ? process.env.MYSQLPORT : process.env.DB_PORT || process.env.MYSQLPORT || 3306)
    };

const pool = mysql.createPool({
  ...credenciais,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  dateStrings: true
});

module.exports = pool;
