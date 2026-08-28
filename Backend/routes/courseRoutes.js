const express = require('express');
const router = express.Router();
const courseController = require('../controller/courseController');
const { protect, requireInstructor, requireLearner } = require('../middleware/authMiddleware');

// Middleware to prevent browser caching of API responses
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Public / Learner Course Browsing Route
router.get('/published', courseController.getPublishedCourses);

// Instructor-Only Protected Routes
router.get('/instructor/my-courses', protect, requireInstructor, courseController.getInstructorCourses);
router.post('/', protect, requireInstructor, courseController.createCourse);
router.put('/:id', protect, requireInstructor, courseController.updateCourse);
router.delete('/:id', protect, requireInstructor, courseController.deleteCourse);
router.post('/:id/publish', protect, requireInstructor, courseController.publishCourse);

// Lessons, Resources & Assessments Routes (Instructor)
router.post('/:id/lessons', protect, requireInstructor, courseController.addLesson);
router.delete('/:id/lessons/:lessonIndex', protect, requireInstructor, courseController.deleteLesson);

router.post('/:id/resources', protect, requireInstructor, courseController.addResource);
router.delete('/:id/resources/:resourceIndex', protect, requireInstructor, courseController.deleteResource);

router.post('/:id/assessments', protect, requireInstructor, courseController.addAssessment);
router.delete('/:id/assessments/:assessmentIndex', protect, requireInstructor, courseController.deleteAssessment);

// Learner-Only Protected Routes
router.post('/enrol', protect, requireLearner, courseController.enrolInCourse);
router.get('/learner/my-enrolments', protect, requireLearner, courseController.getLearnerEnrolments);
router.post('/progress', protect, requireLearner, courseController.updateLessonProgress);

// Public / Authorized Course Detail
router.get('/:id', courseController.getCourseById);

module.exports = router;
