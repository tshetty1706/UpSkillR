/**
 * Resolves a reviewer's registered display name from a review object,
 * strictly avoiding `@username` handles, emails, or internal IDs.
 *
 * @param {Object} review
 * @returns {string}
 */
export const getReviewerDisplayName = (review) => {
  if (!review || typeof review !== 'object') return 'Learner';

  const userObj =
    review.learnerId && typeof review.learnerId === 'object'
      ? review.learnerId
      : review.learner && typeof review.learner === 'object'
        ? review.learner
        : null;

  const knownUsername =
    typeof userObj?.username === 'string'
      ? userObj.username.trim().toLowerCase()
      : typeof review.username === 'string'
        ? review.username.trim().toLowerCase()
        : '';

  const candidates = [
    userObj?.fullName,
    userObj?.name,
    review.reviewerName,
    review.learnerName,
    review.authorName
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('@') || trimmed.includes('@')) continue;
    if (!userObj?.fullName && !userObj?.name && knownUsername && trimmed.toLowerCase() === knownUsername) {
      continue;
    }
    return trimmed;
  }

  return 'Learner';
};

/**
 * Resolves a reviewer's avatar URL cleanly from a review object.
 *
 * @param {Object} review
 * @returns {string}
 */
export const getReviewerAvatar = (review) => {
  if (!review || typeof review !== 'object') return '';
  const userObj =
    review.learnerId && typeof review.learnerId === 'object'
      ? review.learnerId
      : review.learner && typeof review.learner === 'object'
        ? review.learner
        : null;
  return review.learnerAvatar || userObj?.avatar || '';
};
