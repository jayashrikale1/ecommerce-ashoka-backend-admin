const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const AdminUser = sequelize.define('AdminUser', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(200),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager'),
    defaultValue: 'admin',
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reset_token: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reset_token_expiry: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'admin_users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // User only specified created_at in schema description, but usually both are good. Schema says created_at TIMESTAMP. I'll stick to user req or default. Let's keep default timestamps for sequelize convenience but map them if needed. User listed created_at. I will map createdAt to created_at and disable updatedAt if not requested, but standard is both. The user schema shows created_at TIMESTAMP. I'll enable createdAt only.
  // Wait, user schema says: created_at TIMESTAMP.
  // Actually, standard sequelize is createdAt and updatedAt.
  // The user schema for admin_users has created_at.
  // Let's stick to standard Sequelize timestamps but mapped to snake_case if we want to be strict, or just let Sequelize do its thing.
  // User specified: created_at TIMESTAMP.
  underscored: true, // This will make createdAt -> created_at, updatedAt -> updated_at
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
  },
});

AdminUser.prototype.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = AdminUser;
