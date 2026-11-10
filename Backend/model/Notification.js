const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Recipient ID is required'],
      index: true
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
      enum: [
        'NEW_MODULE',
        'NEW_LESSON',
        'COURSE_UPDATE',
        'BADGE_UNLOCKED',
        'QUESTION_REPLY',
        'COURSE_QUESTION',
        'NEW_QUESTION',
        'NEW_REVIEW',
        'COURSE_REVIEW',
        'NEW_ASSESSMENT',
        'ASSESSMENT_ADDED',
        'ASSESSMENT_GRADED',
        'NEW_ANNOUNCEMENT',
        'COURSE_NOTICE',
        'COURSE_ANNOUNCEMENT'
      ],
      default: 'NEW_LESSON'
    },
    section: {
      type: String,
      enum: ['curriculum', 'reviews', 'qa', 'assessments', 'notices', 'badge', 'general'],
      default: 'general',
      index: true
    },
    referenceId: {
      type: String,
      default: null,
      index: true
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseQuestion',
      default: null
    },
    instructorName: {
      type: String,
      default: '',
      trim: true
    },
    link: {
      type: String,
      default: '',
      trim: true
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
notificationSchema.index({ recipientId: 1, courseId: 1, section: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema, 'notifications');
