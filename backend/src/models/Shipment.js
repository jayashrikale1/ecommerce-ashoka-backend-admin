const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Shipment = sequelize.define('Shipment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  tracking_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  carrier: {
    type: DataTypes.STRING(50),
    defaultValue: 'DTDC'
  },
  status: {
    type: DataTypes.ENUM('created', 'in_transit', 'delivered', 'cancelled'),
    defaultValue: 'created'
  },
  last_event: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'shipments',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Shipment;
