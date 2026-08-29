const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const authController = require('../controller/authController');
const { protect } = require('../middleware/authMiddleware');

// Multer Storage Setup for Profile Photos
const photosDir = path.join(__dirname, '../uploads/photos');
if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, photosDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `photo-${req.user.id}-${Date.now()}${ext}`);
  }
});

const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image file format. Only JPG, PNG, and WEBP images are allowed.'));
    }
  }
});

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

// User Profile Routes
router.get('/me', authController.getCurrentUser);
router.put('/profile', protect, authController.updateProfile);
router.post('/profile/upload/photo', protect, photoUpload.single('file'), authController.uploadProfilePhoto);
router.delete('/profile/upload/photo', protect, authController.removeProfilePhoto);

// Public list of instructors
router.get('/instructors', authController.getInstructors);

module.exports = router;
