const mongoose = require('mongoose');
const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');
const Learner = require('../model/Learner');
const AssessmentSubmission = require('../model/AssessmentSubmission');
const { calculateCourseLeaderboard, findCourseQuizzesOnly } = require('../services/leaderboardService');

/**
 * Helper to locate quiz inside Course schema:
 * Checks modules -> lessons -> items, or courseAssessments
 */
function findQuizInCourse(course, quizId) {
  if (!course) return null;

  const targetIdStr = String(quizId);

  // 1. Check modules -> lessons -> items
  for (let mIdx = 0; mIdx < (course.modules || []).length; mIdx++) {
    const mod = course.modules[mIdx];
    for (let lIdx = 0; lIdx < (mod.lessons || []).length; lIdx++) {
      const les = mod.lessons[lIdx];
      // Check items
      const items = les.items || les.contentItems || [];
      for (let iIdx = 0; iIdx < items.length; iIdx++) {
        const it = items[iIdx];
        if (String(it._id) === targetIdStr) {
          return {
            type: 'item_quiz',
            quizObj: it.quiz || {},
            questions: it.quiz?.questions || [],
            title: it.title || les.title || 'Lesson Quiz',
            description: it.description || '',
            instructions: it.quiz?.instructions || '',
            passThresholdPercent: it.quiz?.passThresholdPercent ?? 70,
            durationMinutes: it.quiz?.durationMinutes ?? it.quiz?.timeLimit ?? null,
            totalMarks: it.quiz?.totalMarks ?? null,
            module: mod,
            moduleIndex: mIdx,
            lesson: les,
            lessonIndex: lIdx,
            item: it,
            itemIndex: iIdx,
            assessmentId: it._id
          };
        }
      }

      // Also check if the quiz was identified by lessonId
      if (String(les._id) === targetIdStr) {
        const quizItem = items.find(it => it.type && it.type.toLowerCase() === 'quiz');
        if (quizItem) {
          return {
            type: 'item_quiz',
            quizObj: quizItem.quiz || {},
            questions: quizItem.quiz?.questions || [],
            title: quizItem.title || les.title || 'Lesson Quiz',
            description: quizItem.description || '',
            instructions: quizItem.quiz?.instructions || '',
            passThresholdPercent: quizItem.quiz?.passThresholdPercent ?? 70,
            durationMinutes: quizItem.quiz?.durationMinutes ?? quizItem.quiz?.timeLimit ?? null,
            totalMarks: quizItem.quiz?.totalMarks ?? null,
            module: mod,
            moduleIndex: mIdx,
            lesson: les,
            lessonIndex: lIdx,
            item: quizItem,
            itemIndex: items.indexOf(quizItem),
            assessmentId: quizItem._id
          };
        }

        const lesType = String(les.type || '').trim().toLowerCase();
        if (lesType === 'quiz' || lesType.includes('quiz') || les.quiz || (les.questions && les.questions.length > 0)) {
          return {
            type: 'lesson_quiz',
            quizObj: les.quiz || {},
            questions: les.quiz?.questions || les.questions || [],
            title: les.title || 'Lesson Quiz',
            description: les.description || '',
            instructions: les.quiz?.instructions || '',
            passThresholdPercent: les.quiz?.passThresholdPercent ?? 70,
            durationMinutes: les.quiz?.durationMinutes ?? les.quiz?.timeLimit ?? null,
            totalMarks: les.quiz?.totalMarks ?? null,
            module: mod,
            moduleIndex: mIdx,
            lesson: les,
            lessonIndex: lIdx,
            item: null,
            itemIndex: -1,
            assessmentId: les._id
          };
        }
      }
    }
  }

  return null;
}

/**
 * Helper to retrieve all quiz IDs and metadata across a course (excludes milestone courseAssessments)
 */
function findAllQuizzesInCourse(course) {
  return findCourseQuizzesOnly(course);
}

/**
 * Calculates quiz duration:
 * 1. Uses instructor-defined duration if present
 * 2. Otherwise calculates:
 *    - MCQ: 1 min/q
 *    - Multiple-select: 1.5 min/q
 *    - Coding/practical: 5 min/q
 *    - Default: 1 min/q
 *    - Minimum: 5 minutes
 */
function resolveQuizDuration(quizInfo) {
  if (quizInfo.durationMinutes && Number(quizInfo.durationMinutes) > 0) {
    return {
      durationMinutes: Number(quizInfo.durationMinutes),
      isCalculated: false
    };
  }

  const questions = quizInfo.questions || [];
  if (questions.length === 0) {
    return { durationMinutes: 5, isCalculated: true };
  }

  let totalMins = 0;
  for (const q of questions) {
    const qType = (q.type || 'mcq').toLowerCase();
    if (qType === 'multiple_response' || qType === 'multiple_choice') {
      totalMins += 1.5;
    } else if (qType === 'coding' || qType === 'practical') {
      totalMins += 5;
    } else {
      totalMins += 1.0;
    }
  }

  const calculated = Math.max(5, Math.ceil(totalMins));
  return {
    durationMinutes: calculated,
    isCalculated: true
  };
}

/**
 * Computes total marks for the quiz questions
 */
function resolveQuizMarks(quizInfo) {
  const questions = quizInfo.questions || [];
  const sumMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
  if (quizInfo.totalMarks && Number(quizInfo.totalMarks) > 0) {
    return Number(quizInfo.totalMarks);
  }
  return sumMarks > 0 ? sumMarks : questions.length;
}

// ─── 1. Get Quiz Information (GFG-inspired overview) ───
exports.getQuizInfo = async (req, res) => {
  try {
    const { courseId, quizId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const quizInfo = findQuizInCourse(course, quizId);
    if (!quizInfo) {
      return res.status(404).json({ success: false, message: 'Quiz not found in course.' });
    }

    // Verify student is enrolled
    const enrolment = await Enrolment.findOne({ courseId, learnerId: req.user.id });
    if (!enrolment) {
      return res.status(403).json({ success: false, message: 'You must be enrolled to access this quiz.' });
    }

    const { durationMinutes, isCalculated } = resolveQuizDuration(quizInfo);
    const totalMarks = resolveQuizMarks(quizInfo);
    const totalQuestions = quizInfo.questions.length;

    // Fetch previous submissions by this student for this quiz
    const submissions = await AssessmentSubmission.find({
      assessmentId: quizInfo.assessmentId,
      learnerId: req.user.id,
      status: { $in: ['submitted', 'graded'] }
    }).sort({ attemptNumber: 1, submittedAt: 1 });

    const attemptsCount = submissions.length;
    let firstAttempt = null;

    const formattedAttempts = submissions.map(s => ({
      attemptId: s._id,
      attemptNumber: s.attemptNumber || 1,
      totalScore: s.totalScore || 0,
      maxScore: s.maxScore || totalMarks,
      percentage: s.percentage || 0,
      gradeResult: s.gradeResult || 'pending',
      correctCount: s.correctCount || 0,
      incorrectCount: s.incorrectCount || 0,
      unansweredCount: s.unansweredCount || 0,
      timeTakenSeconds: s.timeTakenSeconds || 0,
      submittedAt: s.submittedAt,
      isOfficial: Boolean(s.isOfficial || s.isFirstAttempt || s.attemptNumber === 1),
      isFirstAttempt: Boolean(s.isFirstAttempt || s.attemptNumber === 1)
    }));

    if (attemptsCount > 0) {
      // Find the official first attempt (either isOfficial: true or lowest attemptNumber)
      firstAttempt = formattedAttempts.find(s => s.isOfficial || s.isFirstAttempt) || formattedAttempts[0];
    }

    // Check if there is an active in-progress attempt within valid window
    const activeAttempt = await AssessmentSubmission.findOne({
      assessmentId: quizInfo.assessmentId,
      learnerId: req.user.id,
      status: 'in_progress'
    }).sort({ startedAt: -1 });

    let activeAttemptId = null;
    if (activeAttempt) {
      const allowedMs = (durationMinutes + 2) * 60 * 1000;
      if (Date.now() - new Date(activeAttempt.startedAt).getTime() < allowedMs) {
        activeAttemptId = activeAttempt._id;
      }
    }

    return res.json({
      success: true,
      quiz: {
        id: quizInfo.assessmentId,
        title: quizInfo.title,
        description: quizInfo.description,
        instructions: quizInfo.instructions,
        courseTitle: course.title,
        moduleTitle: quizInfo.module?.title || '',
        lessonTitle: quizInfo.lesson?.title || '',
        totalQuestions,
        totalMarks,
        durationMinutes,
        isCalculatedDuration: isCalculated,
        passThresholdPercent: quizInfo.passThresholdPercent
      },
      hasAttempted: attemptsCount > 0,
      attemptsCount,
      firstAttempt,
      attempts: formattedAttempts,
      activeAttemptId
    });
  } catch (err) {
    console.error('getQuizInfo error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve quiz details.' });
  }
};

// ─── 2. Start or Resume Quiz Attempt ───
exports.startQuizAttempt = async (req, res) => {
  try {
    const { courseId, quizId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const quizInfo = findQuizInCourse(course, quizId);
    if (!quizInfo) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    // Verify enrollment
    const enrolment = await Enrolment.findOne({ courseId, learnerId: req.user.id });
    if (!enrolment) {
      return res.status(403).json({ success: false, message: 'You must be enrolled to take this quiz.' });
    }

    const { durationMinutes, isCalculated } = resolveQuizDuration(quizInfo);
    const totalMarks = resolveQuizMarks(quizInfo);
    const questions = quizInfo.questions;

    // Check for existing in-progress attempt that hasn't expired
    let attempt = await AssessmentSubmission.findOne({
      assessmentId: quizInfo.assessmentId,
      learnerId: req.user.id,
      status: 'in_progress'
    }).sort({ startedAt: -1 });

    const maxMs = (durationMinutes + 1) * 60 * 1000;
    const isStillValid = attempt && (Date.now() - new Date(attempt.startedAt).getTime() < maxMs);

    if (!isStillValid) {
      if (attempt) {
        attempt.status = 'expired';
        await attempt.save().catch(() => {});
      }

      // Determine attempt number
      const previousCount = await AssessmentSubmission.countDocuments({
        assessmentId: quizInfo.assessmentId,
        learnerId: req.user.id,
        status: { $in: ['submitted', 'graded'] }
      });

      const learnerUser = await Learner.findById(req.user.id) || req.user;
      const learnerDisplayName = learnerUser.name || learnerUser.fullName || req.user.name || 'Learner';

      attempt = new AssessmentSubmission({
        courseId: course._id,
        moduleId: quizInfo.module?._id || null,
        lessonId: quizInfo.lesson?._id || null,
        assessmentId: quizInfo.assessmentId,
        assessmentTitle: quizInfo.title,
        learnerId: req.user.id,
        learnerName: learnerDisplayName,
        learnerEmail: req.user.email,
        startedAt: new Date(),
        attemptNumber: previousCount + 1,
        durationMinutes,
        maxScore: totalMarks,
        totalQuestions: questions.length,
        status: 'in_progress',
        answers: []
      });

      await attempt.save();
    }

    // Sanitize questions: strip correct answers, explanations, etc.
    const sanitizedQuestions = questions.map((q, idx) => ({
      _id: q._id || `q_${idx + 1}`,
      questionIndex: idx,
      questionText: q.questionText,
      type: q.type || 'mcq',
      options: Array.isArray(q.options) ? q.options : [],
      optionImages: Array.isArray(q.optionImages) ? q.optionImages : [],
      marks: Number(q.marks) || 1
    }));

    return res.json({
      success: true,
      attemptId: attempt._id,
      startedAt: attempt.startedAt,
      durationMinutes,
      serverTime: Date.now(),
      quiz: {
        id: quizInfo.assessmentId,
        title: quizInfo.title,
        courseTitle: course.title,
        moduleTitle: quizInfo.module?.title || '',
        lessonTitle: quizInfo.lesson?.title || '',
        totalQuestions: sanitizedQuestions.length,
        totalMarks,
        durationMinutes,
        isCalculatedDuration: isCalculated,
        questions: sanitizedQuestions
      }
    });
  } catch (err) {
    console.error('startQuizAttempt error:', err);
    return res.status(500).json({ success: false, message: 'Could not start quiz attempt.' });
  }
};

// ─── 3. Get Active Quiz Attempt State (For Refresh / Page Reload / Review) ───
exports.getQuizAttempt = async (req, res) => {
  try {
    const { courseId, quizId, attemptId } = req.params;
    const attempt = await AssessmentSubmission.findById(attemptId);

    if (!attempt || String(attempt.learnerId) !== String(req.user.id)) {
      return res.status(404).json({ success: false, message: 'Attempt not found or access denied.' });
    }

    const course = await Course.findById(courseId);
    const quizInfo = findQuizInCourse(course, quizId);
    if (!quizInfo) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    const isSubmitted = attempt.status === 'submitted' || attempt.status === 'graded';

    // If attempt is finalized, return full result summary and question-by-question review
    if (isSubmitted) {
      const reviewQuestions = (attempt.answers || []).map((ans, idx) => {
        const qOriginal = quizInfo?.questions ? (quizInfo.questions.find(q => String(q._id) === String(ans.questionId)) || quizInfo.questions[idx]) : null;
        return {
          questionId: ans.questionId,
          questionIndex: idx,
          questionText: ans.questionText || qOriginal?.questionText || `Question ${idx + 1}`,
          type: ans.questionType || qOriginal?.type || 'mcq',
          options: (ans.options && ans.options.length > 0) ? ans.options : (qOriginal?.options || []),
          optionImages: (ans.optionImages && ans.optionImages.length > 0) ? ans.optionImages : (qOriginal?.optionImages || []),
          studentAnswer: ans.studentAnswer,
          correctAnswer: ans.correctAnswer !== undefined && ans.correctAnswer !== '' ? ans.correctAnswer : (qOriginal?.correctAnswerIndex ?? qOriginal?.correctAnswer),
          isCorrect: Boolean(ans.isCorrect),
          isAnswered: ans.isAnswered !== undefined ? ans.isAnswered : (ans.studentAnswer !== undefined && ans.studentAnswer !== null && ans.studentAnswer !== ''),
          marksAwarded: ans.marksAwarded || 0,
          maxMarks: ans.maxMarks || qOriginal?.marks || 1,
          explanation: ans.feedback || qOriginal?.explanation || ''
        };
      });

      return res.json({
        success: true,
        attemptId: attempt._id,
        startedAt: attempt.startedAt,
        durationMinutes: attempt.durationMinutes || 10,
        serverTime: Date.now(),
        status: attempt.status,
        isSubmitted: true,
        result: {
          attemptId: attempt._id,
          attemptNumber: attempt.attemptNumber || 1,
          totalScore: attempt.totalScore || 0,
          maxScore: attempt.maxScore || resolveQuizMarks(quizInfo),
          percentage: attempt.percentage || 0,
          gradeResult: attempt.gradeResult || 'pending',
          correctCount: attempt.correctCount || 0,
          incorrectCount: attempt.incorrectCount || 0,
          unansweredCount: attempt.unansweredCount || 0,
          totalQuestions: reviewQuestions.length || attempt.totalQuestions || quizInfo.questions.length,
          timeTakenSeconds: attempt.timeTakenSeconds || 0,
          submittedAt: attempt.submittedAt,
          isFirstAttempt: Boolean(attempt.isFirstAttempt || attempt.attemptNumber === 1),
          isOfficial: Boolean(attempt.isOfficial || attempt.isFirstAttempt || attempt.attemptNumber === 1)
        },
        review: {
          questions: reviewQuestions
        },
        quiz: {
          id: quizInfo.assessmentId,
          title: quizInfo.title,
          courseTitle: course?.title || '',
          moduleTitle: quizInfo.module?.title || '',
          lessonTitle: quizInfo.lesson?.title || '',
          totalQuestions: reviewQuestions.length || quizInfo.questions.length,
          totalMarks: resolveQuizMarks(quizInfo)
        }
      });
    }

    // Active in-progress attempt: sanitize questions (NEVER expose answers or explanations)
    const sanitizedQuestions = quizInfo.questions.map((q, idx) => ({
      _id: q._id || `q_${idx + 1}`,
      questionIndex: idx,
      questionText: q.questionText,
      type: q.type || 'mcq',
      options: Array.isArray(q.options) ? q.options : [],
      optionImages: Array.isArray(q.optionImages) ? q.optionImages : [],
      marks: Number(q.marks) || 1
    }));

    return res.json({
      success: true,
      attemptId: attempt._id,
      startedAt: attempt.startedAt,
      durationMinutes: attempt.durationMinutes || 10,
      serverTime: Date.now(),
      status: attempt.status,
      isSubmitted: false,
      quiz: {
        id: quizInfo.assessmentId,
        title: quizInfo.title,
        description: quizInfo.description,
        instructions: quizInfo.instructions,
        courseTitle: course?.title || '',
        moduleTitle: quizInfo.module?.title || '',
        lessonTitle: quizInfo.lesson?.title || '',
        totalQuestions: sanitizedQuestions.length,
        totalMarks: resolveQuizMarks(quizInfo),
        questions: sanitizedQuestions
      }
    });
  } catch (err) {
    console.error('getQuizAttempt error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve attempt.' });
  }
};

// ─── 4. Submit Quiz Attempt & Evaluate on Backend ───
exports.submitQuizAttempt = async (req, res) => {
  try {
    const { courseId, quizId, attemptId } = req.params;
    const { answers = {} } = req.body;

    const attempt = await AssessmentSubmission.findById(attemptId);
    if (!attempt || String(attempt.learnerId) !== String(req.user.id)) {
      return res.status(404).json({ success: false, message: 'Attempt not found or unauthorized.' });
    }

    const course = await Course.findById(courseId);
    const quizInfo = findQuizInCourse(course, quizId);
    if (!quizInfo) {
      return res.status(404).json({ success: false, message: 'Quiz questions not found.' });
    }

    // If already submitted, return the saved result with full review (idempotent / double-submit safe)
    if (attempt.status === 'submitted' || attempt.status === 'graded') {
      const reviewQuestions = (attempt.answers || []).map((ans, idx) => {
        const qOriginal = quizInfo?.questions ? (quizInfo.questions.find(q => String(q._id) === String(ans.questionId)) || quizInfo.questions[idx]) : null;
        return {
          questionId: ans.questionId,
          questionIndex: idx,
          questionText: ans.questionText || qOriginal?.questionText || `Question ${idx + 1}`,
          type: ans.questionType || qOriginal?.type || 'mcq',
          options: (ans.options && ans.options.length > 0) ? ans.options : (qOriginal?.options || []),
          optionImages: (ans.optionImages && ans.optionImages.length > 0) ? ans.optionImages : (qOriginal?.optionImages || []),
          studentAnswer: ans.studentAnswer,
          correctAnswer: ans.correctAnswer !== undefined && ans.correctAnswer !== '' ? ans.correctAnswer : (qOriginal?.correctAnswerIndex ?? qOriginal?.correctAnswer),
          isCorrect: Boolean(ans.isCorrect),
          isAnswered: ans.isAnswered !== undefined ? ans.isAnswered : (ans.studentAnswer !== undefined && ans.studentAnswer !== null && ans.studentAnswer !== ''),
          marksAwarded: ans.marksAwarded || 0,
          maxMarks: ans.maxMarks || qOriginal?.marks || 1,
          explanation: ans.feedback || qOriginal?.explanation || ''
        };
      });

      return res.json({
        success: true,
        alreadySubmitted: true,
        result: {
          attemptId: attempt._id,
          attemptNumber: attempt.attemptNumber || 1,
          totalScore: attempt.totalScore || 0,
          maxScore: attempt.maxScore || resolveQuizMarks(quizInfo),
          percentage: attempt.percentage || 0,
          gradeResult: attempt.gradeResult || 'pending',
          correctCount: attempt.correctCount || 0,
          incorrectCount: attempt.incorrectCount || 0,
          unansweredCount: attempt.unansweredCount || 0,
          totalQuestions: reviewQuestions.length || attempt.totalQuestions || quizInfo.questions.length,
          timeTakenSeconds: attempt.timeTakenSeconds || 0,
          submittedAt: attempt.submittedAt,
          isFirstAttempt: Boolean(attempt.isFirstAttempt || attempt.attemptNumber === 1),
          isOfficial: Boolean(attempt.isOfficial || attempt.isFirstAttempt || attempt.attemptNumber === 1)
        },
        review: {
          questions: reviewQuestions
        }
      });
    }

    const questions = quizInfo.questions || [];
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let totalScore = 0;
    const evaluatedAnswers = [];

    questions.forEach((q, qIdx) => {
      const qKey = q._id ? String(q._id) : String(qIdx);
      const studentAns = answers[qKey] !== undefined ? answers[qKey] : answers[qIdx];
      const qMarks = Number(q.marks) || 1;
      const isMulti = q.type === 'multiple_response';

      let isAnswered = false;
      let isCorrect = false;

      if (isMulti) {
        isAnswered = Array.isArray(studentAns) && studentAns.length > 0;
        if (isAnswered) {
          const expected = (q.correctOptionIndexes || []).map(Number).sort().join(',');
          const actual = studentAns.map(Number).sort().join(',');
          isCorrect = expected === actual;
        }
      } else {
        isAnswered = studentAns !== undefined && studentAns !== null && studentAns !== '';
        if (isAnswered) {
          const correctIdx = Number(q.correctAnswerIndex ?? 0);
          const studentNum = Number(studentAns);
          if (!isNaN(studentNum)) {
            isCorrect = studentNum === correctIdx;
          } else if (q.correctAnswer !== undefined && q.correctAnswer !== null) {
            isCorrect = String(studentAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
          }
        }
      }

      let marksAwarded = 0;
      if (!isAnswered) {
        unansweredCount++;
      } else if (isCorrect) {
        correctCount++;
        marksAwarded = qMarks;
        totalScore += qMarks;
      } else {
        incorrectCount++;
      }

      evaluatedAnswers.push({
        questionId: q._id || new mongoose.Types.ObjectId(),
        questionText: q.questionText || `Question ${qIdx + 1}`,
        questionType: q.type || 'mcq',
        options: Array.isArray(q.options) ? q.options : [],
        optionImages: Array.isArray(q.optionImages) ? q.optionImages : [],
        studentAnswer: isAnswered ? studentAns : null,
        correctAnswer: isMulti ? (q.correctOptionIndexes || []) : (q.correctAnswerIndex !== undefined ? q.correctAnswerIndex : q.correctAnswer),
        isCorrect,
        isAnswered,
        marksAwarded,
        maxMarks: qMarks,
        feedback: q.explanation || ''
      });
    });

    const maxScore = resolveQuizMarks(quizInfo);
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passThreshold = quizInfo.passThresholdPercent ?? 70;
    const gradeResult = percentage >= passThreshold ? 'passed' : 'failed';

    const now = new Date();
    const startTime = new Date(attempt.startedAt || now).getTime();
    const elapsedSeconds = Math.max(1, Math.round((now.getTime() - startTime) / 1000));
    const timeTakenSeconds = Math.min((attempt.durationMinutes || 10) * 60, elapsedSeconds);

    // ─── CRITICAL FIRST ATTEMPT RULE ───
    // Check if an official attempt already exists for this learner & quiz
    const priorOfficial = await AssessmentSubmission.findOne({
      assessmentId: quizInfo.assessmentId,
      learnerId: req.user.id,
      isOfficial: true,
      status: { $in: ['submitted', 'graded'] },
      _id: { $ne: attempt._id }
    });

    const isFirstOfficial = !priorOfficial;

    attempt.status = 'submitted';
    attempt.submittedAt = now;
    attempt.timeTakenSeconds = timeTakenSeconds;
    attempt.totalScore = totalScore;
    attempt.maxScore = maxScore;
    attempt.percentage = percentage;
    attempt.gradeResult = gradeResult;
    attempt.correctCount = correctCount;
    attempt.incorrectCount = incorrectCount;
    attempt.unansweredCount = unansweredCount;
    attempt.totalQuestions = questions.length;
    attempt.answers = evaluatedAnswers;
    attempt.isFirstAttempt = isFirstOfficial;
    attempt.isOfficial = isFirstOfficial;

    await attempt.save();

    try {
      const { logLearnerActivity } = require('../services/activityService');
      const isRetake = (attempt.attemptNumber || 1) > 1;
      logLearnerActivity(req.user.id, {
        activityType: isRetake ? 'quiz_retaken' : 'quiz_attempted',
        title: isRetake ? `Quiz Retaken (Attempt #${attempt.attemptNumber})` : 'Quiz Attempted',
        description: `Completed "${attempt.assessmentTitle || 'Quiz'}" with score ${totalScore}/${maxScore} (${attempt.percentage}%)`,
        courseId: course?._id || courseId,
        courseTitle: course?.title || 'Course',
        lessonTitle: attempt.assessmentTitle || 'Quiz',
        referenceId: `quiz_sub_${attempt._id}`,
        points: isFirstOfficial ? 10 : 0,
        metadata: {
          attemptNumber: attempt.attemptNumber || 1,
          totalScore,
          maxScore,
          percentage: attempt.percentage,
          gradeResult: attempt.gradeResult
        },
        createdAt: new Date()
      }).catch(() => {});
    } catch (_) {}

    // Update course enrolment progress for this quiz
    const enrolment = await Enrolment.findOne({ courseId, learnerId: req.user.id });
    if (enrolment) {
      if (!Array.isArray(enrolment.completedLessons)) {
        enrolment.completedLessons = [];
      }

      const itemIdentifier = String(quizInfo.assessmentId);
      if (!enrolment.completedLessons.some(id => String(id) === itemIdentifier)) {
        enrolment.completedLessons.push(itemIdentifier);
      }
      if (quizInfo.item?._id) {
        const directItemId = String(quizInfo.item._id);
        if (!enrolment.completedLessons.some(id => String(id) === directItemId)) {
          enrolment.completedLessons.push(directItemId);
        }
      }

      // If quiz belongs to a lesson, check if all sibling items are done, and if so mark parent lesson
      if (quizInfo.lesson?._id) {
        const lessonItems = quizInfo.lesson.items || quizInfo.lesson.contentItems || [];
        const allItemsDone = lessonItems.length === 0 || lessonItems.every(it =>
          enrolment.completedLessons.some(id => String(id) === String(it._id))
        );
        const parentLessonId = String(quizInfo.lesson._id);
        if (allItemsDone && !enrolment.completedLessons.some(id => String(id) === parentLessonId)) {
          enrolment.completedLessons.push(parentLessonId);
        }
      }

      const { calculateEnrolmentProgress } = require('./courseController');
      const progressResult = calculateEnrolmentProgress(course, enrolment);
      enrolment.progressPercentage = progressResult.progressPercentage;
      enrolment.status = progressResult.status;
      enrolment.lastAccessedAt = now;
      if (progressResult.status === 'completed' && !enrolment.completedAt) {
        enrolment.completedAt = now;
      }
      await enrolment.save();

      // Certificate issuance if course is 100% completed
      if (progressResult.progressPercentage === 100 && req.user && req.user.role === 'learner') {
        try {
          const { issueCourseCertificate } = require('../services/certificateService');
          await issueCourseCertificate({
            course,
            enrolment,
            learnerId: req.user.id,
            learnerUser: req.user
          });
        } catch (certErr) {
          console.error('Quiz certificate issuance error:', certErr);
        }

        try {
          const { evaluateAndAwardCourseCompletionBadges } = require('../services/badgeService');
          const Learner = require('../model/Learner');
          const learnerDoc = await Learner.findById(req.user.id);
          if (learnerDoc) {
            await evaluateAndAwardCourseCompletionBadges(learnerDoc);
          }
        } catch (bErr) {
          console.warn('Quiz badge evaluation warning:', bErr.message);
        }
      }

      try {
        const { checkAndAwardLearningProgressPoints } = require('../services/pointsService');
        await checkAndAwardLearningProgressPoints(course, enrolment, req.user.id);
      } catch (pointErr) {
        console.error('Quiz point reward error:', pointErr);
      }
    }

    // Evaluate Perfectionist badges whenever a quiz is submitted
    try {
      const { evaluateAndAwardPerfectionistBadges } = require('../services/badgeService');
      const Learner = require('../model/Learner');
      const learnerDoc = await Learner.findById(req.user.id);
      if (learnerDoc) {
        await evaluateAndAwardPerfectionistBadges(learnerDoc);
      }
    } catch (qBadgeErr) {
      console.warn('Perfectionist badge evaluation warning:', qBadgeErr.message);
    }

    return res.json({
      success: true,
      result: {
        attemptId: attempt._id,
        attemptNumber: attempt.attemptNumber,
        totalScore,
        maxScore,
        percentage,
        gradeResult,
        correctCount,
        incorrectCount,
        unansweredCount,
        totalQuestions: questions.length,
        timeTakenSeconds,
        submittedAt: attempt.submittedAt,
        isFirstAttempt: isFirstOfficial,
        isOfficial: isFirstOfficial
      },
      review: {
        questions: evaluatedAnswers.map((ans, idx) => ({
          questionId: ans.questionId,
          questionIndex: idx,
          questionText: ans.questionText,
          type: ans.questionType,
          options: ans.options || [],
          optionImages: ans.optionImages || [],
          studentAnswer: ans.studentAnswer,
          correctAnswer: ans.correctAnswer,
          isCorrect: ans.isCorrect,
          isAnswered: ans.isAnswered,
          marksAwarded: ans.marksAwarded,
          maxMarks: ans.maxMarks,
          explanation: ans.feedback || ''
        }))
      }
    });
  } catch (err) {
    console.error('submitQuizAttempt error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process quiz submission.' });
  }
};

// ─── 5. Learner's Personal Quiz Attempts History ───
exports.getMyQuizAttempts = async (req, res) => {
  try {
    const { courseId, quizId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const quizInfo = findQuizInCourse(course, quizId);
    if (!quizInfo) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    const submissions = await AssessmentSubmission.find({
      assessmentId: quizInfo.assessmentId,
      learnerId: req.user.id,
      status: { $in: ['submitted', 'graded'] }
    }).sort({ attemptNumber: 1, submittedAt: 1 });

    const totalMarks = resolveQuizMarks(quizInfo);

    const attempts = submissions.map(s => ({
      attemptId: s._id,
      attemptNumber: s.attemptNumber || 1,
      totalScore: s.totalScore || 0,
      maxScore: s.maxScore || totalMarks,
      percentage: s.percentage || 0,
      gradeResult: s.gradeResult || 'pending',
      correctCount: s.correctCount || 0,
      incorrectCount: s.incorrectCount || 0,
      unansweredCount: s.unansweredCount || 0,
      timeTakenSeconds: s.timeTakenSeconds || 0,
      submittedAt: s.submittedAt,
      isOfficial: Boolean(s.isOfficial || s.isFirstAttempt || s.attemptNumber === 1),
      isFirstAttempt: Boolean(s.isFirstAttempt || s.attemptNumber === 1)
    }));

    const officialAttempt = attempts.find(a => a.isOfficial || a.isFirstAttempt) || attempts[0] || null;

    return res.json({
      success: true,
      attempts,
      officialAttempt,
      totalAttempts: attempts.length
    });
  } catch (err) {
    console.error('getMyQuizAttempts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve quiz attempts.' });
  }
};

// ─── 5. Quiz Leaderboard (First Attempt Only + Strict Access Control) ───
exports.getQuizLeaderboard = async (req, res) => {
  try {
    const { courseId, quizId } = req.params;

    // Strict access control: Student MUST have completed at least one attempt
    const userCompletedAttempt = await AssessmentSubmission.findOne({
      assessmentId: quizId,
      learnerId: req.user.id,
      status: { $in: ['submitted', 'graded'] }
    });

    if (!userCompletedAttempt) {
      return res.status(403).json({
        success: false,
        code: 'ATTEMPT_REQUIRED',
        message: 'You must complete at least one attempt to view the leaderboard.'
      });
    }

    // Fetch all submitted attempts for this quiz, populated with learner display info
    const submissions = await AssessmentSubmission.find({
      assessmentId: quizId,
      status: { $in: ['submitted', 'graded'] }
    })
      .sort({ submittedAt: 1, attemptNumber: 1 })
      .populate('learnerId', 'name fullName profilePicture avatar username');

    // Filter to retain ONLY each student's FIRST submitted attempt
    const studentFirstAttemptMap = new Map();

    for (const sub of submissions) {
      const learner = sub.learnerId;
      const lid = learner?._id ? String(learner._id) : (sub.learnerId ? String(sub.learnerId) : null);
      if (!lid) continue;

      if (!studentFirstAttemptMap.has(lid)) {
        studentFirstAttemptMap.set(lid, sub);
      } else if (sub.isOfficial) {
        // Prefer explicit official attempt flag if present
        studentFirstAttemptMap.set(lid, sub);
      }
    }

    const firstAttempts = Array.from(studentFirstAttemptMap.values());

    // Sort by Total Score DESC, then Time Taken ASC (tie-breaker)
    firstAttempts.sort((a, b) => {
      const scoreDiff = (b.totalScore || 0) - (a.totalScore || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.timeTakenSeconds || 0) - (b.timeTakenSeconds || 0);
    });

    const currentUserIdStr = String(req.user.id);

    const leaderboard = firstAttempts.map((item, index) => {
      const learner = item.learnerId || {};
      const displayName = learner.name || learner.fullName || learner.username || item.learnerName || 'Student';
      const avatar = learner.profilePicture || learner.avatar || '';
      const isCurrentUser = (learner._id ? String(learner._id) : String(item.learnerId)) === currentUserIdStr;

      return {
        rank: index + 1,
        name: displayName,
        avatar,
        score: item.totalScore || 0,
        maxScore: item.maxScore || 0,
        percentage: item.percentage || 0,
        correctCount: item.correctCount || 0,
        incorrectCount: item.incorrectCount || 0,
        timeTakenSeconds: item.timeTakenSeconds || 0,
        submittedAt: item.submittedAt,
        isCurrentUser
      };
    });

    const userEntry = leaderboard.find(l => l.isCurrentUser);

    return res.json({
      success: true,
      leaderboard,
      userRank: userEntry?.rank || null,
      totalParticipants: leaderboard.length
    });
  } catch (err) {
    console.error('getQuizLeaderboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load leaderboard.' });
  }
};

/**
 * ─── 6. Course-Level Aggregate Leaderboard ───
 * Delegates to centralized leaderboardService calculating Official Quiz Marks (1st attempt)
 * + Official Assessment Marks (1st attempt), global rank, and server-side pagination.
 */
exports.getCourseLeaderboard = async (req, res) => {
  try {
    const { courseId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const result = await calculateCourseLeaderboard({
      courseId,
      currentLearnerId: req.user.id,
      page,
      limit
    });

    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('getCourseLeaderboard error:', err);
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to load course leaderboard.'
    });
  }
};
