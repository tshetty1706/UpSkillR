const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  certificateId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  learnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Learner',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor',
    required: true
  },
  studentNameSnapshot: {
    type: String,
    required: true,
    trim: true
  },
  courseNameSnapshot: {
    type: String,
    required: true,
    trim: true
  },
  instructorNameSnapshot: {
    type: String,
    required: true,
    trim: true
  },
  instructorDesignationSnapshot: {
    type: String,
    default: 'Course Instructor',
    trim: true
  },
  completionDate: {
    type: Date,
    default: Date.now
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  certificateImageUrl: {
    type: String,
    required: true
  },
  certificatePublicId: {
    type: String,
    default: ''
  },
  certificatePdfUrl: {
    type: String,
    default: ''
  },
  verificationStatus: {
    type: String,
    enum: ['valid', 'revoked'],
    default: 'valid',
    index: true
  },
  verificationUrl: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Ensure 1 certificate per learner per course
certificateSchema.index({ learnerId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', certificateSchema, 'certificates');
