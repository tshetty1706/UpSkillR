const { Learner } = require('../model/User');
const Enrolment = require('../model/Enrolment');
const PointTransaction = require('../model/PointTransaction');

// Helper to format date string YYYY-MM-DD
const getDateString = (date = new Date()) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Helper to check if two dates are consecutive days
const isConsecutiveDay = (lastDate, currentDate = new Date()) => {
  if (!lastDate) return false;
  const last = new Date(lastDate);
  const current = new Date(currentDate);

  last.setUTCHours(0, 0, 0, 0);
  current.setUTCHours(0, 0, 0, 0);

  const diffTime = current.getTime() - last.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
  return diffDays === 1;
};

// Helper to check if two dates are the same calendar day
const isSameDay = (d1, d2 = new Date()) => {
  if (!d1 || !d2) return false;
  return getDateString(d1) === getDateString(d2);
};

// 1. Get Learner Profile & Read-Only Learning Stats
exports.getLearnerProfileAndStats = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const learner = await Learner.findById(learnerId).select('-password');
    if (!learner) {
      return res.status(404).json({ success: false, message: 'Learner not found' });
    }

    // Calculate enrollments and completions
    const enrolments = await Enrolment.find({ learnerId });
    const coursesEnrolled = enrolments.length;
    const coursesCompleted = enrolments.filter(e => e.status === 'completed' || e.progressPercentage === 100).length;
    const modulesCompleted = enrolments.reduce((sum, e) => sum + (e.completedLessons ? e.completedLessons.length : 0), 0);

    const checkedInToday = isSameDay(learner.lastCheckInDate);

    return res.status(200).json({
      success: true,
      user: {
        id: learner._id,
        _id: learner._id,
        fullName: learner.fullName,
        email: learner.email,
        username: learner.username || '',
        avatar: learner.avatar || '',
        bio: learner.bio || '',
        learningGoal: learner.learningGoal || '',
        learningInterests: learner.learningInterests || [],
        socialLinks: {
          github: learner.socialLinks?.github || '',
          linkedin: learner.socialLinks?.linkedin || '',
          leetcode: learner.socialLinks?.leetcode || ''
        },
        points: learner.points || 0,
        currentStreak: learner.currentStreak || 0,
        longestStreak: learner.longestStreak || 0,
        lastCheckInDate: learner.lastCheckInDate
      },
      stats: {
        totalPoints: learner.points || 0,
        currentStreak: learner.currentStreak || 0,
        longestStreak: learner.longestStreak || 0,
        coursesEnrolled,
        coursesCompleted,
        modulesCompleted,
        checkedInToday
      }
    });
  } catch (error) {
    console.error('Error fetching learner profile and stats:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching learner stats' });
  }
};

// 2. Check Username Availability
exports.checkUsernameAvailability = async (req, res) => {
  try {
    const rawUsername = req.query.username || '';
    const cleanUsername = rawUsername.replace(/^@/, '').trim().toLowerCase();

    if (!cleanUsername) {
      return res.status(400).json({ success: false, available: false, message: 'Username is required' });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.'
      });
    }

    const existing = await Learner.findOne({
      username: cleanUsername,
      _id: { $ne: req.user.id }
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        available: false,
        message: 'Username is already taken by another learner.'
      });
    }

    return res.status(200).json({
      success: true,
      available: true,
      username: cleanUsername,
      message: 'Username is available!'
    });
  } catch (error) {
    console.error('Check username error:', error);
    return res.status(500).json({ success: false, message: 'Server error while checking username' });
  }
};

// 3. Update Username
exports.updateUsername = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const rawUsername = req.body.username || '';
    const cleanUsername = rawUsername.replace(/^@/, '').trim().toLowerCase();

    if (!cleanUsername) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.'
      });
    }

    const existing = await Learner.findOne({
      username: cleanUsername,
      _id: { $ne: learnerId }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }

    const learner = await Learner.findById(learnerId);
    if (!learner) {
      return res.status(404).json({ success: false, message: 'Learner not found' });
    }

    learner.username = cleanUsername;
    await learner.save();

    return res.status(200).json({
      success: true,
      message: 'Username updated successfully!',
      username: cleanUsername,
      user: learner
    });
  } catch (error) {
    console.error('Update username error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }
    return res.status(500).json({ success: false, message: 'Failed to update username' });
  }
};

// 4. Update Profile Details (Bio, Learning Goal, Interests, Full Name, Username)
exports.updateLearnerProfile = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { fullName, bio, learningGoal, learningInterests, username, socialLinks } = req.body;

    const learner = await Learner.findById(learnerId);
    if (!learner) {
      return res.status(404).json({ success: false, message: 'Learner not found' });
    }

    if (fullName && fullName.trim()) {
      learner.fullName = fullName.trim();
    }

    if (username !== undefined && username !== null) {
      const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
      if (cleanUsername) {
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
          return res.status(400).json({
            success: false,
            message: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.'
          });
        }
        const existing = await Learner.findOne({ username: cleanUsername, _id: { $ne: learnerId } });
        if (existing) {
          return res.status(400).json({ success: false, message: 'Username is already taken.' });
        }
        learner.username = cleanUsername;
      }
    }

    if (bio !== undefined) {
      learner.bio = bio.trim().slice(0, 300);
    }

    if (learningGoal !== undefined) {
      learner.learningGoal = learningGoal.trim();
    }

    if (Array.isArray(learningInterests)) {
      learner.learningInterests = learningInterests.map(i => i.trim()).filter(Boolean);
    }

    // Process Social / Developer Profile Links
    if (socialLinks !== undefined && socialLinks !== null) {
      if (!learner.socialLinks) {
        learner.socialLinks = { github: '', linkedin: '', leetcode: '' };
      }

      if (socialLinks.github !== undefined) {
        const val = typeof socialLinks.github === 'string' ? socialLinks.github.trim() : '';
        if (val) {
          if (!/^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/?$/.test(val)) {
            return res.status(400).json({
              success: false,
              message: 'Please enter a valid GitHub profile URL.'
            });
          }
          learner.socialLinks.github = val;
        } else {
          learner.socialLinks.github = '';
        }
      }

      if (socialLinks.linkedin !== undefined) {
        const val = typeof socialLinks.linkedin === 'string' ? socialLinks.linkedin.trim() : '';
        if (val) {
          if (!/^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9_.-]+\/?$/.test(val)) {
            return res.status(400).json({
              success: false,
              message: 'Please enter a valid LinkedIn profile URL.'
            });
          }
          learner.socialLinks.linkedin = val;
        } else {
          learner.socialLinks.linkedin = '';
        }
      }

      if (socialLinks.leetcode !== undefined) {
        const val = typeof socialLinks.leetcode === 'string' ? socialLinks.leetcode.trim() : '';
        if (val) {
          if (!/^https:\/\/(www\.)?leetcode\.com\/u\/[A-Za-z0-9_.-]+\/?$/.test(val)) {
            return res.status(400).json({
              success: false,
              message: 'Please enter a valid LeetCode profile URL.'
            });
          }
          learner.socialLinks.leetcode = val;
        } else {
          learner.socialLinks.leetcode = '';
        }
      }
    }

    await learner.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: learner._id,
        _id: learner._id,
        fullName: learner.fullName,
        email: learner.email,
        username: learner.username || '',
        avatar: learner.avatar || '',
        bio: learner.bio || '',
        learningGoal: learner.learningGoal || '',
        learningInterests: learner.learningInterests || [],
        socialLinks: {
          github: learner.socialLinks?.github || '',
          linkedin: learner.socialLinks?.linkedin || '',
          leetcode: learner.socialLinks?.leetcode || ''
        },
        points: learner.points || 0,
        currentStreak: learner.currentStreak || 0,
        longestStreak: learner.longestStreak || 0,
        lastCheckInDate: learner.lastCheckInDate
      }
    });
  } catch (error) {
    console.error('Update learner profile error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }
    return res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

// 5. Daily Check-in Logic
exports.performDailyCheckin = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const learner = await Learner.findById(learnerId);
    if (!learner) {
      return res.status(404).json({ success: false, message: 'Learner not found' });
    }

    // Check if already checked in today
    if (isSameDay(learner.lastCheckInDate)) {
      return res.status(200).json({
        success: true,
        message: 'Already checked in today!',
        checkedInToday: true,
        points: learner.points || 0,
        currentStreak: learner.currentStreak || 0,
        longestStreak: learner.longestStreak || 0
      });
    }

    // Calculate streak
    const isConsecutive = isConsecutiveDay(learner.lastCheckInDate);
    if (isConsecutive) {
      learner.currentStreak = (learner.currentStreak || 0) + 1;
    } else {
      learner.currentStreak = 1;
    }

    learner.longestStreak = Math.max(learner.longestStreak || 0, learner.currentStreak);
    learner.lastCheckInDate = new Date();
    learner.points = (learner.points || 0) + 1;

    await learner.save();

    // Log transaction (duplicate safe)
    const todayStr = getDateString();
    try {
      await PointTransaction.create({
        learnerId,
        points: 1,
        type: 'DAILY_CHECKIN',
        referenceId: `checkin_${todayStr}`,
        description: 'Daily Check-in (+1 point)'
      });
    } catch (e) {
      // Ignore duplicate transaction error if concurrency happens
    }

    return res.status(200).json({
      success: true,
      message: '🎉 Check-in successful! +1 point awarded.',
      checkedInToday: true,
      points: learner.points,
      currentStreak: learner.currentStreak,
      longestStreak: learner.longestStreak
    });
  } catch (error) {
    console.error('Daily check-in error:', error);
    return res.status(500).json({ success: false, message: 'Server error performing check-in' });
  }
};

// 6. Get Points & Streak
exports.getPoints = async (req, res) => {
  try {
    const learner = await Learner.findById(req.user.id).select('points currentStreak longestStreak lastCheckInDate');
    if (!learner) {
      return res.status(404).json({ success: false, message: 'Learner not found' });
    }

    return res.status(200).json({
      success: true,
      points: learner.points || 0,
      currentStreak: learner.currentStreak || 0,
      longestStreak: learner.longestStreak || 0,
      checkedInToday: isSameDay(learner.lastCheckInDate)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch points' });
  }
};

// 7. Get Point History
exports.getPointHistory = async (req, res) => {
  try {
    const transactions = await PointTransaction.find({ learnerId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      transactions: transactions.map(t => ({
        _id: t._id,
        points: t.points,
        type: t.type,
        referenceId: t.referenceId,
        description: t.description,
        createdAt: t.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching point history:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch point history' });
  }
};
