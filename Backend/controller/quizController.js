const mongoose = require('mongoose');
const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');
const Learner = require('../model/Learner');
const AssessmentSubmission = require('../model/AssessmentSubmission');

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
      }
    }
  }

  // 2. Check course-level courseAssessments
  for (const ca of course.courseAssessments || []) {
    if (String(ca._id) === targetIdStr) {
      return {
        type: 'course_assessment',
        quizObj: ca,
        questions: ca.questions || [],
        title: ca.title || 'Course Assessment',
        description: ca.description || '',
        instructions: ca.instructions || '',
        passThresholdPercent: ca.passThresholdPercent ?? 70,
        durationMinutes: ca.durationMinutes ?? ca.timeLimit ?? null,
        totalMarks: ca.totalMarks ?? null,
        module: null,
        lesson: null,
        item: null,
        assessmentId: ca._id
      };
    }
  }

  return null;
}

/**
 * Helper to retrieve all quiz IDs and metadata across a course
 */
function findAllQuizzesInCourse(course) {
  const quizzes = [];
  const seenIds = new Set();
  if (!course) return quizzes;

  // 1. Traverse modules -> lessons -> items
  for (let mIdx = 0; mIdx < (course.modules || []).length; mIdx++) {
    const mod = course.modules[mIdx];
    for (let lIdx = 0; lIdx < (mod.lessons || []).length; lIdx++) {
      const les = mod.lessons[lIdx];
      const items = les.items || les.contentItems || [];
      for (let iIdx = 0; iIdx < items.length; iIdx++) {
        const it = items[iIdx];
        const rawType = String(it.type || '').trim().toLowerCase();
        const hasQuizData = it.quiz || (Array.isArray(it.questions) && it.questions.length > 0);
        const isQuiz = rawType === 'quiz' || rawType.includes('quiz') || hasQuizData;
        if (isQuiz && !seenIds.has(String(it._id))) {
          seenIds.add(String(it._id));
          quizzes.push({
            id: it._id,
            title: it.title || les.title || 'Lesson Quiz',
            moduleTitle: mod.title || `Module ${mIdx + 1}`,
            lessonTitle: les.title || `Lesson ${lIdx + 1}`,
            totalMarks: resolveQuizMarks({ quizObj: it.quiz || {}, questions: it.quiz?.questions || it.questions || [] })
          });
        }
      }

      // If lesson itself has quiz type
      const lesType = String(les.type || '').trim().toLowerCase();
      if ((lesType === 'quiz' || lesType.includes('quiz')) && !seenIds.has(String(les._id))) {
        seenIds.add(String(les._id));
        quizzes.push({
          id: les._id,
          title: les.title || 'Lesson Quiz',
          moduleTitle: mod.title || `Module ${mIdx + 1}`,
          lessonTitle: les.title || `Lesson ${lIdx + 1}`,
          totalMarks: 10
        });
      }
    }
  }

  // 2. Course-level assessments
  for (const ca of course.courseAssessments || []) {
    if (!seenIds.has(String(ca._id))) {
      seenIds.add(String(ca._id));
      quizzes.push({
        id: ca._id,
        title: ca.title || 'Course Assessment',
        moduleTitle: 'Course Assessments',
        lessonTitle: ca.title,
        totalMarks: resolveQuizMarks({ quizObj: ca, questions: ca.questions || [] })
      });
    }
  }

  return quizzes;
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

    if (attemptsCount > 0) {
      // Find the official first attempt (either isOfficial: true or lowest attemptNumber)
      const official = submissions.find(s => s.isOfficial || s.isFirstAttempt) || submissions[0];
      firstAttempt = {
        attemptNumber: official.attemptNumber || 1,
        totalScore: official.totalScore || 0,
        maxScore: official.maxScore || totalMarks,
        percentage: official.percentage || 0,
        gradeResult: official.gradeResult || 'pending',
        correctCount: official.correctCount || 0,
        incorrectCount: official.incorrectCount || 0,
        unansweredCount: official.unansweredCount || 0,
        timeTakenSeconds: official.timeTakenSeconds || 0,
        submittedAt: official.submittedAt
      };
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

// ─── 3. Get Active Quiz Attempt State (For Refresh / Page Reload) ───
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
      isSubmitted: attempt.status === 'submitted' || attempt.status === 'graded',
      quiz: {
        id: quizInfo.assessmentId,
        title: quizInfo.title,
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

    // If already submitted, return the saved result
    if (attempt.status === 'submitted' || attempt.status === 'graded') {
      return res.json({
        success: true,
        alreadySubmitted: true,
        result: {
          totalScore: attempt.totalScore,
          maxScore: attempt.maxScore,
          percentage: attempt.percentage,
          gradeResult: attempt.gradeResult,
          correctCount: attempt.correctCount,
          incorrectCount: attempt.incorrectCount,
          unansweredCount: attempt.unansweredCount,
          timeTakenSeconds: attempt.timeTakenSeconds,
          isFirstAttempt: attempt.isFirstAttempt,
          attemptNumber: attempt.attemptNumber
        }
      });
    }

    const course = await Course.findById(courseId);
    const quizInfo = findQuizInCourse(course, quizId);
    if (!quizInfo) {
      return res.status(404).json({ success: false, message: 'Quiz questions not found.' });
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
          } else if (q.correctAnswer) {
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
        studentAnswer: studentAns,
        correctAnswer: isMulti ? (q.correctOptionIndexes || []) : (q.correctAnswer || q.correctAnswerIndex),
        isCorrect,
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
      status: { $in: ['submitted', 'graded'] }
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

    // If this is the FIRST official attempt, update course enrolment progress
    if (isFirstOfficial) {
      const enrolment = await Enrolment.findOne({ courseId, learnerId: req.user.id });
      if (enrolment) {
        const itemIdentifier = String(quizInfo.assessmentId);
        if (!enrolment.completedLessons.includes(itemIdentifier)) {
          enrolment.completedLessons.push(itemIdentifier);
        }

        // Calculate total content count and progress percentage
        let totalItemsCount = 0;
        for (const m of course.modules || []) {
          for (const l of m.lessons || []) {
            const its = l.items || l.contentItems || [];
            totalItemsCount += its.length > 0 ? its.length : 1;
          }
        }
        if (totalItemsCount > 0) {
          enrolment.progress = Math.min(100, Math.round((enrolment.completedLessons.length / totalItemsCount) * 100));
        }
        enrolment.lastAccessed = now;
        await enrolment.save();
      }
    }

    return res.json({
      success: true,
      result: {
        totalScore,
        maxScore,
        percentage,
        gradeResult,
        correctCount,
        incorrectCount,
        unansweredCount,
        timeTakenSeconds,
        isFirstAttempt: isFirstOfficial,
        attemptNumber: attempt.attemptNumber
      }
    });
  } catch (err) {
    console.error('submitQuizAttempt error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process quiz submission.' });
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
 * Aggregates only the FIRST official submitted attempt for each quiz across the course.
 * Prepares the schema structure for future Assessment contributions.
 */
exports.getCourseLeaderboard = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // 1. Identify all quizzes in this course
    const courseQuizzes = findAllQuizzesInCourse(course);
    const quizIds = courseQuizzes.map(q => String(q.id));
    const totalCourseQuizzes = quizIds.length;

    // 2. Fetch all enrolled learners for this course
    const enrolments = await Enrolment.find({ courseId: course._id }).lean();
    const enrolledLearnerIdsSet = new Set(enrolments.map(e => String(e.learnerId)));

    // Ensure the current requesting learner is included in the list
    const currentUserIdStr = String(req.user.id);
    enrolledLearnerIdsSet.add(currentUserIdStr);

    const enrolledLearnerIds = Array.from(enrolledLearnerIdsSet);

    // 3. Fetch public profile information for all enrolled learners (NO EMAIL OR SENSITIVE DATA!)
    const learners = await Learner.find({ _id: { $in: enrolledLearnerIds } })
      .select('_id fullName name avatar profilePicture username')
      .lean();
    const learnerMap = new Map(learners.map(l => [String(l._id), l]));

    // 4. Fetch all qualifying submitted attempts for this course
    // Sorted by submission date ascending so earliest attempt comes first
    const submissions = await AssessmentSubmission.find({
      courseId: course._id,
      status: { $in: ['submitted', 'graded'] }
    })
      .sort({ submittedAt: 1, createdAt: 1 })
      .lean();

    // Map: learnerId -> Map: quizId -> first qualifying attempt
    const learnerFirstAttemptsMap = new Map();
    for (const sub of submissions) {
      const lid = String(sub.learnerId);
      const qid = String(sub.assessmentId);

      if (!learnerFirstAttemptsMap.has(lid)) {
        learnerFirstAttemptsMap.set(lid, new Map());
      }
      const qMap = learnerFirstAttemptsMap.get(lid);

      if (!qMap.has(qid)) {
        // Record the first successfully submitted attempt
        qMap.set(qid, sub);
      } else if (sub.isOfficial || sub.isFirstAttempt) {
        // If an attempt is explicitly flagged official/first, prioritize it
        qMap.set(qid, sub);
      }
    }

    // 5. Aggregate official quiz marks for each enrolled student
    const leaderboardList = enrolledLearnerIds.map(lid => {
      const learner = learnerMap.get(lid) || {};
      const displayName = learner.fullName || learner.name || learner.username || 'Learner';
      const avatar = learner.avatar || learner.profilePicture || '';
      const isCurrentUser = lid === currentUserIdStr;

      const qMap = learnerFirstAttemptsMap.get(lid);
      let quizMarks = 0;
      let quizzesAttempted = 0;
      let lastSubmittedAt = null;

      if (qMap && qMap.size > 0) {
        for (const [_, attempt] of qMap.entries()) {
          quizMarks += Number(attempt.totalScore) || 0;
          quizzesAttempted += 1;
          if (attempt.submittedAt) {
            const subDate = new Date(attempt.submittedAt);
            if (!lastSubmittedAt || subDate > new Date(lastSubmittedAt)) {
              lastSubmittedAt = attempt.submittedAt;
            }
          }
        }
      }

      // Assessments not yet implemented; prepare data structure for future assessment score addition
      const assessmentMarks = null;
      const totalMarks = quizMarks + (assessmentMarks || 0);

      return {
        learnerId: lid,
        displayName,
        avatar,
        quizMarks,
        assessmentMarks, // null -> displays as "—"
        totalMarks,
        quizzesAttempted,
        totalCourseQuizzes,
        lastSubmittedAt,
        isCurrentUser
      };
    });

    // 6. Ranking & Tie-breaking:
    // Rule 1: Highest Total Marks (DESC)
    // Rule 2: Most Quizzes Attempted (DESC)
    // Rule 3: Earliest Completion Time (ASC)
    // Rule 4: Alphabetical by Display Name (ASC)
    leaderboardList.sort((a, b) => {
      if (b.totalMarks !== a.totalMarks) {
        return b.totalMarks - a.totalMarks;
      }
      if (b.quizzesAttempted !== a.quizzesAttempted) {
        return b.quizzesAttempted - a.quizzesAttempted;
      }
      if (a.lastSubmittedAt && b.lastSubmittedAt) {
        const timeDiff = new Date(a.lastSubmittedAt).getTime() - new Date(b.lastSubmittedAt).getTime();
        if (timeDiff !== 0) return timeDiff;
      } else if (a.lastSubmittedAt && !b.lastSubmittedAt) {
        return -1;
      } else if (!a.lastSubmittedAt && b.lastSubmittedAt) {
        return 1;
      }
      return a.displayName.localeCompare(b.displayName);
    });

    // 7. Assign Rank positions
    leaderboardList.forEach((entry, idx) => {
      if (idx > 0) {
        const prev = leaderboardList[idx - 1];
        if (entry.totalMarks === prev.totalMarks && entry.quizzesAttempted === prev.quizzesAttempted) {
          entry.rank = prev.rank;
        } else {
          entry.rank = idx + 1;
        }
      } else {
        entry.rank = 1;
      }
    });

    const currentUserEntry = leaderboardList.find(e => e.isCurrentUser);
    const totalAttemptedParticipants = leaderboardList.filter(e => e.quizzesAttempted > 0).length;

    return res.json({
      success: true,
      courseTitle: course.title,
      totalEnrolled: enrolledLearnerIds.length,
      totalAttemptedParticipants,
      totalCourseQuizzes,
      methodology: 'Official Quiz Marks (1st Attempt) + Assessments',
      assessmentStatus: 'coming_soon',
      leaderboard: leaderboardList,
      currentUserRank: currentUserEntry ? {
        rank: currentUserEntry.rank,
        displayName: currentUserEntry.displayName,
        quizMarks: currentUserEntry.quizMarks,
        assessmentMarks: currentUserEntry.assessmentMarks,
        totalMarks: currentUserEntry.totalMarks,
        quizzesAttempted: currentUserEntry.quizzesAttempted,
        totalCourseQuizzes
      } : null
    });
  } catch (err) {
    console.error('getCourseLeaderboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load course leaderboard.' });
  }
};
