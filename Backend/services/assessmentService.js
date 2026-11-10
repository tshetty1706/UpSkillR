const mongoose = require('mongoose');
const AssessmentAttempt = require('../model/AssessmentAttempt');
const OfficialAssessmentAttempt = require('../model/OfficialAssessmentAttempt');
const AssessmentSubmission = require('../model/AssessmentSubmission');

const TIMEOUT_GRACE_MS = 15 * 1000;

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getPublishedCourseAssessments(course) {
  if (!course || !Array.isArray(course.courseAssessments)) return [];
  return course.courseAssessments.filter(a => a && a.state === 'published');
}

function findPublishedCourseAssessment(course, assessmentId) {
  if (!course || !assessmentId) return null;
  const target = String(assessmentId);
  return (course.courseAssessments || []).find(
    a => String(a._id) === target && a.state === 'published'
  ) || null;
}

function findCourseAssessmentRaw(course, assessmentId) {
  if (!course || !assessmentId) return null;
  const target = String(assessmentId);
  return (course.courseAssessments || []).find(a => String(a._id) === target) || null;
}

function resolveAssessmentDurationMinutes(assessment) {
  if (!assessment) return 45;
  const raw = Number(assessment.durationMinutes) || Number(assessment.timeLimit);
  return raw > 0 ? raw : 45;
}

function computeAssessmentTotalMarks(assessment) {
  if (!assessment) return 0;
  const questions = Array.isArray(assessment.questions) ? assessment.questions : [];
  if (questions.length === 0) {
    return Number(assessment.totalMarks) > 0 ? Number(assessment.totalMarks) : 0;
  }
  return questions.reduce((sum, q) => sum + (Number(q.marks) > 0 ? Number(q.marks) : 1), 0);
}

/**
 * Backend-enforced prerequisite verification for a milestone assessment.
 * Reuses single-source course progress / video / quiz completion logic so learners
 * cannot bypass incomplete modules, 80% video watch requirements, or unsubmitted quizzes.
 */
async function evaluateAssessmentPrerequisites(course, assessment, enrolment, learnerId) {
  const {
    calculateEnrolmentProgress,
    getVideoDetailsForLesson,
    getQuizDetailsForLesson
  } = require('../controller/courseController');

  const rawReqIds = Array.isArray(assessment?.requiredModuleIds) && assessment.requiredModuleIds.length > 0
    ? assessment.requiredModuleIds
    : (Array.isArray(assessment?.requiresModules) ? assessment.requiresModules : []);

  const reqModuleIdStrs = Array.from(new Set(rawReqIds.map(id => String(id?._id || id)).filter(Boolean)));

  if (reqModuleIdStrs.length === 0) {
    return {
      unlocked: true,
      totalRequiredModules: 0,
      completedRequiredModules: 0,
      requiredModules: [],
      incompleteModules: []
    };
  }

  if (!enrolment) {
    const requiredModules = reqModuleIdStrs.map((mId) => {
      const mIdx = (course.modules || []).findIndex(m => String(m._id) === mId);
      const mod = mIdx >= 0 ? course.modules[mIdx] : null;
      return {
        _id: mId,
        title: mod?.title || 'Module',
        orderNumber: mIdx >= 0 ? mIdx + 1 : null,
        totalItems: 1,
        completedItems: 0,
        progressPercentage: 0,
        isCompleted: false
      };
    });
    return {
      unlocked: false,
      totalRequiredModules: requiredModules.length,
      completedRequiredModules: 0,
      requiredModules,
      incompleteModules: requiredModules
    };
  }

  const isCoursePublished = (course.status === 'published' || course.state === 'published');
  const completedSet = new Set((enrolment.completedLessons || []).map(String));
  const progressSnapshot = calculateEnrolmentProgress(course, enrolment);
  const snapshotMap = new Map((progressSnapshot.modulesProgress || []).map(mp => [String(mp._id), mp]));

  // Pre-fetch all submitted quiz assessmentIds for this learner & course
  const submittedQuizDocs = await AssessmentSubmission.find({
    courseId: course._id,
    learnerId,
    status: { $in: ['submitted', 'graded'] }
  }).distinct('assessmentId');
  const submittedQuizIds = new Set(submittedQuizDocs.map(String));

  const getWatchRecordForKeys = (keys) => {
    if (!enrolment.videoWatchData) return null;
    for (const k of keys) {
      if (!k) continue;
      const rec = typeof enrolment.videoWatchData.get === 'function'
        ? enrolment.videoWatchData.get(String(k))
        : enrolment.videoWatchData[String(k)];
      if (rec) return rec;
    }
    return null;
  };

  const requiredModules = [];
  const incompleteModules = [];

  for (const modId of reqModuleIdStrs) {
    const modIdx = (course.modules || []).findIndex(m => String(m._id) === modId);
    const mod = modIdx >= 0 ? course.modules[modIdx] : null;
    if (!mod) continue;

    // Skip explicitly unpublished module only when course itself is unpublished
    if (!isCoursePublished && mod.state !== 'published' && mod.status !== 'published') {
      continue;
    }

    const lessons = (mod.lessons || []).filter(
      l => isCoursePublished || l.state === 'published' || l.status === 'published' || !l.state
    );

    let totalItems = 0;
    let completedItems = 0;

    for (const les of lessons) {
      const lesItems = (Array.isArray(les.items) && les.items.length > 0
        ? les.items
        : (Array.isArray(les.contentItems) ? les.contentItems : [])
      ).filter(it => isCoursePublished || it.state === 'published' || it.status === 'published');

      if (lesItems.length > 0) {
        for (const item of lesItems) {
          totalItems += 1;
          const itemIdStr = String(item._id);
          let itemSatisfied = completedSet.has(itemIdStr);

          if (itemSatisfied) {
            // 1. Enforce 80% video watch requirement on backend if playable video has known duration
            const videoDetails = getVideoDetailsForLesson(course, itemIdStr, String(les._id));
            if (videoDetails.isVideo && videoDetails.hasPlayableVideo && videoDetails.duration > 0) {
              const watchRec = getWatchRecordForKeys([
                itemIdStr,
                String(les._id),
                videoDetails.contentItemId ? String(videoDetails.contentItemId) : null
              ]);
              if (!watchRec || (!watchRec.isEligible && Number(watchRec.watchPercentage || 0) < 80)) {
                itemSatisfied = false;
              }
            }

            // 2. Enforce backend-verified submitted attempt for quiz items
            const quizDetails = getQuizDetailsForLesson(course, itemIdStr, String(les._id));
            if (quizDetails.isQuiz && quizDetails.quizzes.length > 0) {
              const allQuizzesSubmitted = quizDetails.quizzes.every(q =>
                submittedQuizIds.has(String(q.assessmentId))
              );
              if (!allQuizzesSubmitted) {
                itemSatisfied = false;
              }
            }
          }

          if (itemSatisfied) {
            completedItems += 1;
          }
        }
      } else {
        totalItems += 1;
        const lesIdStr = String(les._id);
        let lesSatisfied = completedSet.has(lesIdStr);

        if (lesSatisfied) {
          const quizDetails = getQuizDetailsForLesson(course, lesIdStr, lesIdStr);
          if (quizDetails.isQuiz && quizDetails.quizzes.length > 0) {
            const allQuizzesSubmitted = quizDetails.quizzes.every(q =>
              submittedQuizIds.has(String(q.assessmentId))
            );
            if (!allQuizzesSubmitted) {
              lesSatisfied = false;
            }
          }
        }

        if (lesSatisfied) {
          completedItems += 1;
        }
      }
    }

    const snap = snapshotMap.get(modId);
    const modIsCompleted = totalItems > 0 ? completedItems >= totalItems : true;
    const modPct = totalItems > 0
      ? (modIsCompleted ? 100 : Math.min(Math.round((completedItems / totalItems) * 100), 99))
      : 100;

    const moduleInfo = {
      _id: mod._id,
      title: mod.title || snap?.title || `Module ${modIdx + 1}`,
      orderNumber: modIdx + 1,
      totalItems,
      completedItems,
      progressPercentage: modPct,
      isCompleted: modIsCompleted
    };

    requiredModules.push(moduleInfo);
    if (!modIsCompleted) {
      incompleteModules.push(moduleInfo);
    }
  }

  return {
    unlocked: incompleteModules.length === 0,
    totalRequiredModules: requiredModules.length,
    completedRequiredModules: requiredModules.filter(m => m.isCompleted).length,
    requiredModules,
    incompleteModules
  };
}

/**
 * Generates deterministic per-attempt question/option permutations according to
 * instructor assessment configuration so browser reloads maintain consistent ordering.
 */
function prepareAttemptOrdering(assessment) {
  const questions = Array.isArray(assessment.questions) ? assessment.questions : [];
  const indexedQuestions = questions.map((q, idx) => ({
    q,
    qId: q._id ? String(q._id) : `q_${idx}`
  }));

  const orderedEntries = assessment.shuffleQuestions
    ? shuffleArray(indexedQuestions)
    : indexedQuestions;

  const questionOrder = orderedEntries.map(entry => entry.qId);
  const optionOrders = new Map();

  for (const { q, qId } of orderedEntries) {
    const opts = Array.isArray(q.options) ? q.options : [];
    const indices = opts.map((_, i) => i);
    const qType = String(q.type || 'mcq').toLowerCase();
    const shouldShuffle = Boolean(assessment.shuffleOptions) && opts.length > 1 && qType !== 'true_false';
    optionOrders.set(qId, shouldShuffle ? shuffleArray(indices) : indices);
  }

  return { questionOrder, optionOrders };
}

function getOrderedQuestionsForAttempt(assessment, attempt) {
  const rawQuestions = Array.isArray(assessment.questions) ? assessment.questions : [];
  const byId = new Map();
  rawQuestions.forEach((q, idx) => {
    const qId = q._id ? String(q._id) : `q_${idx}`;
    byId.set(qId, q);
  });

  const ordered = [];
  const seen = new Set();

  if (Array.isArray(attempt?.questionOrder) && attempt.questionOrder.length > 0) {
    for (const qId of attempt.questionOrder) {
      const q = byId.get(String(qId));
      if (q && !seen.has(String(qId))) {
        ordered.push({ q, qId: String(qId) });
        seen.add(String(qId));
      }
    }
  }

  rawQuestions.forEach((q, idx) => {
    const qId = q._id ? String(q._id) : `q_${idx}`;
    if (!seen.has(qId)) {
      ordered.push({ q, qId });
      seen.add(qId);
    }
  });

  return ordered;
}

function getOptionPermutation(attempt, qId, optionCount) {
  if (attempt?.optionOrders) {
    const rawPerm = typeof attempt.optionOrders.get === 'function'
      ? attempt.optionOrders.get(qId)
      : attempt.optionOrders[qId];
    if (Array.isArray(rawPerm) && rawPerm.length === optionCount) {
      return rawPerm.map(Number);
    }
  }
  return Array.from({ length: optionCount }, (_, i) => i);
}

/**
 * Strips all answer keys, correctAnswerIndex, correctOptionIndexes, and explanations
 * before sending active attempt questions to the client.
 */
function buildSanitizedQuestionsForAttempt(assessment, attempt) {
  const ordered = getOrderedQuestionsForAttempt(assessment, attempt);

  return ordered.map(({ q, qId }, displayIdx) => {
    const rawOptions = Array.isArray(q.options) ? q.options : [];
    const rawOptionImages = Array.isArray(q.optionImages) ? q.optionImages : [];
    const perm = getOptionPermutation(attempt, qId, rawOptions.length);

    return {
      _id: qId,
      questionIndex: displayIdx,
      questionText: q.questionText,
      type: q.type || 'mcq',
      options: perm.map(origIdx => rawOptions[origIdx]),
      optionImages: perm.map(origIdx => rawOptionImages[origIdx] || ''),
      marks: Number(q.marks) > 0 ? Number(q.marks) : 1
    };
  });
}

function buildReviewQuestionsFromAttempt(attempt, assessment) {
  const qMap = new Map();
  ((assessment && assessment.questions) || []).forEach((q, idx) => {
    qMap.set(q._id ? String(q._id) : `q_${idx}`, q);
  });

  return (attempt.answers || []).map((ans, idx) => {
    const origQ = qMap.get(String(ans.questionId));
    return {
      questionId: ans.questionId,
      questionIndex: idx,
      questionText: ans.questionText || origQ?.questionText || `Question ${idx + 1}`,
      type: ans.questionType || origQ?.type || 'mcq',
      options: (ans.options && ans.options.length > 0) ? ans.options : (origQ?.options || []),
      optionImages: (ans.optionImages && ans.optionImages.length > 0) ? ans.optionImages : (origQ?.optionImages || []),
      studentAnswer: ans.studentAnswer,
      correctAnswer: ans.correctAnswer,
      isCorrect: Boolean(ans.isCorrect),
      isAnswered: Boolean(ans.isAnswered),
      marksAwarded: Number(ans.marksAwarded) || 0,
      maxMarks: Number(ans.maxMarks) || 1,
      explanation: ans.explanation || origQ?.explanation || ''
    };
  });
}

function buildResultSummaryFromAttempt(attempt, officialRecord = null) {
  const isOfficial = attempt.attemptType === 'OFFICIAL' || Boolean(
    officialRecord && String(officialRecord.attemptId) === String(attempt._id)
  );
  return {
    attemptId: attempt._id,
    assessmentId: attempt.assessmentId,
    courseId: attempt.courseId,
    attemptNumber: attempt.attemptNumber || 1,
    attemptType: isOfficial ? 'OFFICIAL' : 'RETAKE',
    isOfficial,
    obtainedMarks: attempt.obtainedMarks || 0,
    totalMarks: attempt.totalMarks || 0,
    percentage: attempt.percentage || 0,
    passThresholdPercent: attempt.passThresholdPercent ?? 70,
    resultStatus: attempt.resultStatus || 'FAIL',
    submissionStatus: attempt.submissionStatus,
    correctCount: attempt.correctCount || 0,
    incorrectCount: attempt.incorrectCount || 0,
    unansweredCount: attempt.unansweredCount || 0,
    totalQuestions: attempt.totalQuestions || (attempt.answers || []).length,
    timeTakenSeconds: attempt.timeTakenSeconds || 0,
    durationMinutes: attempt.durationMinutes || 45,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    submittedAt: attempt.submittedAt
  };
}

/**
 * Evaluates submitted answers strictly against instructor answer keys on the backend,
 * transitions attempt atomically, and locks in an immutable OfficialAssessmentAttempt
 * if this is the learner's first submitted attempt for this assessment.
 */
async function evaluateAndFinalizeAttempt({
  attempt,
  assessment,
  submittedAnswers = {},
  submissionStatus = 'submitted',
  submittedAtOverride = null
}) {
  const ordered = getOrderedQuestionsForAttempt(assessment, attempt);
  const safeAnswers = (submittedAnswers && typeof submittedAnswers === 'object') ? submittedAnswers : {};

  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let obtainedMarks = 0;
  let totalMarks = 0;
  const evaluatedAnswers = [];

  ordered.forEach(({ q, qId }, displayIdx) => {
    const rawOptions = Array.isArray(q.options) ? q.options : [];
    const rawOptionImages = Array.isArray(q.optionImages) ? q.optionImages : [];
    const perm = getOptionPermutation(attempt, qId, rawOptions.length);

    const displayedOptions = perm.map(origIdx => rawOptions[origIdx]);
    const displayedOptionImages = perm.map(origIdx => rawOptionImages[origIdx] || '');

    const rawAns = safeAnswers[qId] !== undefined ? safeAnswers[qId] : safeAnswers[String(displayIdx)];
    const qMarks = Number(q.marks) > 0 ? Number(q.marks) : 1;
    totalMarks += qMarks;

    const qType = String(q.type || 'mcq').toLowerCase();
    const isMulti = qType === 'multiple_response';
    const isText = qType === 'short_answer' || qType === 'long_answer';

    let isAnswered = false;
    let isCorrect = false;
    let normalizedStudentAnswer = null;
    let normalizedCorrectAnswer = null;

    if (isMulti) {
      const selectedDispIndices = Array.isArray(rawAns)
        ? Array.from(new Set(rawAns.map(Number).filter(n => !isNaN(n) && n >= 0 && n < displayedOptions.length))).sort((a, b) => a - b)
        : [];
      isAnswered = selectedDispIndices.length > 0;
      normalizedStudentAnswer = isAnswered ? selectedDispIndices : null;

      const expectedOrigIndices = Array.from(
        new Set((q.correctOptionIndexes || []).map(Number).filter(n => !isNaN(n)))
      ).sort((a, b) => a - b);

      normalizedCorrectAnswer = expectedOrigIndices
        .map(origIdx => perm.indexOf(origIdx))
        .filter(i => i >= 0)
        .sort((a, b) => a - b);

      if (isAnswered) {
        const studentOrigIndices = selectedDispIndices
          .map(dispIdx => perm[dispIdx])
          .filter(v => v !== undefined)
          .sort((a, b) => a - b);

        isCorrect =
          expectedOrigIndices.length > 0 &&
          studentOrigIndices.length === expectedOrigIndices.length &&
          studentOrigIndices.every((val, i) => val === expectedOrigIndices[i]);
      }
    } else if (isText) {
      const strAns = rawAns !== undefined && rawAns !== null ? String(rawAns).trim() : '';
      isAnswered = strAns.length > 0;
      normalizedStudentAnswer = isAnswered ? strAns : null;
      normalizedCorrectAnswer = q.correctAnswer !== undefined && q.correctAnswer !== null ? String(q.correctAnswer).trim() : '';
      if (isAnswered && normalizedCorrectAnswer) {
        isCorrect = strAns.toLowerCase() === normalizedCorrectAnswer.toLowerCase();
      }
    } else {
      const hasVal = rawAns !== undefined && rawAns !== null && rawAns !== '';
      const origCorrectIdx = Number(q.correctAnswerIndex ?? 0);
      const dispCorrectIdx = perm.indexOf(origCorrectIdx);
      normalizedCorrectAnswer = dispCorrectIdx >= 0 ? dispCorrectIdx : origCorrectIdx;

      if (hasVal) {
        const parsedDispIdx = Number(rawAns);
        if (!isNaN(parsedDispIdx) && parsedDispIdx >= 0 && parsedDispIdx < displayedOptions.length) {
          isAnswered = true;
          normalizedStudentAnswer = parsedDispIdx;
          const selectedOrigIdx = perm[parsedDispIdx];
          if (selectedOrigIdx === origCorrectIdx) {
            isCorrect = true;
          } else if (q.correctAnswer !== undefined && q.correctAnswer !== null && String(q.correctAnswer).trim() !== '') {
            isCorrect = String(displayedOptions[parsedDispIdx] || '').trim().toLowerCase() ===
              String(q.correctAnswer).trim().toLowerCase();
          }
        } else if (typeof rawAns === 'string' && rawAns.trim() !== '') {
          isAnswered = true;
          normalizedStudentAnswer = rawAns.trim();
          const expectedText = q.correctAnswer !== undefined && q.correctAnswer !== null && String(q.correctAnswer).trim() !== ''
            ? String(q.correctAnswer).trim()
            : String(rawOptions[origCorrectIdx] || '').trim();
          if (expectedText) {
            isCorrect = rawAns.trim().toLowerCase() === expectedText.toLowerCase();
          }
        }
      }
    }

    let marksAwarded = 0;
    if (!isAnswered) {
      unansweredCount += 1;
    } else if (isCorrect) {
      correctCount += 1;
      marksAwarded = qMarks;
      obtainedMarks += qMarks;
    } else {
      incorrectCount += 1;
    }

    evaluatedAnswers.push({
      questionId: mongoose.Types.ObjectId.isValid(q._id) ? q._id : new mongoose.Types.ObjectId(),
      questionText: q.questionText || `Question ${displayIdx + 1}`,
      questionType: q.type || 'mcq',
      options: displayedOptions,
      optionImages: displayedOptionImages,
      studentAnswer: normalizedStudentAnswer,
      correctAnswer: normalizedCorrectAnswer,
      isCorrect,
      isAnswered,
      marksAwarded,
      maxMarks: qMarks,
      explanation: q.explanation || ''
    });
  });

  if (totalMarks <= 0) {
    totalMarks = computeAssessmentTotalMarks(assessment);
  }
  const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;
  const passThreshold = Number(attempt.passThresholdPercent ?? assessment.passThresholdPercent ?? 70);
  const resultStatus = percentage >= passThreshold ? 'PASS' : 'FAIL';

  const startMs = new Date(attempt.startedAt).getTime();
  const maxDurationSec = Math.max(60, (attempt.durationMinutes || resolveAssessmentDurationMinutes(assessment)) * 60);
  const finalSubmittedAt = submittedAtOverride ? new Date(submittedAtOverride) : new Date();
  const rawElapsedSec = Math.max(1, Math.round((finalSubmittedAt.getTime() - startMs) / 1000));
  const timeTakenSeconds = submissionStatus === 'timed_out'
    ? maxDurationSec
    : Math.min(maxDurationSec, rawElapsedSec);

  const transitioned = await AssessmentAttempt.findOneAndUpdate(
    { _id: attempt._id, learnerId: attempt.learnerId, submissionStatus: 'in_progress' },
    {
      $set: {
        submissionStatus,
        submittedAt: finalSubmittedAt,
        timeTakenSeconds,
        answers: evaluatedAnswers,
        obtainedMarks,
        totalMarks,
        percentage,
        correctCount,
        incorrectCount,
        unansweredCount,
        totalQuestions: evaluatedAnswers.length,
        resultStatus,
        passThresholdPercent: passThreshold
      }
    },
    { new: true }
  );

  if (!transitioned) {
    // Another request concurrently finalized this exact attempt
    const existingFinalized = await AssessmentAttempt.findById(attempt._id);
    const officialRecord = await OfficialAssessmentAttempt.findOne({
      courseId: attempt.courseId,
      assessmentId: attempt.assessmentId,
      learnerId: attempt.learnerId
    });
    return { alreadyFinalized: true, attempt: existingFinalized, officialRecord };
  }

  // Atomically establish immutable OfficialAssessmentAttempt if none exists yet
  let officialRecord = await OfficialAssessmentAttempt.findOne({
    courseId: transitioned.courseId,
    assessmentId: transitioned.assessmentId,
    learnerId: transitioned.learnerId
  });

  if (!officialRecord) {
    try {
      officialRecord = await OfficialAssessmentAttempt.create({
        learnerId: transitioned.learnerId,
        courseId: transitioned.courseId,
        assessmentId: transitioned.assessmentId,
        attemptId: transitioned._id,
        attemptNumber: transitioned.attemptNumber,
        obtainedMarks: transitioned.obtainedMarks,
        totalMarks: transitioned.totalMarks,
        percentage: transitioned.percentage,
        resultStatus: transitioned.resultStatus,
        submissionStatus: transitioned.submissionStatus,
        timeTakenSeconds: transitioned.timeTakenSeconds,
        submittedAt: transitioned.submittedAt
      });

      if (transitioned.attemptType !== 'OFFICIAL') {
        transitioned.attemptType = 'OFFICIAL';
        await transitioned.save();
      }
    } catch (err) {
      if (err && err.code === 11000) {
        // Concurrent first submission won the immutable official slot; keep existing official permanently
        officialRecord = await OfficialAssessmentAttempt.findOne({
          courseId: transitioned.courseId,
          assessmentId: transitioned.assessmentId,
          learnerId: transitioned.learnerId
        });
        if (transitioned.attemptType !== 'RETAKE') {
          transitioned.attemptType = 'RETAKE';
          await transitioned.save();
        }
      } else {
        throw err;
      }
    }
  } else if (transitioned.attemptType !== 'RETAKE' && String(officialRecord.attemptId) !== String(transitioned._id)) {
    transitioned.attemptType = 'RETAKE';
    await transitioned.save();
  }

  return { alreadyFinalized: false, attempt: transitioned, officialRecord };
}

/**
 * Automatically finalizes an expired in-progress attempt past the deadline + grace window
 * using server-saved draftAnswers so expired attempts never stay orphaned in progress.
 */
async function finalizeExpiredAttemptIfNeeded(attempt, assessment, nowMs = Date.now()) {
  if (!attempt || attempt.submissionStatus !== 'in_progress') {
    return { expiredFinalized: false, attempt, officialRecord: null };
  }

  const expiresAtMs = new Date(attempt.expiresAt).getTime();
  if (nowMs <= expiresAtMs + TIMEOUT_GRACE_MS) {
    return { expiredFinalized: false, attempt, officialRecord: null };
  }

  const { attempt: finalizedAttempt, officialRecord } = await evaluateAndFinalizeAttempt({
    attempt,
    assessment,
    submittedAnswers: attempt.draftAnswers || {},
    submissionStatus: 'timed_out',
    submittedAtOverride: new Date(expiresAtMs)
  });

  return { expiredFinalized: true, attempt: finalizedAttempt, officialRecord };
}

module.exports = {
  TIMEOUT_GRACE_MS,
  getPublishedCourseAssessments,
  findPublishedCourseAssessment,
  findCourseAssessmentRaw,
  resolveAssessmentDurationMinutes,
  computeAssessmentTotalMarks,
  evaluateAssessmentPrerequisites,
  prepareAttemptOrdering,
  buildSanitizedQuestionsForAttempt,
  buildReviewQuestionsFromAttempt,
  buildResultSummaryFromAttempt,
  evaluateAndFinalizeAttempt,
  finalizeExpiredAttemptIfNeeded
};
