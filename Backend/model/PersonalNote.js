const mongoose = require('mongoose');

const personalNoteSchema = new mongoose.Schema({
  learnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Learner',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Note title is required'],
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: [true, 'Note content is required']
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null,
    index: true
  },
  courseTitle: {
    type: String,
    default: '',
    trim: true
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

// Index for fast search across title and content
personalNoteSchema.index({ learnerId: 1, title: 'text', content: 'text' });

module.exports = mongoose.model('PersonalNote', personalNoteSchema, 'personal_notes');
