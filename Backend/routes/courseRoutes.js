const express = require('express');
const router = express.Router();
const courseController = require('../controller/courseController');
const { protect, requireInstructor, requireLearner, requireSubmittedInstructor } = require('../middleware/authMiddleware');

// Middleware to prevent browser caching of API responses
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Public / Learner Course Browsing Route
router.get('/published', courseController.getPublishedCourses);

// Instructor-Only Protected Routes (Requires Submitted Instructor Application)
router.get('/instructor/my-courses', protect, requireSubmittedInstructor, courseController.getInstructorCourses);
router.post('/', protect, requireSubmittedInstructor, courseController.createCourse);
router.put('/:id', protect, requireSubmittedInstructor, courseController.updateCourse);
router.delete('/:id', protect, requireSubmittedInstructor, courseController.deleteCourse);
router.post('/:id/publish', protect, requireSubmittedInstructor, courseController.publishCourse);

// Lessons, Resources & Assessments Routes (Instructor)
router.post('/:id/lessons', protect, requireSubmittedInstructor, courseController.addLesson);
router.delete('/:id/lessons/:lessonIndex', protect, requireSubmittedInstructor, courseController.deleteLesson);

router.post('/:id/resources', protect, requireSubmittedInstructor, courseController.addResource);
router.delete('/:id/resources/:resourceIndex', protect, requireSubmittedInstructor, courseController.deleteResource);

router.post('/:id/assessments', protect, requireSubmittedInstructor, courseController.addAssessment);
router.delete('/:id/assessments/:assessmentIndex', protect, requireSubmittedInstructor, courseController.deleteAssessment);

// Learner-Only Protected Routes
router.post('/enrol', protect, requireLearner, courseController.enrolInCourse);
router.get('/learner/my-enrolments', protect, requireLearner, courseController.getLearnerEnrolments);
router.post('/progress', protect, requireLearner, courseController.updateLessonProgress);

// Public / Authorized Course Detail
router.get('/:id', courseController.getCourseById);

module.exports = router;
