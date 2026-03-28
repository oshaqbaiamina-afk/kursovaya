const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');

const Survey = sequelize.define('Survey', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  questions: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  // ← БУЛ ӨРІС БОЛМАСА — сауалнамалар ЕШҚАШАН ШЫҚПАЙДЫ
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  responseCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  commentCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

Survey.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Survey, { foreignKey: 'userId' });

module.exports = Survey;