const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  let token = null;

  const authHeader = req.header('Authorization') || req.header('authorization') || req.header('x-auth-token') || req.headers['authorization'];
  if (authHeader) {
    token = authHeader.replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();
  }

  if (!token && req.query?.token) {
    token = String(req.query.token).replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();
  }

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const userId = decoded.id || decoded._id || decoded.userId || (decoded.user && (decoded.user.id || decoded.user._id));

    if (!userId) {
      return res.status(401).json({ msg: 'Token payload invalid, authorization denied' });
    }

    req.user = await User.findById(userId).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ msg: 'User not found, please login again' });
    }
    if (req.user.isActive === false) {
      return res.status(403).json({ msg: 'This account is deactivated' });
    }
    
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
