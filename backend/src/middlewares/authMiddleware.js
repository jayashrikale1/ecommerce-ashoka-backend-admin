const jwt = require('jsonwebtoken');
const { AdminUser } = require('../models');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await AdminUser.findByPk(decoded.id);

    if (!admin) {
      return res.status(401).json({ message: 'Token is invalid' });
    }

    if (!admin.status) {
        return res.status(403).json({ message: 'Account is inactive' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
