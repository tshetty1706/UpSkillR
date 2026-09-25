const mongoose = require('mongoose');

const courseReviewSchema = new mongoose.Schema(
  {
    learnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Learner',
      required: [true, 'Learner ID is required'],
      index: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    feedback: {
      type: String,
      required: [true, 'Feedback text is required'],
      trim: true,
      minlength: [3, 'Feedback must be at least 3 characters'],
      maxlength: [1000, 'Feedback cannot exceed 1000 characters']
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ]
  },
  {
    timestamps: true
  }
);

// Compound unique index to guarantee one review per learner per course
courseReviewSchema.index({ learnerId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('CourseReview', courseReviewSchema, 'course_reviews');
