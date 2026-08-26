const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  videoUrl: { type: String, default: '' },
  duration: { type: String, default: '10 min' },
  order: { type: Number, default: 1 },
  content: { type: String, default: '' }
});

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String, default: 'Document' },
  fileSize: { type: String, default: '1.2 MB' }
});

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswerIndex: { type: Number, default: 0 }
});

const assessmentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  instructions: { type: String, default: '' },
  passingScore: { type: Number, default: 70 },
  questions: [questionSchema]
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
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
  lessons: [lessonSchema],
  resources: [resourceSchema],
  assessments: [assessmentSchema],
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
courseSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Course', courseSchema, 'courses');
