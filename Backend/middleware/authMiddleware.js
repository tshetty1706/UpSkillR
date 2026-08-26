const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'upskillr_jwt_secret_key_2026_super_secure';

// Protect middleware to verify JWT token
const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Access token missing.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
  }
};

// Require Instructor role authorization
const requireInstructor = (req, res, next) => {
  if (!req.user || req.user.role !== 'instructor') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only registered instructors can perform this action.'
    });
  }
  next();
};

// Require Learner role authorization
const requireLearner = (req, res, next) => {
  if (!req.user || req.user.role !== 'learner') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only registered learners can perform this action.'
    });
  }
  next();
};

module.exports = {
  protect,
  requireInstructor,
  requireLearner
};
