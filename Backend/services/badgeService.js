const Notification = require('../model/Notification');
const Enrolment = require('../model/Enrolment');
const Course = require('../model/Course');
const AssessmentSubmission = require('../model/AssessmentSubmission');
const { logLearnerActivity } = require('./activityService');

// ─── Four Learning Streak Badges Configuration ───
const STREAK_BADGES = [
  {
    badgeId: 'streak_30',
    threshold: 30,
    name: 'Streak Achiever',
    title: 'Streak Achiever — 30 Days',
    thresholdLabel: '30 Consecutive Days',
    description: 'Your learning journey is becoming a habit! Maintain a 30-day continuous streak.',
    image: '/assets/badges/streak-achiever.png',
    category: 'streak'
  },
  {
    badgeId: 'streak_150',
    threshold: 150,
    name: 'Bronze Streak',
    title: 'Bronze Streak — 150 Days',
    thresholdLabel: '150 Consecutive Days',
    description: 'Your dedication is impressive! Maintain 150 consecutive days of learning.',
    image: '/assets/badges/bronze-streak.png',
    category: 'streak'
  },
  {
    badgeId: 'streak_500',
    threshold: 500,
    name: 'Silver Streak',
    title: 'Silver Streak — 500 Days',
    thresholdLabel: '500 Consecutive Days',
    description: 'An exceptional commitment to learning. Maintain 500 consecutive days.',
    image: '/assets/badges/silver-streak.png',
    category: 'streak'
  },
  {
    badgeId: 'streak_1000',
    threshold: 1000,
    name: 'Master Streak',
    title: 'Master Streak — 1,000 Days',
    thresholdLabel: '1,000 Consecutive Days',
    description: 'An extraordinary achievement! Maintain a continuous learning streak of 1,000 days.',
    image: '/assets/badges/master-streak.png',
    category: 'streak'
  }
];

// ─── Three Knowledge Seeker Badges Configuration (Course Completion) ───
const KNOWLEDGE_SEEKER_BADGES = [
  {
    badgeId: 'knowledge_seeker_bronze',
    threshold: 5,
    name: 'Knowledge Seeker Bronze',
    title: 'Knowledge Seeker Bronze',
    requirement: 'Complete 5 courses',
    description: 'Explore new subjects, expand your expertise, and complete 5 full courses.',
    notificationMessage: "Congratulations! You've completed 5 courses and unlocked Knowledge Seeker Bronze!",
    image: '/assets/badges/knowledge-seeker-bronze.png',
    category: 'course_completion'
  },
  {
    badgeId: 'knowledge_seeker_silver',
    threshold: 10,
    name: 'Knowledge Seeker Silver',
    title: 'Knowledge Seeker Silver',
    requirement: 'Complete 10 courses',
    description: 'Demonstrate impressive dedication to lifelong learning by completing 10 full courses.',
    notificationMessage: "Amazing progress! You've completed 10 courses and unlocked Knowledge Seeker Silver!",
    image: '/assets/badges/knowledge-seeker-silver.png',
    category: 'course_completion'
  },
  {
    badgeId: 'knowledge_seeker_gold',
    threshold: 20,
    name: 'Knowledge Seeker Gold',
    title: 'Knowledge Seeker Gold',
    requirement: 'Complete 20 courses',
    description: 'Reach the pinnacle of knowledge mastery by completing 20 full courses on UpSkillR.',
    notificationMessage: "Outstanding achievement! You've completed 20 courses and unlocked Knowledge Seeker Gold!",
    image: '/assets/badges/knowledge-seeker-gold.png',
    category: 'course_completion'
  }
];

// ─── Three Quiz Master Badges Configuration (Quiz Performance) ───
const QUIZ_MASTER_BADGES = [
  {
    badgeId: 'quiz_master_bronze',
    threshold: 3,
    name: 'Quiz Master Bronze',
    title: 'Quiz Master Bronze',
    requirement: '100% in 3 unique quizzes',
    description: 'Score 100% in 3 unique quizzes to prove your foundational mastery.',
    notificationMessage: "Congratulations! You've achieved 100% in 3 unique quizzes and unlocked Quiz Master Bronze!",
    image: '/assets/badges/quiz-master-bronze.png',
    category: 'quiz_performance'
  },
  {
    badgeId: 'quiz_master_silver',
    threshold: 10,
    name: 'Quiz Master Silver',
    title: 'Quiz Master Silver',
    requirement: '100% in 10 unique quizzes',
    description: 'Achieve perfect scores in 10 unique quizzes to demonstrate consistent excellence.',
    notificationMessage: "Excellent work! You've achieved perfect scores in 10 unique quizzes and unlocked Quiz Master Silver!",
    image: '/assets/badges/quiz-master-silver.png',
    category: 'quiz_performance'
  },
  {
    badgeId: 'quiz_master_gold',
    threshold: 25,
    name: 'Quiz Master Gold',
    title: 'Quiz Master Gold',
    requirement: '100% in 25 unique quizzes',
    description: 'Attain the pinnacle of quiz mastery with perfect 100% scores in 25 unique quizzes.',
    notificationMessage: "Outstanding! You've achieved perfect scores in 25 unique quizzes and unlocked Quiz Master Gold!",
    image: '/assets/badges/quiz-master-gold.png',
    category: 'quiz_performance'
  }
];

// ─── Three Consistent Learner Badges Configuration (Lesson Completion) ───
const CONSISTENT_LEARNER_BADGES = [
  {
    badgeId: 'consistent_learner_bronze',
    threshold: 10,
    name: 'Consistent Learner Bronze',
    title: 'Consistent Learner Bronze',
    requirement: 'Complete 10 unique lessons',
    description: 'Complete 10 unique lessons across your courses to establish steady learning momentum.',
    notificationMessage: "Congratulations! You've completed 10 unique lessons and unlocked Consistent Learner Bronze!",
    image: '/assets/badges/consistent-learner-bronze.png',
    category: 'learning_consistency'
  },
  {
    badgeId: 'consistent_learner_silver',
    threshold: 50,
    name: 'Consistent Learner Silver',
    title: 'Consistent Learner Silver',
    requirement: 'Complete 50 unique lessons',
    description: 'Complete 50 unique lessons across your courses to show continuous growth and discipline.',
    notificationMessage: "Great consistency! You've completed 50 unique lessons and unlocked Consistent Learner Silver!",
    image: '/assets/badges/consistent-learner-silver.png',
    category: 'learning_consistency'
  },
  {
    badgeId: 'consistent_learner_gold',
    threshold: 100,
    name: 'Consistent Learner Gold',
    title: 'Consistent Learner Gold',
    requirement: 'Complete 100 unique lessons',
    description: 'Reach the pinnacle of daily dedication by completing 100 unique lessons on UpSkillR.',
    notificationMessage: "Outstanding dedication! You've completed 100 unique lessons and unlocked Consistent Learner Gold!",
    image: '/assets/badges/consistent-learner-gold.png',
    category: 'learning_consistency'
  }
];

// ─── Three Perfectionist Badges Configuration (Academic Excellence - First Attempt 90%+) ───
const PERFECTIONIST_BADGES = [
  {
    badgeId: 'perfectionist_bronze',
    threshold: 3,
    name: 'Perfectionist Bronze',
    title: 'Perfectionist Bronze',
    requirement: 'Score 90%+ in 3 first attempts',
    description: 'Score 90% or above in 3 unique quizzes on your first attempt.',
    notificationMessage: "Outstanding! You've scored 90%+ on your first attempt in 3 unique quizzes and unlocked Perfectionist Bronze!",
    image: '/assets/badges/perfectionist-bronze.png',
    category: 'quiz_excellence'
  },
  {
    badgeId: 'perfectionist_silver',
    threshold: 10,
    name: 'Perfectionist Silver',
    title: 'Perfectionist Silver',
    requirement: 'Score 90%+ in 10 first attempts',
    description: 'Score 90% or above in 10 unique quizzes on your first attempt.',
    notificationMessage: "Exceptional excellence! You've scored 90%+ on your first attempt in 10 unique quizzes and unlocked Perfectionist Silver!",
    image: '/assets/badges/perfectionist-silver.png',
    category: 'quiz_excellence'
  },
  {
    badgeId: 'perfectionist_gold',
    threshold: 25,
    name: 'Perfectionist Gold',
    title: 'Perfectionist Gold',
    requirement: 'Score 90%+ in 25 first attempts',
    description: 'Score 90% or above in 25 unique quizzes on your first attempt.',
    notificationMessage: "Academic mastery! You've scored 90%+ on your first attempt in 25 unique quizzes and unlocked Perfectionist Gold!",
    image: '/assets/badges/perfectionist-gold.png',
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
 * Counts unique quizzes where the learner achieved a 100% score on any valid submitted/graded attempt.
 * Excludes:
 * - Scores < 100% (e.g., 99% does not qualify)
 * - Duplicate attempts on the same quiz (each unique quiz counts at most once)
 * - Quizzes in soft-deleted courses
 *
 * @param {string|ObjectId} learnerId
 * @returns {Promise<number>} Number of unique quizzes where learner scored 100%
 */
const getUniquePerfectQuizzesCount = async (learnerId) => {
  if (!learnerId) return 0;
  try {
    const submissions = await AssessmentSubmission.find({
      learnerId,
      status: { $in: ['submitted', 'graded'] },
      $or: [
        { percentage: 100 },
        {
          $expr: {
            $and: [
              { $gt: ['$maxScore', 0] },
              { $eq: ['$totalScore', '$maxScore'] }
            ]
          }
        }
      ]
    }).populate({
      path: 'courseId',
      select: '_id title isDeleted'
    });

    const uniqueQuizIds = new Set();
    for (const sub of submissions) {
      if (sub.courseId && sub.courseId.isDeleted) {
        continue;
      }

      // Check strictly that score is 100%:
      // 1. Percentage must equal 100
      // 2. Total score must equal maxScore (when maxScore > 0)
      // 3. If totalQuestions is recorded, correctCount must equal totalQuestions
      const percentageValid = Number(sub.percentage) === 100;
      const scoreValid = Number(sub.maxScore) > 0 ? Number(sub.totalScore) === Number(sub.maxScore) : true;
      const questionsValid = Number(sub.totalQuestions) > 0 ? Number(sub.correctCount) === Number(sub.totalQuestions) : true;

      if (percentageValid && scoreValid && questionsValid && sub.assessmentId) {
        uniqueQuizIds.add(String(sub.assessmentId));
      }
    }
    return uniqueQuizIds.size;
  } catch (err) {
    console.error('Error counting unique perfect quizzes:', err);
    return 0;
  }
};

/**
 * Counts unique lessons successfully completed by a learner across all enrolled courses.
 * Enforces:
 * - Unique lessons only (completing the same lesson repeatedly counts at most once)
 * - All enrolled courses contribute to the same total
 * - Non-deleted courses only
 * - Excludes incomplete lessons or video lessons not meeting completion rules
 *
 * @param {string|ObjectId} learnerId
 * @returns {Promise<number>} Number of unique completed lessons
 */
const getUniqueCompletedLessonsCount = async (learnerId) => {
  if (!learnerId) return 0;
  try {
    const enrolments = await Enrolment.find({ learnerId }).populate({
      path: 'courseId',
      select: '_id title status state isDeleted modules lessons'
    });

    const uniqueCompletedLessonKeys = new Set();

    for (const enrolment of enrolments) {
      const course = enrolment.courseId;
      if (!course || course.isDeleted) continue;
      const isCoursePublished = (course.status === 'published' || course.state === 'published');
      if (!isCoursePublished) continue;

      const completedSet = new Set((enrolment.completedLessons || []).map(String));
      if (completedSet.size === 0) continue;

      // Collect all lessons across modules and course root
      const courseLessons = [];
      (course.modules || []).forEach(m => {
        (m.lessons || []).forEach(l => {
          courseLessons.push(l);
        });
      });
      (course.lessons || []).forEach(l => {
        courseLessons.push(l);
      });

      if (courseLessons.length > 0) {
        courseLessons.forEach((l) => {
          const lIdStr = String(l._id);
          const lItems = (l.items || l.contentItems || []);
          const itemIds = lItems.map(i => String(i._id));

          // A lesson is complete if:
          // 1. Its ID is in completedSet, OR
          // 2. All of its items are in completedSet (and itemIds.length > 0)
          const isDirectlyDone = completedSet.has(lIdStr);
          const areItemsDone = itemIds.length > 0 && itemIds.every(id => completedSet.has(id));

          if (isDirectlyDone || areItemsDone) {
            uniqueCompletedLessonKeys.add(`${course._id}_${lIdStr}`);
          }
        });
      } else {
        // Fallback for flat courses where completedLessons contains lesson IDs directly
        enrolment.completedLessons.forEach(id => {
          if (id) {
            uniqueCompletedLessonKeys.add(`${course._id}_${String(id)}`);
          }
        });
      }
    }

    return uniqueCompletedLessonKeys.size;
  } catch (err) {
    console.error('Error counting unique completed lessons:', err);
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
        name: badgeConfig.name,
        category: 'course_completion',
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
 * Evaluates unique perfect (100%) quiz count and unlocks Quiz Master badges idempotently.
 *
 * @param {Object} learner - Mongoose Learner document
 * @param {number|null} [precomputedCount=null] - Optional pre-computed unique perfect quiz count
 * @returns {Promise<Object>} { newlyAwarded: Array, badges: Array, totalBadgesCount: Number }
 */
const evaluateAndAwardQuizMasterBadges = async (learner, precomputedCount = null) => {
  if (!learner || learner.role !== 'learner') {
    return { newlyAwarded: [], badges: [], totalBadgesCount: 0 };
  }

  if (!Array.isArray(learner.badges)) {
    learner.badges = [];
  }

  const perfectCount = typeof precomputedCount === 'number'
    ? precomputedCount
    : await getUniquePerfectQuizzesCount(learner._id);

  const existingBadgeIds = new Set(learner.badges.map((b) => b.badgeId));
  const newlyAwarded = [];

  for (const badgeConfig of QUIZ_MASTER_BADGES) {
    if (perfectCount >= badgeConfig.threshold && !existingBadgeIds.has(badgeConfig.badgeId)) {
      const unlockDate = new Date();
      const newBadgeRecord = {
        badgeId: badgeConfig.badgeId,
        name: badgeConfig.name,
        category: 'quiz_performance',
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
          title: `🎯 New Badge Unlocked: ${badgeConfig.name}!`,
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
 * Evaluates unique completed lesson count and unlocks Consistent Learner badges idempotently.
 *
 * @param {Object} learner - Mongoose Learner document
 * @param {number|null} [precomputedCount=null] - Optional pre-computed unique completed lesson count
 * @returns {Promise<Object>} { newlyAwarded: Array, badges: Array, totalBadgesCount: Number }
 */
const evaluateAndAwardConsistentLearnerBadges = async (learner, precomputedCount = null) => {
  if (!learner || learner.role !== 'learner') {
    return { newlyAwarded: [], badges: [], totalBadgesCount: 0 };
  }

  if (!Array.isArray(learner.badges)) {
    learner.badges = [];
  }

  const completedCount = typeof precomputedCount === 'number'
    ? precomputedCount
    : await getUniqueCompletedLessonsCount(learner._id);

  const existingBadgeIds = new Set(learner.badges.map((b) => b.badgeId));
  const newlyAwarded = [];

  for (const badgeConfig of CONSISTENT_LEARNER_BADGES) {
    if (completedCount >= badgeConfig.threshold && !existingBadgeIds.has(badgeConfig.badgeId)) {
      const unlockDate = new Date();
      const newBadgeRecord = {
        badgeId: badgeConfig.badgeId,
        name: badgeConfig.name,
        category: 'learning_consistency',
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
          title: `💻 New Badge Unlocked: ${badgeConfig.name}!`,
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
        name: badgeConfig.name,
        category: 'quiz_excellence',
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
 * Unified evaluator for Streak, Knowledge Seeker, Quiz Master, Consistent Learner, and Perfectionist badges.
 *
 * @param {Object} learner
 * @param {number|null} [precomputedCompletedCount=null]
 * @param {number|null} [precomputedPerfectQuizzesCount=null]
 * @param {number|null} [precomputedCompletedLessonsCount=null]
 * @param {number|null} [precomputedPerfectionistQuizzesCount=null]
 * @returns {Promise<Object>}
 */
const evaluateAllBadges = async (
  learner,
  precomputedCompletedCount = null,
  precomputedPerfectQuizzesCount = null,
  precomputedCompletedLessonsCount = null,
  precomputedPerfectionistQuizzesCount = null
) => {
  const streakRes = await evaluateAndAwardStreakBadges(learner);
  const courseRes = await evaluateAndAwardCourseCompletionBadges(learner, precomputedCompletedCount);
  const quizRes = await evaluateAndAwardQuizMasterBadges(learner, precomputedPerfectQuizzesCount);
  const lessonRes = await evaluateAndAwardConsistentLearnerBadges(learner, precomputedCompletedLessonsCount);
  const perfectionistRes = await evaluateAndAwardPerfectionistBadges(learner, precomputedPerfectionistQuizzesCount);

  return {
    newlyAwarded: [
      ...(streakRes.newlyAwarded || []),
      ...(courseRes.newlyAwarded || []),
      ...(quizRes.newlyAwarded || []),
      ...(lessonRes.newlyAwarded || []),
      ...(perfectionistRes.newlyAwarded || [])
    ],
    badges: learner?.badges || [],
    totalBadgesCount: learner?.badges?.length || 0
  };
};

/**
 * Builds formatted badge representations for frontend display.
 * Includes Streak Badges, Knowledge Seeker Badges, Quiz Master Badges, Consistent Learner Badges, and Perfectionist Badges.
 *
 * @param {Object} learner - Learner document or learner stats
 * @param {number|null} [precomputedCompletedCount=null]
 * @param {number|null} [precomputedPerfectQuizzesCount=null]
 * @param {number|null} [precomputedCompletedLessonsCount=null]
 * @param {number|null} [precomputedPerfectionistQuizzesCount=null]
 * @returns {Promise<Object>} { streakBadges, knowledgeSeekerBadges, quizMasterBadges, consistentLearnerBadges, perfectionistBadges, badges, stats }
 */
const getLearnerBadgeProgress = async (
  learner,
  precomputedCompletedCount = null,
  precomputedPerfectQuizzesCount = null,
  precomputedCompletedLessonsCount = null,
  precomputedPerfectionistQuizzesCount = null
) => {
  const currentStreak = Number(learner?.currentStreak) || 0;
  const longestStreak = Number(learner?.longestStreak) || 0;
  const effectiveStreak = Math.max(currentStreak, longestStreak);

  const completedCoursesCount = typeof precomputedCompletedCount === 'number'
    ? precomputedCompletedCount
    : await getUniqueCompletedCoursesCount(learner?._id);

  const perfectQuizzesCount = typeof precomputedPerfectQuizzesCount === 'number'
    ? precomputedPerfectQuizzesCount
    : await getUniquePerfectQuizzesCount(learner?._id);

  const completedLessonsCount = typeof precomputedCompletedLessonsCount === 'number'
    ? precomputedCompletedLessonsCount
    : await getUniqueCompletedLessonsCount(learner?._id);

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

    return {
      badgeId: config.badgeId,
      name: config.name,
      title: config.title,
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

    return {
      badgeId: config.badgeId,
      name: config.name,
      title: config.title,
      requirement: config.requirement,
      threshold: config.threshold,
      thresholdLabel: `${config.threshold} Courses`,
      description: config.description,
      image: config.image,
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

  // 3. Format Quiz Master Badges
  const quizMasterCards = QUIZ_MASTER_BADGES.map((config) => {
    const earned = earnedBadgesMap.has(config.badgeId) || perfectQuizzesCount >= config.threshold;
    const earnedRecord = earnedBadgesMap.get(config.badgeId);

    const currentProgress = earned
      ? config.threshold
      : Math.min(config.threshold, perfectQuizzesCount);

    const progressPercentage = Math.min(
      100,
      Math.max(0, Math.round((currentProgress / config.threshold) * 100))
    );

    return {
      badgeId: config.badgeId,
      name: config.name,
      title: config.title,
      requirement: config.requirement,
      threshold: config.threshold,
      thresholdLabel: `${config.threshold} Quizzes`,
      description: config.description,
      image: config.image,
      category: 'quiz_performance',
      isUnlocked: Boolean(earned),
      unlocked: Boolean(earned),
      unlockedAt: earnedRecord?.unlockedAt || (earned ? new Date() : null),
      progress: currentProgress,
      currentProgress,
      progressPercent: progressPercentage,
      progressPercentage,
      progressText: `${currentProgress} / ${config.threshold} quizzes`
    };
  });

  // 4. Format Consistent Learner Badges
  const consistentLearnerCards = CONSISTENT_LEARNER_BADGES.map((config) => {
    const earned = earnedBadgesMap.has(config.badgeId) || completedLessonsCount >= config.threshold;
    const earnedRecord = earnedBadgesMap.get(config.badgeId);

    const currentProgress = earned
      ? config.threshold
      : Math.min(config.threshold, completedLessonsCount);

    const progressPercentage = Math.min(
      100,
      Math.max(0, Math.round((currentProgress / config.threshold) * 100))
    );

    return {
      badgeId: config.badgeId,
      name: config.name,
      title: config.title,
      requirement: config.requirement,
      threshold: config.threshold,
      thresholdLabel: `${config.threshold} Lessons`,
      description: config.description,
      image: config.image,
      category: 'learning_consistency',
      isUnlocked: Boolean(earned),
      unlocked: Boolean(earned),
      unlockedAt: earnedRecord?.unlockedAt || (earned ? new Date() : null),
      progress: currentProgress,
      currentProgress,
      progressPercent: progressPercentage,
      progressPercentage,
      progressText: `${currentProgress} / ${config.threshold} lessons`
    };
  });

  // 5. Format Perfectionist Badges
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

    return {
      badgeId: config.badgeId,
      name: config.name,
      title: config.title,
      requirement: config.requirement,
      threshold: config.threshold,
      thresholdLabel: `${config.threshold} Qualifying Quizzes`,
      description: config.description,
      image: config.image,
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

  const streakUnlockedCount = streakCards.filter((b) => b.unlocked).length;
  const knowledgeSeekerUnlockedCount = knowledgeSeekerCards.filter((b) => b.unlocked).length;
  const quizMasterUnlockedCount = quizMasterCards.filter((b) => b.unlocked).length;
  const consistentLearnerUnlockedCount = consistentLearnerCards.filter((b) => b.unlocked).length;
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
  quizMasterCards.forEach(b => { if (b.unlocked) uniqueUnlockedBadgeIds.add(b.badgeId); });
  consistentLearnerCards.forEach(b => { if (b.unlocked) uniqueUnlockedBadgeIds.add(b.badgeId); });
  perfectionistCards.forEach(b => { if (b.unlocked) uniqueUnlockedBadgeIds.add(b.badgeId); });

  const totalBadgesEarned = uniqueUnlockedBadgeIds.size;

  return {
    streakBadges: streakCards,
    knowledgeSeekerBadges: knowledgeSeekerCards,
    quizMasterBadges: quizMasterCards,
    consistentLearnerBadges: consistentLearnerCards,
    perfectionistBadges: perfectionistCards,
    badges: [
      ...streakCards,
      ...knowledgeSeekerCards,
      ...quizMasterCards,
      ...consistentLearnerCards,
      ...perfectionistCards
    ],
    stats: {
      currentStreak,
      longestStreak,
      coursesCompleted: completedCoursesCount,
      perfectQuizzesCount,
      lessonsCompleted: completedLessonsCount,
      perfectionistQuizzesCount,
      totalBadgesEarned,
      streakBadgesUnlocked: streakUnlockedCount,
      totalStreakBadges: STREAK_BADGES.length,
      knowledgeSeekerBadgesUnlocked: knowledgeSeekerUnlockedCount,
      totalKnowledgeSeekerBadges: KNOWLEDGE_SEEKER_BADGES.length,
      quizMasterBadgesUnlocked: quizMasterUnlockedCount,
      totalQuizMasterBadges: QUIZ_MASTER_BADGES.length,
      consistentLearnerBadgesUnlocked: consistentLearnerUnlockedCount,
      totalConsistentLearnerBadges: CONSISTENT_LEARNER_BADGES.length,
      perfectionistBadgesUnlocked: perfectionistUnlockedCount,
      totalPerfectionistBadges: PERFECTIONIST_BADGES.length,
      totalPlatformBadges:
        STREAK_BADGES.length +
        KNOWLEDGE_SEEKER_BADGES.length +
        QUIZ_MASTER_BADGES.length +
        CONSISTENT_LEARNER_BADGES.length +
        PERFECTIONIST_BADGES.length
    }
  };
};

module.exports = {
  STREAK_BADGES,
  KNOWLEDGE_SEEKER_BADGES,
  QUIZ_MASTER_BADGES,
  CONSISTENT_LEARNER_BADGES,
  PERFECTIONIST_BADGES,
  getUniqueCompletedCoursesCount,
  getUniquePerfectQuizzesCount,
  getUniqueCompletedLessonsCount,
  getUniqueFirstAttemptQualifyingQuizzesCountForPerfectionist,
  getUniquePerfectQuizzesCountForPerfectionist,
  evaluateAndAwardStreakBadges,
  evaluateAndAwardCourseCompletionBadges,
  evaluateAndAwardQuizMasterBadges,
  evaluateAndAwardConsistentLearnerBadges,
  evaluateAndAwardPerfectionistBadges,
  evaluateAllBadges,
  getLearnerBadgeProgress
};
