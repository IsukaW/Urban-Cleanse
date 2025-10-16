const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from token
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, account deactivated'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Not authorized, admin access required'
    });
  }
};

// Worker category middleware (wc1, wc2, wc3)
const workerOnly = (req, res, next) => {
  if (req.user && ['wc1', 'wc2', 'wc3'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Not authorized, worker access required'
    });
  }
};

// Admin or Worker middleware
const adminOrWorker = (req, res, next) => {
  if (req.user && ['admin', 'wc1', 'wc2', 'wc3'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Not authorized, admin or worker access required'
    });
  }
};

// Specific worker category middleware
const specificWorker = (workerType) => {
  return (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === workerType)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: `Not authorized, ${workerType} or admin access required`
      });
    }
  };
};

module.exports = {
  protect,
  adminOnly,
  workerOnly,
  adminOrWorker,
  specificWorker
};
