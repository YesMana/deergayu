const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  customerId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id',
    }
  },
  providerId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id',
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  time: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled'),
    defaultValue: 'pending',
  },
  paymentMethod: {
    type: DataTypes.ENUM('qr', 'bank_transfer', 'paypal', 'cash'),
    allowNull: true,
  }
});

// Associations
User.hasMany(Appointment, { foreignKey: 'customerId', as: 'customerAppointments' });
User.hasMany(Appointment, { foreignKey: 'providerId', as: 'providerAppointments' });
Appointment.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
Appointment.belongsTo(User, { foreignKey: 'providerId', as: 'provider' });

module.exports = Appointment;
