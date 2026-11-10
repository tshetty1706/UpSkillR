const mongoose = require('mongoose');

const deletionJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    learnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Learner',
      required: true,
      index: true
    },
    email: {
      type: String,
      required: false,
      default: 'anonymized@deleted.local',
      trim: true,
      lowercase: true
    },
    emailHash: {
      type: String,
      default: '',
      index: true
    },
    authProvider: {
      type: String,
      default: 'local'
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true
    },
    step: {
      type: String,
      default: 'initiated'
    },
    attempts: {
      type: Number,
      default: 1
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    inventory: {
      enrolments: { type: Number, default: 0 },
      personalNotes: { type: Number, default: 0 },
      bookmarks: { type: Number, default: 0 },
      bookmarkFolders: { type: Number, default: 0 },
      certificates: { type: Number, default: 0 },
      completionRecords: { type: Number, default: 0 },
      assessmentSubmissions: { type: Number, default: 0 },
      assessmentAttempts: { type: Number, default: 0 },
      officialAssessmentAttempts: { type: Number, default: 0 },
      pointTransactions: { type: Number, default: 0 },
      learnerActivities: { type: Number, default: 0 },
      notifications: { type: Number, default: 0 },
      notificationsReferencedCleaned: { type: Number, default: 0 },
      courseQuestions: { type: Number, default: 0 },
      courseQuestionsDeleted: { type: Number, default: 0 },
      courseQuestionsAnonymized: { type: Number, default: 0 },
      courseReviews: { type: Number, default: 0 },
      cloudinaryAssetsCount: { type: Number, default: 0 },
      cloudinaryAssets: [{ type: String }],
      coursesToRecalculate: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
    },
    pendingAssetCleanup: [
      {
        target: { type: String, required: true },
        publicId: { type: String, default: '' },
        resourceType: { type: String, enum: ['image', 'raw'], default: 'image' },
        lastError: { type: String, default: '' },
        attempts: { type: Number, default: 0 }
      }
    ],
    error: {
      type: String,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// TTL index to automatically remove completed deletion job records after 30 days
deletionJobSchema.index({ completedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { status: 'completed' } });

module.exports = mongoose.model('DeletionJob', deletionJobSchema, 'deletion_jobs');
