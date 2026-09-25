const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Learner',
      required: [true, 'Recipient ID is required'],
      index: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true
    },
    courseTitle: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['NEW_MODULE', 'NEW_LESSON', 'COURSE_UPDATE'],
      default: 'NEW_LESSON'
    },
    moduleTitle: {
      type: String,
      default: '',
      trim: true
    },
    lessonTitle: {
      type: String,
      default: '',
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast queries of a learner's unread notifications
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema, 'notifications');
