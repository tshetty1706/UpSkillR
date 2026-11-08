const mongoose = require('mongoose');
const PointTransaction = require('../model/PointTransaction');
const { Learner } = require('../model/User');

/**
 * Format a Date to YYYY-MM-DD in the learner's local timezone (defaults to Asia/Kolkata)
 * Avoids UTC boundary flips where late-night logins cross midnight in UTC.
 */
const getLocalDateString = (date = new Date(), timeZone = 'Asia/Kolkata') => {
  try {
    const tz = timeZone || 'Asia/Kolkata';
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date(date));
  } catch (e) {
    // Fallback if invalid timezone string passed
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

/**
 * Check if two dates are consecutive calendar days in the given timezone (default: Asia/Kolkata)
 */
const isConsecutiveDay = (lastDate, currentDate = new Date(), timeZone = 'Asia/Kolkata') => {
  if (!lastDate) return false;
  const tz = timeZone || 'Asia/Kolkata';
  const lastStr = getLocalDateString(lastDate, tz);
  const currentStr = getLocalDateString(currentDate, tz);
  const d1 = new Date(lastStr + 'T00:00:00Z');
  const d2 = new Date(currentStr + 'T00:00:00Z');
  const diffDays = Math.round((d2.getTime() - d1.getTime()) / (24 * 3600 * 1000));
  return diffDays === 1;
};

/**
 * Check if two dates represent the same calendar day in the given timezone (default: Asia/Kolkata)
 */
const isSameDay = (d1, d2 = new Date(), timeZone = 'Asia/Kolkata') => {
  if (!d1 || !d2) return false;
  const tz = timeZone || 'Asia/Kolkata';
  return getLocalDateString(d1, tz) === getLocalDateString(d2, tz);
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
 * Atomically records LOGIN activity in LearnerActivity and updates streaks.
 */
const awardDailyLoginPoint = async (learnerId, timeZone = 'Asia/Kolkata') => {
  try {
    const tz = timeZone || 'Asia/Kolkata';
    const learner = await Learner.findById(learnerId);
    if (!learner || learner.role !== 'learner') {
      return { awarded: false, points: 0 };
    }

    const todayStr = getLocalDateString(new Date(), tz);
    const referenceId = `login_${todayStr}`;
    const legacyReferenceId = `checkin_${todayStr}`;

    // 1. Ensure LearnerActivity record is logged atomically for today (idempotent upsert)
    const { logLearnerActivity } = require('./activityService');
    await logLearnerActivity(learner._id, {
      activityType: 'daily_login',
      title: 'Daily Login Check-in',
      description: `Daily login recorded for ${todayStr}`,
      points: 1,
      referenceId,
      createdAt: new Date()
    });

    // 2. Check if learner already received reward for this calendar day
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
        longestStreak: learner.longestStreak || 0,
        alreadyAwarded: true
      };
    }

    // 3. Calculate daily streak
    const isConsecutive = isConsecutiveDay(learner.lastCheckInDate, new Date(), tz);
    const newStreak = isConsecutive ? (learner.currentStreak || 0) + 1 : 1;
    const newLongest = Math.max(learner.longestStreak || 0, newStreak);

    // 4. Atomically create PointTransaction ledger record (+1 point)
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
          longestStreak: learner.longestStreak || 0,
          alreadyAwarded: true
        };
      }
      throw createErr;
    }

    // 5. Safely update learner total points, streak and check for badge unlocks
    learner.points = (learner.points || 0) + 1;
    learner.currentStreak = newStreak;
    learner.longestStreak = newLongest;
    learner.lastCheckInDate = new Date();
    await learner.save();

    // Update the LearnerActivity description with streak info
    const LearnerActivity = require('../model/LearnerActivity');
    await LearnerActivity.updateOne(
      { learnerId: learner._id, referenceId },
      { $set: { description: `Daily login completed! Streak: ${newStreak} day${newStreak === 1 ? '' : 's'}` } }
    ).catch(() => {});

    const { evaluateAndAwardStreakBadges } = require('./badgeService');
    const badgeResult = await evaluateAndAwardStreakBadges(learner);

    return {
      awarded: true,
      points: 1,
      currentStreak: newStreak,
      longestStreak: newLongest,
      newlyAwardedBadges: badgeResult?.newlyAwarded || [],
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

    // Evaluate Knowledge Seeker course completion badges
    try {
      const learnerDoc = await Learner.findById(learnerId);
      if (learnerDoc && learnerDoc.role === 'learner') {
        const { evaluateAndAwardCourseCompletionBadges } = require('./badgeService');
        await evaluateAndAwardCourseCompletionBadges(learnerDoc);
      }
    } catch (badgeErr) {
      console.warn('Error auto-evaluating course completion badges:', badgeErr.message);
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
  isConsecutiveDay,
  isSameDay,
  awardDailyLoginPoint,
  awardModuleCompletionPoints,
  awardCourseCompletionPoints,
  isModuleGenuinelyCompleted,
  checkAndAwardLearningProgressPoints,
  syncLearnerPoints
};
