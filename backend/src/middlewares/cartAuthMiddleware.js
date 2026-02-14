const jwt = require('jsonwebtoken');
const { User, Wholesaler } = require('../models');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user = null;
    let userType = '';

    if (decoded.role === 'wholesaler') {
        user = await Wholesaler.findByPk(decoded.id);
        if (user && user.status === 'approved') {
            userType = 'wholesaler';
        }
    } else {
        // Assume customer/user
        user = await User.findByPk(decoded.id);
        if (user && user.status === 'active') {
            userType = 'customer';
        }
    }

    if (!user) {
      return res.status(401).json({ message: 'Token is invalid or account not active' });
    }

    req.user = user;
    req.userType = userType;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};
