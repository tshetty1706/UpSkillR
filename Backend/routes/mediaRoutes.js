const express = require('express');
const router = express.Router();
const mediaController = require('../controller/mediaController');
const { protect, requireSubmittedInstructor } = require('../middleware/authMiddleware');

// Get upload credentials (Mux direct upload or Cloudinary signed upload)
router.post('/upload-credentials', protect, requireSubmittedInstructor, mediaController.getUploadCredentials);

// Mux webhook (publicly accessible for Mux servers)
router.post('/mux-webhook', mediaController.muxWebhook);

module.exports = router;
