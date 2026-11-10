const mongoose = require('mongoose');

/**
 * Immutable reference to the learner's first successfully submitted attempt
 * for each course milestone assessment. Database unique index guarantees at most
 * one official attempt per (courseId, assessmentId, learnerId) even under races.
 */
const officialAssessmentAttemptSchema = new mongoose.Schema({
  learnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Learner',
    required: true,
    immutable: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    immutable: true,
    index: true
  },
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    immutable: true,
    index: true
  },
  attemptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssessmentAttempt',
    required: true,
    immutable: true
  },
  attemptNumber: {
    type: Number,
    default: 1,
    immutable: true
  },
  obtainedMarks: {
    type: Number,
    required: true,
    immutable: true
  },
  totalMarks: {
    type: Number,
    required: true,
    immutable: true
  },
  percentage: {
    type: Number,
    required: true,
    immutable: true
  },
  resultStatus: {
    type: String,
    enum: ['PASS', 'FAIL'],
    required: true,
    immutable: true
  },
  submissionStatus: {
    type: String,
    enum: ['submitted', 'timed_out'],
    required: true,
    immutable: true
  },
  timeTakenSeconds: {
    type: Number,
    default: 0,
    immutable: true
  },
  submittedAt: {
    type: Date,
    required: true,
    immutable: true
  }
}, {
  timestamps: true
});

officialAssessmentAttemptSchema.index(
  { courseId: 1, assessmentId: 1, learnerId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'OfficialAssessmentAttempt',
  officialAssessmentAttemptSchema,
  'official_assessment_attempts'
);
