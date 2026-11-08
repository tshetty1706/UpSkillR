const express = require('express');
const router = express.Router();
const certificateController = require('../controller/certificateController');
const { protect, requireLearner, requireSubmittedInstructor } = require('../middleware/authMiddleware');

// 1. Public certificate verification (no authentication required)
router.get('/verify/:certificateId', certificateController.verifyCertificatePublic);

// 2. Learner routes (requires learner authentication)
router.get('/me', protect, requireLearner, certificateController.getMyCertificates);
router.get('/my-certificates', protect, requireLearner, certificateController.getMyCertificates);
router.post('/claim/:courseId', protect, requireLearner, certificateController.claimCertificate);

// 3. Instructor routes (requires instructor authentication)
router.get('/course/:courseId', protect, requireSubmittedInstructor, certificateController.getCourseCertificateStats);

module.exports = router;
