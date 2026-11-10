const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const mongoose = require('mongoose');

const Learner = require('../model/Learner');
const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');
const AssessmentSubmission = require('../model/AssessmentSubmission');
const Notification = require('../model/Notification');

const {
  STREAK_BADGES,
  KNOWLEDGE_SEEKER_BADGES,
  PERFECTIONIST_BADGES,
  getUniqueCompletedCoursesCount,
  getUniqueFirstAttemptQualifyingQuizzesCountForPerfectionist,
  evaluateAndAwardStreakBadges,
  evaluateAndAwardCourseCompletionBadges,
  evaluateAndAwardPerfectionistBadges,
  evaluateAllBadges,
  getLearnerBadgeProgress
} = require('../services/badgeService');

async function runValidation() {
  console.log('====================================================');
  console.log('🧪 UpSkillR — Normal Badges & Profile Integration Validation');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
    }
  }

  // ─── 1. Configuration & Platform Total Badges ───
  assert(STREAK_BADGES.length === 4, 'Streak badges count is 4');
  assert(KNOWLEDGE_SEEKER_BADGES.length === 4, 'Knowledge Seeker badges count is 4');
  assert(PERFECTIONIST_BADGES.length === 4, 'Perfectionist badges count is 4');
  const totalPlatformBadges = STREAK_BADGES.length + KNOWLEDGE_SEEKER_BADGES.length + PERFECTIONIST_BADGES.length;
  assert(totalPlatformBadges === 12, 'Total platform badges is exactly 12');

  // ─── 2. Knowledge Seeker Tiers & Thresholds ───
  const ksNormal = KNOWLEDGE_SEEKER_BADGES.find(b => b.badgeId === 'knowledge_seeker_normal');
  const ksBronze = KNOWLEDGE_SEEKER_BADGES.find(b => b.badgeId === 'knowledge_seeker_bronze');
  const ksSilver = KNOWLEDGE_SEEKER_BADGES.find(b => b.badgeId === 'knowledge_seeker_silver');
  const ksGold = KNOWLEDGE_SEEKER_BADGES.find(b => b.badgeId === 'knowledge_seeker_gold');

  assert(ksNormal && ksNormal.threshold === 5, 'Knowledge Seeker Normal threshold is 5 courses');
  assert(ksBronze && ksBronze.threshold === 15, 'Knowledge Seeker Bronze threshold is 15 courses');
  assert(ksSilver && ksSilver.threshold === 30, 'Knowledge Seeker Silver threshold is 30 courses');
  assert(ksGold && ksGold.threshold === 50, 'Knowledge Seeker Gold threshold is 50 courses');

  // ─── 3. Perfectionist Tiers & Thresholds ───
  const perfNormal = PERFECTIONIST_BADGES.find(b => b.badgeId === 'perfectionist_normal');
  const perfBronze = PERFECTIONIST_BADGES.find(b => b.badgeId === 'perfectionist_bronze');
  const perfSilver = PERFECTIONIST_BADGES.find(b => b.badgeId === 'perfectionist_silver');
  const perfGold = PERFECTIONIST_BADGES.find(b => b.badgeId === 'perfectionist_gold');

  assert(perfNormal && perfNormal.threshold === 3, 'Perfectionist Normal threshold is 3 qualifying quizzes');
  assert(perfBronze && perfBronze.threshold === 10, 'Perfectionist Bronze threshold is 10 qualifying quizzes');
  assert(perfSilver && perfSilver.threshold === 25, 'Perfectionist Silver threshold is 25 qualifying quizzes');
  assert(perfGold && perfGold.threshold === 50, 'Perfectionist Gold threshold is 50 qualifying quizzes');

  // ─── 4. Image assets and Cloudinary URL Configuration ───
  const ksFrontendFile = path.join(__dirname, '../../Frontend/public/assets/badges/knowledge-seeker-normal.png');
  const perfFrontendFile = path.join(__dirname, '../../Frontend/public/assets/badges/perfectionist-normal.png');
  assert(fs.existsSync(ksFrontendFile), 'Frontend static asset for Knowledge Seeker Normal exists');
  assert(fs.existsSync(perfFrontendFile), 'Frontend static asset for Perfectionist Normal exists');

  assert(ksNormal.image.includes('cloudinary.com') || ksNormal.cloudinaryUrl.includes('cloudinary.com'), 'KS Normal configured with Cloudinary URL');
  assert(perfNormal.image.includes('cloudinary.com') || perfNormal.cloudinaryUrl.includes('cloudinary.com'), 'Perf Normal configured with Cloudinary URL');

  // ─── 5. Connect to MongoDB to Test Real DB Queries & Idempotency ───
  const mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI;
  if (!mongoUrl) {
    console.warn('⚠️ No MONGO_URL found in .env; skipping live DB query portion.');
  } else {
    await mongoose.connect(mongoUrl, { dbName: 'UpSkillr' });
    console.log('Connected to MongoDB for live validation.\n');

    const testLearnerId = new mongoose.Types.ObjectId();
    const testCourseId1 = new mongoose.Types.ObjectId();
    const testCourseId2 = new mongoose.Types.ObjectId();
    const testQuizId1 = new mongoose.Types.ObjectId();
    const testQuizId2 = new mongoose.Types.ObjectId();
    const testQuizId3 = new mongoose.Types.ObjectId();
    const testQuizId4 = new mongoose.Types.ObjectId();

    try {
      // Create test learner document
      const testLearner = await Learner.create({
        _id: testLearnerId,
        fullName: 'Validation Test Learner',
        email: `test_learner_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'learner',
        badges: [],
        currentStreak: 0,
        longestStreak: 0
      });

      // Create test published course
      const testCourse = await Course.create({
        _id: testCourseId1,
        title: 'Validation Test Course',
        category: 'Web Development',
        description: 'Validation course for automated testing',
        status: 'published',
        state: 'published',
        isDeleted: false,
        instructorId: new mongoose.Types.ObjectId(),
        modules: []
      });

      // Create active enrolment in testCourse
      await Enrolment.create({
        learnerId: testLearnerId,
        learnerEmail: testLearner.email,
        courseId: testCourseId1,
        courseTitle: testCourse.title,
        status: 'active',
        progressPercentage: 50
      });

      // Test Perfectionist First-Attempt Logic against MongoDB:
      // Quiz 1: Attempt 1 -> 95% (Qualifies, count: 1)
      await AssessmentSubmission.create({
        courseId: testCourseId1,
        assessmentId: testQuizId1,
        assessmentTitle: 'Quiz 1',
        learnerId: testLearnerId,
        learnerName: 'Test Learner',
        learnerEmail: testLearner.email,
        attemptNumber: 1,
        isFirstAttempt: true,
        percentage: 95,
        totalScore: 95,
        maxScore: 100,
        status: 'graded',
        submittedAt: new Date(Date.now() - 50000)
      });

      // Quiz 1: Attempt 2 (retake) -> 100% (Should NOT increase count!)
      await AssessmentSubmission.create({
        courseId: testCourseId1,
        assessmentId: testQuizId1,
        assessmentTitle: 'Quiz 1',
        learnerId: testLearnerId,
        learnerName: 'Test Learner',
        learnerEmail: testLearner.email,
        attemptNumber: 2,
        isFirstAttempt: false,
        percentage: 100,
        totalScore: 100,
        maxScore: 100,
        status: 'graded',
        submittedAt: new Date(Date.now() - 40000)
      });

      // Quiz 2: Attempt 1 -> 80% (Did NOT reach 90%)
      await AssessmentSubmission.create({
        courseId: testCourseId1,
        assessmentId: testQuizId2,
        assessmentTitle: 'Quiz 2',
        learnerId: testLearnerId,
        learnerName: 'Test Learner',
        learnerEmail: testLearner.email,
        attemptNumber: 1,
        isFirstAttempt: true,
        percentage: 80,
        totalScore: 80,
        maxScore: 100,
        status: 'graded',
        submittedAt: new Date(Date.now() - 30000)
      });

      // Quiz 2: Attempt 2 (retake) -> 98% (Must NOT count because 1st attempt was <90%!)
      await AssessmentSubmission.create({
        courseId: testCourseId1,
        assessmentId: testQuizId2,
        assessmentTitle: 'Quiz 2',
        learnerId: testLearnerId,
        learnerName: 'Test Learner',
        learnerEmail: testLearner.email,
        attemptNumber: 2,
        isFirstAttempt: false,
        percentage: 98,
        totalScore: 98,
        maxScore: 100,
        status: 'graded',
        submittedAt: new Date(Date.now() - 20000)
      });

      // Quiz 3: Attempt 1 -> 90% (Qualifies, count: 2)
      await AssessmentSubmission.create({
        courseId: testCourseId1,
        assessmentId: testQuizId3,
        assessmentTitle: 'Quiz 3',
        learnerId: testLearnerId,
        learnerName: 'Test Learner',
        learnerEmail: testLearner.email,
        attemptNumber: 1,
        isFirstAttempt: true,
        percentage: 90,
        totalScore: 90,
        maxScore: 100,
        status: 'graded',
        submittedAt: new Date(Date.now() - 10000)
      });

      let count = await getUniqueFirstAttemptQualifyingQuizzesCountForPerfectionist(testLearnerId);
      assert(count === 2, 'Quiz 1 (retake ignored) + Quiz 2 (failed first attempt ignored) + Quiz 3 = exactly 2 qualifying quizzes');

      // Now add Quiz 4: Attempt 1 -> 92% (Qualifies, count: 3)
      await AssessmentSubmission.create({
        courseId: testCourseId1,
        assessmentId: testQuizId4,
        assessmentTitle: 'Quiz 4',
        learnerId: testLearnerId,
        learnerName: 'Test Learner',
        learnerEmail: testLearner.email,
        attemptNumber: 1,
        isFirstAttempt: true,
        percentage: 92,
        totalScore: 92,
        maxScore: 100,
        status: 'graded',
        submittedAt: new Date()
      });

      count = await getUniqueFirstAttemptQualifyingQuizzesCountForPerfectionist(testLearnerId);
      assert(count === 3, 'After 3 qualifying first attempts, count is exactly 3');

      // Evaluate Perfectionist Badges against testLearner
      const perfAwardRes = await evaluateAndAwardPerfectionistBadges(testLearner);
      assert(perfAwardRes.newlyAwarded.length === 1, 'Perfectionist Normal is newly awarded');
      assert(perfAwardRes.newlyAwarded[0].badgeId === 'perfectionist_normal', 'Awarded badge is perfectionist_normal');
      assert(testLearner.badges.some(b => b.badgeId === 'perfectionist_normal'), 'testLearner has perfectionist_normal in badges array');

      // Idempotency: evaluate again with same state
      const perfRepeatRes = await evaluateAndAwardPerfectionistBadges(testLearner);
      assert(perfRepeatRes.newlyAwarded.length === 0, 'Evaluating again is strictly idempotent (0 newly awarded)');
      assert(testLearner.badges.filter(b => b.badgeId === 'perfectionist_normal').length === 1, 'No duplicate badge stored');

      // Test Course Completion Badges with real 5 completed courses in MongoDB
      const createdCourses = [];
      for (let i = 0; i < 5; i++) {
        const cId = new mongoose.Types.ObjectId();
        createdCourses.push(cId);
        await Course.create({
          _id: cId,
          title: `KS Course ${i + 1}`,
          category: 'Web Development',
          description: 'Test KS Course',
          status: 'published',
          state: 'published',
          isDeleted: false,
          instructorId: new mongoose.Types.ObjectId(),
          modules: []
        });
        await Enrolment.create({
          learnerId: testLearnerId,
          learnerEmail: testLearner.email,
          courseId: cId,
          courseTitle: `KS Course ${i + 1}`,
          status: 'completed',
          progressPercentage: 100
        });
      }

      const uniqueCompletedCount = await getUniqueCompletedCoursesCount(testLearnerId);
      assert(uniqueCompletedCount === 5, 'getUniqueCompletedCoursesCount returns 5 from persisted MongoDB records');

      const courseAwardRes = await evaluateAndAwardCourseCompletionBadges(testLearner);
      assert(courseAwardRes.newlyAwarded.length === 1, 'Knowledge Seeker Normal is newly awarded at 5 completed courses');
      assert(courseAwardRes.newlyAwarded[0].badgeId === 'knowledge_seeker_normal', 'Awarded badge is knowledge_seeker_normal');

      // Test KS Bronze (15), Silver (30), Gold (50) evaluation
      const ksBronzeRes = await evaluateAndAwardCourseCompletionBadges(testLearner, 15);
      assert(ksBronzeRes.newlyAwarded.some(b => b.badgeId === 'knowledge_seeker_bronze'), '15 courses unlocks Knowledge Seeker Bronze');
      const ksSilverRes = await evaluateAndAwardCourseCompletionBadges(testLearner, 30);
      assert(ksSilverRes.newlyAwarded.some(b => b.badgeId === 'knowledge_seeker_silver'), '30 courses unlocks Knowledge Seeker Silver');
      const ksGoldRes = await evaluateAndAwardCourseCompletionBadges(testLearner, 50);
      assert(ksGoldRes.newlyAwarded.some(b => b.badgeId === 'knowledge_seeker_gold'), '50 courses unlocks Knowledge Seeker Gold');

      // Test Streak System Integrity
      testLearner.currentStreak = 30;
      testLearner.longestStreak = 30;
      const streakRes = await evaluateAndAwardStreakBadges(testLearner);
      assert(streakRes.newlyAwarded.some(b => b.badgeId === 'streak_30'), '30-day streak continues to unlock Streak Achiever');

      // Cleanup extra courses
      await Course.deleteMany({ _id: { $in: createdCourses } });

      // Test full progress helper
      const progress = await getLearnerBadgeProgress(testLearner, 5, 3);
      assert(progress.stats.totalBadgesEarned === 6, 'Total badges earned matches exact unlocked set (Streak30 + KS 4 + Perf Normal = 6)');
      assert(progress.stats.totalPlatformBadges === 12, 'Stats totalPlatformBadges is 12');
      assert(progress.stats.totalKnowledgeSeekerBadges === 4, 'Stats totalKnowledgeSeekerBadges is 4');
      assert(progress.stats.totalPerfectionistBadges === 4, 'Stats totalPerfectionistBadges is 4');
      assert(progress.knowledgeSeekerBadges[0].isUnlocked === true, 'Knowledge Seeker Normal is marked unlocked');
      assert(progress.perfectionistBadges[0].isUnlocked === true, 'Perfectionist Normal is marked unlocked');
      assert(progress.perfectionistBadges[1].isUnlocked === false, 'Perfectionist Bronze is marked locked');

    } finally {
      // Clean up all synthetic test data from DB
      await Learner.deleteOne({ _id: testLearnerId });
      await Course.deleteOne({ _id: testCourseId1 });
      await Enrolment.deleteMany({ learnerId: testLearnerId });
      await AssessmentSubmission.deleteMany({ learnerId: testLearnerId });
      await Notification.deleteMany({ recipientId: testLearnerId });
      await mongoose.disconnect();
      console.log('Cleaned up synthetic test records and disconnected from MongoDB.\n');
    }
  }

  console.log(`====================================================`);
  console.log(`Summary: ${passedTests}/${totalTests} tests passed.`);
  console.log(`====================================================\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runValidation().catch((err) => {
  console.error('Validation script execution error:', err);
  process.exit(1);
});
