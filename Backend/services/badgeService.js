const Notification = require('../model/Notification');
const Enrolment = require('../model/Enrolment');
const Course = require('../model/Course');
const AssessmentSubmission = require('../model/AssessmentSubmission');
const { logLearnerActivity } = require('./activityService');

// ─── Four Learning Streak Badges Configuration ───
const STREAK_BADGES = [
  {
    badgeId: 'streak_30',
    tier: 'normal',
    threshold: 30,
    name: 'Streak Achiever',
    title: 'Streak Achiever — 30 Days',
    requirement: 'Maintain a 30-day continuous streak',
    thresholdLabel: '30 Consecutive Days',
    description: 'Your learning journey is becoming a habit! Maintain a 30-day continuous streak.',
    image: '/assets/badges/streak-achiever.png',
    category: 'streak'
  },
  {
    badgeId: 'streak_150',
    tier: 'bronze',
    threshold: 150,
    name: 'Bronze Streak',
    title: 'Bronze Streak — 150 Days',
    requirement: 'Maintain a 150-day continuous streak',
    thresholdLabel: '150 Consecutive Days',
    description: 'Your dedication is impressive! Maintain 150 consecutive days of learning.',
    image: '/assets/badges/bronze-streak.png',
    category: 'streak'
  },
  {
    badgeId: 'streak_500',
    tier: 'silver',
    threshold: 500,
    name: 'Silver Streak',
    title: 'Silver Streak — 500 Days',
    requirement: 'Maintain a 500-day continuous streak',
    thresholdLabel: '500 Consecutive Days',
    description: 'An exceptional commitment to learning. Maintain 500 consecutive days.',
    image: '/assets/badges/silver-streak.png',
    category: 'streak'
  },
  {
    badgeId: 'streak_1000',
    tier: 'gold',
    threshold: 1000,
    name: 'Master Streak',
    title: 'Master Streak — 1,000 Days',
    requirement: 'Maintain a 1,000-day continuous streak',
    thresholdLabel: '1,000 Consecutive Days',
    description: 'An extraordinary achievement! Maintain a continuous learning streak of 1,000 days.',
    image: '/assets/badges/master-streak.png',
    category: 'streak'
  }
];

// Cloudinary badge URLs helper cache
let badgeCloudUrls = {};
try {
  badgeCloudUrls = require('../config/badgeCloudinaryUrls.json');
} catch (_) {}

const CLOUDINARY_KS_NORMAL = badgeCloudUrls['knowledge-seeker-normal']?.secureUrl ||
  'https://res.cloudinary.com/dudqnkdte/image/upload/v1/upskillr/achievements/badges/knowledge-seeker-normal.png';

const CLOUDINARY_PERF_NORMAL = badgeCloudUrls['perfectionist-normal']?.secureUrl ||
  'https://res.cloudinary.com/dudqnkdte/image/upload/v1/upskillr/achievements/badges/perfectionist-normal.png';

// ─── Four Knowledge Seeker Badges Configuration (Course Completion) ───
const KNOWLEDGE_SEEKER_BADGES = [
  {
    badgeId: 'knowledge_seeker_normal',
    tier: 'normal',
    threshold: 5,
    name: 'Knowledge Seeker Normal',
    title: 'Knowledge Seeker Normal',
    requirement: 'Complete 5 courses',
    thresholdLabel: '5 Courses',
    description: 'Explore new subjects, expand your expertise, and complete 5 full courses.',
    notificationMessage: "Congratulations! You've completed 5 courses and unlocked Knowledge Seeker Normal!",
    image: CLOUDINARY_KS_NORMAL,
    cloudinaryUrl: CLOUDINARY_KS_NORMAL,
    fallbackImage: '/assets/badges/knowledge-seeker-normal.png',
    category: 'course_completion'
  },
  {
    badgeId: 'knowledge_seeker_bronze',
    tier: 'bronze',
    threshold: 15,
    name: 'Knowledge Seeker Bronze',
    title: 'Knowledge Seeker Bronze',
    requirement: 'Complete 15 courses',
    thresholdLabel: '15 Courses',
    description: 'Expand your horizons, master new domains, and complete 15 full courses.',
    notificationMessage: "Amazing progress! You've completed 15 courses and unlocked Knowledge Seeker Bronze!",
    image: '/assets/badges/knowledge-seeker-bronze.png',
    cloudinaryUrl: '/assets/badges/knowledge-seeker-bronze.png',
    fallbackImage: '/assets/badges/knowledge-seeker-bronze.png',
    category: 'course_completion'
  },
  {
    badgeId: 'knowledge_seeker_silver',
    tier: 'silver',
    threshold: 30,
    name: 'Knowledge Seeker Silver',
    title: 'Knowledge Seeker Silver',
    requirement: 'Complete 30 courses',
    thresholdLabel: '30 Courses',
    description: 'Demonstrate impressive dedication to lifelong learning by completing 30 full courses.',
    notificationMessage: "Outstanding dedication! You've completed 30 courses and unlocked Knowledge Seeker Silver!",
    image: '/assets/badges/knowledge-seeker-silver.png',
    cloudinaryUrl: '/assets/badges/knowledge-seeker-silver.png',
    fallbackImage: '/assets/badges/knowledge-seeker-silver.png',
    category: 'course_completion'
  },
  {
    badgeId: 'knowledge_seeker_gold',
    tier: 'gold',
    threshold: 50,
    name: 'Knowledge Seeker Gold',
    title: 'Knowledge Seeker Gold',
    requirement: 'Complete 50 courses',
    thresholdLabel: '50 Courses',
    description: 'Reach the pinnacle of knowledge mastery by completing 50 full courses on UpSkillR.',
    notificationMessage: "Knowledge Legend! You've completed 50 full courses and unlocked Knowledge Seeker Gold!",
    image: '/assets/badges/knowledge-seeker-gold.png',
    cloudinaryUrl: '/assets/badges/knowledge-seeker-gold.png',
    fallbackImage: '/assets/badges/knowledge-seeker-gold.png',
    category: 'course_completion'
  }
];

// ─── Four Perfectionist Badges Configuration (Academic Excellence - First Attempt 90%+) ───
const PERFECTIONIST_BADGES = [
  {
    badgeId: 'perfectionist_normal',
    tier: 'normal',
    threshold: 3,
    name: 'Perfectionist Normal',
    title: 'Perfectionist Normal',
    requirement: 'Score 90%+ in 3 first attempts',
    thresholdLabel: '3 Qualifying Quizzes',
    description: 'Score 90% or above in 3 unique quizzes on your first attempt.',
    notificationMessage: "Fantastic achievement! You've scored 90%+ on your first attempt in 3 unique quizzes and unlocked Perfectionist Normal!",
    image: CLOUDINARY_PERF_NORMAL,
    cloudinaryUrl: CLOUDINARY_PERF_NORMAL,
    fallbackImage: '/assets/badges/perfectionist-normal.png',
    category: 'quiz_excellence'
  },
  {
    badgeId: 'perfectionist_bronze',
    tier: 'bronze',
    threshold: 10,
    name: 'Perfectionist Bronze',
    title: 'Perfectionist Bronze',
    requirement: 'Score 90%+ in 10 first attempts',
    thresholdLabel: '10 Qualifying Quizzes',
    description: 'Score 90% or above in 10 unique quizzes on your first attempt.',
    notificationMessage: "Outstanding excellence! You've scored 90%+ on your first attempt in 10 unique quizzes and unlocked Perfectionist Bronze!",
    image: '/assets/badges/perfectionist-bronze.png',
    cloudinaryUrl: '/assets/badges/perfectionist-bronze.png',
    fallbackImage: '/assets/badges/perfectionist-bronze.png',
    category: 'quiz_excellence'
  },
  {
    badgeId: 'perfectionist_silver',
    tier: 'silver',
    threshold: 25,
    name: 'Perfectionist Silver',
    title: 'Perfectionist Silver',
    requirement: 'Score 90%+ in 25 first attempts',
    thresholdLabel: '25 Qualifying Quizzes',
    description: 'Score 90% or above in 25 unique quizzes on your first attempt.',
    notificationMessage: "Remarkable precision! You've scored 90%+ on your first attempt in 25 unique quizzes and unlocked Perfectionist Silver!",
    image: '/assets/badges/perfectionist-silver.png',
    cloudinaryUrl: '/assets/badges/perfectionist-silver.png',
    fallbackImage: '/assets/badges/perfectionist-silver.png',
    category: 'quiz_excellence'
  },
  {
    badgeId: 'perfectionist_gold',
    tier: 'gold',
    threshold: 50,
    name: 'Perfectionist Gold',
    title: 'Perfectionist Gold',
    requirement: 'Score 90%+ in 50 first attempts',
    thresholdLabel: '50 Qualifying Quizzes',
    description: 'Score 90% or above in 50 unique quizzes on your first attempt.',
    notificationMessage: "Academic mastery! You've scored 90%+ on your first attempt in 50 unique quizzes and unlocked Perfectionist Gold!",
    image: '/assets/badges/perfectionist-gold.png',
    cloudinaryUrl: '/assets/badges/perfectionist-gold.png',
    fallbackImage: '/assets/badges/perfectionist-gold.png',
    category: 'quiz_excellence'
  }
];

/**
 * Counts unique, successfully completed courses for a learner.
 * Excludes:
 * - Merely enrolled or in-progress courses
 * - Unpublished or deleted courses
 * - Duplicate completion records for the same course
 * - Repeated attempts for an already completed course
 *
 * @param {string|ObjectId} learnerId
 * @returns {Promise<number>} Number of unique completed courses
 */
const getUniqueCompletedCoursesCount = async (learnerId) => {
  if (!learnerId) return 0;
  try {
    const enrolments = await Enrolment.find({
      learnerId,
      status: { $regex: /^completed$/i },
      progressPercentage: { $gte: 100 }
    }).populate({
      path: 'courseId',
      select: '_id title status state isDeleted'
    });

    const uniqueValidCourseIds = new Set();
    for (const e of enrolments) {
      const course = e.courseId;
      // Must exist, not deleted, and published
      if (
        course &&
        !course.isDeleted &&
        (course.status === 'published' || course.state === 'published')
      ) {
        uniqueValidCourseIds.add(String(course._id));
      }
    }
    return uniqueValidCourseIds.size;
  } catch (err) {
    console.error('Error counting unique completed courses:', err);
    return 0;
  }
};

/**
 * Counts unique quizzes where the learner achieved at least 90% in the FIRST ATTEMPT.
 * Enforces:
 * - Requirement is >= 90% score, NOT 100%
 * - Only the chronologically earliest (first) attempt of each quiz counts
 * - Each unique quiz contributes at most once
 * - Retakes must never increase Perfectionist progress
 * - A score below 90% on the first attempt cannot be replaced by a better retake score
 * - Only quizzes belonging to courses in which the learner is actively enrolled
 * - Excludes non-quiz assessments
 * - Excludes soft-deleted courses
 *
 * @param {string|ObjectId} learnerId
 * @returns {Promise<number>} Number of qualifying unique quizzes
 */
const getUniqueFirstAttemptQualifyingQuizzesCountForPerfectionist = async (learnerId) => {
  if (!learnerId) return 0;
  try {
    // 1. Get courses in which the learner is currently enrolled
    const enrolments = await Enrolment.find({ learnerId }).select('courseId');
    const enrolledCourseIds = new Set(enrolments.map(e => String(e.courseId)));
    if (enrolledCourseIds.size === 0) return 0;

    // 2. Fetch all submitted or graded attempts by this learner
    const submissions = await AssessmentSubmission.find({
      learnerId,
      status: { $in: ['submitted', 'graded'] }
    }).populate({
      path: 'courseId',
      select: '_id title isDeleted modules courseAssessments'
    });

    // 3. Group attempts by unique quiz ID (assessmentId)
    const attemptsByQuiz = new Map();

    for (const sub of submissions) {
      if (!sub.courseId || sub.courseId.isDeleted) continue;
      if (!enrolledCourseIds.has(String(sub.courseId._id))) continue;

      const targetAssessmentIdStr = String(sub.assessmentId);

      // Verify whether this assessment is explicitly a quiz:
      let isQuiz = false;
      if (sub.lessonId || sub.moduleId) {
        // Module/lesson item quiz
        isQuiz = true;
      } else if (sub.courseId.modules) {
        // Search inside modules
        for (const m of sub.courseId.modules) {
          for (const l of (m.lessons || [])) {
            for (const it of (l.items || l.contentItems || [])) {
              if (String(it._id) === targetAssessmentIdStr) {
                isQuiz = Boolean(it.type && it.type.toLowerCase() === 'quiz');
                break;
              }
            }
            if (isQuiz) break;
          }
          if (isQuiz) break;
        }
      }

      // Check courseAssessments if not in modules
      if (!isQuiz && sub.courseId.courseAssessments) {
        const ca = sub.courseId.courseAssessments.find(a => String(a._id) === targetAssessmentIdStr);
        if (ca) {
          isQuiz = ca.assessmentType === 'quiz' || (ca.questions && ca.questions.length > 0 && ca.assessmentType !== 'project');
        }
      }

      // Fallback: If title explicitly indicates quiz
      if (!isQuiz && sub.assessmentTitle && sub.assessmentTitle.toLowerCase().includes('quiz')) {
        isQuiz = true;
      }

      if (!isQuiz) continue;

      if (!attemptsByQuiz.has(targetAssessmentIdStr)) {
        attemptsByQuiz.set(targetAssessmentIdStr, []);
      }
      attemptsByQuiz.get(targetAssessmentIdStr).push(sub);
    }

    // 4. For each unique quiz, determine the true FIRST attempt
    let qualifyingCount = 0;

    for (const [quizId, attempts] of attemptsByQuiz.entries()) {
      // Sort attempts to determine the true first attempt
      attempts.sort((a, b) => {
        // 1. Explicit attemptNumber if valid positive integers
        const aNum = Number(a.attemptNumber);
        const bNum = Number(b.attemptNumber);
        if (aNum > 0 && bNum > 0 && aNum !== bNum) {
          return aNum - bNum;
        }

        // 2. Explicit isFirstAttempt flag
        if (a.isFirstAttempt && !b.isFirstAttempt) return -1;
        if (!a.isFirstAttempt && b.isFirstAttempt) return 1;

        // 3. Fallback to chronological timestamps: submittedAt -> startedAt -> createdAt -> _id
        const aTime = new Date(a.submittedAt || a.startedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.submittedAt || b.startedAt || b.createdAt || 0).getTime();
        if (aTime !== bTime) {
          return aTime - bTime;
        }
        return String(a._id).localeCompare(String(b._id));
      });

      const firstAttempt = attempts[0];
      if (!firstAttempt) continue;

      // 5. Calculate percentage score of the first attempt
      let pct = Number(firstAttempt.percentage);
      if (isNaN(pct) || pct === null || pct === undefined) {
        if (Number(firstAttempt.maxScore) > 0) {
          pct = (Number(firstAttempt.totalScore) / Number(firstAttempt.maxScore)) * 100;
        } else {
          pct = 0;
        }
      }

      // Condition: >= 90% on FIRST attempt
      if (pct >= 90) {
        qualifyingCount++;
      }
    }

    return qualifyingCount;
  } catch (err) {
    console.error('Error counting unique first attempt qualifying quizzes for Perfectionist:', err);
    return 0;
  }
};

const getUniquePerfectQuizzesCountForPerfectionist = getUniqueFirstAttemptQualifyingQuizzesCountForPerfectionist;

/**
 * Evaluates learner streak and unlocks eligible badges idempotently.
 * Preserves previously unlocked badges permanently.
 * Dispatches congratulatory in-app notifications only once per badge.
 *
 * @param {Object} learner - Mongoose Learner document
 * @returns {Promise<Object>} { newlyAwarded: Array, badges: Array, totalBadgesCount: Number }
 */
const evaluateAndAwardStreakBadges = async (learner) => {
  if (!learner || learner.role !== 'learner') {
    return { newlyAwarded: [], badges: [], totalBadgesCount: 0 };
  }

  if (!Array.isArray(learner.badges)) {
    learner.badges = [];
  }

  // Effective streak evaluates against both currentStreak and longestStreak
  const effectiveStreak = Math.max(
    Number(learner.currentStreak) || 0,
    Number(learner.longestStreak) || 0
  );

  const existingBadgeIds = new Set(learner.badges.map((b) => b.badgeId));
  const newlyAwarded = [];

  for (const badgeConfig of STREAK_BADGES) {
    if (effectiveStreak >= badgeConfig.threshold && !existingBadgeIds.has(badgeConfig.badgeId)) {
      const unlockDate = new Date();
      const newBadgeRecord = {
        badgeId: badgeConfig.badgeId,
        name: badgeConfig.name,
        category: 'streak',
        threshold: badgeConfig.threshold,
        unlockedAt: unlockDate
      };

      learner.badges.push(newBadgeRecord);
      existingBadgeIds.add(badgeConfig.badgeId);
      newlyAwarded.push(badgeConfig);

      // 1. Generate In-App Notification (strictly once per badge)
      try {
        await Notification.create({
          recipientId: learner._id,
          type: 'BADGE_UNLOCKED',
          title: `🏆 New Badge Unlocked: ${badgeConfig.name}!`,
          message: `Congratulations! You've unlocked the ${badgeConfig.name} badge by maintaining ${badgeConfig.threshold.toLocaleString()} consecutive days of learning!`,
          isRead: false
        });
      } catch (notifErr) {
        console.warn(`[BADGE NOTIFICATION WARNING] Could not create notification for ${badgeConfig.badgeId}:`, notifErr.message);
      }

      // 2. Log in Learner Activity History
      try {
        if (typeof logLearnerActivity === 'function') {
          logLearnerActivity(learner._id, {
            activityType: 'points_earned',
            title: `Badge Unlocked: ${badgeConfig.name}`,
            description: `Earned the ${badgeConfig.name} badge for reaching ${badgeConfig.threshold} consecutive days of learning!`,
            createdAt: unlockDate
          }).catch(() => {});
        }
      } catch (actErr) {
        // Non-blocking activity log
      }
    }
  }

  if (newlyAwarded.length > 0) {
    await learner.save();
  }

  return {
    newlyAwarded,
    badges: learner?.badges || [],
    totalBadgesCount: learner?.badges?.length || 0
  };
};

/**
 * Evaluates unique completed courses count and unlocks Knowledge Seeker badges idempotently.
 *
 * @param {Object} learner - Mongoose Learner document
 * @param {number|null} [precomputedCompletedCount=null] - Optional pre-computed count
 * @returns {Promise<Object>} { newlyAwarded: Array, badges: Array, totalBadgesCount: Number }
 */
const evaluateAndAwardCourseCompletionBadges = async (learner, precomputedCompletedCount = null) => {
  if (!learner || learner.role !== 'learner') {
    return { newlyAwarded: [], badges: [], totalBadgesCount: 0 };
  }

  if (!Array.isArray(learner.badges)) {
    learner.badges = [];
  }

  const completedCount = typeof precomputedCompletedCount === 'number'
    ? precomputedCompletedCount
    : await getUniqueCompletedCoursesCount(learner._id);

  const existingBadgeIds = new Set(learner.badges.map((b) => b.badgeId));
  const newlyAwarded = [];

  for (const badgeConfig of KNOWLEDGE_SEEKER_BADGES) {
    if (completedCount >= badgeConfig.threshold && !existingBadgeIds.has(badgeConfig.badgeId)) {
      const unlockDate = new Date();
      const newBadgeRecord = {
        badgeId: badgeConfig.badgeId,
        tier: badgeConfig.tier,
        name: badgeConfig.name,
        category: 'course_completion',
        threshold: badgeConfig.threshold,
        image: badgeConfig.image,
        cloudinaryUrl: badgeConfig.cloudinaryUrl || badgeConfig.image,
        unlockedAt: unlockDate
      };

      learner.badges.push(newBadgeRecord);
      existingBadgeIds.add(badgeConfig.badgeId);
      newlyAwarded.push(badgeConfig);

      // 1. Generate In-App Notification (strictly once per badge)
      try {
        await Notification.create({
          recipientId: learner._id,
          type: 'BADGE_UNLOCKED',
          title: `🎓 New Badge Unlocked: ${badgeConfig.name}!`,
          message: badgeConfig.notificationMessage,
          isRead: false
        });
      } catch (notifErr) {
        console.warn(`[BADGE NOTIFICATION WARNING] Could not create notification for ${badgeConfig.badgeId}:`, notifErr.message);
      }

      // 2. Log in Learner Activity History
      try {
        if (typeof logLearnerActivity === 'function') {
          logLearnerActivity(learner._id, {
            activityType: 'points_earned',
            title: `Badge Unlocked: ${badgeConfig.name}`,
            description: badgeConfig.notificationMessage,
            createdAt: unlockDate
          }).catch(() => {});
        }
      } catch (actErr) {
        // Non-blocking activity log
      }
    }
  }

  if (newlyAwarded.length > 0) {
    await learner.save();
  }

  return {
    newlyAwarded,
    badges: learner?.badges || [],
    totalBadgesCount: learner?.badges?.length || 0
  };
};

/**
 * Evaluates unique perfect (100%) quiz count for Perfectionist badges idempotently.
 *
 * @param {Object} learner - Mongoose Learner document
 * @param {number|null} [precomputedCount=null] - Optional pre-computed unique perfect quiz count
 * @returns {Promise<Object>} { newlyAwarded: Array, badges: Array, totalBadgesCount: Number }
 */
const evaluateAndAwardPerfectionistBadges = async (learner, precomputedCount = null) => {
  if (!learner || learner.role !== 'learner') {
    return { newlyAwarded: [], badges: [], totalBadgesCount: 0 };
  }

  if (!Array.isArray(learner.badges)) {
    learner.badges = [];
  }

  const perfectCount = typeof precomputedCount === 'number'
    ? precomputedCount
    : await getUniquePerfectQuizzesCountForPerfectionist(learner._id);

  const existingBadgeIds = new Set(learner.badges.map((b) => b.badgeId));
  const newlyAwarded = [];

  for (const badgeConfig of PERFECTIONIST_BADGES) {
    if (perfectCount >= badgeConfig.threshold && !existingBadgeIds.has(badgeConfig.badgeId)) {
      const unlockDate = new Date();
      const newBadgeRecord = {
        badgeId: badgeConfig.badgeId,
        tier: badgeConfig.tier,
        name: badgeConfig.name,
        category: 'quiz_excellence',
        threshold: badgeConfig.threshold,
        image: badgeConfig.image,
        cloudinaryUrl: badgeConfig.cloudinaryUrl || badgeConfig.image,
        unlockedAt: unlockDate
      };

      learner.badges.push(newBadgeRecord);
      existingBadgeIds.add(badgeConfig.badgeId);
      newlyAwarded.push(badgeConfig);

      // 1. Generate In-App Notification (strictly once per badge)
      try {
        await Notification.create({
          recipientId: learner._id,
          type: 'BADGE_UNLOCKED',
          title: `🌟 New Badge Unlocked: ${badgeConfig.name}!`,
          message: badgeConfig.notificationMessage,
          isRead: false
        });
      } catch (notifErr) {
        console.warn(`[BADGE NOTIFICATION WARNING] Could not create notification for ${badgeConfig.badgeId}:`, notifErr.message);
      }

      // 2. Log in Learner Activity History
      try {
        if (typeof logLearnerActivity === 'function') {
          logLearnerActivity(learner._id, {
            activityType: 'points_earned',
            title: `Badge Unlocked: ${badgeConfig.name}`,
            description: badgeConfig.notificationMessage,
            createdAt: unlockDate
          }).catch(() => {});
        }
      } catch (actErr) {
        // Non-blocking activity log
      }
    }
  }

  if (newlyAwarded.length > 0) {
    await learner.save();
  }

  return {
    newlyAwarded,
    badges: learner?.badges || [],
    totalBadgesCount: learner?.badges?.length || 0
  };
};

/**
 * Unified evaluator for Streak, Knowledge Seeker, and Perfectionist badges.
 *
 * @param {Object} learner
 * @param {number|null} [precomputedCompletedCount=null]
 * @param {number|null} [precomputedPerfectionistQuizzesCount=null]
 * @returns {Promise<Object>}
 */
const evaluateAllBadges = async (
  learner,
  precomputedCompletedCount = null,
  precomputedPerfectionistQuizzesCount = null
) => {
  const streakRes = await evaluateAndAwardStreakBadges(learner);
  const courseRes = await evaluateAndAwardCourseCompletionBadges(learner, precomputedCompletedCount);
  const perfectionistRes = await evaluateAndAwardPerfectionistBadges(learner, precomputedPerfectionistQuizzesCount);

  return {
    newlyAwarded: [
      ...(streakRes.newlyAwarded || []),
      ...(courseRes.newlyAwarded || []),
      ...(perfectionistRes.newlyAwarded || [])
    ],
    badges: learner?.badges || [],
    totalBadgesCount: learner?.badges?.length || 0
  };
};

/**
 * Filters a tier-ordered badge array for progressive display:
 * returns all unlocked badges (sorted by threshold ascending) followed by
 * at most ONE immediate next locked badge. Remaining future locked badges stay hidden.
 *
 * @param {Array<Object>} cards
 * @returns {Array<Object>}
 */
const selectProgressiveBadges = (cards = []) => {
  const sorted = [...cards].sort((a, b) => Number(a.threshold || 0) - Number(b.threshold || 0));
  const unlocked = sorted.filter((b) => Boolean(b.isUnlocked || b.unlocked));
  const nextLocked = sorted.find((b) => !(b.isUnlocked || b.unlocked)) || null;
  return nextLocked ? [...unlocked, nextLocked] : unlocked;
};

/**
 * Builds formatted progressive badge representations for frontend display.
 * Returns unlocked badges first + only the immediate next locked badge per category,
 * while reporting exact earned and total platform counts in `stats`.
 *
 * @param {Object} learner - Learner document or learner stats
 * @param {number|null} [precomputedCompletedCount=null]
 * @param {number|null} [precomputedPerfectionistQuizzesCount=null]
 * @returns {Promise<Object>} { streakBadges, knowledgeSeekerBadges, perfectionistBadges, badges, stats }
 */
const getLearnerBadgeProgress = async (
  learner,
  precomputedCompletedCount = null,
  precomputedPerfectionistQuizzesCount = null
) => {
  const currentStreak = Number(learner?.currentStreak) || 0;
  const longestStreak = Number(learner?.longestStreak) || 0;
  const effectiveStreak = Math.max(currentStreak, longestStreak);

  const completedCoursesCount = typeof precomputedCompletedCount === 'number'
    ? precomputedCompletedCount
    : await getUniqueCompletedCoursesCount(learner?._id);

  const perfectionistQuizzesCount = typeof precomputedPerfectionistQuizzesCount === 'number'
    ? precomputedPerfectionistQuizzesCount
    : await getUniquePerfectQuizzesCountForPerfectionist(learner?._id);

  const earnedBadgesMap = new Map();
  if (learner && Array.isArray(learner.badges)) {
    learner.badges.forEach((b) => {
      earnedBadgesMap.set(b.badgeId, b);
    });
  }

  // 1. Format Streak Badges
  const streakCards = STREAK_BADGES.map((config) => {
    const earned = earnedBadgesMap.has(config.badgeId) || effectiveStreak >= config.threshold;
    const earnedRecord = earnedBadgesMap.get(config.badgeId);

    const currentProgress = earned
      ? config.threshold
      : Math.min(config.threshold, currentStreak);

    const progressPercentage = Math.min(
      100,
      Math.max(0, Math.round((currentProgress / config.threshold) * 100))
    );

    const formatTierLabel = (t) => (t ? `${t.charAt(0).toUpperCase() + t.slice(1)} Tier` : 'Normal Tier');

    return {
      badgeId: config.badgeId,
      tier: config.tier || 'normal',
      tierLabel: formatTierLabel(config.tier || 'normal'),
      categoryLabel: 'Learning Streak',
      unit: 'days',
      name: config.name,
      title: config.title,
      requirement: config.requirement || config.thresholdLabel,
      threshold: config.threshold,
      thresholdLabel: config.thresholdLabel,
      description: config.description,
      image: config.image,
      category: 'streak',
      isUnlocked: Boolean(earned),
      unlocked: Boolean(earned),
      unlockedAt: earnedRecord?.unlockedAt || (earned ? new Date() : null),
      progress: currentProgress,
      currentProgress,
      progressPercent: progressPercentage,
      progressPercentage,
      progressText: `${currentProgress.toLocaleString()} / ${config.threshold.toLocaleString()} days`
    };
  });

  // 2. Format Knowledge Seeker Badges
  const knowledgeSeekerCards = KNOWLEDGE_SEEKER_BADGES.map((config) => {
    const earned = earnedBadgesMap.has(config.badgeId) || completedCoursesCount >= config.threshold;
    const earnedRecord = earnedBadgesMap.get(config.badgeId);

    const currentProgress = earned
      ? config.threshold
      : Math.min(config.threshold, completedCoursesCount);

    const progressPercentage = Math.min(
      100,
      Math.max(0, Math.round((currentProgress / config.threshold) * 100))
    );

    const t = config.tier || 'normal';
    return {
      badgeId: config.badgeId,
      tier: t,
      tierLabel: `${t.charAt(0).toUpperCase() + t.slice(1)} Tier`,
      categoryLabel: 'Knowledge Seeker',
      unit: 'courses',
      name: config.name,
      title: config.title,
      requirement: config.requirement,
      threshold: config.threshold,
      thresholdLabel: config.thresholdLabel || `${config.threshold} Courses`,
      description: config.description,
      image: config.image,
      cloudinaryUrl: config.cloudinaryUrl || config.image,
      fallbackImage: config.fallbackImage || config.image,
      category: 'course_completion',
      isUnlocked: Boolean(earned),
      unlocked: Boolean(earned),
      unlockedAt: earnedRecord?.unlockedAt || (earned ? new Date() : null),
      progress: currentProgress,
      currentProgress,
      progressPercent: progressPercentage,
      progressPercentage,
      progressText: `${currentProgress} / ${config.threshold} courses`
    };
  });

  // 3. Format Perfectionist Badges
  const perfectionistCards = PERFECTIONIST_BADGES.map((config) => {
    const earned = earnedBadgesMap.has(config.badgeId) || perfectionistQuizzesCount >= config.threshold;
    const earnedRecord = earnedBadgesMap.get(config.badgeId);

    const currentProgress = earned
      ? config.threshold
      : Math.min(config.threshold, perfectionistQuizzesCount);

    const progressPercentage = Math.min(
      100,
      Math.max(0, Math.round((currentProgress / config.threshold) * 100))
    );

    const t = config.tier || 'normal';
    return {
      badgeId: config.badgeId,
      tier: t,
      tierLabel: `${t.charAt(0).toUpperCase() + t.slice(1)} Tier`,
      categoryLabel: 'Perfectionist',
      unit: 'quizzes',
      name: config.name,
      title: config.title,
      requirement: config.requirement,
      threshold: config.threshold,
      thresholdLabel: config.thresholdLabel || `${config.threshold} Qualifying Quizzes`,
      description: config.description,
      image: config.image,
      cloudinaryUrl: config.cloudinaryUrl || config.image,
      fallbackImage: config.fallbackImage || config.image,
      category: 'quiz_excellence',
      isUnlocked: Boolean(earned),
      unlocked: Boolean(earned),
      unlockedAt: earnedRecord?.unlockedAt || (earned ? new Date() : null),
      progress: currentProgress,
      currentProgress,
      progressPercent: progressPercentage,
      progressPercentage,
      progressText: `${currentProgress} / ${config.threshold} qualifying quizzes`
    };
  });

  const visibleStreakCards = selectProgressiveBadges(streakCards);
  const visibleKnowledgeSeekerCards = selectProgressiveBadges(knowledgeSeekerCards);
  const visiblePerfectionistCards = selectProgressiveBadges(perfectionistCards);

  const earnedBadges = [...streakCards, ...knowledgeSeekerCards, ...perfectionistCards]
    .filter((b) => b.unlocked)
    .sort((a, b) => {
      const timeDiff = new Date(b.unlockedAt || 0).getTime() - new Date(a.unlockedAt || 0).getTime();
      if (timeDiff !== 0) return timeDiff;
      return Number(b.threshold || 0) - Number(a.threshold || 0);
    });

  const badgesInProgress = [
    streakCards.find((b) => !b.unlocked) || null,
    knowledgeSeekerCards.find((b) => !b.unlocked) || null,
    perfectionistCards.find((b) => !b.unlocked) || null
  ].filter(Boolean);

  const streakUnlockedCount = streakCards.filter((b) => b.unlocked).length;
  const knowledgeSeekerUnlockedCount = knowledgeSeekerCards.filter((b) => b.unlocked).length;
  const perfectionistUnlockedCount = perfectionistCards.filter((b) => b.unlocked).length;

  // Count unique unlocked badge IDs strictly across platform
  const uniqueUnlockedBadgeIds = new Set();
  if (learner && Array.isArray(learner.badges)) {
    learner.badges.forEach((b) => {
      if (b.badgeId) uniqueUnlockedBadgeIds.add(b.badgeId);
    });
  }
  streakCards.forEach(b => { if (b.unlocked) uniqueUnlockedBadgeIds.add(b.badgeId); });
  knowledgeSeekerCards.forEach(b => { if (b.unlocked) uniqueUnlockedBadgeIds.add(b.badgeId); });
  perfectionistCards.forEach(b => { if (b.unlocked) uniqueUnlockedBadgeIds.add(b.badgeId); });

  const totalBadgesEarned = uniqueUnlockedBadgeIds.size;

  return {
    streakBadges: visibleStreakCards,
    knowledgeSeekerBadges: visibleKnowledgeSeekerCards,
    perfectionistBadges: visiblePerfectionistCards,
    earnedBadges,
    badgesInProgress,
    badges: [
      ...visibleStreakCards,
      ...visibleKnowledgeSeekerCards,
      ...visiblePerfectionistCards
    ],
    stats: {
      currentStreak,
      longestStreak,
      coursesCompleted: completedCoursesCount,
      perfectionistQuizzesCount,
      totalBadgesEarned,
      streakBadgesUnlocked: streakUnlockedCount,
      totalStreakBadges: STREAK_BADGES.length,
      knowledgeSeekerBadgesUnlocked: knowledgeSeekerUnlockedCount,
      totalKnowledgeSeekerBadges: KNOWLEDGE_SEEKER_BADGES.length,
      perfectionistBadgesUnlocked: perfectionistUnlockedCount,
      totalPerfectionistBadges: PERFECTIONIST_BADGES.length,
      totalPlatformBadges:
        STREAK_BADGES.length +
        KNOWLEDGE_SEEKER_BADGES.length +
        PERFECTIONIST_BADGES.length
    }
  };
};

module.exports = {
  STREAK_BADGES,
  KNOWLEDGE_SEEKER_BADGES,
  PERFECTIONIST_BADGES,
  selectProgressiveBadges,
  getUniqueCompletedCoursesCount,
  getUniqueFirstAttemptQualifyingQuizzesCountForPerfectionist,
  getUniquePerfectQuizzesCountForPerfectionist,
  evaluateAndAwardStreakBadges,
  evaluateAndAwardCourseCompletionBadges,
  evaluateAndAwardPerfectionistBadges,
  evaluateAllBadges,
  getLearnerBadgeProgress
};
