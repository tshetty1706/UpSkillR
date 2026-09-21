const AssessmentSubmission = require('../model/AssessmentSubmission');
const Course = require('../model/Course');

// Helper to verify instructor owns the course of a submission
const verifySubmissionCourseOwner = async (submissionId, userId) => {
  const submission = await AssessmentSubmission.findById(submissionId).populate('courseId', 'title instructorId instructor');
  if (!submission) {
    const err = new Error('Assessment submission not found');
    err.status = 404;
    throw err;
  }
  const uId = userId._id ? userId._id.toString() : (userId.id ? userId.id.toString() : userId.toString());
  const instId = (submission.courseId?.instructorId || submission.courseId?.instructor)?.toString();
  if (instId !== uId) {
    const err = new Error('Access denied: You do not own the course for this assessment');
    err.status = 403;
    throw err;
  }
  return submission;
};

/**
 * GET /api/courses/instructor/assessments-review
 * Review-only surface listing learner attempts, appeals, cooldowns across all instructor courses
 */
exports.getInstructorAssessmentsReview = async (req, res) => {
  try {
    const uId = req.user._id ? req.user._id.toString() : (req.user.id ? req.user.id.toString() : req.user.toString());
    const instructorCourses = await Course.find({
      $or: [{ instructorId: uId }, { instructor: uId }]
    }).select('_id title');
    const courseIds = instructorCourses.map(c => c._id);

    if (courseIds.length === 0) {
      return res.json({
        success: true,
        submissions: [],
        courses: [],
        stats: { total: 0, pendingAppeals: 0, passed: 0, failed: 0 }
      });
    }

    const { courseFilter, statusFilter, appealFilter } = req.query;
    const query = { courseId: { $in: courseIds } };

    if (courseFilter && courseFilter !== 'all') {
      query.courseId = courseFilter;
    }
    if (statusFilter && statusFilter !== 'all') {
      query.gradeResult = statusFilter;
    }
    if (appealFilter && appealFilter !== 'all') {
      query.appealStatus = appealFilter;
    }

    const submissions = await AssessmentSubmission.find(query)
      .populate('courseId', 'title')
      .sort({ submittedAt: -1 })
      .lean();

    // Compute stats
    const allSubmissions = await AssessmentSubmission.find({ courseId: { $in: courseIds } }).select('gradeResult appealStatus').lean();
    const stats = {
      total: allSubmissions.length,
      pendingAppeals: allSubmissions.filter(s => s.appealStatus === 'pending').length,
      passed: allSubmissions.filter(s => s.gradeResult === 'passed').length,
      failed: allSubmissions.filter(s => s.gradeResult === 'failed').length
    };

    res.json({
      success: true,
      submissions,
      courses: instructorCourses,
      stats
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/courses/instructor/assessments-review/:submissionId/grant-attempt
 */
exports.grantExtraAttempt = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { reason } = req.body;
    const submission = await verifySubmissionCourseOwner(submissionId, req.user);

    submission.extraAttemptsGranted = (submission.extraAttemptsGranted || 0) + 1;
    submission.cooldownUntil = null; // Clear cooldown immediately

    submission.auditLog.push({
      action: 'grant_extra_attempt',
      performedBy: req.user.fullName || 'Instructor',
      performedByRole: 'instructor',
      reason: reason ? reason.trim() : 'Instructor granted an extra attempt',
      timestamp: new Date()
    });

    await submission.save();
    res.json({ success: true, message: 'Extra attempt granted successfully', submission });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/courses/instructor/assessments-review/:submissionId/mark-complete
 */
exports.markCompleteManually = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { reason } = req.body;
    const submission = await verifySubmissionCourseOwner(submissionId, req.user);

    submission.manuallyMarkedComplete = true;
    submission.gradeResult = 'passed';
    submission.status = 'graded';

    submission.auditLog.push({
      action: 'mark_complete_manually',
      performedBy: req.user.fullName || 'Instructor',
      performedByRole: 'instructor',
      reason: reason ? reason.trim() : 'Manually passed by instructor',
      timestamp: new Date()
    });

    await submission.save();
    res.json({ success: true, message: 'Assessment manually marked complete', submission });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/courses/instructor/assessments-review/:submissionId/resolve-appeal
 */
exports.resolveAppeal = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { decision, reason } = req.body;

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be "approved" or "rejected"' });
    }

    const submission = await verifySubmissionCourseOwner(submissionId, req.user);
    submission.appealStatus = decision;

    if (decision === 'approved') {
      submission.extraAttemptsGranted = (submission.extraAttemptsGranted || 0) + 1;
      submission.cooldownUntil = null;
    }

    submission.auditLog.push({
      action: `appeal_${decision}`,
      performedBy: req.user.fullName || 'Instructor',
      performedByRole: 'instructor',
      reason: reason ? reason.trim() : `Learner appeal ${decision}`,
      timestamp: new Date()
    });

    await submission.save();
    res.json({ success: true, message: `Appeal ${decision} successfully`, submission });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/courses/instructor/assessments-review/:submissionId/reset-attempts
 */
exports.resetAttempts = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { reason } = req.body;
    const submission = await verifySubmissionCourseOwner(submissionId, req.user);

    submission.attemptNumber = 0;
    submission.cooldownUntil = null;

    submission.auditLog.push({
      action: 'reset_attempts',
      performedBy: req.user.fullName || 'Instructor',
      performedByRole: 'instructor',
      reason: reason ? reason.trim() : 'Attempt counter reset by instructor',
      timestamp: new Date()
    });

    await submission.save();
    res.json({ success: true, message: 'Attempts reset successfully', submission });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};
