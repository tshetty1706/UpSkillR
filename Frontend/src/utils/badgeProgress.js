/**
 * Formats and filters a category's badges for progressive Achievements display:
 * - Renders all backend-verified unlocked badges first (sorted by threshold ascending).
 * - Renders only the single immediate next locked badge (lowest threshold not yet unlocked).
 * - Hides all remaining future locked badges until unlocked.
 *
 * @param {Array<Object>} backendList - Category badges returned by backend API
 * @param {Array<Object>} configList - Static metadata fallback (images, descriptions, labels)
 * @param {number} fallbackMetricValue - Fallback metric only used if backend array has not loaded yet
 * @returns {Array<Object>}
 */
export const buildProgressiveCategoryBadges = (backendList, configList, fallbackMetricValue = 0) => {
  const hasBackendData = Array.isArray(backendList) && backendList.length > 0;
  let mappedCards;

  if (hasBackendData) {
    mappedCards = backendList.map((backendBadge) => {
      const cfg = configList.find((c) => c.badgeId === backendBadge.badgeId) || {};
      const threshold = Number(backendBadge.threshold ?? cfg.threshold ?? 1) || 1;
      const isUnlocked = Boolean(backendBadge.isUnlocked || backendBadge.unlocked);
      const progress = isUnlocked
        ? threshold
        : Math.min(
            threshold,
            Math.max(0, Number(backendBadge.progress ?? backendBadge.currentProgress ?? 0))
          );
      const progressPercent = isUnlocked
        ? 100
        : Math.min(
            100,
            Math.max(
              0,
              Number(
                backendBadge.progressPercent ??
                  backendBadge.progressPercentage ??
                  Math.round((progress / threshold) * 100)
              )
            )
          );

      return {
        ...cfg,
        ...backendBadge,
        threshold,
        isUnlocked,
        unlockedAt: backendBadge.unlockedAt || null,
        progress,
        progressPercent
      };
    });
  } else {
    const safeMetric = Math.max(0, Number(fallbackMetricValue) || 0);
    const firstCfg = configList[0];
    if (!firstCfg) return [];
    const progress = Math.min(safeMetric, firstCfg.threshold);
    mappedCards = [
      {
        ...firstCfg,
        isUnlocked: false,
        unlockedAt: null,
        progress,
        progressPercent: Math.min(100, Math.round((progress / firstCfg.threshold) * 100))
      }
    ];
  }

  const sorted = [...mappedCards].sort((a, b) => Number(a.threshold || 0) - Number(b.threshold || 0));
  const unlocked = sorted.filter((b) => b.isUnlocked);
  const nextLocked = sorted.find((b) => !b.isUnlocked) || null;
  return nextLocked ? [...unlocked, nextLocked] : unlocked;
};

const CATEGORY_METADATA = {
  streak: {
    categoryLabel: 'Learning Streak',
    unit: 'days',
    metricLabel: 'Current streak'
  },
  course_completion: {
    categoryLabel: 'Knowledge Seeker',
    unit: 'courses',
    metricLabel: 'Completed courses'
  },
  quiz_excellence: {
    categoryLabel: 'Perfectionist',
    unit: 'quizzes',
    metricLabel: 'Qualifying quizzes'
  }
};

/**
 * Normalizes badge metadata across Streak, Knowledge Seeker, and Perfectionist categories.
 *
 * @param {Object} badge
 * @param {'streak'|'course_completion'|'quiz_excellence'} defaultCategory
 * @returns {Object}
 */
export const normalizeBadgeMetadata = (badge, defaultCategory = 'streak') => {
  const category = badge?.category || defaultCategory;
  const catMeta = CATEGORY_METADATA[category] || CATEGORY_METADATA.streak;
  const rawTier = (badge?.tier || (badge?.threshold >= 500 || badge?.badgeId?.includes('gold') || badge?.badgeId?.includes('1000')
    ? 'gold'
    : badge?.badgeId?.includes('silver') || badge?.badgeId?.includes('500')
      ? 'silver'
      : badge?.badgeId?.includes('bronze') || badge?.badgeId?.includes('150')
        ? 'bronze'
        : 'normal')).toLowerCase();

  const tierLabel = badge?.tierLabel || `${rawTier.charAt(0).toUpperCase() + rawTier.slice(1)} Tier`;
  const categoryLabel = badge?.categoryLabel || catMeta.categoryLabel;
  const unit = badge?.unit || catMeta.unit;

  const fallbackArtwork =
    badge?.fallbackImage ||
    (badge?.badgeId === 'knowledge_seeker_normal'
      ? '/assets/badges/knowledge-seeker-normal.png'
      : badge?.badgeId === 'perfectionist_normal'
        ? '/assets/badges/perfectionist-normal.png'
        : badge?.image || '');

  return {
    ...badge,
    category,
    categoryLabel,
    tier: rawTier,
    tierLabel,
    unit,
    metricLabel: catMeta.metricLabel,
    requirement: badge?.requirement || badge?.thresholdLabel || badge?.description || '',
    artworkSrc: badge?.cloudinaryUrl || badge?.image || fallbackArtwork,
    fallbackArtworkSrc: fallbackArtwork
  };
};

/**
 * Partitions all achievement badges into two unified collections for the redesigned Achievements page:
 * 1. `earnedBadges`: every unlocked badge across all 3 categories (never includes locked tiers).
 * 2. `badgesInProgress`: strictly the single immediate next locked badge for each incomplete category.
 *
 * @param {Object} params
 * @returns {{ earnedBadges: Array<Object>, badgesInProgress: Array<Object>, allCategoriesCompleted: boolean }}
 */
export const partitionAchievementBadges = ({
  streakBadges = [],
  knowledgeSeekerBadges = [],
  perfectionistBadges = [],
  streakConfig = [],
  knowledgeSeekerConfig = [],
  perfectionistConfig = [],
  stats = {}
} = {}) => {
  const streakList = buildProgressiveCategoryBadges(streakBadges, streakConfig, stats.currentStreak || 0).map((b) =>
    normalizeBadgeMetadata(b, 'streak')
  );
  const ksList = buildProgressiveCategoryBadges(
    knowledgeSeekerBadges,
    knowledgeSeekerConfig,
    stats.completedCourses || 0
  ).map((b) => normalizeBadgeMetadata(b, 'course_completion'));
  const perfList = buildProgressiveCategoryBadges(
    perfectionistBadges,
    perfectionistConfig,
    stats.perfectionistQuizzesCount || 0
  ).map((b) => normalizeBadgeMetadata(b, 'quiz_excellence'));

  const seenEarned = new Set();
  const earnedBadges = [];
  for (const item of [...streakList, ...ksList, ...perfList]) {
    if (item.isUnlocked && !seenEarned.has(item.badgeId)) {
      seenEarned.add(item.badgeId);
      earnedBadges.push(item);
    }
  }

  earnedBadges.sort((a, b) => {
    const aTime = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
    const bTime = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return Number(b.threshold || 0) - Number(a.threshold || 0);
  });

  const nextStreak = streakList.find((b) => !b.isUnlocked) || null;
  const nextKs = ksList.find((b) => !b.isUnlocked) || null;
  const nextPerf = perfList.find((b) => !b.isUnlocked) || null;

  const badgesInProgress = [nextStreak, nextKs, nextPerf].filter(Boolean);

  const hasBackendOrConfigCategories = streakList.length > 0 && ksList.length > 0 && perfList.length > 0;
  const allCategoriesCompleted = Boolean(
    hasBackendOrConfigCategories && earnedBadges.length > 0 && badgesInProgress.length === 0
  );

  return {
    earnedBadges,
    badgesInProgress,
    allCategoriesCompleted
  };
};
