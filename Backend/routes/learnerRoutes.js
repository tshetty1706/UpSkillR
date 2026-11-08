const express = require('express');
const router = express.Router();
const learnerController = require('../controller/learnerController');
const reviewController = require('../controller/reviewController');
const libraryController = require('../controller/libraryController');
const { protect, requireLearner } = require('../middleware/authMiddleware');

// Middleware to prevent caching
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// All learner endpoints require authentication
router.use(protect, requireLearner);

const courseController = require('../controller/courseController');

// Profile & Stats Routes
router.get('/me', learnerController.getLearnerProfileAndStats);
router.patch('/me', learnerController.updateLearnerProfile);
router.put('/me', learnerController.updateLearnerProfile);
router.get('/me/check-username', learnerController.checkUsernameAvailability);
router.patch('/me/username', learnerController.updateUsername);

// Gamification, Streak & Check-in Routes
router.post('/me/check-in', learnerController.performDailyCheckin);
router.get('/me/streak', learnerController.getPoints);
router.get('/me/points', learnerController.getPoints);
router.get('/me/point-history', learnerController.getPointHistory);
router.get('/me/points-history', learnerController.getPointHistory);

// Enrolled Courses Route
router.get('/me/courses', courseController.getLearnerEnrolments);

// FR-09: Learner's own reviews & feedback management
router.get('/me/reviews', learnerController.getLearnerReviews);
router.delete('/me/reviews/:reviewId', reviewController.deleteCourseReview);
router.patch('/me/reviews/:reviewId', reviewController.updateCourseReview);

// ─── My Learning Library Routes (Folders, Bookmarks & Personal Notes) ───
// Folders
router.get('/me/folders', libraryController.getFolders);
router.post('/me/folders', libraryController.createFolder);
router.patch('/me/folders/:id', libraryController.updateFolder);
router.delete('/me/folders/:id', libraryController.deleteFolder);

// Personal Notes
router.get('/me/notes', libraryController.getNotes);
router.post('/me/notes', libraryController.createNote);
router.get('/me/notes/:id', libraryController.getNoteById);
router.patch('/me/notes/:id', libraryController.updateNote);
router.put('/me/notes/:id', libraryController.updateNote);
router.delete('/me/notes/:id', libraryController.deleteNote);

// Bookmarks (Enhanced with Videos, Articles, Quizzes & Folders)
router.get('/me/bookmarks', libraryController.getBookmarks);
router.post('/me/bookmarks', libraryController.addOrToggleBookmark);
router.get('/me/bookmarks/check', libraryController.checkBookmarkStatus);
router.patch('/me/bookmarks/:id/folder', libraryController.moveBookmarkToFolder);
router.delete('/me/bookmarks/:id', libraryController.deleteBookmark);
router.delete('/me/bookmarks', libraryController.deleteBookmark);

// Enrolled Courses for Library Filter
router.get('/me/library/courses', libraryController.getLibraryCourses);

// Recent Course Activity / Access Route
router.post('/me/recent-course', learnerController.recordCourseAccess);

// Learning Activity Heatmap (from PointTransaction data)
router.get('/me/activity', learnerController.getLearnerActivity);

// Recent Learning Activity with Server-Side Pagination
router.get('/me/recent-activities', learnerController.getRecentActivities);

// Certificates (derived from completed enrolments)
router.get('/me/certificates', learnerController.getLearnerCertificates);

// Verified Learning Milestones
router.get('/me/milestones', learnerController.getLearnerMilestones);

// Learning Streak Badges
router.get('/me/badges', learnerController.getLearnerBadges);

// Notifications (New modules / lessons uploaded)
const notificationController = require('../controller/notificationController');
router.get('/me/notifications', notificationController.getLearnerNotifications);
router.patch('/me/notifications/read-all', notificationController.markAllNotificationsAsRead);
router.patch('/me/notifications/:id/read', notificationController.markNotificationAsRead);

// Account Deletion (Email OTP Only — Step 2: Send OTP, Step 2b: Resend, Step 3: Verify OTP, Step 4: Confirm Deletion)
router.post('/me/delete-account/send-otp', learnerController.requestDeleteAccountOtp);
router.post('/me/delete-account/verify-password', learnerController.requestDeleteAccountOtp); // Backward-compatibility alias
router.post('/me/delete-account/resend-otp', learnerController.resendDeleteAccountOtp);
router.post('/me/delete-account/verify-otp', learnerController.verifyDeleteAccountOtp);
router.post('/me/delete-account/confirm', learnerController.confirmDeleteAccount);

module.exports = router;
