const { Learner } = require('../model/User');
const Enrolment = require('../model/Enrolment');
const PointTransaction = require('../model/PointTransaction');
const CourseReview = require('../model/CourseReview');

// ─── Platform URL validation regexes ───
const PLATFORM_REGEXES = {
  github: /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/?$/,
  linkedin: /^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9_.-]+\/?$/,
  leetcode: /^https:\/\/(www\.)?leetcode\.com\/u\/[A-Za-z0-9_.-]+\/?$/,
  instagram: /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.-]+\/?$/,
  facebook: /^https:\/\/(www\.)?facebook\.com\/[A-Za-z0-9_.-]+\/?$/,
  codeforces: /^https:\/\/(www\.)?codeforces\.com\/profile\/[A-Za-z0-9_.-]+\/?$/,
  geeksforgeeks: /^https:\/\/(www\.)?geeksforgeeks\.org\/user\/[A-Za-z0-9_.-]+\/?$/,
  hackerrank: /^https:\/\/(www\.)?hackerrank\.com\/profile\/[A-Za-z0-9_.-]+\/?$/
};

const PLATFORM_LABELS = {
  github: 'GitHub', linkedin: 'LinkedIn', leetcode: 'LeetCode',
  instagram: 'Instagram', facebook: 'Facebook', codeforces: 'Codeforces',
  geeksforgeeks: 'GeeksforGeeks', hackerrank: 'HackerRank'
};

// ─── Helper: YYYY-MM-DD date string ───
const getDateString = (date = new Date()) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// ─── Helper: build full social links object from learner doc ───
const buildSocialLinks = (learner) => ({
  github: learner.socialLinks?.github || '',
  linkedin: learner.socialLinks?.linkedin || '',
  leetcode: learner.socialLinks?.leetcode || '',
  instagram: learner.socialLinks?.instagram || '',
  facebook: learner.socialLinks?.facebook || '',
  codeforces: learner.socialLinks?.codeforces || '',
  geeksforgeeks: learner.socialLinks?.geeksforgeeks || '',
  hackerrank: learner.socialLinks?.hackerrank || ''
});

// ─── Helper: are two dates consecutive calendar days ───
const isConsecutiveDay = (lastDate, currentDate = new Date()) => {
  if (!lastDate) return false;
  const last = new Date(lastDate);
  const current = new Date(currentDate);
  last.setUTCHours(0, 0, 0, 0);
  current.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.round((current.getTime() - last.getTime()) / (1000 * 3600 * 24));
  return diffDays === 1;
};

// ─── Helper: are two dates the same calendar day ───
const isSameDay = (d1, d2 = new Date()) => {
  if (!d1 || !d2) return false;
  return getDateString(d1) === getDateString(d2);
};

// ─── Helper: process daily login streak (+1 point) ───
const processDailyLoginStreak = async (learner) => {
  if (!learner || learner.role !== 'learner') return learner;
  if (isSameDay(learner.lastCheckInDate)) return learner;

  const isConsecutive = isConsecutiveDay(learner.lastCheckInDate);
  learner.currentStreak = isConsecutive ? (learner.currentStreak || 0) + 1 : 1;
  learner.longestStreak = Math.max(learner.longestStreak || 0, learner.currentStreak);
  learner.lastCheckInDate = new Date();
  learner.points = (learner.points || 0) + 1;
  await learner.save();

  const todayStr = getDateString();
  try {
    await PointTransaction.create({
      learnerId: learner._id,
      points: 1,
      type: 'DAILY_CHECKIN',
      referenceId: `checkin_${todayStr}`,
      description: 'Daily Login (+1 point)'
    });
  } catch (e) {
    // Duplicate safe — compound unique index guards this
  }
  return learner;
};
exports.processDailyLoginStreak = processDailyLoginStreak;

// ─── 1. GET /api/learners/me — Profile + Stats ───
exports.getLearnerProfileAndStats = async (req, res) => {
  try {
    const learnerId = req.user.id;
    let learner = await Learner.findById(learnerId).select('-password');
    if (!learner) return res.status(404).json({ success: false, message: 'Learner not found' });

    await processDailyLoginStreak(learner);

    const enrolments = await Enrolment.find({ learnerId });
    const coursesEnrolled = enrolments.length;
    const coursesCompleted = enrolments.filter(
      e => e.status === 'completed' || e.progressPercentage === 100
    ).length;
    const modulesCompleted = enrolments.reduce(
      (sum, e) => sum + (e.completedLessons ? e.completedLessons.length : 0), 0
    );
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
        socialLinks: buildSocialLinks(learner),
        education: learner.education || [],
        experience: learner.experience || [],
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

// ─── 2. Check Username Availability ───
exports.checkUsernameAvailability = async (req, res) => {
  try {
    const rawUsername = req.query.username || '';
    const cleanUsername = rawUsername.replace(/^@/, '').trim().toLowerCase();
    if (!cleanUsername) {
      return res.status(400).json({ success: false, available: false, message: 'Username is required' });
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false, available: false,
        message: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.'
      });
    }
    const existing = await Learner.findOne({ username: cleanUsername, _id: { $ne: req.user.id } });
    if (existing) {
      return res.status(200).json({ success: true, available: false, message: 'Username is already taken by another learner.' });
    }
    return res.status(200).json({ success: true, available: true, username: cleanUsername, message: 'Username is available!' });
  } catch (error) {
    console.error('Check username error:', error);
    return res.status(500).json({ success: false, message: 'Server error while checking username' });
  }
};

// ─── 3. Update Username ───
exports.updateUsername = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const rawUsername = req.body.username || '';
    const cleanUsername = rawUsername.replace(/^@/, '').trim().toLowerCase();
    if (!cleanUsername) return res.status(400).json({ success: false, message: 'Username is required' });
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.'
      });
    }
    const existing = await Learner.findOne({ username: cleanUsername, _id: { $ne: learnerId } });
    if (existing) return res.status(400).json({ success: false, message: 'Username is already taken.' });

    const learner = await Learner.findById(learnerId);
    if (!learner) return res.status(404).json({ success: false, message: 'Learner not found' });

    learner.username = cleanUsername;
    await learner.save();

    return res.status(200).json({
      success: true, message: 'Username updated successfully!', username: cleanUsername, user: learner
    });
  } catch (error) {
    console.error('Update username error:', error);
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Username is already taken.' });
    return res.status(500).json({ success: false, message: 'Failed to update username' });
  }
};

// ─── 4. PATCH /api/learners/me — Update Profile (bio, goal, interests, education, experience, socialLinks) ───
exports.updateLearnerProfile = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { fullName, bio, learningGoal, learningInterests, username, socialLinks, education, experience } = req.body;

    const learner = await Learner.findById(learnerId);
    if (!learner) return res.status(404).json({ success: false, message: 'Learner not found' });

    // ─── Basic fields ───
    if (fullName && fullName.trim()) learner.fullName = fullName.trim();

    if (username !== undefined && username !== null) {
      const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
      if (cleanUsername) {
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
          return res.status(400).json({ success: false, message: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.' });
        }
        const existing = await Learner.findOne({ username: cleanUsername, _id: { $ne: learnerId } });
        if (existing) return res.status(400).json({ success: false, message: 'Username is already taken.' });
        learner.username = cleanUsername;
      }
    }

    if (bio !== undefined) learner.bio = bio.trim().slice(0, 300);
    if (learningGoal !== undefined) learner.learningGoal = learningGoal.trim();
    if (Array.isArray(learningInterests)) {
      learner.learningInterests = learningInterests.map(i => i.trim()).filter(Boolean);
    }

    // ─── Social / Developer Profile Links (all 8 platforms) ───
    if (socialLinks !== undefined && socialLinks !== null) {
      if (!learner.socialLinks) learner.socialLinks = {};
      for (const platform of Object.keys(PLATFORM_REGEXES)) {
        if (socialLinks[platform] !== undefined) {
          const val = typeof socialLinks[platform] === 'string' ? socialLinks[platform].trim() : '';
          if (val) {
            if (!PLATFORM_REGEXES[platform].test(val)) {
              return res.status(400).json({
                success: false,
                message: `Please enter a valid ${PLATFORM_LABELS[platform]} profile URL.`
              });
            }
            learner.socialLinks[platform] = val;
          } else {
            learner.socialLinks[platform] = '';
          }
        }
      }
    }

    // ─── Education ───
    if (education !== undefined) {
      if (!Array.isArray(education)) {
        return res.status(400).json({ success: false, message: 'Education must be an array.' });
      }
      learner.education = education
        .map(edu => ({
          institution: (edu.institution || '').trim(),
          degree: (edu.degree || '').trim(),
          fieldOfStudy: (edu.fieldOfStudy || '').trim(),
          startDate: (edu.startDate || '').trim(),
          endDate: edu.current ? '' : (edu.endDate || '').trim(),
          current: Boolean(edu.current),
          description: (edu.description || '').trim().slice(0, 500)
        }))
        .filter(edu => edu.institution && edu.degree);
    }

    // ─── Experience ───
    if (experience !== undefined) {
      if (!Array.isArray(experience)) {
        return res.status(400).json({ success: false, message: 'Experience must be an array.' });
      }
      learner.experience = experience
        .map(exp => ({
          role: (exp.role || '').trim(),
          company: (exp.company || '').trim(),
          employmentType: (exp.employmentType || '').trim(),
          startDate: (exp.startDate || '').trim(),
          endDate: exp.current ? '' : (exp.endDate || '').trim(),
          current: Boolean(exp.current),
          location: (exp.location || '').trim(),
          description: (exp.description || '').trim().slice(0, 500)
        }))
        .filter(exp => exp.role && exp.company);
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
        socialLinks: buildSocialLinks(learner),
        education: learner.education || [],
        experience: learner.experience || [],
        points: learner.points || 0,
        currentStreak: learner.currentStreak || 0,
        longestStreak: learner.longestStreak || 0,
        lastCheckInDate: learner.lastCheckInDate
      }
    });
  } catch (error) {
    console.error('Update learner profile error:', error);
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Username is already taken.' });
    return res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

// ─── 5. Daily Check-in / Login Streak ───
exports.performDailyCheckin = async (req, res) => {
  try {
    const learnerId = req.user.id;
    let learner = await Learner.findById(learnerId);
    if (!learner) return res.status(404).json({ success: false, message: 'Learner not found' });

    const alreadyDone = isSameDay(learner.lastCheckInDate);
    if (!alreadyDone) await processDailyLoginStreak(learner);

    return res.status(200).json({
      success: true,
      message: alreadyDone ? 'Already recorded today!' : '🎉 Daily login streak +1 point awarded!',
      checkedInToday: true,
      points: learner.points || 0,
      currentStreak: learner.currentStreak || 0,
      longestStreak: learner.longestStreak || 0
    });
  } catch (error) {
    console.error('Daily check-in error:', error);
    return res.status(500).json({ success: false, message: 'Server error performing check-in' });
  }
};

// ─── 6. Get Points & Streak ───
exports.getPoints = async (req, res) => {
  try {
    const learner = await Learner.findById(req.user.id).select('points currentStreak longestStreak lastCheckInDate');
    if (!learner) return res.status(404).json({ success: false, message: 'Learner not found' });
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

// ─── 7. Get Point History ───
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

// ─── 8. GET /api/learners/me/reviews — Learner's own reviews ───
exports.getLearnerReviews = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const reviews = await CourseReview.find({ learnerId })
      .populate('courseId', 'title thumbnail category instructorName')
      .sort({ createdAt: -1 });

    const formatted = reviews.map(r => ({
      _id: r._id,
      courseId: r.courseId?._id || r.courseId,
      courseTitle: r.courseId?.title || 'Course',
      courseThumbnail: r.courseId?.thumbnail || '',
      category: r.courseId?.category || 'General',
      instructorName: r.courseId?.instructorName || 'UpSkillr Instructor',
      rating: r.rating,
      feedback: r.feedback,
      tags: r.tags || [],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));

    return res.status(200).json({ success: true, count: formatted.length, reviews: formatted });
  } catch (error) {
    console.error('Error fetching learner reviews:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch your reviews.' });
  }
};

// ─── 9. GET /api/learners/me/activity — Heatmap data from PointTransaction ───
exports.getLearnerActivity = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const transactions = await PointTransaction.find({
      learnerId,
      createdAt: { $gte: oneYearAgo }
    }).sort({ createdAt: 1 });

    // Group by YYYY-MM-DD
    const activityMap = {};
    for (const t of transactions) {
      const dateStr = getDateString(t.createdAt);
      if (!activityMap[dateStr]) {
        activityMap[dateStr] = { date: dateStr, count: 0, activities: [], descriptions: [] };
      }
      activityMap[dateStr].count += 1;
      activityMap[dateStr].activities.push(t.type);
      activityMap[dateStr].descriptions.push(t.description);
    }

    const activityData = Object.values(activityMap).sort((a, b) => a.date.localeCompare(b.date));
    return res.status(200).json({ success: true, activity: activityData });
  } catch (error) {
    console.error('Error fetching activity heatmap data:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch activity data.' });
  }
};

// ─── 10. GET /api/learners/me/certificates — Derived from completed enrolments ───
exports.getLearnerCertificates = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const completedEnrolments = await Enrolment.find({
      learnerId,
      $or: [{ status: 'completed' }, { progressPercentage: 100 }]
    }).populate('courseId', 'title thumbnail category certificate instructorName');

    const certificates = completedEnrolments
      .filter(e => e.courseId)
      .map(e => ({
        _id: e._id,
        courseId: e.courseId?._id || e.courseId,
        courseTitle: e.courseId?.title || e.courseTitle || 'Completed Course',
        courseThumbnail: e.courseId?.thumbnail || '',
        category: e.courseId?.category || 'General',
        instructorName: e.courseId?.instructorName || 'UpSkillr Instructor',
        hasCertificate: e.courseId?.certificate !== false,
        completedAt: e.completedAt
      }));

    return res.status(200).json({ success: true, count: certificates.length, certificates });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch certificates.' });
  }
};
