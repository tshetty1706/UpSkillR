const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');

const courseController = require('../controller/courseController');
const announcementController = require('../controller/announcementController');
const courseContentController = require('../controller/courseContentController');
const assessmentReviewController = require('../controller/assessmentReviewController');
const analyticsController = require('../controller/analyticsController');
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

// ─── Multer Storage Configurations (In-Memory Buffer, Zero Local Disk Storage) ───
const thumbnailUpload = multer({
  storage: multer.memoryStorage(),
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

const resourceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedExts = [
      '.pdf', '.ppt', '.pptx', '.doc', '.docx', '.xls', '.xlsx', '.zip',
      '.jpg', '.jpeg', '.png', '.webp'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File format not supported. Allowed: PDF, PPT, DOC, XLS, ZIP, Images.'));
    }
  }
});

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.mp4', '.mov', '.webm', '.mkv', '.avi'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video format. Only MP4, MOV, WebM, MKV, and AVI allowed.'));
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
router.get('/', courseController.getPublishedCourses);
router.get('/published', courseController.getPublishedCourses);
router.get('/public/:id', courseController.getPublicCourseById);
router.get('/public/:id/overview', courseController.getPublicCourseOverview);

// ─── 2. Learner-Only Protected Routes ───
router.post('/enrol', protect, requireLearner, courseController.enrolInCourse);
router.post('/:courseId/enroll', protect, requireLearner, courseController.enrolInCourse);
router.get('/learner/my-enrolments', protect, requireLearner, courseController.getLearnerEnrolments);
router.get('/:courseId/progress', protect, requireLearner, courseController.getCourseProgress);
router.post('/progress', protect, requireLearner, courseController.updateLessonProgress);
router.post('/:courseId/modules/:moduleId/complete', protect, requireLearner, courseController.updateLessonProgress);
router.post('/rate', protect, requireLearner, courseController.submitCourseRating);

// ─── 3. Instructor Course Management (Collection Level) ───
router.get('/instructor/my-courses', protect, requireSubmittedInstructor, courseController.getInstructorCourses);
router.get('/instructor/analytics', protect, requireSubmittedInstructor, analyticsController.getInstructorAnalytics);
router.get('/instructor/questions', protect, requireSubmittedInstructor, courseController.getInstructorQuestions);
router.post('/', protect, requireSubmittedInstructor, thumbnailUpload.single('thumbnail'), courseController.createCourse);

// ─── Assessment Review Surface (Sidebar) ───
router.get('/instructor/assessments-review', protect, requireSubmittedInstructor, assessmentReviewController.getInstructorAssessmentsReview);
router.post('/instructor/assessments-review/:submissionId/grant-attempt', protect, requireSubmittedInstructor, assessmentReviewController.grantExtraAttempt);
router.post('/instructor/assessments-review/:submissionId/mark-complete', protect, requireSubmittedInstructor, assessmentReviewController.markCompleteManually);
router.post('/instructor/assessments-review/:submissionId/resolve-appeal', protect, requireSubmittedInstructor, assessmentReviewController.resolveAppeal);
router.post('/instructor/assessments-review/:submissionId/reset-attempts', protect, requireSubmittedInstructor, assessmentReviewController.resetAttempts);

// ─── ID-Based Curriculum System ───
router.get('/:courseId/curriculum', protect, requireSubmittedInstructor, courseContentController.getCurriculumTree);
router.post('/:courseId/curriculum/modules', protect, requireSubmittedInstructor, courseContentController.createModule);
router.patch('/:courseId/curriculum/modules/:moduleId', protect, requireSubmittedInstructor, courseContentController.updateModule);
router.patch('/:courseId/curriculum/modules/:moduleId/toggle-state', protect, requireSubmittedInstructor, courseContentController.toggleModuleState);
router.patch('/:courseId/curriculum/modules/:moduleId/reorder', protect, requireSubmittedInstructor, courseContentController.reorderModule);
router.post('/:courseId/curriculum/modules/:moduleId/lessons', protect, requireSubmittedInstructor, courseContentController.createLesson);
router.patch('/:courseId/curriculum/modules/:moduleId/lessons/:lessonId', protect, requireSubmittedInstructor, courseContentController.updateLesson);
router.patch('/:courseId/curriculum/modules/:moduleId/lessons/:lessonId/toggle-state', protect, requireSubmittedInstructor, courseContentController.toggleLessonState);
router.patch('/:courseId/curriculum/modules/:moduleId/lessons/:lessonId/reorder', protect, requireSubmittedInstructor, courseContentController.reorderLesson);
router.post('/:courseId/curriculum/lessons/:lessonId/items', protect, requireSubmittedInstructor, courseContentController.createContentItem);
router.patch('/:courseId/curriculum/lessons/:lessonId/items/:itemId', protect, requireSubmittedInstructor, courseContentController.updateContentItem);
router.patch('/:courseId/curriculum/lessons/:lessonId/items/:itemId/toggle-state', protect, requireSubmittedInstructor, courseContentController.toggleContentItemState);
router.patch('/:courseId/curriculum/lessons/:lessonId/items/:itemId/reorder', protect, requireSubmittedInstructor, courseContentController.reorderContentItem);
router.post('/:courseId/curriculum/notes', protect, requireSubmittedInstructor, courseContentController.attachNote);
router.patch('/:courseId/curriculum/notes/:noteId', protect, requireSubmittedInstructor, courseContentController.updateNote);
router.delete('/:courseId/curriculum/notes/:noteId', protect, requireSubmittedInstructor, courseContentController.deleteNote);
router.patch('/:courseId/curriculum/notes/:noteId/toggle-state', protect, requireSubmittedInstructor, courseContentController.toggleNoteState);
router.post('/:courseId/curriculum/assessments', protect, requireSubmittedInstructor, courseContentController.createAssessment);
router.patch('/:courseId/curriculum/assessments/:assessmentId', protect, requireSubmittedInstructor, courseContentController.updateAssessment);
router.delete('/:courseId/curriculum/assessments/:assessmentId', protect, requireSubmittedInstructor, courseContentController.deleteAssessment);
router.patch('/:courseId/curriculum/assessments/:assessmentId/toggle-state', protect, requireSubmittedInstructor, courseContentController.toggleAssessmentState);
router.post('/:courseId/curriculum/upload/video', protect, requireSubmittedInstructor, videoUpload.single('video'), courseContentController.uploadVideoFromDevice);
router.post('/:courseId/curriculum/upload/resource', protect, requireSubmittedInstructor, resourceUpload.single('file'), courseContentController.uploadResourceFromDevice);

// ─── 4. Parameterized Course Routes ───
router.get('/:id/questions', courseController.getCourseQuestions);
router.post('/:id/questions', protect, requireLearner, courseController.askCourseQuestion);

// ─── 4. Course Details & Instructor Scoped Routes ───
router.get('/:id', courseController.getCourseUniversal);
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
