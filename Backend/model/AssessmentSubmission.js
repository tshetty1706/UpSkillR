const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  questionText: { type: String, required: true },
  questionType: {
    type: String,
    enum: ['mcq', 'multiple_choice', 'multiple_response', 'true_false', 'short_answer', 'long_answer'],
    required: true
  },
  studentAnswer: { type: mongoose.Schema.Types.Mixed, default: '' },
  correctAnswer: { type: mongoose.Schema.Types.Mixed, default: '' },
  isCorrect: { type: Boolean, default: false },
  marksAwarded: { type: Number, default: 0 },
  maxMarks: { type: Number, default: 1 },
  feedback: { type: String, default: '' }
});

const gradeRecordSchema = new mongoose.Schema({
  score: { type: Number, required: true },
  maxScore: { type: Number, required: true },
  gradeResult: {
    type: String,
    enum: ['passed', 'failed', 'pending'],
    default: 'pending'
  },
  recordedBy: { type: String, default: 'Instructor' },
  recordedByRole: { type: String, default: 'instructor' },
  timestamp: { type: Date, default: Date.now },
  reason: { type: String, default: 'Initial grading' },
  feedback: { type: String, default: '' }
});

const assessmentSubmissionSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  assessmentTitle: {
    type: String,
    default: 'Assessment'
  },
  learnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Learner',
    required: true
  },
  learnerName: {
    type: String,
    required: true
  },
  learnerEmail: {
    type: String,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  attemptNumber: {
    type: Number,
    default: 1
  },
  timeTakenSeconds: {
    type: Number,
    default: 0
  },
  durationMinutes: {
    type: Number,
    default: 0
  },
  isFirstAttempt: {
    type: Boolean,
    default: false
  },
  isOfficial: {
    type: Boolean,
    default: false
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
  status: {
    type: String,
    enum: ['in_progress', 'submitted', 'graded', 'pending_review'],
    default: 'submitted'
  },
  totalScore: {
    type: Number,
    default: 0
  },
  maxScore: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  gradeResult: {
    type: String,
    enum: ['passed', 'failed', 'pending'],
    default: 'pending'
  },
  generalFeedback: {
    type: String,
    default: ''
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  cooldownUntil: {
    type: Date,
    default: null
  },
  extraAttemptsGranted: {
    type: Number,
    default: 0
  },
  manuallyMarkedComplete: {
    type: Boolean,
    default: false
  },
  appealStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none'
  },
  appealMessage: {
    type: String,
    default: ''
  },
  appealedAt: {
    type: Date,
    default: null
  },
  auditLog: [
    {
      action: { type: String, required: true },
      performedBy: { type: String, default: 'Instructor' },
      performedByRole: { type: String, default: 'instructor' },
      reason: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ],
  answers: [answerSchema],
  gradeRecords: [gradeRecordSchema]
});

module.exports = mongoose.model('AssessmentSubmission', assessmentSubmissionSchema, 'assessment_submissions');
