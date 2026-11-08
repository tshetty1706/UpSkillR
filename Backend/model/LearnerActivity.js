const mongoose = require('mongoose');

const learnerActivitySchema = new mongoose.Schema({
  learnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Learner',
    required: [true, 'learnerId is required'],
    index: true
  },
  activityType: {
    type: String,
    enum: [
      'course_enrolled',
      'lesson_completed',
      'video_completed',
      'module_completed',
      'quiz_attempted',
      'quiz_retaken',
      'course_completed',
      'certificate_earned',
      'bookmark_added',
      'note_created',
      'points_earned',
      'daily_login',
      'daily_checkin',
      'badge_unlocked',
      'LOGIN',
      'DAILY_LOGIN',
      'DAILY_CHECKIN',
      'LESSON_COMPLETED',
      'MODULE_COMPLETED',
      'COURSE_COMPLETED',
      'QUIZ_ATTEMPT',
      'QUIZ_ATTEMPTED',
      'QUIZ_RETAKEN',
      'BADGE_UNLOCKED',
      'CERTIFICATE_EARNED'
    ],
    required: [true, 'activityType is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Activity title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Activity description is required'],
    trim: true
  },
  courseId: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    index: true
  },
  courseTitle: {
    type: String,
    default: '',
    trim: true
  },
  moduleId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  moduleTitle: {
    type: String,
    default: '',
    trim: true
  },
  lessonId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  lessonTitle: {
    type: String,
    default: '',
    trim: true
  },
  points: {
    type: Number,
    default: 0
  },
  referenceId: {
    type: String,
    default: null,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: true }
});

// Compound unique index for strict deduplication
learnerActivitySchema.index(
  { learnerId: 1, activityType: 1, referenceId: 1 },
  { unique: true, sparse: true }
);

// Compound index for sorted pagination
learnerActivitySchema.index({ learnerId: 1, createdAt: -1 });

module.exports = mongoose.model('LearnerActivity', learnerActivitySchema, 'learner_activities');
