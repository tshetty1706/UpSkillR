const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  fileUrl: { type: String, required: true },
  fileType: { type: String, default: 'PDF' },
  fileSize: { type: String, default: '1.0 MB' },
  originalName: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now }
});

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

const assessmentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  instructions: { type: String, default: '' },
  type: { type: String, default: 'Quiz' },
  totalMarks: { type: Number, default: 10 },
  passingMarks: { type: Number, default: 5 },
  timeLimit: { type: Number, default: 30 }, // in minutes
  attemptsAllowed: { type: Number, default: 1 },
  dueDate: { type: Date, default: null },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  questions: [questionSchema],
  createdAt: { type: Date, default: Date.now }
});

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  videoUrl: { type: String, default: '' },
  duration: { type: String, default: '10 min' },
  order: { type: Number, default: 1 },
  content: { type: String, default: '' },
  resources: [resourceSchema],
  assessments: [assessmentSchema]
});

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  order: { type: Number, default: 1 },
  lessons: [lessonSchema]
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
    default: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80'
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
  modules: [moduleSchema],
  lessons: [lessonSchema],
  resources: [resourceSchema],
  assessments: [assessmentSchema],
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
