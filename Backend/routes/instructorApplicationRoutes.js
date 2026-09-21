const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const { protect, requireInstructor } = require('../middleware/authMiddleware');
const {
  getApplication,
  updateApplication,
  uploadPhoto,
  removePhoto,
  uploadResume,
  removeResume,
  uploadCertificate,
  removeCertificate,
  submitApplication
} = require('../controller/instructorApplicationController');

// Multer Storage Setup (In-Memory Buffer, Zero Local Disk Storage)
const photoUpload = multer({
  storage: multer.memoryStorage(),
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

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid document file format. Only PDF, DOC, and DOCX files are allowed.'));
    }
  }
});

const certificateUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid certificate file format. Only PDF, JPG, PNG, and WEBP files are allowed.'));
    }
  }
});

// All routes require authentication & instructor role
router.use(protect, requireInstructor);

router.get('/', getApplication);
router.put('/', updateApplication);
router.post('/upload/photo', photoUpload.single('file'), uploadPhoto);
router.delete('/upload/photo', removePhoto);
router.post('/upload/resume', resumeUpload.single('file'), uploadResume);
router.delete('/upload/resume', removeResume);
router.post('/upload/certificate', certificateUpload.single('file'), uploadCertificate);
router.delete('/upload/certificate', removeCertificate);
router.post('/submit', submitApplication);

module.exports = router;
