const mongoose = require('mongoose');
const PointTransaction = require('../model/PointTransaction');
const { Learner } = require('../model/User');
const { isConsecutiveDay, isSameDay } = require('../controller/learnerController');

/**
 * Format a Date to YYYY-MM-DD in the learner's local timezone (or fallback)
 * Avoids UTC boundary flips where late-night logins cross midnight in UTC.
 */
const getLocalDateString = (date = new Date(), timeZone) => {
  try {
    if (timeZone) {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(new Date(date));
    }
  } catch (e) {
    // Fallback if invalid timezone string passed
  }

  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Synchronize learner points balance with the actual ledger sum
 * Ensures total points is safely synchronized and single-source-of-truth.
 */
const syncLearnerPoints = async (learnerId) => {
  try {
    const agg = await PointTransaction.aggregate([
      { $match: { learnerId: new mongoose.Types.ObjectId(learnerId) } },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);
    const ledgerTotal = agg[0]?.total || 0;

    const learner = await Learner.findById(learnerId).select('points');
    if (learner && learner.points !== ledgerTotal) {
      learner.points = ledgerTotal;
      await learner.save();
    }
    return ledgerTotal;
  } catch (err) {
    console.error('Error syncing learner points:', err);
    return 0;
  }
};

/**
 * Award 1 point for the first successful login of the calendar day
 * Strictly awards only once per calendar day per learner.
 */
const awardDailyLoginPoint = async (learnerId, timeZone) => {
  try {
    const learner = await Learner.findById(learnerId);
    if (!learner || learner.role !== 'learner') {
      return { awarded: false, points: 0 };
    }

    const todayStr = getLocalDateString(new Date(), timeZone);
    const referenceId = `login_${todayStr}`;
    const legacyReferenceId = `checkin_${todayStr}`;

    // 1. Check if learner already received reward for this calendar day
    const existingTx = await PointTransaction.findOne({
      learnerId: learner._id,
      type: { $in: ['DAILY_LOGIN', 'DAILY_CHECKIN', 'daily_login'] },
      referenceId: { $in: [referenceId, legacyReferenceId, todayStr] }
    });

    if (existingTx) {
      return {
        awarded: false,
        points: 0,
        currentStreak: learner.currentStreak || 0,
        alreadyAwarded: true
      };
    }

    // 2. Calculate daily streak
    const isConsecutive = typeof isConsecutiveDay === 'function' && isConsecutiveDay(learner.lastCheckInDate);
    const newStreak = isConsecutive ? (learner.currentStreak || 0) + 1 : 1;
    const newLongest = Math.max(learner.longestStreak || 0, newStreak);

    // 3. Atomically create PointTransaction ledger record (+1 point)
    let tx;
    try {
      tx = await PointTransaction.create({
        learnerId: learner._id,
        userId: learner._id,
        points: 1,
        type: 'DAILY_LOGIN',
        activityType: 'daily_login',
        referenceId,
        description: 'Daily Login Reward (+1 point)'
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        // Compound unique index caught simultaneous login race condition
        return {
          awarded: false,
          points: 0,
          currentStreak: learner.currentStreak || 0,
          alreadyAwarded: true
        };
      }
      throw createErr;
    }

    // 4. Safely update learner total points and streak
    await Learner.findByIdAndUpdate(learner._id, {
      $inc: { points: 1 },
      $set: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastCheckInDate: new Date()
      }
    });

    return {
      awarded: true,
      points: 1,
      currentStreak: newStreak,
      message: '+1 Point — Daily Login Reward!',
      transaction: tx
    };
  } catch (err) {
    console.error('Error in awardDailyLoginPoint:', err);
    return { awarded: false, points: 0 };
  }
};

/**
 * Award 5 points for completing all required lessons & quizzes in a module
 * Strictly awards only once per module per learner.
 */
const awardModuleCompletionPoints = async (courseId, moduleId, moduleTitle, learnerId, courseTitle = '') => {
  try {
    const referenceId = `${courseId}_mod_${moduleId}`;
    const legacyReferenceId = `module_${moduleId}`;

    // 1. Check if module completion points were already awarded
    const existing = await PointTransaction.findOne({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      type: { $in: ['MODULE_COMPLETION', 'module_completion'] },
      referenceId: { $in: [referenceId, legacyReferenceId] }
    });

    if (existing) {
      return { awarded: false, points: 0 };
    }

    // 2. Atomically create transaction (+5 points)
    let tx;
    try {
      tx = await PointTransaction.create({
        learnerId,
        userId: learnerId,
        points: 5,
        type: 'MODULE_COMPLETION',
        activityType: 'module_completion',
        referenceId,
        description: `Completed Module: ${moduleTitle || 'Module'} in ${courseTitle || 'Course'} (+5 points)`
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        return { awarded: false, points: 0 };
      }
      throw createErr;
    }

    // 3. Atomically increment learner points
    await Learner.findByIdAndUpdate(learnerId, { $inc: { points: 5 } });

    return {
      awarded: true,
      points: 5,
      moduleId: String(moduleId),
      moduleTitle,
      message: `+5 Points — Module Completed: ${moduleTitle || 'Module'}!`,
      transaction: tx
    };
  } catch (err) {
    console.error('Error in awardModuleCompletionPoints:', err);
    return { awarded: false, points: 0 };
  }
};

/**
 * Award 25 points for completing an entire course (100% completion)
 * Strictly awards only once per course per learner.
 */
const awardCourseCompletionPoints = async (courseId, learnerId, courseTitle = '') => {
  try {
    const referenceId = `${courseId}_completed`;
    const legacyReferenceId = `course_${courseId}`;

    // 1. Check if course completion was already rewarded
    const existing = await PointTransaction.findOne({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      type: { $in: ['COURSE_COMPLETION', 'course_completion'] },
      referenceId: { $in: [referenceId, legacyReferenceId] }
    });

    if (existing) {
      return { awarded: false, points: 0 };
    }

    // 2. Atomically create transaction (+25 points)
    let tx;
    try {
      tx = await PointTransaction.create({
        learnerId,
        userId: learnerId,
        points: 25,
        type: 'COURSE_COMPLETION',
        activityType: 'course_completion',
        referenceId,
        description: `Completed Course: ${courseTitle || 'Course'} (+25 points)`
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        return { awarded: false, points: 0 };
      }
      throw createErr;
    }

    // 3. Atomically increment learner points
    await Learner.findByIdAndUpdate(learnerId, { $inc: { points: 25 } });

    return {
      awarded: true,
      points: 25,
      courseId: String(courseId),
      courseTitle,
      message: `+25 Points — Course Completed: ${courseTitle || 'Course'}!`,
      transaction: tx
    };
  } catch (err) {
    console.error('Error in awardCourseCompletionPoints:', err);
    return { awarded: false, points: 0 };
  }
};

/**
 * Check if a module is genuinely completed:
 * Every published lesson and every published item in the module must be completed.
 */
const isModuleGenuinelyCompleted = (module, completedLessonsList) => {
  if (!module) return false;
  const completedSet = new Set((completedLessonsList || []).map(String));
  const pubLessons = (module.lessons || []).filter(l => l.state === 'published' || l.status === 'published');
  if (pubLessons.length === 0) return false;

  for (const lesson of pubLessons) {
    const lIdStr = String(lesson._id);
    const pubItems = (lesson.items || lesson.contentItems || []).filter(
      i => i.state === 'published' || i.status === 'published'
    );

    if (pubItems.length > 0) {
      // All items in this lesson must be completed, or lesson itself marked complete
      const allItemsDone = pubItems.every(item => completedSet.has(String(item._id)));
      if (!allItemsDone && !completedSet.has(lIdStr)) {
        return false;
      }
    } else {
      if (!completedSet.has(lIdStr)) {
        return false;
      }
    }
  }
  return true;
};

/**
 * Check and award learning progress points (modules + course)
 * Evaluates all modules in course and overall course completion.
 */
const checkAndAwardLearningProgressPoints = async (course, enrolment, learnerId) => {
  const rewards = [];
  let totalPointsAwarded = 0;

  if (!course || !enrolment || !learnerId) {
    return { totalPointsAwarded: 0, rewards: [] };
  }

  // 1. Check each published module
  const pubModules = (course.modules || []).filter(m => m.state === 'published' || m.status === 'published');
  for (const mod of pubModules) {
    if (isModuleGenuinelyCompleted(mod, enrolment.completedLessons)) {
      const modRes = await awardModuleCompletionPoints(
        course._id,
        mod._id,
        mod.title,
        learnerId,
        course.title
      );
      if (modRes.awarded) {
        totalPointsAwarded += modRes.points;
        rewards.push(modRes.message);
      }
    }
  }

  // 2. Check course completion (100% progress)
  if (enrolment.progressPercentage === 100 || enrolment.status === 'completed') {
    const courseRes = await awardCourseCompletionPoints(
      course._id,
      learnerId,
      course.title
    );
    if (courseRes.awarded) {
      totalPointsAwarded += courseRes.points;
      rewards.push(courseRes.message);
    }
  }

  // 3. Maintain daily learning streak if points were awarded or valid activity occurred
  if (totalPointsAwarded > 0) {
    const learner = await Learner.findById(learnerId);
    if (learner && learner.role === 'learner') {
      if (typeof isSameDay === 'function' && !isSameDay(learner.lastCheckInDate)) {
        const isConsecutive = typeof isConsecutiveDay === 'function' && isConsecutiveDay(learner.lastCheckInDate);
        learner.currentStreak = isConsecutive ? (learner.currentStreak || 0) + 1 : 1;
        learner.longestStreak = Math.max(learner.longestStreak || 0, learner.currentStreak);
        learner.lastCheckInDate = new Date();
        await learner.save();
      }
    }
  }

  return {
    totalPointsAwarded,
    rewards
  };
};

module.exports = {
  getLocalDateString,
  awardDailyLoginPoint,
  awardModuleCompletionPoints,
  awardCourseCompletionPoints,
  isModuleGenuinelyCompleted,
  checkAndAwardLearningProgressPoints,
  syncLearnerPoints
};
