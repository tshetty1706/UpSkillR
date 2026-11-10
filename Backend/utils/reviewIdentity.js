const mongoose = require('mongoose');

const isPopulatedUserObject = (val) =>
  Boolean(
    val &&
      typeof val === 'object' &&
      !(val instanceof mongoose.Types.ObjectId) &&
      val._bsontype !== 'ObjectId'
  );

/**
 * Resolves a reviewer's public display identity strictly from their registered user name
 * (`fullName` / `name`), never exposing `username`, `email`, or internal IDs.
 * Falls back gracefully to `'Learner'` if the user record is missing or deleted.
 */
const resolveReviewerIdentity = (learnerRecord) => {
  if (!isPopulatedUserObject(learnerRecord)) {
    return { learnerName: 'Learner', learnerAvatar: '' };
  }

  const rawFull = typeof learnerRecord.fullName === 'string' ? learnerRecord.fullName.trim() : '';
  const rawName = typeof learnerRecord.name === 'string' ? learnerRecord.name.trim() : '';
  const candidate = rawFull || rawName;

  // Never surface @handles, email strings, or values identical to a handle-only fallback
  const safeName =
    candidate && !candidate.startsWith('@') && !candidate.includes('@')
      ? candidate
      : 'Learner';

  return {
    learnerName: safeName,
    learnerAvatar: typeof learnerRecord.avatar === 'string' ? learnerRecord.avatar : ''
  };
};

/**
 * Maps a CourseReview or legacy Enrolment review document into a public-safe response
 * containing registered `learnerName` and excluding `learnerId`, `username`, and `email`.
 */
const formatPublicReview = (review, learnerOverride = null) => {
  if (!review) return null;
  const doc = typeof review.toObject === 'function' ? review.toObject() : review;

  const populatedLearner =
    learnerOverride !== null && learnerOverride !== undefined
      ? learnerOverride
      : isPopulatedUserObject(doc.learnerId)
        ? doc.learnerId
        : null;

  const { learnerName, learnerAvatar } = resolveReviewerIdentity(populatedLearner);
  const ratedAt = doc.ratedAt || doc.updatedAt || doc.createdAt || null;

  return {
    _id: doc._id,
    courseId: doc.courseId,
    rating: doc.rating,
    feedback: doc.feedback || '',
    tags: Array.isArray(doc.tags)
      ? doc.tags
      : Array.isArray(doc.feedbackTags)
        ? doc.feedbackTags
        : [],
    createdAt: doc.createdAt || ratedAt,
    updatedAt: doc.updatedAt || ratedAt,
    ratedAt,
    learnerName,
    learnerAvatar
  };
};

/**
 * Fetches course reviews cleanly from `CourseReview` (plus any unrepresented legacy rated
 * `Enrolment` records with feedback), resolves registered names in a single batch `Learner`
 * lookup, and returns sanitized review payloads.
 */
const fetchAndFormatCourseReviews = async (
  courseId,
  { CourseReview, Enrolment, Learner, preloadedEnrolments = null }
) => {
  const [courseReviews, rawEnrolments] = await Promise.all([
    CourseReview.find({ courseId }).sort({ createdAt: -1 }).lean(),
    preloadedEnrolments !== null
      ? Promise.resolve(preloadedEnrolments)
      : Enrolment.find(
          { courseId, rating: { $ne: null } },
          { rating: 1, feedback: 1, feedbackTags: 1, ratedAt: 1, learnerId: 1, courseId: 1 }
        ).lean()
  ]);

  const ratedEnrolments = (rawEnrolments || []).filter(
    (e) => e.rating !== null && e.rating !== undefined && e.feedback && e.feedback.trim().length > 0
  );

  // Batch lookup referenced Learner records for registered `fullName` & `avatar` (never select `username`/`email`)
  const idMap = new Map();
  const collectId = (ref) => {
    if (!ref) return;
    const rawId = isPopulatedUserObject(ref) ? ref._id : ref;
    if (rawId && mongoose.Types.ObjectId.isValid(rawId)) {
      idMap.set(String(rawId), rawId);
    }
  };
  courseReviews.forEach((r) => collectId(r.learnerId));
  ratedEnrolments.forEach((e) => collectId(e.learnerId));

  const learnerIds = Array.from(idMap.values());
  const learners =
    learnerIds.length > 0
      ? await Learner.find({ _id: { $in: learnerIds } })
          .select('fullName name avatar')
          .lean()
      : [];

  const learnerById = new Map(learners.map((l) => [String(l._id), l]));

  const seenLearnerIds = new Set();
  const results = [];

  for (const r of courseReviews) {
    const rawId = isPopulatedUserObject(r.learnerId) ? r.learnerId._id : r.learnerId;
    const lid = rawId ? String(rawId) : '';
    if (lid) seenLearnerIds.add(lid);
    const learnerDoc = lid ? learnerById.get(lid) || null : null;
    results.push(formatPublicReview(r, learnerDoc));
  }

  for (const e of ratedEnrolments) {
    const rawId = isPopulatedUserObject(e.learnerId) ? e.learnerId._id : e.learnerId;
    const lid = rawId ? String(rawId) : '';
    if (lid && seenLearnerIds.has(lid)) continue;
    const learnerDoc = lid ? learnerById.get(lid) || null : null;
    results.push(formatPublicReview({ ...e, courseId: e.courseId || courseId }, learnerDoc));
  }

  return results;
};

module.exports = {
  resolveReviewerIdentity,
  formatPublicReview,
  fetchAndFormatCourseReviews
};
