const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  questionText: { type: String, required: true },
  questionType: {
    type: String,
    enum: ['mcq', 'true_false', 'short_answer', 'long_answer'],
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
    required: true
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
  attemptNumber: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['submitted', 'graded', 'pending_review'],
    default: 'pending_review'
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
  answers: [answerSchema],
  gradeRecords: [gradeRecordSchema]
});

module.exports = mongoose.model('AssessmentSubmission', assessmentSubmissionSchema, 'assessment_submissions');
