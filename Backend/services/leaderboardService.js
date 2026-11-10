const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');
const Learner = require('../model/Learner');
const AssessmentSubmission = require('../model/AssessmentSubmission');
const AssessmentAttempt = require('../model/AssessmentAttempt');
const OfficialAssessmentAttempt = require('../model/OfficialAssessmentAttempt');

const OFFICIAL_METHODOLOGY_TEXT =
  'Overall standings are calculated using the first officially submitted attempt for every quiz and assessment in this course. Subsequent attempts are recorded separately for practice and do not affect official rankings.';

/**
 * Collects ONLY module/lesson quizzes inside a course (strictly excluding courseAssessments).
 */
function findCourseQuizzesOnly(course) {
  const quizzes = [];
  const seenIds = new Set();
  if (!course) return quizzes;

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
          const questions = it.quiz?.questions || it.questions || [];
          const qMarks = Number(it.quiz?.totalMarks) > 0
            ? Number(it.quiz.totalMarks)
            : questions.reduce((s, q) => s + (Number(q.marks) || 1), 0) || questions.length;
          quizzes.push({
            id: it._id,
            title: it.title || les.title || 'Lesson Quiz',
            moduleTitle: mod.title || `Module ${mIdx + 1}`,
            lessonTitle: les.title || `Lesson ${lIdx + 1}`,
            totalMarks: qMarks
          });
        }
      }

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

  return quizzes;
}

/**
 * Single centralized service calculating the course leaderboard:
 * Total Course Score = Official Quiz Marks (1st attempt) + Official Assessment Marks (1st attempt)
 * Global rank is calculated across ALL enrolled learners using deterministic tie-breaking,
 * then sliced into server-side pages while preserving the requesting learner's global rank.
 */
async function calculateCourseLeaderboard({
  courseId,
  currentLearnerId = null,
  page = 1,
  limit = 10
}) {
  const course = await Course.findById(courseId).lean();
  if (!course) {
    const err = new Error('Course not found.');
    err.status = 404;
    throw err;
  }

  const courseQuizzes = findCourseQuizzesOnly(course);
  const quizIdsSet = new Set(courseQuizzes.map(q => String(q.id)));
  const totalCourseQuizzes = courseQuizzes.length;

  const publishedAssessments = (course.courseAssessments || []).filter(a => a.state === 'published');
  const assessmentIdsSet = new Set(publishedAssessments.map(a => String(a._id)));
  const totalCourseAssessments = publishedAssessments.length;

  // Fetch all enrolled learners
  const enrolments = await Enrolment.find({ courseId: course._id }).select('learnerId').lean();
  const enrolledLearnerIdsSet = new Set(enrolments.map(e => String(e.learnerId)));

  const currentUserIdStr = currentLearnerId ? String(currentLearnerId) : null;
  if (currentUserIdStr) {
    enrolledLearnerIdsSet.add(currentUserIdStr);
  }

  const enrolledLearnerIds = Array.from(enrolledLearnerIdsSet);

  // Public display info only (exclude deleted accounts & non-learner previewers)
  const learners = await Learner.find({ _id: { $in: enrolledLearnerIds } })
    .select('_id fullName name avatar profilePicture')
    .lean();
  const learnerMap = new Map(learners.map(l => [String(l._id), l]));
  const activeLearnerIds = enrolledLearnerIds.filter(lid => learnerMap.has(lid));

  // 1. Official Quiz Marks: 1st submitted attempt per unique module/lesson quiz
  const quizSubmissions = await AssessmentSubmission.find({
    courseId: course._id,
    status: { $in: ['submitted', 'graded'] }
  })
    .sort({ attemptNumber: 1, submittedAt: 1, createdAt: 1 })
    .lean();

  const learnerFirstQuizMap = new Map();
  for (const sub of quizSubmissions) {
    const lid = String(sub.learnerId);
    const qid = String(sub.assessmentId);

    // Exclude milestone courseAssessments from quiz aggregation so they are never double-counted
    if (assessmentIdsSet.has(qid) || !quizIdsSet.has(qid)) {
      continue;
    }

    if (!learnerFirstQuizMap.has(lid)) {
      learnerFirstQuizMap.set(lid, new Map());
    }
    const qMap = learnerFirstQuizMap.get(lid);

    if (!qMap.has(qid)) {
      qMap.set(qid, sub);
    } else if (sub.isOfficial && !qMap.get(qid).isOfficial) {
      qMap.set(qid, sub);
    }
  }

  // 2. Official Assessment Marks: immutable first submitted attempt per course assessment
  const officialAssessments = await OfficialAssessmentAttempt.find({
    courseId: course._id
  }).lean();

  const learnerOfficialAssessmentMap = new Map();
  for (const off of officialAssessments) {
    const lid = String(off.learnerId);
    const aid = String(off.assessmentId);
    if (!assessmentIdsSet.has(aid)) continue;

    if (!learnerOfficialAssessmentMap.has(lid)) {
      learnerOfficialAssessmentMap.set(lid, new Map());
    }
    const aMap = learnerOfficialAssessmentMap.get(lid);
    if (!aMap.has(aid)) {
      aMap.set(aid, off);
    }
  }

  // 3. Aggregate totals for every active enrolled learner
  const leaderboardList = activeLearnerIds.map((lid) => {
    const learner = learnerMap.get(lid) || {};
    const displayName = learner.fullName || learner.name || 'Learner';
    const avatar = learner.avatar || learner.profilePicture || '';
    const isCurrentUser = Boolean(currentUserIdStr && lid === currentUserIdStr);

    let quizMarks = 0;
    let quizzesAttempted = 0;
    let lastSubmittedAt = null;

    const qMap = learnerFirstQuizMap.get(lid);
    if (qMap && qMap.size > 0) {
      for (const attempt of qMap.values()) {
        quizMarks += Number(attempt.totalScore) || 0;
        quizzesAttempted += 1;
        if (attempt.submittedAt) {
          const dt = new Date(attempt.submittedAt);
          if (!lastSubmittedAt || dt > new Date(lastSubmittedAt)) {
            lastSubmittedAt = attempt.submittedAt;
          }
        }
      }
    }

    let assessmentMarks = 0;
    let assessmentsAttempted = 0;

    const aMap = learnerOfficialAssessmentMap.get(lid);
    if (aMap && aMap.size > 0) {
      for (const off of aMap.values()) {
        assessmentMarks += Number(off.obtainedMarks) || 0;
        assessmentsAttempted += 1;
        if (off.submittedAt) {
          const dt = new Date(off.submittedAt);
          if (!lastSubmittedAt || dt > new Date(lastSubmittedAt)) {
            lastSubmittedAt = off.submittedAt;
          }
        }
      }
    }

    const totalMarks = quizMarks + assessmentMarks;

    return {
      learnerId: lid,
      displayName,
      avatar,
      quizMarks,
      assessmentMarks,
      totalMarks,
      quizzesAttempted,
      totalCourseQuizzes,
      assessmentsAttempted,
      totalCourseAssessments,
      lastSubmittedAt,
      isCurrentUser
    };
  });

  // 4. Deterministic Global Ranking & Tie-breaking:
  //    Rule 1: Highest Total Marks (DESC)
  //    Rule 2: Earliest Official Completion Timestamp (ASC)
  //    Rule 3: Most Total Graded Items Completed (DESC)
  //    Rule 4: Display Name (ASC) + Learner ID (ASC) for total stability
  leaderboardList.sort((a, b) => {
    if (b.totalMarks !== a.totalMarks) {
      return b.totalMarks - a.totalMarks;
    }
    if (a.lastSubmittedAt && b.lastSubmittedAt) {
      const timeDiff = new Date(a.lastSubmittedAt).getTime() - new Date(b.lastSubmittedAt).getTime();
      if (timeDiff !== 0) return timeDiff;
    } else if (a.lastSubmittedAt && !b.lastSubmittedAt) {
      return -1;
    } else if (!a.lastSubmittedAt && b.lastSubmittedAt) {
      return 1;
    }
    const itemsA = a.quizzesAttempted + a.assessmentsAttempted;
    const itemsB = b.quizzesAttempted + b.assessmentsAttempted;
    if (itemsB !== itemsA) {
      return itemsB - itemsA;
    }
    const nameDiff = a.displayName.localeCompare(b.displayName);
    if (nameDiff !== 0) return nameDiff;
    return a.learnerId.localeCompare(b.learnerId);
  });

  leaderboardList.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  // 5. Server-side pagination
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const totalLearners = leaderboardList.length;
  const totalPages = Math.max(1, Math.ceil(totalLearners / safeLimit));
  const safePage = Math.min(Math.max(parseInt(page, 10) || 1, 1), totalPages);
  const startIdx = (safePage - 1) * safeLimit;
  const paginatedRows = leaderboardList.slice(startIdx, startIdx + safeLimit);

  const currentUserEntry = leaderboardList.find(e => e.isCurrentUser) || null;
  const currentUserPage = currentUserEntry ? Math.ceil(currentUserEntry.rank / safeLimit) : 1;
  const totalAttemptedParticipants = leaderboardList.filter(
    e => e.quizzesAttempted > 0 || e.assessmentsAttempted > 0
  ).length;

  return {
    courseTitle: course.title,
    totalEnrolled: totalLearners,
    totalLearners,
    totalAttemptedParticipants,
    totalCourseQuizzes,
    totalCourseAssessments,
    methodology: OFFICIAL_METHODOLOGY_TEXT,
    assessmentStatus: 'active',
    pagination: {
      currentPage: safePage,
      limit: safeLimit,
      totalLearners,
      totalPages,
      hasPrevPage: safePage > 1,
      hasNextPage: safePage < totalPages
    },
    leaderboard: paginatedRows,
    currentUserRank: currentUserEntry ? {
      rank: currentUserEntry.rank,
      page: currentUserPage,
      totalLearners,
      displayName: currentUserEntry.displayName,
      quizMarks: currentUserEntry.quizMarks,
      assessmentMarks: currentUserEntry.assessmentMarks,
      totalMarks: currentUserEntry.totalMarks,
      quizzesAttempted: currentUserEntry.quizzesAttempted,
      totalCourseQuizzes,
      assessmentsAttempted: currentUserEntry.assessmentsAttempted,
      totalCourseAssessments
    } : null
  };
}

/**
 * Paginated practice/retake-only leaderboard for a specific course assessment.
 * Strictly includes RETAKE attempts only and never modifies official leaderboard scores.
 */
async function getAssessmentRetakeLeaderboard({
  courseId,
  assessmentId,
  currentLearnerId = null,
  page = 1,
  limit = 10
}) {
  const query = {
    courseId,
    assessmentId,
    attemptType: 'RETAKE',
    submissionStatus: { $in: ['submitted', 'timed_out'] }
  };

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const totalRetakes = await AssessmentAttempt.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(totalRetakes / safeLimit));
  const safePage = Math.min(Math.max(parseInt(page, 10) || 1, 1), totalPages);
  const skip = (safePage - 1) * safeLimit;

  const rows = await AssessmentAttempt.find(query)
    .sort({ obtainedMarks: -1, timeTakenSeconds: 1, submittedAt: 1, _id: 1 })
    .skip(skip)
    .limit(safeLimit)
    .populate('learnerId', 'fullName name avatar profilePicture username')
    .lean();

  const currentUserIdStr = currentLearnerId ? String(currentLearnerId) : null;

  const retakes = rows.map((row, idx) => {
    const learner = row.learnerId && typeof row.learnerId === 'object' ? row.learnerId : {};
    const learnerIdStr = learner._id ? String(learner._id) : String(row.learnerId);
    const displayName = learner.fullName || learner.name || learner.username || row.learnerName || 'Learner';
    return {
      rank: skip + idx + 1,
      attemptId: row._id,
      learnerId: learnerIdStr,
      learnerName: displayName,
      avatar: learner.avatar || learner.profilePicture || '',
      attemptNumber: row.attemptNumber || 2,
      obtainedMarks: row.obtainedMarks || 0,
      totalMarks: row.totalMarks || 0,
      percentage: row.percentage || 0,
      resultStatus: row.resultStatus || 'FAIL',
      submittedAt: row.submittedAt,
      timeTakenSeconds: row.timeTakenSeconds || 0,
      isCurrentUser: Boolean(currentUserIdStr && learnerIdStr === currentUserIdStr)
    };
  });

  return {
    retakes,
    pagination: {
      currentPage: safePage,
      limit: safeLimit,
      totalRetakes,
      totalPages,
      hasPrevPage: safePage > 1,
      hasNextPage: safePage < totalPages
    }
  };
}

module.exports = {
  OFFICIAL_METHODOLOGY_TEXT,
  findCourseQuizzesOnly,
  calculateCourseLeaderboard,
  getAssessmentRetakeLeaderboard
};
