const mongoose = require('mongoose');

const pointTransactionSchema = new mongoose.Schema({
  learnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Learner',
    required: true,
    index: true
  },
  points: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['DAILY_CHECKIN', 'MODULE_COMPLETION', 'COURSE_COMPLETION', 'OTHER'],
    required: true
  },
  referenceId: {
    type: String,
    default: null
  },
  description: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Sparse compound index to prevent duplicate point rewards for same transaction
pointTransactionSchema.index({ learnerId: 1, type: 1, referenceId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('PointTransaction', pointTransactionSchema, 'point_transactions');
