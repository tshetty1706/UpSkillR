const mongoose = require('mongoose');

const instructorSchema = new mongoose.Schema({
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
    default: 'instructor',
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
  designation: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  keySkills: {
    type: [String],
    default: []
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
  otpPurpose: {
    type: String,
    enum: ['signup', 'login', null],
    default: null
  },
  otpAttempts: {
    type: Number,
    default: 0
  },
  otpChallengeId: {
    type: String,
    default: null
  },
  otpResendCooldownUntil: {
    type: Date,
    default: null
  },
  resetPasswordOtp: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  resetPasswordAttempts: {
    type: Number,
    default: 0
  },
  resetPasswordCooldown: {
    type: Date,
    default: null
  },
  passwordChangedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Instructor', instructorSchema, 'instructors');
