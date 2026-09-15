const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ msg: 'User not found, please login again' });
    }
    if (!req.user.isActive) return res.status(403).json({ msg: 'This account is deactivated' });
    
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
