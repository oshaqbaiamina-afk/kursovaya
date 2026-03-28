const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');
const Survey = require('./Survey');

const Response = sequelize.define('Response', {
  answers: { type: DataTypes.JSON, allowNull: false },
});

Response.belongsTo(User, { foreignKey: 'userId' });
Response.belongsTo(Survey, { foreignKey: 'surveyId' });
Survey.hasMany(Response, { foreignKey: 'surveyId' });

module.exports = Response;
