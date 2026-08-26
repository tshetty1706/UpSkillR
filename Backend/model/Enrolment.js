const mongoose = require('mongoose');

const enrolmentSchema = new mongoose.Schema({
  learnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Learner',
    required: true
  },
  learnerName: {
    type: String,
    default: 'Learner'
  },
  learnerEmail: {
    type: String,
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  courseTitle: {
    type: String,
    required: true
  },
  completedLessons: [{
    type: Number
  }],
  progressPercentage: {
    type: Number,
    default: 0
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure unique enrolment per learner per course
enrolmentSchema.index({ learnerId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Enrolment', enrolmentSchema, 'enrolments');
