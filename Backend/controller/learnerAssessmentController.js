const mongoose = require('mongoose');
const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');
const Learner = require('../model/Learner');
const AssessmentAttempt = require('../model/AssessmentAttempt');
const OfficialAssessmentAttempt = require('../model/OfficialAssessmentAttempt');
const {
  TIMEOUT_GRACE_MS,
  getPublishedCourseAssessments,
  findPublishedCourseAssessment,
  resolveAssessmentDurationMinutes,
  computeAssessmentTotalMarks,
  evaluateAssessmentPrerequisites,
  prepareAttemptOrdering,
  buildSanitizedQuestionsForAttempt,
  buildReviewQuestionsFromAttempt,
  buildResultSummaryFromAttempt,
  evaluateAndFinalizeAttempt,
  finalizeExpiredAttemptIfNeeded
} = require('../services/assessmentService');
const { getAssessmentRetakeLeaderboard } = require('../services/leaderboardService');

const MANUAL_SUBMIT_GRACE_MS = 3 * 1000;

function formatSafeAssessmentCard({
  course,
  assessment,
  prereq,
  officialRecord,
  submittedAttempts,
  activeAttempt,
  nowMs = Date.now()
}) {
  const durationMinutes = resolveAssessmentDurationMinutes(assessment);
  const totalMarks = computeAssessmentTotalMarks(assessment);
  const questionCount = Array.isArray(assessment.questions) ? assessment.questions.length : 0;
  const passThresholdPercent = Number(assessment.passThresholdPercent ?? 70);

  const hasCompletedOfficial = Boolean(officialRecord);
  const attemptsCount = submittedAttempts.length;
  const retakesCount = submittedAttempts.filter(a => a.attemptType === 'RETAKE').length;
  const latestAttempt = submittedAttempts[0] || null;

  let remainingSeconds = null;
  if (activeAttempt && activeAttempt.submissionStatus === 'in_progress') {
    const remMs = new Date(activeAttempt.expiresAt).getTime() - nowMs;
    if (remMs > 0) {
      remainingSeconds = Math.ceil(remMs / 1000);
    }
  }

  return {
    _id: assessment._id,
    courseId: course._id,
    title: assessment.title || 'Course Assessment',
    description: assessment.description || '',
    instructions: assessment.instructions || '',
    durationMinutes,
    timeLimit: durationMinutes,
    questionCount,
    totalMarks,
    passThresholdPercent,
    availabilityStatus: assessment.state === 'published' ? 'available' : 'unavailable',
    state: assessment.state,
    shuffleQuestions: Boolean(assessment.shuffleQuestions),
    shuffleOptions: Boolean(assessment.shuffleOptions),
    resultVisibility: assessment.resultVisibility || 'immediate',
    unlocked: Boolean(prereq.unlocked),
    prerequisiteInfo: {
      unlocked: Boolean(prereq.unlocked),
      totalRequiredModules: prereq.totalRequiredModules,
      completedRequiredModules: prereq.completedRequiredModules,
      requiredModules: prereq.requiredModules,
      incompleteModules: prereq.incompleteModules,
      lockMessage: prereq.unlocked
        ? ''
        : 'Complete all prerequisite modules to unlock this assessment.'
    },
    hasCompletedOfficial,
    officialAttempt: officialRecord ? {
      attemptId: officialRecord.attemptId,
      attemptNumber: officialRecord.attemptNumber || 1,
      obtainedMarks: officialRecord.obtainedMarks,
      totalMarks: officialRecord.totalMarks,
      percentage: officialRecord.percentage,
      resultStatus: officialRecord.resultStatus,
      submissionStatus: officialRecord.submissionStatus,
      timeTakenSeconds: officialRecord.timeTakenSeconds,
      submittedAt: officialRecord.submittedAt
    } : null,
    attemptsCount,
    retakesCount,
    latestAttemptId: latestAttempt ? latestAttempt._id : (officialRecord ? officialRecord.attemptId : null),
    activeAttempt: (activeAttempt && remainingSeconds !== null && remainingSeconds > 0) ? {
      attemptId: activeAttempt._id,
      attemptNumber: activeAttempt.attemptNumber,
      attemptType: activeAttempt.attemptType,
      startedAt: activeAttempt.startedAt,
      expiresAt: activeAttempt.expiresAt,
      remainingSeconds
    } : null,
    canTake: Boolean(prereq.unlocked && !hasCompletedOfficial),
    canRetake: Boolean(prereq.unlocked && hasCompletedOfficial)
  };
}

/**
 * Auto-finalizes expired in-progress attempt(s) for an assessment before computing status/starting.
 */
async function syncExpiredActiveAttemptsForAssessment(learnerId, courseId, assessment) {
  const active = await AssessmentAttempt.findOne({
    learnerId,
    courseId,
    assessmentId: assessment._id,
    submissionStatus: 'in_progress'
  });

  if (!active) return null;

  const { expiredFinalized, attempt } = await finalizeExpiredAttemptIfNeeded(active, assessment);
  return expiredFinalized ? null : attempt;
}

/**
 * GET /api/courses/:courseId/assessments
 * Lists published course assessments with backend-enforced prerequisite status,
 * official attempt result, active session info, and attempt counts.
 * NEVER exposes assessment questions or answer keys.
 */
exports.getCourseAssessments = async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const enrolment = await Enrolment.findOne({ courseId: course._id, learnerId: req.user.id });
    const publishedAssessments = getPublishedCourseAssessments(course);
    const nowMs = Date.now();

    const assessments = [];
    for (const assessment of publishedAssessments) {
      let activeAttempt = null;
      if (enrolment) {
        activeAttempt = await syncExpiredActiveAttemptsForAssessment(req.user.id, course._id, assessment);
      }

      const prereq = await evaluateAssessmentPrerequisites(course, assessment, enrolment, req.user.id);

      const officialRecord = enrolment
        ? await OfficialAssessmentAttempt.findOne({
            courseId: course._id,
            assessmentId: assessment._id,
            learnerId: req.user.id
          }).lean()
        : null;

      const submittedAttempts = enrolment
        ? await AssessmentAttempt.find({
            courseId: course._id,
            assessmentId: assessment._id,
            learnerId: req.user.id,
            submissionStatus: { $in: ['submitted', 'timed_out'] }
          })
            .sort({ attemptNumber: -1 })
            .select('_id attemptNumber attemptType obtainedMarks totalMarks percentage resultStatus submissionStatus submittedAt timeTakenSeconds')
            .lean()
        : [];

      assessments.push(formatSafeAssessmentCard({
        course,
        assessment,
        prereq,
        officialRecord,
        submittedAttempts,
        activeAttempt,
        nowMs
      }));
    }

    return res.json({
      success: true,
      enrolled: Boolean(enrolment),
      courseId: course._id,
      courseTitle: course.title,
      serverTime: nowMs,
      assessments
    });
  } catch (err) {
    console.error('getCourseAssessments error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load course assessments.' });
  }
};

/**
 * GET /api/courses/:courseId/assessments/:assessmentId/details
 * Pre-start assessment overview, instructions, prerequisite status, and personal attempts list.
 * NEVER exposes question prompts or answer keys.
 */
exports.getSingleAssessmentDetails = async (req, res) => {
  try {
    const { courseId, assessmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid course or assessment ID.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const enrolment = await Enrolment.findOne({ courseId: course._id, learnerId: req.user.id });
    if (!enrolment) {
      return res.status(403).json({
        success: false,
        code: 'NOT_ENROLLED',
        message: 'You must be enrolled in this course to access course assessments.'
      });
    }

    const assessment = findPublishedCourseAssessment(course, assessmentId);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        code: 'ASSESSMENT_UNAVAILABLE',
        message: 'Assessment not found or is not currently published.'
      });
    }

    const activeAttempt = await syncExpiredActiveAttemptsForAssessment(req.user.id, course._id, assessment);
    const prereq = await evaluateAssessmentPrerequisites(course, assessment, enrolment, req.user.id);

    const officialRecord = await OfficialAssessmentAttempt.findOne({
      courseId: course._id,
      assessmentId: assessment._id,
      learnerId: req.user.id
    }).lean();

    const submittedAttempts = await AssessmentAttempt.find({
      courseId: course._id,
      assessmentId: assessment._id,
      learnerId: req.user.id,
      submissionStatus: { $in: ['submitted', 'timed_out'] }
    })
      .sort({ attemptNumber: -1 })
      .select('_id attemptNumber attemptType obtainedMarks totalMarks percentage resultStatus submissionStatus submittedAt timeTakenSeconds')
      .lean();

    const nowMs = Date.now();
    const card = formatSafeAssessmentCard({
      course,
      assessment,
      prereq,
      officialRecord,
      submittedAttempts,
      activeAttempt,
      nowMs
    });

    return res.json({
      success: true,
      serverTime: nowMs,
      courseTitle: course.title,
      assessment: card,
      attempts: submittedAttempts.map(a => ({
        attemptId: a._id,
        attemptNumber: a.attemptNumber,
        attemptType: a.attemptType,
        obtainedMarks: a.obtainedMarks,
        totalMarks: a.totalMarks,
        percentage: a.percentage,
        resultStatus: a.resultStatus,
        submissionStatus: a.submissionStatus,
        submittedAt: a.submittedAt,
        timeTakenSeconds: a.timeTakenSeconds
      }))
    });
  } catch (err) {
    console.error('getSingleAssessmentDetails error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve assessment details.' });
  }
};

/**
 * POST /api/courses/:courseId/assessments/:assessmentId/start
 * Enforces prerequisite module completion, server timer initialization, and single active attempt invariant.
 */
exports.startAssessmentAttempt = async (req, res) => {
  try {
    const { courseId, assessmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid course or assessment ID.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const enrolment = await Enrolment.findOne({ courseId: course._id, learnerId: req.user.id });
    if (!enrolment) {
      return res.status(403).json({
        success: false,
        code: 'NOT_ENROLLED',
        message: 'You must be enrolled in this course to start assessments.'
      });
    }

    const assessment = findPublishedCourseAssessment(course, assessmentId);
    if (!assessment) {
      return res.status(403).json({
        success: false,
        code: 'ASSESSMENT_UNAVAILABLE',
        message: 'This assessment is unavailable or in draft mode.'
      });
    }

    if (!Array.isArray(assessment.questions) || assessment.questions.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'ASSESSMENT_EMPTY',
        message: 'This assessment has no questions configured yet.'
      });
    }

    // Strict backend-enforced prerequisite module gating
    const prereq = await evaluateAssessmentPrerequisites(course, assessment, enrolment, req.user.id);
    if (!prereq.unlocked) {
      return res.status(403).json({
        success: false,
        code: 'PREREQUISITES_INCOMPLETE',
        message: 'Complete all prerequisite modules to unlock this assessment.',
        requiredModules: prereq.requiredModules,
        incompleteModules: prereq.incompleteModules
      });
    }

    const nowMs = Date.now();
    // Check existing in_progress attempt
    let attempt = await AssessmentAttempt.findOne({
      learnerId: req.user.id,
      courseId: course._id,
      assessmentId: assessment._id,
      submissionStatus: 'in_progress'
    });

    if (attempt) {
      const expiresAtMs = new Date(attempt.expiresAt).getTime();
      if (nowMs < expiresAtMs) {
        // Resume existing active attempt — never create multiple simultaneous active attempts
        const questions = buildSanitizedQuestionsForAttempt(assessment, attempt);
        return res.json({
          success: true,
          resumed: true,
          attemptId: attempt._id,
          attemptNumber: attempt.attemptNumber,
          attemptType: attempt.attemptType,
          startedAt: attempt.startedAt,
          expiresAt: attempt.expiresAt,
          serverTime: Date.now(),
          remainingSeconds: Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000)),
          durationMinutes: attempt.durationMinutes,
          draftAnswers: attempt.draftAnswers || {},
          assessment: {
            _id: assessment._id,
            title: assessment.title,
            description: assessment.description,
            instructions: assessment.instructions,
            courseTitle: course.title,
            passThresholdPercent: attempt.passThresholdPercent,
            durationMinutes: attempt.durationMinutes,
            totalMarks: attempt.totalMarks,
            totalQuestions: questions.length,
            questions
          }
        });
      }

      // Expired: finalize cleanly on backend before starting a fresh attempt
      await evaluateAndFinalizeAttempt({
        attempt,
        assessment,
        submittedAnswers: attempt.draftAnswers || {},
        submissionStatus: 'timed_out',
        submittedAtOverride: new Date(expiresAtMs)
      });
      attempt = null;
    }

    // Check official attempt presence
    const officialRecord = await OfficialAssessmentAttempt.findOne({
      courseId: course._id,
      assessmentId: assessment._id,
      learnerId: req.user.id
    }).lean();

    const lastAttemptDoc = await AssessmentAttempt.findOne({
      courseId: course._id,
      assessmentId: assessment._id,
      learnerId: req.user.id
    })
      .sort({ attemptNumber: -1 })
      .select('attemptNumber')
      .lean();

    const durationMinutes = resolveAssessmentDurationMinutes(assessment);
    const totalMarks = computeAssessmentTotalMarks(assessment);
    const passThresholdPercent = Number(assessment.passThresholdPercent ?? 70);
    const { questionOrder, optionOrders } = prepareAttemptOrdering(assessment);

    const learnerUser = await Learner.findById(req.user.id).select('fullName name username email').lean();
    const learnerDisplayName =
      learnerUser?.fullName || learnerUser?.name || learnerUser?.username || req.user.name || 'Learner';
    const learnerEmail = learnerUser?.email || req.user.email || 'learner@upskillr.local';

    let attemptNumber = (lastAttemptDoc?.attemptNumber || 0) + 1;
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

    try {
      attempt = await AssessmentAttempt.create({
        learnerId: req.user.id,
        learnerName: learnerDisplayName,
        learnerEmail,
        courseId: course._id,
        assessmentId: assessment._id,
        assessmentTitle: assessment.title || 'Assessment',
        attemptNumber,
        attemptType: officialRecord ? 'RETAKE' : 'OFFICIAL',
        startedAt,
        expiresAt,
        durationMinutes,
        passThresholdPercent,
        totalMarks,
        totalQuestions: assessment.questions.length,
        questionOrder,
        optionOrders,
        draftAnswers: {},
        submissionStatus: 'in_progress',
        resultStatus: 'PENDING'
      });
    } catch (createErr) {
      if (createErr && createErr.code === 11000) {
        // Concurrent request won race for active session OR attempt number
        const concurrentActive = await AssessmentAttempt.findOne({
          learnerId: req.user.id,
          courseId: course._id,
          assessmentId: assessment._id,
          submissionStatus: 'in_progress'
        });
        if (concurrentActive && Date.now() < new Date(concurrentActive.expiresAt).getTime()) {
          attempt = concurrentActive;
        } else {
          const refreshedLast = await AssessmentAttempt.findOne({
            courseId: course._id,
            assessmentId: assessment._id,
            learnerId: req.user.id
          })
            .sort({ attemptNumber: -1 })
            .select('attemptNumber')
            .lean();
          attemptNumber = (refreshedLast?.attemptNumber || attemptNumber) + 1;
          attempt = await AssessmentAttempt.create({
            learnerId: req.user.id,
            learnerName: learnerDisplayName,
            learnerEmail,
            courseId: course._id,
            assessmentId: assessment._id,
            assessmentTitle: assessment.title || 'Assessment',
            attemptNumber,
            attemptType: officialRecord ? 'RETAKE' : 'OFFICIAL',
            startedAt,
            expiresAt,
            durationMinutes,
            passThresholdPercent,
            totalMarks,
            totalQuestions: assessment.questions.length,
            questionOrder,
            optionOrders,
            draftAnswers: {},
            submissionStatus: 'in_progress',
            resultStatus: 'PENDING'
          });
        }
      } else {
        throw createErr;
      }
    }

    const questions = buildSanitizedQuestionsForAttempt(assessment, attempt);
    const expiresAtMs = new Date(attempt.expiresAt).getTime();

    return res.json({
      success: true,
      resumed: false,
      attemptId: attempt._id,
      attemptNumber: attempt.attemptNumber,
      attemptType: attempt.attemptType,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      serverTime: Date.now(),
      remainingSeconds: Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000)),
      durationMinutes: attempt.durationMinutes,
      draftAnswers: attempt.draftAnswers || {},
      assessment: {
        _id: assessment._id,
        title: assessment.title,
        description: assessment.description,
        instructions: assessment.instructions,
        courseTitle: course.title,
        passThresholdPercent: attempt.passThresholdPercent,
        durationMinutes: attempt.durationMinutes,
        totalMarks: attempt.totalMarks,
        totalQuestions: questions.length,
        questions
      }
    });
  } catch (err) {
    console.error('startAssessmentAttempt error:', err);
    return res.status(500).json({ success: false, message: 'Could not start assessment attempt.' });
  }
};

/**
 * GET /api/courses/:courseId/assessments/:assessmentId/attempt/:attemptId
 * Returns either active session state (with server-calculated remaining time & NO answers)
 * or full finalized result + answer key review once submitted/timed out.
 */
exports.getAssessmentAttempt = async (req, res) => {
  try {
    const { courseId, assessmentId, attemptId } = req.params;
    if (
      !mongoose.Types.ObjectId.isValid(courseId) ||
      !mongoose.Types.ObjectId.isValid(assessmentId) ||
      !mongoose.Types.ObjectId.isValid(attemptId)
    ) {
      return res.status(400).json({ success: false, message: 'Invalid attempt identifier.' });
    }

    let attempt = await AssessmentAttempt.findById(attemptId);
    if (
      !attempt ||
      String(attempt.learnerId) !== String(req.user.id) ||
      String(attempt.courseId) !== String(courseId) ||
      String(attempt.assessmentId) !== String(assessmentId)
    ) {
      return res.status(404).json({ success: false, message: 'Assessment attempt not found or access denied.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const assessment = (course.courseAssessments || []).find(a => String(a._id) === String(assessmentId));
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    // Automatically finalize expired attempts past deadline
    const { attempt: maybeFinalized } = await finalizeExpiredAttemptIfNeeded(attempt, assessment);
    if (maybeFinalized) {
      attempt = maybeFinalized;
    }

    const officialRecord = await OfficialAssessmentAttempt.findOne({
      courseId: course._id,
      assessmentId: assessment._id,
      learnerId: req.user.id
    }).lean();

    const isFinalized = attempt.submissionStatus === 'submitted' || attempt.submissionStatus === 'timed_out';
    if (isFinalized) {
      const reviewQuestions = buildReviewQuestionsFromAttempt(attempt, assessment);
      return res.json({
        success: true,
        isSubmitted: true,
        attemptId: attempt._id,
        attemptNumber: attempt.attemptNumber,
        attemptType: attempt.attemptType,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        serverTime: Date.now(),
        submissionStatus: attempt.submissionStatus,
        result: buildResultSummaryFromAttempt(attempt, officialRecord),
        officialAttempt: officialRecord ? {
          attemptId: officialRecord.attemptId,
          attemptNumber: officialRecord.attemptNumber,
          obtainedMarks: officialRecord.obtainedMarks,
          totalMarks: officialRecord.totalMarks,
          percentage: officialRecord.percentage,
          resultStatus: officialRecord.resultStatus,
          submittedAt: officialRecord.submittedAt
        } : null,
        review: {
          questions: reviewQuestions
        },
        assessment: {
          _id: assessment._id,
          title: assessment.title,
          description: assessment.description,
          instructions: assessment.instructions,
          courseTitle: course.title,
          passThresholdPercent: attempt.passThresholdPercent ?? assessment.passThresholdPercent ?? 70,
          durationMinutes: attempt.durationMinutes,
          totalMarks: attempt.totalMarks || computeAssessmentTotalMarks(assessment),
          totalQuestions: reviewQuestions.length
        }
      });
    }

    // Active attempt: verify enrollment, publication & prerequisite completion strictly
    if (assessment.state !== 'published') {
      return res.status(403).json({
        success: false,
        code: 'ASSESSMENT_UNAVAILABLE',
        message: 'This assessment is no longer available.'
      });
    }

    const enrolment = await Enrolment.findOne({ courseId: course._id, learnerId: req.user.id });
    if (!enrolment) {
      return res.status(403).json({ success: false, code: 'NOT_ENROLLED', message: 'Not enrolled.' });
    }

    const prereq = await evaluateAssessmentPrerequisites(course, assessment, enrolment, req.user.id);
    if (!prereq.unlocked) {
      return res.status(403).json({
        success: false,
        code: 'PREREQUISITES_INCOMPLETE',
        message: 'Complete all prerequisite modules to unlock this assessment.',
        incompleteModules: prereq.incompleteModules
      });
    }

    const sanitizedQuestions = buildSanitizedQuestionsForAttempt(assessment, attempt);
    const expiresAtMs = new Date(attempt.expiresAt).getTime();
    const nowMs = Date.now();

    return res.json({
      success: true,
      isSubmitted: false,
      attemptId: attempt._id,
      attemptNumber: attempt.attemptNumber,
      attemptType: attempt.attemptType,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      serverTime: nowMs,
      remainingSeconds: Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000)),
      durationMinutes: attempt.durationMinutes,
      submissionStatus: attempt.submissionStatus,
      draftAnswers: attempt.draftAnswers || {},
      assessment: {
        _id: assessment._id,
        title: assessment.title,
        description: assessment.description,
        instructions: assessment.instructions,
        courseTitle: course.title,
        passThresholdPercent: attempt.passThresholdPercent ?? assessment.passThresholdPercent ?? 70,
        durationMinutes: attempt.durationMinutes,
        totalMarks: attempt.totalMarks || computeAssessmentTotalMarks(assessment),
        totalQuestions: sanitizedQuestions.length,
        questions: sanitizedQuestions
      }
    });
  } catch (err) {
    console.error('getAssessmentAttempt error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve assessment attempt.' });
  }
};

/**
 * PATCH /api/courses/:courseId/assessments/:assessmentId/attempt/:attemptId/answers
 * Saves in-progress selected choices cleanly to backend so reload or deadline auto-submit keeps them.
 */
exports.saveAssessmentDraftAnswers = async (req, res) => {
  try {
    const { courseId, assessmentId, attemptId } = req.params;
    const { answers } = req.body;

    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'Invalid answers payload.' });
    }

    const attempt = await AssessmentAttempt.findById(attemptId);
    if (
      !attempt ||
      String(attempt.learnerId) !== String(req.user.id) ||
      String(attempt.courseId) !== String(courseId) ||
      String(attempt.assessmentId) !== String(assessmentId)
    ) {
      return res.status(404).json({ success: false, message: 'Attempt not found or unauthorized.' });
    }

    if (attempt.submissionStatus !== 'in_progress') {
      return res.status(409).json({
        success: false,
        code: 'ALREADY_FINALIZED',
        message: 'Attempt has already been finalized.'
      });
    }

    if (Date.now() > new Date(attempt.expiresAt).getTime() + 2000) {
      return res.status(403).json({
        success: false,
        code: 'DEADLINE_EXPIRED',
        message: 'Cannot save answers after assessment deadline.'
      });
    }

    await AssessmentAttempt.updateOne(
      { _id: attempt._id, learnerId: req.user.id, submissionStatus: 'in_progress' },
      { $set: { draftAnswers: answers } }
    );

    return res.json({ success: true, savedAt: Date.now() });
  } catch (err) {
    console.error('saveAssessmentDraftAnswers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save progress.' });
  }
};

/**
 * POST /api/courses/:courseId/assessments/:assessmentId/attempt/:attemptId/submit
 * Strictly validates attempt ownership, prerequisites, server deadline, evaluates answers
 * on backend, records immutable OfficialAssessmentAttempt on 1st submission, and never
 * overwrites official score on retakes.
 */
exports.submitAssessmentAttempt = async (req, res) => {
  try {
    const { courseId, assessmentId, attemptId } = req.params;
    const { answers = {}, isTimeoutSubmit = false } = req.body || {};

    if (
      !mongoose.Types.ObjectId.isValid(courseId) ||
      !mongoose.Types.ObjectId.isValid(assessmentId) ||
      !mongoose.Types.ObjectId.isValid(attemptId)
    ) {
      return res.status(400).json({ success: false, message: 'Invalid assessment or attempt ID.' });
    }

    let attempt = await AssessmentAttempt.findById(attemptId);
    if (
      !attempt ||
      String(attempt.learnerId) !== String(req.user.id) ||
      String(attempt.courseId) !== String(courseId) ||
      String(attempt.assessmentId) !== String(assessmentId)
    ) {
      return res.status(404).json({ success: false, message: 'Attempt not found or unauthorized.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const assessment = (course.courseAssessments || []).find(a => String(a._id) === String(assessmentId));
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const nowMs = Date.now();
    const expiresAtMs = new Date(attempt.expiresAt).getTime();

    // If attempt was already finalized earlier
    if (attempt.submissionStatus === 'submitted' || attempt.submissionStatus === 'timed_out') {
      const officialRecord = await OfficialAssessmentAttempt.findOne({
        courseId: course._id,
        assessmentId: assessment._id,
        learnerId: req.user.id
      }).lean();

      // If caller sends a late submission well after expiry on a timed-out attempt, reject clearly
      if (attempt.submissionStatus === 'timed_out' && nowMs > expiresAtMs + TIMEOUT_GRACE_MS && !isTimeoutSubmit) {
        return res.status(403).json({
          success: false,
          code: 'DEADLINE_EXPIRED',
          message: 'Assessment deadline has expired. Late submissions are rejected.'
        });
      }

      return res.json({
        success: true,
        alreadySubmitted: true,
        result: buildResultSummaryFromAttempt(attempt, officialRecord),
        officialAttempt: officialRecord ? {
          attemptId: officialRecord.attemptId,
          attemptNumber: officialRecord.attemptNumber,
          obtainedMarks: officialRecord.obtainedMarks,
          totalMarks: officialRecord.totalMarks,
          percentage: officialRecord.percentage,
          resultStatus: officialRecord.resultStatus,
          submittedAt: officialRecord.submittedAt
        } : null,
        review: {
          questions: buildReviewQuestionsFromAttempt(attempt, assessment)
        }
      });
    }

    // Check backend enrolment & prerequisite gating strictly
    const enrolment = await Enrolment.findOne({ courseId: course._id, learnerId: req.user.id });
    if (!enrolment) {
      return res.status(403).json({ success: false, code: 'NOT_ENROLLED', message: 'Not enrolled in course.' });
    }

    const prereq = await evaluateAssessmentPrerequisites(course, assessment, enrolment, req.user.id);
    if (!prereq.unlocked) {
      return res.status(403).json({
        success: false,
        code: 'PREREQUISITES_INCOMPLETE',
        message: 'Complete all prerequisite modules to unlock this assessment.',
        incompleteModules: prereq.incompleteModules
      });
    }

    // Strict server deadline check:
    // Accept valid submissions before expiresAt, OR a valid timeout submission right at 00:00 (within TIMEOUT_GRACE_MS).
    // Reject late submissions beyond deadline while automatically finalizing the expired attempt with server draftAnswers.
    const withinValidTimeoutWindow = Boolean(isTimeoutSubmit) && nowMs <= expiresAtMs + TIMEOUT_GRACE_MS;
    const withinManualTransitGrace = !isTimeoutSubmit && nowMs <= expiresAtMs + MANUAL_SUBMIT_GRACE_MS;

    if (nowMs > expiresAtMs && !withinValidTimeoutWindow && !withinManualTransitGrace) {
      await evaluateAndFinalizeAttempt({
        attempt,
        assessment,
        submittedAnswers: attempt.draftAnswers || {},
        submissionStatus: 'timed_out',
        submittedAtOverride: new Date(expiresAtMs)
      });

      return res.status(403).json({
        success: false,
        code: 'DEADLINE_EXPIRED',
        message: 'Assessment time limit has expired. Late submissions are rejected and your attempt has been auto-finalized.'
      });
    }

    const submissionStatus = nowMs > expiresAtMs ? 'timed_out' : 'submitted';
    const submittedAtOverride = submissionStatus === 'timed_out' ? new Date(expiresAtMs) : new Date();

    const {
      attempt: finalizedAttempt,
      officialRecord
    } = await evaluateAndFinalizeAttempt({
      attempt,
      assessment,
      submittedAnswers: answers,
      submissionStatus,
      submittedAtOverride
    });

    // Log learner activity safely (separate assessment activity types)
    try {
      const { logLearnerActivity } = require('../services/activityService');
      const isRetake = finalizedAttempt.attemptType === 'RETAKE';
      logLearnerActivity(req.user.id, {
        activityType: isRetake ? 'assessment_retaken' : 'assessment_attempted',
        title: isRetake
          ? `Assessment Retaken (Attempt #${finalizedAttempt.attemptNumber})`
          : 'Assessment Completed',
        description: `Completed "${assessment.title}" with score ${finalizedAttempt.obtainedMarks}/${finalizedAttempt.totalMarks} (${finalizedAttempt.percentage}%)`,
        courseId: course._id,
        courseTitle: course.title,
        lessonTitle: assessment.title,
        referenceId: `assessment_att_${finalizedAttempt._id}`,
        points: 0,
        metadata: {
          attemptNumber: finalizedAttempt.attemptNumber,
          attemptType: finalizedAttempt.attemptType,
          obtainedMarks: finalizedAttempt.obtainedMarks,
          totalMarks: finalizedAttempt.totalMarks,
          percentage: finalizedAttempt.percentage,
          resultStatus: finalizedAttempt.resultStatus
        },
        createdAt: finalizedAttempt.submittedAt
      }).catch(() => {});
    } catch (_) {}

    const reviewQuestions = buildReviewQuestionsFromAttempt(finalizedAttempt, assessment);

    return res.json({
      success: true,
      result: buildResultSummaryFromAttempt(finalizedAttempt, officialRecord),
      officialAttempt: officialRecord ? {
        attemptId: officialRecord.attemptId,
        attemptNumber: officialRecord.attemptNumber,
        obtainedMarks: officialRecord.obtainedMarks,
        totalMarks: officialRecord.totalMarks,
        percentage: officialRecord.percentage,
        resultStatus: officialRecord.resultStatus,
        submittedAt: officialRecord.submittedAt
      } : null,
      review: {
        questions: reviewQuestions
      }
    });
  } catch (err) {
    console.error('submitAssessmentAttempt error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit assessment attempt.' });
  }
};

/**
 * GET /api/courses/:courseId/assessments/:assessmentId/retake-leaderboard
 * Paginated practice/retake leaderboard for a specific assessment (RETAKE attempts only).
 */
exports.getRetakeLeaderboard = async (req, res) => {
  try {
    const { courseId, assessmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid course or assessment ID.' });
    }

    const course = await Course.findById(courseId).select('_id title courseAssessments').lean();
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const assessment = (course.courseAssessments || []).find(a => String(a._id) === String(assessmentId));
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const enrolment = await Enrolment.findOne({ courseId: course._id, learnerId: req.user.id }).lean();
    if (!enrolment) {
      return res.status(403).json({
        success: false,
        code: 'NOT_ENROLLED',
        message: 'You must be enrolled in this course to view retake standings.'
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const data = await getAssessmentRetakeLeaderboard({
      courseId: course._id,
      assessmentId: assessment._id,
      currentLearnerId: req.user.id,
      page,
      limit
    });

    return res.json({
      success: true,
      assessmentTitle: assessment.title,
      totalMarks: computeAssessmentTotalMarks(assessment),
      ...data
    });
  } catch (err) {
    console.error('getRetakeLeaderboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load retake leaderboard.' });
  }
};
