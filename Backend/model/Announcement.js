const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instructor',
      required: [true, 'Instructor ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    message: {
      type: String,
      required: [true, 'Announcement message is required'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters']
    },
    targetAudience: {
      type: String,
      enum: ['current', 'completed', 'all'],
      required: [true, 'Target audience is required'],
      default: 'all'
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true
    },
    publishedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index to quickly fetch course announcements sorted by creation
announcementSchema.index({ courseId: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema, 'announcements');
