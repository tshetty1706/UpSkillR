const mongoose = require('mongoose');

const bookmarkFolderSchema = new mongoose.Schema({
  learnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Learner',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Folder name is required'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: 300
  },
  color: {
    type: String,
    default: '#10b981'
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

// Ensure a user cannot create duplicate folder names
bookmarkFolderSchema.index({ learnerId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('BookmarkFolder', bookmarkFolderSchema, 'bookmark_folders');
