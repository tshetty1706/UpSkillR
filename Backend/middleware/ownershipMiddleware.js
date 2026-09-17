const mongoose = require('mongoose');
const Course = require('../model/Course');

/**
 * Middleware: Verify Course Ownership
 * Enforces that the authenticated instructor is the actual owner of the course.
 *
 * Flow:
 * 1. Extracts courseId from route params (:courseId or :id).
 * 2. Validates MongoDB ObjectId format.
 * 3. Retrieves Course document from database.
 * 4. Compares course.instructorId with validated req.user.id (from JWT).
 * 5. Attaches course document to req.course for downstream handlers.
 */
const verifyCourseOwnership = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.params.id;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID format.'
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.'
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Authenticated user required.'
      });
    }

    // Strictly enforce course ownership using req.user.id from JWT
    if (course.instructorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to access or modify this course.'
      });
    }

    // Attach verified course to request context
    req.course = course;
    next();
  } catch (error) {
    console.error('verifyCourseOwnership error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during course ownership verification.'
    });
  }
};

/**
 * Middleware: Verify Lesson Belongs to Course
 * Enforces that the requested lesson actually belongs to the verified req.course.
 * Prevents cross-course IDOR attacks.
 */
const verifyLessonBelongsToCourse = (req, res, next) => {
  if (!req.course) {
    return res.status(500).json({
      success: false,
      message: 'Server configuration error: verifyCourseOwnership must precede verifyLessonBelongsToCourse.'
    });
  }

  const lessonIdentifier = req.params.lessonId || req.params.lessonIndex;
  if (lessonIdentifier === undefined || lessonIdentifier === null) {
    return res.status(400).json({
      success: false,
      message: 'Lesson identifier is required.'
    });
  }

  // 1. Check if identifier matches subdocument _id
  if (mongoose.Types.ObjectId.isValid(lessonIdentifier)) {
    const lesson = req.course.lessons.id(lessonIdentifier);
    if (lesson) {
      req.lesson = lesson;
      req.lessonIndex = req.course.lessons.findIndex(
        (l) => l._id.toString() === lessonIdentifier.toString()
      );
      return next();
    }
  }

  // 2. Check if identifier is a numeric array index
  const idx = parseInt(lessonIdentifier, 10);
  if (!isNaN(idx) && idx >= 0 && idx < req.course.lessons.length) {
    req.lesson = req.course.lessons[idx];
    req.lessonIndex = idx;
    return next();
  }

  return res.status(404).json({
    success: false,
    message: 'Lesson not found in this course.'
  });
};

/**
 * Middleware: Verify Resource Belongs to Course
 * Enforces that the requested resource actually belongs to the verified req.course.
 * Prevents cross-course IDOR attacks.
 */
const verifyResourceBelongsToCourse = (req, res, next) => {
  if (!req.course) {
    return res.status(500).json({
      success: false,
      message: 'Server configuration error: verifyCourseOwnership must precede verifyResourceBelongsToCourse.'
    });
  }

  const resourceIdentifier = req.params.resourceId || req.params.resourceIndex;
  if (resourceIdentifier === undefined || resourceIdentifier === null) {
    return res.status(400).json({
      success: false,
      message: 'Resource identifier is required.'
    });
  }

  // 1. Check if identifier matches subdocument _id
  if (mongoose.Types.ObjectId.isValid(resourceIdentifier)) {
    const resource = req.course.resources.id(resourceIdentifier);
    if (resource) {
      req.resource = resource;
      req.resourceIndex = req.course.resources.findIndex(
        (r) => r._id.toString() === resourceIdentifier.toString()
      );
      return next();
    }
  }

  // 2. Check if identifier is a numeric array index
  const idx = parseInt(resourceIdentifier, 10);
  if (!isNaN(idx) && idx >= 0 && idx < req.course.resources.length) {
    req.resource = req.course.resources[idx];
    req.resourceIndex = idx;
    return next();
  }

  return res.status(404).json({
    success: false,
    message: 'Resource not found in this course.'
  });
};

/**
 * Middleware: Verify Assessment Belongs to Course
 * Enforces that the requested assessment actually belongs to the verified req.course.
 * Prevents cross-course IDOR attacks.
 */
const verifyAssessmentBelongsToCourse = (req, res, next) => {
  if (!req.course) {
    return res.status(500).json({
      success: false,
      message: 'Server configuration error: verifyCourseOwnership must precede verifyAssessmentBelongsToCourse.'
    });
  }

  const assessmentIdentifier = req.params.assessmentId || req.params.assessmentIndex;
  if (assessmentIdentifier === undefined || assessmentIdentifier === null) {
    return res.status(400).json({
      success: false,
      message: 'Assessment identifier is required.'
    });
  }

  // 1. Check if identifier matches subdocument _id
  if (mongoose.Types.ObjectId.isValid(assessmentIdentifier)) {
    const assessment = req.course.assessments.id(assessmentIdentifier);
    if (assessment) {
      req.assessment = assessment;
      req.assessmentIndex = req.course.assessments.findIndex(
        (a) => a._id.toString() === assessmentIdentifier.toString()
      );
      return next();
    }
  }

  // 2. Check if identifier is a numeric array index
  const idx = parseInt(assessmentIdentifier, 10);
  if (!isNaN(idx) && idx >= 0 && idx < req.course.assessments.length) {
    req.assessment = req.course.assessments[idx];
    req.assessmentIndex = idx;
    return next();
  }

  return res.status(404).json({
    success: false,
    message: 'Assessment not found in this course.'
  });
};

module.exports = {
  verifyCourseOwnership,
  verifyLessonBelongsToCourse,
  verifyResourceBelongsToCourse,
  verifyAssessmentBelongsToCourse
};
