const mongoose = require('mongoose');

const videoWatchRecordSchema = new mongoose.Schema({
  lessonId: { type: String },
  contentItemId: { type: String },
  totalDuration: { type: Number, default: 0 },
  watchedIntervals: [{
    start: { type: Number, required: true },
    end: { type: Number, required: true }
  }],
  uniqueWatchedDuration: { type: Number, default: 0 },
  watchPercentage: { type: Number, default: 0 },
  lastWatchedPosition: { type: Number, default: 0 },
  maxWatchedTime: { type: Number, default: 0 },
  isEligible: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

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
    type: mongoose.Schema.Types.Mixed
  }],
  progressPercentage: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'in_progress', 'completed', 'enrolled', 'ENROLLED', 'IN_PROGRESS', 'COMPLETED'],
    default: 'active',
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessedModuleId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  lastAccessedLessonId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  lastAccessedItemId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  lastAccessedByModule: {
    type: Map,
    of: new mongoose.Schema({
      lessonId: { type: mongoose.Schema.Types.Mixed, default: null },
      itemId: { type: mongoose.Schema.Types.Mixed, default: null },
      updatedAt: { type: Date, default: Date.now }
    }, { _id: false }),
    default: () => new Map()
  },
  videoProgress: {
    type: Map,
    of: Number,
    default: () => new Map()
  },
  videoWatchData: {
    type: Map,
    of: videoWatchRecordSchema,
    default: () => new Map()
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  feedback: {
    type: String,
    default: ''
  },
  feedbackTags: [{
    type: String
  }],
  ratedAt: {
    type: Date,
    default: null
  }
});

// Ensure unique enrolment per learner per course
enrolmentSchema.index({ learnerId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Enrolment', enrolmentSchema, 'enrolments');
