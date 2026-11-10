const CourseReview = require('../model/CourseReview');
const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');
const { Learner } = require('../model/User');
const mongoose = require('mongoose');
const {
  resolveReviewerIdentity,
  formatPublicReview,
  fetchAndFormatCourseReviews
} = require('../utils/reviewIdentity');

const COURSE_COMPLETION_REQUIRED_MSG = 'Complete 100% of this course to unlock ratings and reviews.';

/**
 * Single-source-of-truth backend verification for review eligibility:
 * Learner must be enrolled AND have completed 100% of published curriculum items
 * according to calculateEnrolmentProgress.
 */
const verifyLearnerCourseCompletion = async (learnerId, courseId) => {
  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    return { ok: false, status: 400, code: 'INVALID_COURSE_ID', message: 'Invalid course ID format.' };
  }

  const [enrolment, course] = await Promise.all([
    Enrolment.findOne({ learnerId, courseId }),
    Course.findById(courseId)
  ]);

  if (!course) {
    return { ok: false, status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found.' };
  }

  if (!enrolment) {
    return {
      ok: false,
      status: 403,
      code: 'NOT_ENROLLED',
      message: 'You must be enrolled in this course to rate or review it.',
      progressPercentage: 0,
      isCompleted: false
    };
  }

  const { calculateEnrolmentProgress } = require('./courseController');
  const progressResult = calculateEnrolmentProgress(course, enrolment);
  const hasPublishedCurriculum = Boolean(progressResult.pubItemIds && progressResult.pubItemIds.size > 0);

  let isCompleted = false;
  let effectivePct = progressResult.progressPercentage;

  if (hasPublishedCurriculum) {
    isCompleted = Boolean(progressResult.isCompleted && progressResult.progressPercentage === 100);
    // Keep enrolment completion metadata synchronized with canonical calculation
    if (
      enrolment.progressPercentage !== progressResult.progressPercentage ||
      enrolment.status !== progressResult.status
    ) {
      enrolment.progressPercentage = progressResult.progressPercentage;
      enrolment.status = progressResult.status;
      if (isCompleted && !enrolment.completedAt) {
        enrolment.completedAt = new Date();
      }
      await enrolment.save();
    }
  } else {
    isCompleted = Boolean(enrolment.status === 'completed' && Number(enrolment.progressPercentage) >= 100);
    effectivePct = isCompleted ? 100 : (Number(enrolment.progressPercentage) || 0);
  }

  if (!isCompleted) {
    return {
      ok: false,
      status: 403,
      code: 'COURSE_NOT_COMPLETED',
      message: COURSE_COMPLETION_REQUIRED_MSG,
      progressPercentage: effectivePct,
      isCompleted: false,
      enrolment
    };
  }

  return {
    ok: true,
    status: 200,
    isCompleted: true,
    progressPercentage: 100,
    enrolment,
    course
  };
};

// Helper to recalculate course average rating and review count
const updateCourseRatingStats = async (courseId) => {
  try {
    const reviews = await CourseReview.find({ courseId });
    if (reviews.length === 0) {
      await Course.findByIdAndUpdate(courseId, { rating: null, reviewCount: 0 });
    } else {
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      const avg = Number((sum / reviews.length).toFixed(1));
      await Course.findByIdAndUpdate(courseId, { rating: avg, reviewCount: reviews.length });
    }
    try {
      const { courseCache } = require('./courseController');
      courseCache?.invalidateCourse?.(courseId);
    } catch (_) {}
  } catch (err) {
    console.error('Error recalculating course rating stats:', err);
  }
};

// 1. Submit New Review (POST /api/courses/:courseId/review or POST /api/courses/rate)
exports.submitCourseReview = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    const { rating, feedback, tags } = req.body;
    const learnerId = req.user.id;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID format.' });
    }

    const numRating = Number(rating);
    if (!rating || isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
    }

    const trimmedFeedback = (feedback || '').trim();
    if (!trimmedFeedback || trimmedFeedback.length < 3) {
      return res.status(400).json({ success: false, message: 'Feedback must be at least 3 characters long.' });
    }
    if (trimmedFeedback.length > 1000) {
      return res.status(400).json({ success: false, message: 'Feedback cannot exceed 1000 characters.' });
    }

    // 1 & 2. Enforce authenticated enrollment + 100% backend curriculum completion
    const eligibility = await verifyLearnerCourseCompletion(learnerId, courseId);
    if (!eligibility.ok) {
      return res.status(eligibility.status).json({
        success: false,
        code: eligibility.code,
        message: eligibility.message,
        progressPercentage: eligibility.progressPercentage
      });
    }
    const enrolment = eligibility.enrolment;

    const rawTags = tags !== undefined ? tags : req.body.feedbackTags;
    const cleanTags = Array.isArray(rawTags) ? rawTags.map(t => String(t).trim()).filter(Boolean) : [];

    // Lookup learner's registered name dynamically (never trust frontend-supplied names or expose username)
    const learnerRecord = await Learner.findById(learnerId).select('fullName name avatar').lean();
    const { learnerName } = resolveReviewerIdentity(learnerRecord);

    // 3. Unique check: Only one review per course. If existing, update it cleanly
    const existingReview = await CourseReview.findOne({ learnerId, courseId });
    if (existingReview) {
      existingReview.rating = numRating;
      existingReview.feedback = trimmedFeedback;
      if (Array.isArray(rawTags)) existingReview.tags = cleanTags;
      await existingReview.save();

      // Sync with enrolment
      enrolment.learnerName = learnerName;
      enrolment.rating = numRating;
      enrolment.feedback = trimmedFeedback;
      enrolment.feedbackTags = cleanTags;
      enrolment.ratedAt = new Date();
      await enrolment.save();

      await updateCourseRatingStats(courseId);

      return res.status(200).json({
        success: true,
        message: 'Your course review has been updated successfully.',
        review: formatPublicReview(existingReview, learnerRecord),
        isUpdate: true
      });
    }

    // Create the review
    const review = await CourseReview.create({
      learnerId,
      courseId,
      rating: numRating,
      feedback: trimmedFeedback,
      tags: cleanTags
    });

    // Sync with enrolment for legacy / unified views
    enrolment.learnerName = learnerName;
    enrolment.rating = numRating;
    enrolment.feedback = trimmedFeedback;
    enrolment.feedbackTags = cleanTags;
    enrolment.ratedAt = new Date();
    await enrolment.save();

    // Recalculate Course average rating
    await updateCourseRatingStats(courseId);

    // Notify fellow enrolled learners of a new course review
    try {
      const { notifyEnrolledLearnersForCourseSection } = require('./notificationController');
      const courseDoc = await Course.findById(courseId).select('title').lean();
      const preview = trimmedFeedback.length > 80 ? `${trimmedFeedback.slice(0, 77)}...` : trimmedFeedback;
      await notifyEnrolledLearnersForCourseSection({
        courseId,
        courseTitle: courseDoc?.title || 'Course',
        section: 'reviews',
        type: 'NEW_REVIEW',
        referenceId: review._id,
        title: `New ${numRating}-Star Review in ${courseDoc?.title || 'Course'}`,
        message: `"${preview}"`,
        link: `/courses/${courseId}?tab=reviews`,
        excludeUserIds: [learnerId]
      });
    } catch (notifErr) {
      console.warn('[REVIEW NOTIFICATION WARNING]', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your course review has been submitted successfully.',
      review: formatPublicReview(review, learnerRecord)
    });
  } catch (error) {
    console.error('Error submitting course review:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this course.'
      });
    }
    return res.status(500).json({ success: false, message: 'Server error while submitting review.' });
  }
};

// 2. Edit Review (PATCH/PUT /api/courses/:courseId/review or PATCH /api/learners/me/reviews/:reviewId)
exports.updateCourseReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const rawCourseId = req.params.courseId || req.body.courseId;
    const { rating, feedback, tags } = req.body;
    const learnerId = req.user.id;

    let review = null;
    if (reviewId && mongoose.Types.ObjectId.isValid(reviewId)) {
      review = await CourseReview.findOne({ _id: reviewId, learnerId });
    } else if (rawCourseId && mongoose.Types.ObjectId.isValid(rawCourseId)) {
      review = await CourseReview.findOne({ learnerId, courseId: rawCourseId });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid course or review ID format.' });
    }

    if (!review) {
      // Check if learner lacks completion eligibility even before checking review existence on courseId
      if (rawCourseId && mongoose.Types.ObjectId.isValid(rawCourseId)) {
        const earlyEligibility = await verifyLearnerCourseCompletion(learnerId, rawCourseId);
        if (!earlyEligibility.ok) {
          return res.status(earlyEligibility.status).json({
            success: false,
            code: earlyEligibility.code,
            message: earlyEligibility.message,
            progressPercentage: earlyEligibility.progressPercentage
          });
        }
      }
      return res.status(404).json({ success: false, message: 'No existing review found to update.' });
    }

    const targetCourseId = review.courseId;

    // Enforce 100% completion eligibility on review edits as well
    const eligibility = await verifyLearnerCourseCompletion(learnerId, targetCourseId);
    if (!eligibility.ok) {
      return res.status(eligibility.status).json({
        success: false,
        code: eligibility.code,
        message: eligibility.message,
        progressPercentage: eligibility.progressPercentage
      });
    }

    if (rating !== undefined) {
      const numRating = Number(rating);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
      }
      review.rating = numRating;
    }

    if (feedback !== undefined) {
      const trimmedFeedback = feedback.trim();
      if (!trimmedFeedback || trimmedFeedback.length < 3) {
        return res.status(400).json({ success: false, message: 'Feedback must be at least 3 characters long.' });
      }
      if (trimmedFeedback.length > 1000) {
        return res.status(400).json({ success: false, message: 'Feedback cannot exceed 1000 characters.' });
      }
      review.feedback = trimmedFeedback;
    }

    if (tags !== undefined && Array.isArray(tags)) {
      review.tags = tags.map(t => String(t).trim()).filter(Boolean);
    }

    await review.save();

    // Sync with enrolment using dynamic registered name
    const learnerRecord = await Learner.findById(learnerId).select('fullName name avatar').lean();
    const { learnerName } = resolveReviewerIdentity(learnerRecord);

    const enrolment = eligibility.enrolment;
    if (enrolment) {
      enrolment.learnerName = learnerName;
      enrolment.rating = review.rating;
      enrolment.feedback = review.feedback;
      enrolment.feedbackTags = review.tags;
      enrolment.ratedAt = new Date();
      await enrolment.save();
    }

    // Recalculate Course average rating
    await updateCourseRatingStats(targetCourseId);

    return res.status(200).json({
      success: true,
      message: 'Course review updated successfully!',
      review: formatPublicReview(review, learnerRecord)
    });
  } catch (error) {
    console.error('Error updating course review:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating review.' });
  }
};

// 3. Get Course Reviews (GET /api/courses/:courseId/reviews)
exports.getCourseReviews = async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID format.' });
    }

    const reviews = await fetchAndFormatCourseReviews(courseId, {
      CourseReview,
      Enrolment,
      Learner
    });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (error) {
    console.error('Error fetching course reviews:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch course reviews.' });
  }
};

// 4. Get Learner's Own Review for a course (GET /api/courses/:courseId/my-review)
exports.getMyCourseReview = async (req, res) => {
  try {
    const { courseId } = req.params;
    const learnerId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID format.' });
    }

    let [review, learnerRecord] = await Promise.all([
      CourseReview.findOne({ learnerId, courseId }),
      Learner.findById(learnerId).select('fullName name avatar').lean()
    ]);

    if (!review) {
      const enrolment = await Enrolment.findOne({ learnerId, courseId }).select('rating feedback feedbackTags ratedAt');
      if (enrolment && enrolment.rating) {
        review = {
          courseId,
          rating: enrolment.rating,
          feedback: enrolment.feedback || '',
          tags: Array.isArray(enrolment.feedbackTags) ? enrolment.feedbackTags : [],
          createdAt: enrolment.ratedAt || null
        };
      }
    }
    const eligibility = await verifyLearnerCourseCompletion(learnerId, courseId);

    return res.status(200).json({
      success: true,
      canReview: Boolean(eligibility.ok && eligibility.isCompleted),
      progressPercentage: eligibility.progressPercentage ?? 0,
      isEnrolled: eligibility.code !== 'NOT_ENROLLED' && eligibility.code !== 'COURSE_NOT_FOUND',
      hasReviewed: Boolean(review),
      review: review ? formatPublicReview(review, learnerRecord) : null
    });
  } catch (error) {
    console.error('Error fetching user course review:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch your review.' });
  }
};

// 5. Get All Reviews by Authenticated Learner (GET /api/learners/me/reviews)
exports.getLearnerAllReviews = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const reviews = await CourseReview.find({ learnerId })
      .populate('courseId', 'title thumbnail category instructorName')
      .sort({ createdAt: -1 });

    // Format safely even if course was deleted
    const formatted = reviews.map(r => ({
      _id: r._id,
      courseId: r.courseId?._id || r.courseId,
      courseTitle: r.courseId?.title || 'Course',
      courseThumbnail: r.courseId?.thumbnail || '',
      category: r.courseId?.category || 'General',
      instructorName: r.courseId?.instructorName || 'UpSkillr Instructor',
      rating: r.rating,
      feedback: r.feedback,
      tags: r.tags || [],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      reviews: formatted
    });
  } catch (error) {
    console.error('Error fetching learner reviews:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch your reviews.' });
  }
};


// 6. Delete Review (DELETE /api/courses/:courseId/review or DELETE /api/learners/me/reviews/:reviewId)
exports.deleteCourseReview = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { courseId, reviewId } = req.params;

    let review;
    if (reviewId && mongoose.Types.ObjectId.isValid(reviewId)) {
      review = await CourseReview.findOne({ _id: reviewId, learnerId });
    } else if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      review = await CourseReview.findOne({ courseId, learnerId });
    }

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found or unauthorized.' });
    }

    const targetCourseId = review.courseId;
    await CourseReview.findByIdAndDelete(review._id);

    // Sync with enrolment: clear rating and feedback
    const enrolment = await Enrolment.findOne({ learnerId, courseId: targetCourseId });
    if (enrolment) {
      enrolment.rating = null;
      enrolment.feedback = '';
      enrolment.feedbackTags = [];
      enrolment.ratedAt = null;
      await enrolment.save();
    }

    // Recalculate Course average rating
    await updateCourseRatingStats(targetCourseId);

    return res.status(200).json({
      success: true,
      message: 'Course review has been deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting course review:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting review.' });
  }
};
