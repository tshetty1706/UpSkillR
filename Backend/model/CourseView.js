const mongoose = require('mongoose');

const courseViewSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  viewerHash: {
    type: String,
    required: true,
    index: true
  },
  viewedAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Automatically expire document after 24 hours (86400 seconds)
  }
});

// Composite index to quickly check if viewer viewed this course within 24h
courseViewSchema.index({ courseId: 1, viewerHash: 1 }, { unique: true });

module.exports = mongoose.model('CourseView', courseViewSchema, 'course_views');
