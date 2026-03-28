const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'oylar',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASS || 'amioka26',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    dialect: 'postgres',
    logging: false,
  }
);

module.exports = sequelize;
