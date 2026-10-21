const mongoose = require('mongoose');

const pointTransactionSchema = new mongoose.Schema({
  learnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Learner',
    required: [true, 'learnerId is required'],
    index: true
  },
  points: {
    type: Number,
    required: [true, 'points value is required'],
    min: [1, 'Points must be at least 1']
  },
  type: {
    type: String,
    enum: {
      values: ['MODULE_COMPLETION', 'QUIZ_COMPLETION', 'COURSE_COMPLETION', 'DAILY_CHECKIN'],
      message: '{VALUE} is not a valid learner activity type'
    },
    required: true
  },
  referenceId: {
    type: String,
    default: null
  },
  description: {
    type: String,
    required: [true, 'Transaction description is required'],
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Sparse compound index to prevent duplicate point rewards for same transaction
pointTransactionSchema.index({ learnerId: 1, type: 1, referenceId: 1 }, { unique: true, sparse: true });

// Pre-validate hook: Strictly restrict PointTransaction to genuine learners only
pointTransactionSchema.pre('validate', async function () {
  if (!this.learnerId) {
    throw new Error('PointTransaction is restricted to learners only: learnerId is required.');
  }

  // 1. Explicitly reject if learnerId belongs to an Instructor
  const Instructor = mongoose.models.Instructor || require('./Instructor');
  const isInstructor = await Instructor.exists({ _id: this.learnerId });
  if (isInstructor) {
    throw new Error('PointTransaction is restricted to learners only: Instructors cannot earn points or have point transactions recorded.');
  }

  // 2. Validate that learnerId belongs to a genuine registered Learner
  const Learner = mongoose.models.Learner || require('./Learner');
  const learner = await Learner.findById(this.learnerId).select('role isVerified');
  if (!learner || learner.role !== 'learner') {
    throw new Error('PointTransaction is restricted to learners only: Valid registered learner is required.');
  }
});

module.exports = mongoose.model('PointTransaction', pointTransactionSchema, 'point_transactions');

