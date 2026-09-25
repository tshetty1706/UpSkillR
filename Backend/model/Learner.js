const mongoose = require('mongoose');

const learnerSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function () {
      return this.authProvider === 'local';
    }
  },
  role: {
    type: String,
    default: 'learner',
    immutable: true
  },
  authProvider: {
    type: String,
    enum: ['local', 'google', 'github'],
    default: 'local'
  },
  googleId: {
    type: String,
    default: null
  },
  githubId: {
    type: String,
    default: null
  },
  avatar: {
    type: String,
    default: ''
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  bio: {
    type: String,
    default: '',
    trim: true,
    maxLength: 300
  },
  learningGoal: {
    type: String,
    default: '',
    trim: true
  },
  learningInterests: [{
    type: String
  }],
  socialLinks: {
    github: {
      type: String,
      default: '',
      trim: true
    },
    linkedin: {
      type: String,
      default: '',
      trim: true
    },
    leetcode: {
      type: String,
      default: '',
      trim: true
    },
    instagram: {
      type: String,
      default: '',
      trim: true
    },
    facebook: {
      type: String,
      default: '',
      trim: true
    },
    codeforces: {
      type: String,
      default: '',
      trim: true
    },
    geeksforgeeks: {
      type: String,
      default: '',
      trim: true
    },
    hackerrank: {
      type: String,
      default: '',
      trim: true
    }
  },
  education: [
    {
      institution: { type: String, required: true, trim: true },
      degree: { type: String, required: true, trim: true },
      fieldOfStudy: { type: String, default: '', trim: true },
      startDate: { type: String, default: '', trim: true },
      endDate: { type: String, default: '', trim: true },
      current: { type: Boolean, default: false },
      description: { type: String, default: '', trim: true }
    }
  ],
  experience: [
    {
      role: { type: String, required: true, trim: true },
      company: { type: String, required: true, trim: true },
      employmentType: { type: String, default: '', trim: true },
      startDate: { type: String, default: '', trim: true },
      endDate: { type: String, default: '', trim: true },
      current: { type: Boolean, default: false },
      location: { type: String, default: '', trim: true },
      description: { type: String, default: '', trim: true }
    }
  ],
  points: {
    type: Number,
    default: 0
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastCheckInDate: {
    type: Date,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationOtp: {
    type: String,
    default: null
  },
  otpExpiresAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Learner', learnerSchema, 'learners');
