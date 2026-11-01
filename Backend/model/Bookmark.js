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
    enum: ['course', 'lesson', 'video', 'note'],
    default: 'course',
    required: true
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
  url: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to guarantee uniqueness per learner, course, and resource
bookmarkSchema.index(
  { learnerId: 1, courseId: 1, resourceId: 1, resourceType: 1 },
  { unique: true }
);

module.exports = mongoose.model('Bookmark', bookmarkSchema, 'bookmarks');

