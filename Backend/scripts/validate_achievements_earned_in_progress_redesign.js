/**
 * End-to-End Validation for Redesigned Achievements Page:
 * Section 1: Earned Badges (unified across Streak, Knowledge Seeker, Perfectionist)
 * Section 2: Badges in Progress (only next locked badge per incomplete category)
 * + Dynamic movement on unlock, category completion, celebratory state, and date preservation.
 */
const path = require('path');
const { pathToFileURL } = require('url');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const assert = require('assert');
const mongoose = require('mongoose');

const Learner = require('../model/Learner');
const Notification = require('../model/Notification');
const LearnerActivity = require('../model/LearnerActivity');
const learnerController = require('../controller/learnerController');
const {
  evaluateAllBadges,
  getLearnerBadgeProgress
} = require('../services/badgeService');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(p) {
      this.body = p;
      return this;
    }
  };
}

async function run() {
  console.log('==================================================================');
  console.log('🏆 UpSkillR — Earned Badges & Badges in Progress Redesign Check');
  console.log('==================================================================\n');

  const mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI;
  await mongoose.connect(mongoUrl, { dbName: 'UpSkillr' });

  const suffix = Date.now();
  const learnerId = new mongoose.Types.ObjectId();

  try {
    // 1. Fresh Learner (0 badges earned, active progress below Normal thresholds)
    const learner = await Learner.create({
      _id: learnerId,
      fullName: `Achievement Redesign Tester ${suffix}`,
      email: `ach_redesign_${suffix}@example.com`,
      password: '$2b$10$hashedpasswordplaceholderfortesting1234567890',
      role: 'learner',
      currentStreak: 3,
      longestStreak: 3,
      badges: []
    });

    const stage0 = await getLearnerBadgeProgress(learner, 2, 1);
    assert.strictEqual(stage0.earnedBadges.length, 0, 'Stage 0: 0 earned badges initially');
    assert.strictEqual(stage0.badgesInProgress.length, 3, 'Stage 0: 3 badges in progress (1 per category)');
    assert.deepStrictEqual(
      stage0.badgesInProgress.map((b) => b.badgeId),
      ['streak_30', 'knowledge_seeker_normal', 'perfectionist_normal']
    );
    assert.strictEqual(stage0.badgesInProgress[0].tier, 'normal');
    assert.strictEqual(stage0.badgesInProgress[0].progress, 3);
    assert.strictEqual(stage0.badgesInProgress[0].threshold, 30);
    assert.strictEqual(stage0.badgesInProgress[1].progress, 2);
    assert.strictEqual(stage0.badgesInProgress[1].threshold, 5);
    assert.strictEqual(stage0.badgesInProgress[2].progress, 1);
    assert.strictEqual(stage0.badgesInProgress[2].threshold, 3);
    console.log('✅ [PASS] 1. Initial 0 earned badges + 3 category next-locked progress bars verified');

    // 2. Unlock Perfectionist Normal (3 qualifying quizzes) -> moves from Progress to Earned; Bronze appears in Progress
    const earnedDateNormal = new Date('2026-11-01T10:00:00Z');
    learner.badges = [
      {
        badgeId: 'perfectionist_normal',
        name: 'Perfectionist Normal',
        category: 'quiz_excellence',
        threshold: 3,
        unlockedAt: earnedDateNormal
      }
    ];
    await learner.save();

    const beforeBronze = await getLearnerBadgeProgress(learner, 2, 4);
    assert.strictEqual(beforeBronze.earnedBadges.length, 1);
    assert.strictEqual(beforeBronze.earnedBadges[0].badgeId, 'perfectionist_normal');
    assert.strictEqual(
      new Date(beforeBronze.earnedBadges[0].unlockedAt).toISOString(),
      earnedDateNormal.toISOString(),
      'Earned date must preserve exact original unlockedAt'
    );
    assert.strictEqual(
      beforeBronze.badgesInProgress.find((b) => b.category === 'quiz_excellence')?.badgeId,
      'perfectionist_bronze',
      'Perfectionist In Progress must show Bronze next'
    );
    assert(!beforeBronze.badgesInProgress.some((b) => b.badgeId === 'perfectionist_normal'), 'Unlocked badge must never stay in progress');

    // 3. Meet Bronze threshold (10 qualifying quizzes) -> evaluateAllBadges persists Bronze, moves it into Earned, reveals Silver
    await evaluateAllBadges(learner, 2, 10);
    await evaluateAllBadges(learner, 2, 10); // idempotent duplicate guard check
    const refreshedLearner = await Learner.findById(learnerId);
    assert.strictEqual(refreshedLearner.badges.length, 2, 'Should contain exactly 2 unique badges (no duplicates)');

    const afterBronze = await getLearnerBadgeProgress(refreshedLearner, 2, 10);
    assert.deepStrictEqual(
      afterBronze.earnedBadges.map((b) => b.badgeId),
      ['perfectionist_bronze', 'perfectionist_normal'],
      'Both Perfectionist Normal & Bronze should move into Earned Badges'
    );
    assert.strictEqual(
      afterBronze.badgesInProgress.find((b) => b.category === 'quiz_excellence')?.badgeId,
      'perfectionist_silver',
      'Perfectionist In Progress must advance to Silver once Bronze unlocks'
    );
    console.log('✅ [PASS] 2. Dynamic movement (Normal -> Bronze -> Silver) + date preservation + duplicate guard verified');

    // 4. Category Completion: Unlock all 4 Knowledge Seeker tiers -> Knowledge Seeker leaves Badges in Progress cleanly
    await evaluateAllBadges(refreshedLearner, 50, 10);
    const catDone = await getLearnerBadgeProgress(refreshedLearner, 50, 10);
    assert.strictEqual(
      catDone.badgesInProgress.some((b) => b.category === 'course_completion'),
      false,
      'Completed Knowledge Seeker category must disappear from Badges in Progress'
    );
    assert.strictEqual(catDone.badgesInProgress.length, 2, 'Only Streak & Perfectionist remain in Progress');
    assert.strictEqual(
      catDone.earnedBadges.filter((b) => b.category === 'course_completion').length,
      4,
      'All 4 Knowledge Seeker tiers stay in Earned Badges'
    );
    console.log('✅ [PASS] 3. Completed category omitted from Badges in Progress while retained in Earned Badges');

    // 5. Endpoint contract check (/learners/me/badges & /learners/me/milestones)
    const badgesRes = mockRes();
    await learnerController.getLearnerBadges({ user: { id: String(learnerId) } }, badgesRes);
    assert.strictEqual(badgesRes.statusCode, 200);
    assert(Array.isArray(badgesRes.body.earnedBadges), 'GET /badges exposes earnedBadges');
    assert(Array.isArray(badgesRes.body.badgesInProgress), 'GET /badges exposes badgesInProgress');

    const milestonesRes = mockRes();
    await learnerController.getLearnerMilestones({ user: { id: String(learnerId) } }, milestonesRes);
    assert.strictEqual(milestonesRes.statusCode, 200);
    assert(Array.isArray(milestonesRes.body.earnedBadges), 'GET /milestones exposes earnedBadges');
    assert(Array.isArray(milestonesRes.body.badgesInProgress), 'GET /milestones exposes badgesInProgress');
    console.log('✅ [PASS] 4. Backend API endpoints (/learners/me/badges & /milestones) verified');

    // 6. Full Completion: All 12 badges unlocked across all 3 categories -> celebratory empty Progress state
    refreshedLearner.currentStreak = 1000;
    refreshedLearner.longestStreak = 1000;
    await refreshedLearner.save();
    await evaluateAllBadges(refreshedLearner, 50, 50);
    const allDone = await getLearnerBadgeProgress(refreshedLearner, 50, 50);
    assert.strictEqual(allDone.earnedBadges.length, 12, 'All 12 platform badges must be in Earned Badges');
    assert.strictEqual(allDone.badgesInProgress.length, 0, '0 badges remain in progress once all categories completed');
    console.log('✅ [PASS] 5. Full 12/12 mastery state verified cleanly');

    // 7. Frontend utility partitionAchievementBadges checks (React view source of truth)
    const badgeProgressUrl = pathToFileURL(path.join(__dirname, '../../Frontend/src/utils/badgeProgress.js')).href;
    const { partitionAchievementBadges } = await import(badgeProgressUrl);

    const feZero = partitionAchievementBadges({
      streakBadges: stage0.streakBadges,
      knowledgeSeekerBadges: stage0.knowledgeSeekerBadges,
      perfectionistBadges: stage0.perfectionistBadges,
      stats: { currentStreak: 3, completedCourses: 2, perfectionistQuizzesCount: 1 }
    });
    assert.strictEqual(feZero.earnedBadges.length, 0);
    assert.strictEqual(feZero.badgesInProgress.length, 3);
    assert.strictEqual(feZero.allCategoriesCompleted, false);

    const feMid = partitionAchievementBadges({
      streakBadges: catDone.streakBadges,
      knowledgeSeekerBadges: catDone.knowledgeSeekerBadges,
      perfectionistBadges: catDone.perfectionistBadges,
      stats: { currentStreak: 3, completedCourses: 50, perfectionistQuizzesCount: 10 }
    });
    assert.strictEqual(feMid.earnedBadges.length, 6, 'Frontend earnedBadges combines 4 KS + 2 Perfectionist');
    assert.strictEqual(feMid.badgesInProgress.length, 2, 'Frontend omits completed KS category');
    assert.strictEqual(feMid.allCategoriesCompleted, false);

    const feDone = partitionAchievementBadges({
      streakBadges: allDone.streakBadges,
      knowledgeSeekerBadges: allDone.knowledgeSeekerBadges,
      perfectionistBadges: allDone.perfectionistBadges,
      stats: { currentStreak: 1000, completedCourses: 50, perfectionistQuizzesCount: 50 }
    });
    assert.strictEqual(feDone.earnedBadges.length, 12);
    assert.strictEqual(feDone.badgesInProgress.length, 0);
    assert.strictEqual(feDone.allCategoriesCompleted, true, 'Celebratory state flag triggers when all categories unlocked');
    console.log('✅ [PASS] 6. Frontend partitionAchievementBadges helper verified across empty, mid, category-complete, and full-mastery states');

    console.log('\n==================================================================');
    console.log('Summary: ALL ACHIEVEMENTS REDESIGN VERIFICATION CHECKS PASSED');
    console.log('==================================================================');
  } finally {
    await Notification.deleteMany({ recipientId: learnerId }).catch(() => {});
    await LearnerActivity.deleteMany({ learnerId }).catch(() => {});
    await Learner.findByIdAndDelete(learnerId).catch(() => {});
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('❌ [FAIL]', err);
  process.exit(1);
});
