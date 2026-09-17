const jwt = require('jsonwebtoken');
const { Instructor } = require('../model/User');

const JWT_SECRET = process.env.JWT_SECRET || 'upskillr_jwt_secret_key_2026_super_secure';

/**
 * Protect middleware: validates JWT token and establishes authenticated user.
 *
 * Requirements:
 * - Missing token -> 401
 * - Invalid, expired, or malformed token -> 401
 * - Establishes normalized req.user
 * - Never trusts client-supplied user identity
 */
const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Access token missing or empty.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Invalid token payload.'
      });
    }

    // Establish normalized authenticated user
    req.user = {
      id: decoded.id.toString(),
      email: decoded.email,
      role: decoded.role,
      fullName: decoded.fullName,
      isVerified: decoded.isVerified,
      applicationStatus: decoded.applicationStatus
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.'
    });
  }
};

/**
 * Generic RoleCheck middleware factory
 * @param {...string} roles - Allowed roles e.g. ('instructor')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}.`
      });
    }
    next();
  };
};

/**
 * Require Instructor role authorization
 */
const requireInstructor = requireRole('instructor');

/**
 * Require Learner role authorization
 */
const requireLearner = requireRole('learner');

/**
 * Require Submitted Instructor role authorization for Course/Dashboard operations.
 * Validates role === 'instructor' AND verifies in DB that applicationStatus === 'submitted'.
 */
const requireSubmittedInstructor = async (req, res, next) => {
  if (!req.user || req.user.role !== 'instructor') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only registered instructors can perform this action.'
    });
  }

  try {
    const instructor = await Instructor.findById(req.user.id);
    if (!instructor || instructor.applicationStatus !== 'submitted') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Instructor application must be submitted before accessing dashboard features.',
        applicationStatus: instructor ? instructor.applicationStatus : 'not_started'
      });
    }
    next();
  } catch (error) {
    console.error('requireSubmittedInstructor DB check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server authorization check failed.'
    });
  }
};

module.exports = {
  protect,
  requireRole,
  requireInstructor,
  requireLearner,
  requireSubmittedInstructor
};
