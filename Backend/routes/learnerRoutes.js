const express = require('express');
const router = express.Router();
const learnerController = require('../controller/learnerController');
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

// Enrolled Courses Route
router.get('/me/courses', courseController.getLearnerEnrolments);

module.exports = router;
