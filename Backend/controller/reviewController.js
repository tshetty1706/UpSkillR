const CourseReview = require('../model/CourseReview');
const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');
const mongoose = require('mongoose');

// Helper to recalculate course average rating and review count
const updateCourseRatingStats = async (courseId) => {
  try {
    const reviews = await CourseReview.find({ courseId });
    if (reviews.length === 0) {
      await Course.findByIdAndUpdate(courseId, { rating: null, reviewCount: 0 });
      return;
    }
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = Number((sum / reviews.length).toFixed(1));
    await Course.findByIdAndUpdate(courseId, { rating: avg, reviewCount: reviews.length });
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

    // 1. Must be enrolled
    const enrolment = await Enrolment.findOne({ learnerId, courseId });
    if (!enrolment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to leave a review.'
      });
    }

    // 2. Must have completed the course (FR-09 Rule)
    const isCompleted = enrolment.status === 'completed' || (enrolment.progressPercentage && enrolment.progressPercentage >= 100);
    if (!isCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Only learners who have completed the course can submit feedback.'
      });
    }

    const cleanTags = Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : [];

    // 3. Unique check: Only one review per course. If existing, update it cleanly
    const existingReview = await CourseReview.findOne({ learnerId, courseId });
    if (existingReview) {
      existingReview.rating = numRating;
      existingReview.feedback = trimmedFeedback;
      if (cleanTags.length > 0) existingReview.tags = cleanTags;
      await existingReview.save();

      // Sync with enrolment
      enrolment.rating = numRating;
      enrolment.feedback = trimmedFeedback;
      enrolment.feedbackTags = cleanTags;
      enrolment.ratedAt = new Date();
      await enrolment.save();

      await updateCourseRatingStats(courseId);

      return res.status(200).json({
        success: true,
        message: 'Your course review has been updated successfully.',
        review: existingReview,
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
    enrolment.rating = numRating;
    enrolment.feedback = trimmedFeedback;
    enrolment.feedbackTags = cleanTags;
    enrolment.ratedAt = new Date();
    await enrolment.save();

    // Recalculate Course average rating
    await updateCourseRatingStats(courseId);

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your course review has been submitted successfully.',
      review
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

// 2. Edit Review (PATCH /api/courses/:courseId/review)
exports.updateCourseReview = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    const { rating, feedback, tags } = req.body;
    const learnerId = req.user.id;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID format.' });
    }

    const review = await CourseReview.findOne({ learnerId, courseId });
    if (!review) {
      return res.status(404).json({ success: false, message: 'No existing review found to update.' });
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

    // Sync with enrolment
    const enrolment = await Enrolment.findOne({ learnerId, courseId });
    if (enrolment) {
      enrolment.rating = review.rating;
      enrolment.feedback = review.feedback;
      enrolment.feedbackTags = review.tags;
      enrolment.ratedAt = new Date();
      await enrolment.save();
    }

    // Recalculate Course average rating
    await updateCourseRatingStats(courseId);

    return res.status(200).json({
      success: true,
      message: 'Course review updated successfully!',
      review
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

    const reviews = await CourseReview.find({ courseId })
      .populate('learnerId', 'fullName avatar username')
      .sort({ createdAt: -1 });

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

    const review = await CourseReview.findOne({ learnerId, courseId });
    return res.status(200).json({
      success: true,
      hasReviewed: Boolean(review),
      review: review || null
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
