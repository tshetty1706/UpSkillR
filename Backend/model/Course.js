const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['mcq', 'true_false', 'short_answer', 'long_answer'],
    default: 'mcq'
  },
  options: [{ type: String }],
  correctAnswer: { type: mongoose.Schema.Types.Mixed, default: '' },
  correctAnswerIndex: { type: Number, default: 0 },
  marks: { type: Number, default: 1 },
  evaluationInstructions: { type: String, default: '' },
  order: { type: Number, default: 1 }
});

const notesSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  scope: { type: String, enum: ['course', 'module', 'lesson'], default: 'course' },
  moduleId: { type: mongoose.Schema.Types.ObjectId, default: null },
  lessonId: { type: mongoose.Schema.Types.ObjectId, default: null },
  type: { type: String, default: 'article' },
  noteType: { type: String, default: 'article' },
  content: { type: String, default: '' },
  markdownContent: { type: String, default: '' },
  mediaUrl: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  cloudinaryPublicId: { type: String, default: '' },
  fileType: { type: String, default: 'md' },
  fileSize: { type: String, default: '' },
  state: { type: String, enum: ['draft', 'published'], default: 'draft' },
  effective_visible: { type: Boolean, default: false },
  sortKey: { type: String, default: 'a0' },
  uploadedAt: { type: Date, default: Date.now }
});

const contentItemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  type: { type: String, required: true, lowercase: true, enum: ['video', 'quiz', 'Video', 'Quiz'] },
  state: { type: String, enum: ['draft', 'published'], default: 'draft' },
  effective_visible: { type: Boolean, default: false },
  sortKey: { type: String, default: 'a0' },
  version: { type: Number, default: 1 },
  role: { type: String, enum: ['lesson_check', 'practice'], default: 'lesson_check' },
  video: {
    muxAssetId: { type: String, default: '' },
    muxPlaybackId: { type: String, default: '' },
    duration: { type: Number, default: 0 },
    watchedThresholdPercent: { type: Number, default: 90 },
    allowScrubAhead: { type: Boolean, default: true },
    status: { type: String, default: 'ready' }
  },
  quiz: {
    instructions: { type: String, default: '' },
    passThresholdPercent: { type: Number, default: 70 },
    maxAttempts: { type: Number, default: 3 },
    cooldownHours: { type: Number, default: 6 },
    role: { type: String, enum: ['lesson_check', 'practice'], default: 'lesson_check' },
    questions: [questionSchema]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const courseAssessmentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  instructions: { type: String, default: '' },
  state: { type: String, enum: ['draft', 'published'], default: 'draft' },
  effective_visible: { type: Boolean, default: false },
  sortKey: { type: String, default: 'a0' },
  version: { type: Number, default: 1 },
  requiredModuleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],
  passThresholdPercent: { type: Number, default: 70 },
  maxAttempts: { type: Number, default: 3 },
  cooldownHours: { type: Number, default: 6 },
  countsTowardCertificate: { type: Boolean, default: true },
  questions: [questionSchema],
  totalMarks: { type: Number, default: 10 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  state: { type: String, enum: ['draft', 'published'], default: 'draft' },
  effective_visible: { type: Boolean, default: false },
  sortKey: { type: String, default: 'a0' },
  require_all_items: { type: Boolean, default: true },
  items: [contentItemSchema],
  notes: [notesSchema],
  order: { type: Number, default: 1 }
});

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  state: { type: String, enum: ['draft', 'published'], default: 'draft' },
  effective_visible: { type: Boolean, default: false },
  release_at: { type: Date, default: null },
  sortKey: { type: String, default: 'a0' },
  lessons: [lessonSchema],
  notes: [notesSchema],
  order: { type: Number, default: 1 }
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true
  },
  shortDescription: {
    type: String,
    default: '',
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  fullDescription: {
    type: String,
    default: '',
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  skillLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
    default: 'Beginner'
  },
  language: {
    type: String,
    default: 'English',
    trim: true
  },
  overviewViews: {
    type: Number,
    default: 0
  },
  tags: {
    type: [String],
    default: []
  },
  prerequisites: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  certificate: {
    type: Boolean,
    default: true
  },
  whatYouWillLearn: {
    type: [String],
    default: []
  },
  techStack: {
    type: [String],
    default: []
  },
  thumbnail: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    default: 0
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor',
    required: true
  },
  instructorName: {
    type: String,
    default: 'UpSkillr Instructor'
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  state: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  effective_visible: {
    type: Boolean,
    default: false
  },
  thumbnail_public_id: {
    type: String,
    default: ''
  },
  modules: [moduleSchema],
  courseAssessments: [courseAssessmentSchema],
  notes: [notesSchema],
  skills: {
    type: [String],
    default: []
  },
  rating: {
    type: Number,
    default: null
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Auto update updatedAt timestamp before save
courseSchema.pre('save', async function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Course', courseSchema, 'courses');
