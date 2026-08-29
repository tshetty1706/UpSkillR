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

// Multer Storage Setup
const photosDir = path.join(__dirname, '../uploads/photos');
const resumesDir = path.join(__dirname, '../uploads/resumes');
const certificatesDir = path.join(__dirname, '../uploads/certificates');

if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });
if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true });
if (!fs.existsSync(certificatesDir)) fs.mkdirSync(certificatesDir, { recursive: true });

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

const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resumesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `resume-${req.user.id}-${Date.now()}${ext}`);
  }
});

const resumeUpload = multer({
  storage: resumeStorage,
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

const certificateStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, certificatesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `cert-${req.user.id}-${Date.now()}${ext}`);
  }
});

const certificateUpload = multer({
  storage: certificateStorage,
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
