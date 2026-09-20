const mongoose = require('mongoose');

const completionRecordSchema = new mongoose.Schema({
  learner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Learner',
    required: true
  },
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  lesson_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  content_version: {
    type: Number,
    required: true,
    default: 1
  },
  items_completed: [
    {
      item_id: { type: mongoose.Schema.Types.ObjectId, required: true },
      type: { type: String, enum: ['Video', 'Quiz'], required: true },
      completed_at: { type: Date, default: Date.now }
    }
  ],
  completed_at: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['complete'],
    default: 'complete',
    immutable: true
  }
});

// Enforce unique compound index to permanently freeze completion once recorded
completionRecordSchema.index({ learner_id: 1, lesson_id: 1 }, { unique: true });

module.exports = mongoose.model('CompletionRecord', completionRecordSchema, 'completion_records');
