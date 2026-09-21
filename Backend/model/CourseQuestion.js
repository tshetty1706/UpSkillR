const mongoose = require('mongoose');

const courseQuestionSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Learner',
    required: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  userAvatar: {
    type: String,
    default: ''
  },
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'answered'],
    default: 'pending',
    index: true
  },
  instructorReply: {
    type: String,
    default: null,
    trim: true
  },
  replyTimestamp: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CourseQuestion', courseQuestionSchema, 'course_questions');
