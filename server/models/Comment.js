const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');
const Survey = require('./Survey');

const Comment = sequelize.define('Comment', {
  text: { type: DataTypes.TEXT, allowNull: false },
  likes: { type: DataTypes.INTEGER, defaultValue: 0 },
});

Comment.belongsTo(User, { foreignKey: 'userId' });
Comment.belongsTo(Survey, { foreignKey: 'surveyId' });
Survey.hasMany(Comment, { foreignKey: 'surveyId' });

module.exports = Comment;
