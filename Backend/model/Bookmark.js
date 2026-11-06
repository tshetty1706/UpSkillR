const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  learnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Learner',
    required: true,
    index: true
  },
  resourceType: {
    type: String,
    enum: ['course', 'lesson', 'video', 'article', 'note', 'quiz'],
    default: 'course',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  resourceId: {
    type: String,
    default: null
  },
  moduleId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  moduleTitle: {
    type: String,
    default: '',
    trim: true
  },
  lessonId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  lessonTitle: {
    type: String,
    default: '',
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  courseTitle: {
    type: String,
    default: '',
    trim: true
  },
  courseThumbnail: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'General'
  },
  contentPreview: {
    type: String,
    default: '',
    trim: true
  },
  duration: {
    type: String,
    default: ''
  },
  totalMarks: {
    type: Number,
    default: null
  },
  totalQuestions: {
    type: Number,
    default: null
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BookmarkFolder',
    default: null,
    index: true
  },
  url: {
    type: String,
    default: ''
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

// Compound index to guarantee uniqueness per learner, course, resource, and type
bookmarkSchema.index(
  { learnerId: 1, courseId: 1, resourceId: 1, resourceType: 1 },
  { unique: true }
);

module.exports = mongoose.model('Bookmark', bookmarkSchema, 'bookmarks');
