const mongoose = require('mongoose');

const optionalLinkSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ['linkedin', 'github', 'website', 'twitter', 'portfolio', 'other'],
      default: 'website'
    },
    url: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const courseOverviewSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    unique: true,
    index: true
  },
  fullDescription: {
    type: String,
    required: [true, 'Full course description is required'],
    trim: true
  },
  prerequisites: {
    type: [String],
    default: []
  },
  learningOutcomes: {
    type: [String],
    default: [] // "What You'll Learn"
  },
  skills: {
    type: [String],
    default: [] // "Skills You'll Gain"
  },
  techStack: {
    type: [String],
    default: [] // "Tech Stack / Tools"
  },
  targetAudience: {
    type: [String],
    default: []
  },
  benefits: {
    type: [String],
    default: []
  },
  certificate: {
    type: Boolean,
    default: true
  },
  instructorMessage: {
    type: String,
    default: '',
    trim: true
  },
  optionalLinks: [optionalLinkSchema],
  faqs: [faqSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

courseOverviewSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('CourseOverview', courseOverviewSchema, 'course_overviews');
