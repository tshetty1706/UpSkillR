const path = require('path');
const { pathToFileURL } = require('url');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
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
  console.log('🧪 UpSkillR — Progressive Badge Display Validation');
  console.log('==================================================================\n');

  let passed = 0;
  let total = 0;
  const assert = (cond, label, detail = '') => {
    total++;
    if (cond) {
      console.log(`✅ [PASS] ${label}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${label}${detail ? ' -> ' + detail : ''}`);
    }
  };

  const mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI;
  await mongoose.connect(mongoUrl, { dbName: 'UpSkillr' });

  const suffix = Date.now();
  const learnerId = new mongoose.Types.ObjectId();

  try {
    const learner = await Learner.create({
      _id: learnerId,
      fullName: 'Progressive Badge Learner',
      email: `prog_badge_${suffix}@example.com`,
      password: 'Password123!',
      role: 'learner',
      currentStreak: 3,
      longestStreak: 3,
      badges: []
    });

    // 1. No badges unlocked: 2 completed courses, 1 qualifying quiz, 3-day streak
    const stage1 = await getLearnerBadgeProgress(learner, 2, 1);
    assert(
      stage1.streakBadges.length === 1 &&
        stage1.streakBadges[0].badgeId === 'streak_30' &&
        stage1.streakBadges[0].isUnlocked === false &&
        stage1.streakBadges[0].progress === 3 &&
        stage1.streakBadges[0].threshold === 30 &&
        stage1.stats.streakBadgesUnlocked === 0 &&
        stage1.stats.totalStreakBadges === 4,
      '1a. No streak badges unlocked -> shows only Streak Achiever (3/30) and hides Bronze/Silver/Master'
    );
    assert(
      stage1.knowledgeSeekerBadges.length === 1 &&
        stage1.knowledgeSeekerBadges[0].badgeId === 'knowledge_seeker_normal' &&
        stage1.knowledgeSeekerBadges[0].isUnlocked === false &&
        stage1.knowledgeSeekerBadges[0].progress === 2 &&
        stage1.knowledgeSeekerBadges[0].threshold === 5 &&
        stage1.stats.knowledgeSeekerBadgesUnlocked === 0 &&
        stage1.stats.totalKnowledgeSeekerBadges === 4,
      '1b. No Knowledge Seeker unlocked -> shows only Normal (2/5) and hides Bronze/Silver/Gold'
    );
    assert(
      stage1.perfectionistBadges.length === 1 &&
        stage1.perfectionistBadges[0].badgeId === 'perfectionist_normal' &&
        stage1.perfectionistBadges[0].isUnlocked === false &&
        stage1.perfectionistBadges[0].progress === 1 &&
        stage1.perfectionistBadges[0].threshold === 3 &&
        stage1.stats.perfectionistBadgesUnlocked === 0 &&
        stage1.stats.totalPerfectionistBadges === 4,
      '1c. No Perfectionist unlocked -> shows only Normal (1/3) and hides Bronze/Silver/Gold'
    );

    // 2. Partial unlocks across categories: 15 completed courses, 12 quizzes, 30-day streak
    learner.currentStreak = 30;
    learner.longestStreak = 30;
    await evaluateAllBadges(learner, 15, 12);
    const stage2 = await getLearnerBadgeProgress(learner, 15, 12);

    assert(
      stage2.knowledgeSeekerBadges.length === 3 &&
        stage2.knowledgeSeekerBadges[0].badgeId === 'knowledge_seeker_normal' &&
        stage2.knowledgeSeekerBadges[0].isUnlocked === true &&
        stage2.knowledgeSeekerBadges[1].badgeId === 'knowledge_seeker_bronze' &&
        stage2.knowledgeSeekerBadges[1].isUnlocked === true &&
        stage2.knowledgeSeekerBadges[2].badgeId === 'knowledge_seeker_silver' &&
        stage2.knowledgeSeekerBadges[2].isUnlocked === false &&
        stage2.knowledgeSeekerBadges[2].progress === 15 &&
        stage2.knowledgeSeekerBadges[2].threshold === 30 &&
        stage2.stats.knowledgeSeekerBadgesUnlocked === 2 &&
        stage2.stats.totalKnowledgeSeekerBadges === 4,
      '2a. At 15 courses -> Knowledge Seeker shows Normal & Bronze unlocked + Silver locked (15/30), Gold hidden'
    );

    assert(
      stage2.perfectionistBadges.length === 3 &&
        stage2.perfectionistBadges[0].badgeId === 'perfectionist_normal' &&
        stage2.perfectionistBadges[0].isUnlocked === true &&
        stage2.perfectionistBadges[1].badgeId === 'perfectionist_bronze' &&
        stage2.perfectionistBadges[1].isUnlocked === true &&
        stage2.perfectionistBadges[2].badgeId === 'perfectionist_silver' &&
        stage2.perfectionistBadges[2].isUnlocked === false &&
        stage2.perfectionistBadges[2].progress === 12 &&
        stage2.perfectionistBadges[2].threshold === 25 &&
        stage2.stats.perfectionistBadgesUnlocked === 2 &&
        stage2.stats.totalPerfectionistBadges === 4,
      '2b. At 12 qualifying quizzes -> Perfectionist shows Normal & Bronze unlocked + Silver locked (12/25), Gold hidden'
    );

    assert(
      stage2.streakBadges.length === 2 &&
        stage2.streakBadges[0].badgeId === 'streak_30' &&
        stage2.streakBadges[0].isUnlocked === true &&
        stage2.streakBadges[1].badgeId === 'streak_150' &&
        stage2.streakBadges[1].isUnlocked === false &&
        stage2.streakBadges[1].progress === 30 &&
        stage2.streakBadges[1].threshold === 150 &&
        stage2.stats.streakBadgesUnlocked === 1,
      '2c. At 30-day streak -> shows Streak Achiever unlocked + Bronze Streak locked (30/150)'
    );

    // 3. All 4 badges unlocked in Knowledge Seeker (50 courses)
    await evaluateAllBadges(learner, 50, 12);
    const stage3 = await getLearnerBadgeProgress(learner, 50, 12);
    assert(
      stage3.knowledgeSeekerBadges.length === 4 &&
        stage3.knowledgeSeekerBadges.every((b) => b.isUnlocked === true) &&
        stage3.stats.knowledgeSeekerBadgesUnlocked === 4 &&
        stage3.stats.totalKnowledgeSeekerBadges === 4,
      '3. All 4 Knowledge Seeker badges unlocked -> shows all 4 unlocked, 0 locked'
    );

    // 4. Streak reset + Historical preservation + No duplicate award on repeated reconciliation
    const historicalEarnedAt = new Date('2026-09-15T10:00:00.000Z');
    await Learner.updateOne(
      { _id: learnerId },
      {
        $set: {
          currentStreak: 3,
          longestStreak: 150,
          badges: [
            { badgeId: 'streak_30', name: 'Streak Achiever', category: 'streak', threshold: 30, unlockedAt: historicalEarnedAt }
          ]
        }
      }
    );

    // Reconcile via live HTTP controller GET /api/learners/me/badges twice (checks missing streak_150 + idempotency)
    const rBadges1 = mockRes();
    await learnerController.getLearnerBadges({ user: { id: String(learnerId) } }, rBadges1);
    const rBadges2 = mockRes();
    await learnerController.getLearnerBadges({ user: { id: String(learnerId) } }, rBadges2);

    const updatedLearnerDoc = await Learner.findById(learnerId).lean();
    const streak30Count = updatedLearnerDoc.badges.filter((b) => b.badgeId === 'streak_30').length;
    const streak150Count = updatedLearnerDoc.badges.filter((b) => b.badgeId === 'streak_150').length;
    const apiStreak = rBadges2.body?.streakBadges || [];

    assert(
      rBadges1.statusCode === 200 &&
        rBadges2.statusCode === 200 &&
        streak30Count === 1 &&
        streak150Count === 1 &&
        apiStreak.length === 3 &&
        apiStreak[0].badgeId === 'streak_30' &&
        apiStreak[0].isUnlocked === true &&
        new Date(apiStreak[0].unlockedAt).getTime() === historicalEarnedAt.getTime() &&
        apiStreak[1].badgeId === 'streak_150' &&
        apiStreak[1].isUnlocked === true &&
        apiStreak[2].badgeId === 'streak_500' &&
        apiStreak[2].isUnlocked === false &&
        apiStreak[2].progress === 3 &&
        apiStreak[2].threshold === 500 &&
        rBadges2.body?.stats?.streakBadgesUnlocked === 2 &&
        rBadges2.body?.stats?.totalStreakBadges === 4,
      '4. Missing badge reconciled once without duplicates; streak reset preserves earned badges & dates while calculating next badge progress (3/500) using currentStreak'
    );

    // 5. Frontend progressive helper verification
    const feHelperUrl = pathToFileURL(path.join(__dirname, '../../Frontend/src/utils/badgeProgress.js')).href;
    const { buildProgressiveCategoryBadges } = await import(feHelperUrl);
    const mockCfg = [
      { badgeId: 'ks_1', threshold: 5, name: 'Normal' },
      { badgeId: 'ks_2', threshold: 15, name: 'Bronze' },
      { badgeId: 'ks_3', threshold: 30, name: 'Silver' },
      { badgeId: 'ks_4', threshold: 50, name: 'Gold' }
    ];
    // Test empty/offline fallback returns ONLY 1 locked badge (even if fallbackMetricValue >= threshold, never trusts frontend to unlock)
    const offlineFallback = buildProgressiveCategoryBadges([], mockCfg, 99);
    // Test unlocked first + single next locked badge
    const partialProgressive = buildProgressiveCategoryBadges(
      [
        { badgeId: 'ks_2', threshold: 15, isUnlocked: false, progress: 7, progressPercent: 47 },
        { badgeId: 'ks_1', threshold: 5, isUnlocked: true, unlockedAt: '2026-10-01T00:00:00Z', progress: 5, progressPercent: 100 },
        { badgeId: 'ks_3', threshold: 30, isUnlocked: false, progress: 7, progressPercent: 23 }
      ],
      mockCfg,
      7
    );
    assert(
      offlineFallback.length === 1 &&
        offlineFallback[0].isUnlocked === false &&
        partialProgressive.length === 2 &&
        partialProgressive[0].badgeId === 'ks_1' &&
        partialProgressive[0].isUnlocked === true &&
        partialProgressive[1].badgeId === 'ks_2' &&
        partialProgressive[1].isUnlocked === false,
      '5. Frontend buildProgressiveCategoryBadges places unlocked badges first, reveals only next locked badge, and never trusts client fallback to unlock'
    );
  } finally {
    await Promise.all([
      Notification.deleteMany({ recipientId: learnerId }),
      LearnerActivity.deleteMany({ learnerId }),
      Learner.deleteOne({ _id: learnerId })
    ]);
    await mongoose.disconnect();
  }

  console.log(`\nSummary: ${passed}/${total} checks passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal validation error:', err);
  process.exit(1);
});
