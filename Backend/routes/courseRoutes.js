const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const courseController = require('../controller/courseController');
const announcementController = require('../controller/announcementController');
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

// ─── Multer Storage Configurations ───
const resourcesDir = path.join(__dirname, '../uploads/resources');
const thumbnailsDir = path.join(__dirname, '../uploads/thumbnails');

if (!fs.existsSync(resourcesDir)) fs.mkdirSync(resourcesDir, { recursive: true });
if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });

const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, thumbnailsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `thumb-${Date.now()}${ext}`);
  }
});

const thumbnailUpload = multer({
  storage: thumbnailStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Only JPG, PNG, and WebP allowed.'));
    }
  }
});

const resourceStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resourcesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `res-${Date.now()}-${cleanBase}${ext}`);
  }
});

const resourceUpload = multer({
  storage: resourceStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedExts = [
      '.pdf', '.ppt', '.pptx', '.doc', '.docx', '.xls', '.xlsx', '.zip',
      '.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.avi'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File format not supported. Allowed: PDF, PPT, DOC, XLS, ZIP, Images, Videos.'));
    }
  }
});

// Middleware to prevent browser caching of API responses
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// ─── 0. Course Meta Options ───
router.get('/meta/options', courseController.getCourseMetaOptions);

// ─── 1. Public / Learner Course Browsing Routes ───
router.get('/published', courseController.getPublishedCourses);
router.get('/public/:id', courseController.getPublicCourseById);
router.get('/public/:id/overview', courseController.getPublicCourseOverview);

// ─── 2. Learner-Only Protected Routes ───
router.post('/enrol', protect, requireLearner, courseController.enrolInCourse);
router.get('/learner/my-enrolments', protect, requireLearner, courseController.getLearnerEnrolments);
router.post('/progress', protect, requireLearner, courseController.updateLessonProgress);
router.post('/rate', protect, requireLearner, courseController.submitCourseRating);

// ─── 3. Instructor Course Management (Collection Level) ───
router.get('/instructor/my-courses', protect, requireSubmittedInstructor, courseController.getInstructorCourses);
router.get('/instructor/questions', protect, requireSubmittedInstructor, courseController.getInstructorQuestions);
router.post('/', protect, requireSubmittedInstructor, thumbnailUpload.single('thumbnail'), courseController.createCourse);

// ─── 4. Parameterized Course Routes ───
router.get('/:id/questions', courseController.getCourseQuestions);
router.post('/:id/questions', protect, requireLearner, courseController.askCourseQuestion);

// ─── 4. Instructor Course-Scoped Protected Routes ───
router.get('/:id', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.getCourseById);
router.get('/:id/overview', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.getCourseOverview);
router.put('/:id', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.updateCourse);
router.put('/:id/basic-info', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.updateCourseBasicInfo);
router.put('/:id/thumbnail', protect, requireSubmittedInstructor, verifyCourseOwnership, thumbnailUpload.single('thumbnail'), courseController.updateCourseThumbnail);
router.put('/:id/overview', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.updateCourseOverview);
router.post('/:id/questions/:questionId/reply', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.replyCourseQuestion);
router.delete('/:id', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.deleteCourse);
router.post('/:id/publish', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.publishCourse);

// ─── 5. Modules Management ───
router.post('/:id/modules', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.addModule);
router.put('/:id/modules/:moduleIndex', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.updateModule);
router.delete('/:id/modules/:moduleIndex', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.deleteModule);
router.post('/:id/modules/reorder', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.reorderModules);

// ─── 6. Nested Course Lessons ───
router.get('/:id/lessons', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.getCourseLessons);
router.post('/:id/lessons', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.addLesson);
router.get('/:id/lessons/:lessonIndex', protect, requireSubmittedInstructor, verifyCourseOwnership, verifyLessonBelongsToCourse, courseController.getLesson);
router.put('/:id/lessons/:lessonIndex', protect, requireSubmittedInstructor, verifyCourseOwnership, verifyLessonBelongsToCourse, courseController.updateLesson);
router.delete('/:id/lessons/:lessonIndex', protect, requireSubmittedInstructor, verifyCourseOwnership, verifyLessonBelongsToCourse, courseController.deleteLesson);

// ─── 7. Lesson Resources Upload & Management ───
router.get('/:id/resources', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.getCourseResources);
router.post('/:id/resources', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.addResource);
router.post('/:id/lessons/:lessonIndex/resources/upload', protect, requireSubmittedInstructor, verifyCourseOwnership, resourceUpload.single('file'), courseController.uploadLessonResource);
router.delete('/:id/lessons/:lessonIndex/resources/:resourceId', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.deleteLessonResource);
router.get('/:id/resources/:resourceIndex', protect, requireSubmittedInstructor, verifyCourseOwnership, verifyResourceBelongsToCourse, courseController.getResource);
router.put('/:id/resources/:resourceIndex', protect, requireSubmittedInstructor, verifyCourseOwnership, verifyResourceBelongsToCourse, courseController.updateResource);
router.delete('/:id/resources/:resourceIndex', protect, requireSubmittedInstructor, verifyCourseOwnership, verifyResourceBelongsToCourse, courseController.deleteResource);

// ─── 8. Lesson Assessments & Question Authoring ───
router.get('/:id/assessments', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.getCourseAssessments);
router.post('/:id/assessments', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.addAssessment);
router.post('/:id/lessons/:lessonIndex/assessments', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.createLessonAssessment);
router.put('/:id/lessons/:lessonIndex/assessments/:assessmentId', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.updateLessonAssessment);
router.delete('/:id/lessons/:lessonIndex/assessments/:assessmentId', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.deleteLessonAssessment);
router.post('/:id/lessons/:lessonIndex/assessments/:assessmentId/publish', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.publishLessonAssessment);

// ─── 9. Question Authoring ───
router.post('/:id/lessons/:lessonIndex/assessments/:assessmentId/questions', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.addQuestion);
router.put('/:id/lessons/:lessonIndex/assessments/:assessmentId/questions/:questionId', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.updateQuestion);
router.delete('/:id/lessons/:lessonIndex/assessments/:assessmentId/questions/:questionId', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.deleteQuestion);
router.post('/:id/lessons/:lessonIndex/assessments/:assessmentId/questions/reorder', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.reorderQuestions);

// ─── 10. Instructor Submissions & Auditable Grading ───
router.get('/:id/assessments/:assessmentId/submissions', protect, requireSubmittedInstructor, verifyCourseOwnership, courseController.getAssessmentSubmissions);
router.get('/submissions/:submissionId', protect, requireSubmittedInstructor, courseController.getSubmissionDetails);
router.post('/submissions/:submissionId/grade', protect, requireSubmittedInstructor, courseController.gradeSubmission);

// ─── 11. Course Announcements ───
router.get('/:id/announcements', protect, requireSubmittedInstructor, verifyCourseOwnership, announcementController.getCourseAnnouncements);
router.post('/:id/announcements', protect, requireSubmittedInstructor, verifyCourseOwnership, announcementController.createAnnouncement);
router.put('/:id/announcements/:announcementId', protect, requireSubmittedInstructor, verifyCourseOwnership, announcementController.updateAnnouncement);
router.delete('/:id/announcements/:announcementId', protect, requireSubmittedInstructor, verifyCourseOwnership, announcementController.deleteAnnouncement);
router.patch('/:id/announcements/:announcementId/publish', protect, requireSubmittedInstructor, verifyCourseOwnership, announcementController.togglePublishAnnouncement);
router.get('/:id/learner-announcements', protect, requireLearner, announcementController.getLearnerCourseAnnouncements);

module.exports = router;
