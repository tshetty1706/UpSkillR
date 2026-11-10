const mongoose = require('mongoose');

const attemptAnswerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  questionText: { type: String, required: true },
  questionType: {
    type: String,
    enum: ['mcq', 'multiple_choice', 'multiple_response', 'true_false', 'short_answer', 'long_answer'],
    required: true
  },
  options: [{ type: String }],
  optionImages: [{ type: String }],
  studentAnswer: { type: mongoose.Schema.Types.Mixed, default: null },
  correctAnswer: { type: mongoose.Schema.Types.Mixed, default: null },
  isCorrect: { type: Boolean, default: false },
  isAnswered: { type: Boolean, default: false },
  marksAwarded: { type: Number, default: 0 },
  maxMarks: { type: Number, default: 1 },
  explanation: { type: String, default: '' }
}, { _id: false });

const assessmentAttemptSchema = new mongoose.Schema({
  learnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Learner',
    required: true,
    index: true
  },
  learnerName: {
    type: String,
    required: true,
    trim: true
  },
  learnerEmail: {
    type: String,
    required: true,
    trim: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  assessmentTitle: {
    type: String,
    default: 'Assessment'
  },
  attemptNumber: {
    type: Number,
    required: true,
    min: 1
  },
  attemptType: {
    type: String,
    enum: ['OFFICIAL', 'RETAKE'],
    required: true,
    index: true
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  submittedAt: {
    type: Date,
    default: null
  },
  timeTakenSeconds: {
    type: Number,
    default: 0
  },
  durationMinutes: {
    type: Number,
    required: true,
    min: 1
  },
  passThresholdPercent: {
    type: Number,
    default: 70
  },
  questionOrder: [{
    type: String
  }],
  optionOrders: {
    type: Map,
    of: [Number],
    default: () => new Map()
  },
  draftAnswers: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
  answers: [attemptAnswerSchema],
  obtainedMarks: {
    type: Number,
    default: 0
  },
  totalMarks: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  correctCount: {
    type: Number,
    default: 0
  },
  incorrectCount: {
    type: Number,
    default: 0
  },
  unansweredCount: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  resultStatus: {
    type: String,
    enum: ['PASS', 'FAIL', 'PENDING'],
    default: 'PENDING'
  },
  submissionStatus: {
    type: String,
    enum: ['in_progress', 'submitted', 'timed_out', 'expired'],
    default: 'in_progress',
    index: true
  }
}, {
  timestamps: true
});

// Prevent multiple simultaneous active attempts for the same learner & assessment
assessmentAttemptSchema.index(
  { learnerId: 1, assessmentId: 1 },
  {
    unique: true,
    partialFilterExpression: { submissionStatus: 'in_progress' }
  }
);

// Prevent duplicate attempt numbers under concurrent starts
assessmentAttemptSchema.index(
  { courseId: 1, assessmentId: 1, learnerId: 1, attemptNumber: 1 },
  { unique: true }
);

// Fast retake leaderboard queries
assessmentAttemptSchema.index({
  courseId: 1,
  assessmentId: 1,
  attemptType: 1,
  submissionStatus: 1,
  obtainedMarks: -1,
  submittedAt: 1
});

module.exports = mongoose.model('AssessmentAttempt', assessmentAttemptSchema, 'assessment_attempts');
