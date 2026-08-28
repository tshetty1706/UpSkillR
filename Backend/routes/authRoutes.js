const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');

// Manual Authentication Routes
router.post('/signup', authController.manualSignUp);
router.post('/login', authController.manualLogin);

// Email Verification (Resend OTP) Routes
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);

// Google OAuth Routes
router.get('/google', authController.googleOAuthRedirect);
router.get('/google/callback', authController.googleOAuthCallback);

// GitHub OAuth Routes
router.get('/github', authController.githubOAuthRedirect);
router.get('/github/callback', authController.githubOAuthCallback);

// User Profile Route
router.get('/me', authController.getCurrentUser);

// Public list of instructors
router.get('/instructors', authController.getInstructors);

module.exports = router;
