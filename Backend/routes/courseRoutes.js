const express = require('express');
const router = express.Router();
const courseController = require('../controller/courseController');
const {
  protect,
  requireLearner,
  requireSubmittedInstructor
} = require('../middleware/authMiddleware');
const {
  verifyCourseOwnership,
  verifyLessonBelongsToCourse,
  verifyResourceBelongsToCourse,
  verifyAssessmentBelongsToCourse
} = require('../middleware/ownershipMiddleware');

// Middleware to prevent browser caching of API responses
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// ─── 1. Public / Learner Course Browsing Routes ───
router.get('/published', courseController.getPublishedCourses);
router.get('/public/:id', courseController.getPublicCourseById);

// ─── 2. Learner-Only Protected Routes ───
router.post('/enrol', protect, requireLearner, courseController.enrolInCourse);
router.get('/learner/my-enrolments', protect, requireLearner, courseController.getLearnerEnrolments);
router.post('/progress', protect, requireLearner, courseController.updateLessonProgress);
router.post('/rate', protect, requireLearner, courseController.submitCourseRating);

// ─── 3. Instructor Course Management (Collection Level) ───
router.get('/instructor/my-courses', protect, requireSubmittedInstructor, courseController.getInstructorCourses);
router.post('/', protect, requireSubmittedInstructor, courseController.createCourse);

// ─── 4. Instructor Course-Scoped Protected Routes (AuthN → RBAC → OwnershipCheck → Controller) ───
router.get('/:id', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.getCourseById);
router.put('/:id', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.updateCourse);
router.delete('/:id', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.deleteCourse);
router.post('/:id/publish', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.publishCourse);

// ─── 5. Nested Course Lessons (AuthN → RBAC → CourseOwnership → LessonBelongsToCourse → Controller) ───
router.get('/:id/lessons', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.getCourseLessons);
router.post('/:id/lessons', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.addLesson);
router.get('/:id/lessons/:lessonIndex', protect, requireSubmittedInstructor, verifyCourseOwnership, verifyLessonBelongsToCourse, courseController.getLesson);
router.put('/:id/lessons/:lessonIndex', protect, requireSubmittedInstructor, verifyCourseOwnership, verifyLessonBelongsToCourse, courseController.updateLesson);
router.delete('/:id/lessons/:lessonIndex', protect, requireSubmittedInstructor, verifyCourseOwnership, verifyLessonBelongsToCourse, courseController.deleteLesson);

// ─── 6. Nested Course Resources (AuthN → RBAC → CourseOwnership → ResourceBelongsToCourse → Controller) ───
router.get('/:id/resources', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.getCourseResources);
router.post('/:id/resources', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.addResource);
router.get('/:id/resources/:resourceIndex', protect, requireSubmittedInstructor, verifyCourseOwnership, verifyResourceBelongsToCourse, courseController.getResource);
router.put('/:id/resources/:resourceIndex', protect, requireSubmittedInstructor, verifyCourseOwnership, verifyResourceBelongsToCourse, courseController.updateResource);
router.delete('/:id/resources/:resourceIndex', protect, requireSubmittedInstructor, verifyCourseOwnership, verifyResourceBelongsToCourse, courseController.deleteResource);

// ─── 7. Nested Course Assessments (AuthN → RBAC → CourseOwnership → AssessmentBelongsToCourse → Controller) ───
router.get('/:id/assessments', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.getCourseAssessments);
router.post('/:id/assessments', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.addAssessment);
router.get('/:id/assessments/:assessmentIndex', protect, requireSubmittedInstructor, verifyCourseOwnership, verifyAssessmentBelongsToCourse, courseController.getAssessment);
router.put('/:id/assessments/:assessmentIndex', protect, requireSubmittedInstructor, verifyCourseOwnership, verifyAssessmentBelongsToCourse, courseController.updateAssessment);
router.delete('/:id/assessments/:assessmentIndex', protect, requireSubmittedInstructor, verifyCourseOwnership, verifyAssessmentBelongsToCourse, courseController.deleteAssessment);

module.exports = router;
