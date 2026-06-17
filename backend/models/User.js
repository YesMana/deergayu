const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('customer', 'doctor', 'astrologer', 'admin', 'vendor'),
    defaultValue: 'customer',
  },
  specialization: {
    // For doctors/astrologers
    type: DataTypes.STRING,
    allowNull: true,
  },
  rank: {
    // For manual ranking control
    type: DataTypes.INTEGER,
    defaultValue: 0,
  }
});

module.exports = User;
