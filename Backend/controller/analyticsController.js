const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');
const AssessmentSubmission = require('../model/AssessmentSubmission');
const CompletionRecord = require('../model/CompletionRecord');
const mongoose = require('mongoose');

/**
 * Helper to format date string YYYY-MM-DD to readable date like "Sep 15"
 */
const formatDateLabel = (dateObj) => {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Controller: Get Instructor Analytics
 * Supports overall "all" courses view or specific course view
 */
exports.getInstructorAnalytics = async (req, res) => {
  try {
    const instructorId = req.user.id;

    // 1. Fetch all courses owned by logged in instructor
    const courses = await Course.find({ instructorId }).sort({ updatedAt: -1 });
    const courseIds = courses.map((c) => c._id);

    const selectedCourseId = req.query.courseId;
    const isAllCourses = !selectedCourseId || selectedCourseId === 'all';

    // Map course IDs to titles for quick lookup
    const courseTitleMap = {};
    courses.forEach((c) => {
      courseTitleMap[c._id.toString()] = c.title;
    });

    if (isAllCourses) {
      // ─── ALL COURSES ANALYTICS ───

      // 1. Summary Cards
      const totalCourses = courses.length;
      const publishedCourses = courses.filter((c) => c.status === 'published').length;
      const draftCourses = courses.filter((c) => c.status === 'draft').length;

      // Unique learners across all instructor's courses
      const distinctLearnerIds = await Enrolment.distinct('learnerId', {
        courseId: { $in: courseIds }
      });
      const totalLearners = distinctLearnerIds.length;

      // Count total assessments and quizzes created across all courses
      let assessmentCount = 0;
      let quizCount = 0;
      const quizItemIds = new Set();

      courses.forEach((course) => {
        // Course assessments array
        assessmentCount += (course.courseAssessments || []).length;
        // Quizzes inside module lessons
        (course.modules || []).forEach((m) => {
          (m.lessons || []).forEach((l) => {
            (l.items || []).forEach((item) => {
              if (item.type === 'quiz' || item.type === 'Quiz') {
                quizCount += 1;
                if (item._id) quizItemIds.add(item._id.toString());
              }
            });
          });
        });
      });

      const totalAssessments = assessmentCount + quizCount;

      // Total submissions for instructor courses
      const submissions = await AssessmentSubmission.find({
        courseId: { $in: courseIds }
      }).sort({ submittedAt: 1 });

      const totalSubmissions = submissions.length;

      let assessmentSubmissionsCount = 0;
      let quizSubmissionsCount = 0;

      submissions.forEach((s) => {
        const aId = s.assessmentId ? s.assessmentId.toString() : '';
        const titleLower = (s.assessmentTitle || '').toLowerCase();
        const typeLower = (s.type || s.assessmentType || '').toLowerCase();

        if (typeLower === 'quiz' || quizItemIds.has(aId) || titleLower.includes('quiz')) {
          quizSubmissionsCount += 1;
        } else {
          assessmentSubmissionsCount += 1;
        }
      });

      // Overall average score calculation across graded submissions
      const gradedSubmissions = submissions.filter(
        (s) => s.status === 'graded' || (s.gradeResult && s.gradeResult !== 'pending')
      );

      let overallAverageScore = 0;
      if (gradedSubmissions.length > 0) {
        const totalPctSum = gradedSubmissions.reduce((sum, s) => {
          const pct = typeof s.percentage === 'number' && s.percentage >= 0
            ? s.percentage
            : (s.maxScore > 0 ? (s.totalScore / s.maxScore) * 100 : 0);
          return sum + pct;
        }, 0);
        overallAverageScore = Math.round(totalPctSum / gradedSubmissions.length);
      }

      // 2. Submissions Over Time Chart Data
      const submissionsByDate = {};
      submissions.forEach((s) => {
        const label = formatDateLabel(s.submittedAt);
        if (label) {
          submissionsByDate[label] = (submissionsByDate[label] || 0) + 1;
        }
      });

      const submissionsOverTime = Object.keys(submissionsByDate).map((date) => ({
        date,
        submissions: submissionsByDate[date]
      }));

      // 3. Assessment Performance Breakdown (Passed / Failed / Not Graded)
      let passedCount = 0;
      let failedCount = 0;
      let notGradedCount = 0;

      submissions.forEach((s) => {
        if (s.gradeResult === 'passed') {
          passedCount += 1;
        } else if (s.gradeResult === 'failed') {
          failedCount += 1;
        } else {
          notGradedCount += 1;
        }
      });

      const assessmentPerformance = [
        { name: 'Passed', value: passedCount, color: 'var(--color-success, #16A34A)' },
        { name: 'Failed', value: failedCount, color: 'var(--color-error, #DC2626)' },
        { name: 'Not Graded', value: notGradedCount, color: 'var(--color-warning, #D97706)' }
      ];

      // 4. Average Score Over Time Chart Data
      const scoresByDate = {};
      submissions.forEach((s) => {
        if (s.status === 'graded' || (s.gradeResult && s.gradeResult !== 'pending')) {
          const label = formatDateLabel(s.submittedAt);
          if (label) {
            const pct = typeof s.percentage === 'number' && s.percentage >= 0
              ? s.percentage
              : (s.maxScore > 0 ? (s.totalScore / s.maxScore) * 100 : 0);
            if (!scoresByDate[label]) {
              scoresByDate[label] = { sum: 0, count: 0 };
            }
            scoresByDate[label].sum += pct;
            scoresByDate[label].count += 1;
          }
        }
      });

      const averageScoreOverTime = Object.keys(scoresByDate).map((date) => ({
        date,
        averageScore: Math.round(scoresByDate[date].sum / scoresByDate[date].count)
      }));

      // 5. Recent Submissions Table Data (Top 10)
      const recentSubmissionsList = [...submissions]
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, 10)
        .map((s) => ({
          id: s._id,
          learnerName: s.learnerName || 'Learner',
          assessmentTitle: s.assessmentTitle || 'Assessment',
          courseTitle: courseTitleMap[s.courseId?.toString()] || 'Course',
          submittedAt: s.submittedAt,
          score: s.status === 'graded'
            ? `${s.totalScore}/${s.maxScore} (${Math.round(s.percentage || 0)}%)`
            : 'Pending',
          status: s.status === 'graded' ? 'Graded' : 'Not Graded',
          gradeResult: s.gradeResult || 'pending'
        }));

      return res.status(200).json({
        success: true,
        viewMode: 'all',
        summaryCards: {
          totalCourses,
          publishedCourses,
          draftCourses,
          totalLearners,
          totalAssessments,
          assessmentCount,
          quizCount,
          totalSubmissions,
          assessmentSubmissionsCount,
          quizSubmissionsCount,
          overallAverageScore
        },
        charts: {
          submissionsOverTime,
          assessmentPerformance,
          averageScoreOverTime
        },
        recentSubmissions: recentSubmissionsList
      });
    }

    // ─── SPECIFIC COURSE ANALYTICS ───

    if (!mongoose.Types.ObjectId.isValid(selectedCourseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID format.' });
    }

    const course = courses.find((c) => c._id.toString() === selectedCourseId.toString());
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or access denied.' });
    }

    // 1. Course Overview Stats
    let lessonsCount = 0;
    const allLessons = [];
    (course.modules || []).forEach((m) => {
      (m.lessons || []).forEach((l) => {
        lessonsCount += 1;
        allLessons.push({
          lessonId: l._id,
          title: l.title,
          order: l.order || allLessons.length + 1
        });
      });
    });

    let resourcesCount = (course.notes || []).length;
    (course.modules || []).forEach((m) => {
      resourcesCount += (m.notes || []).length;
      (m.lessons || []).forEach((l) => {
        resourcesCount += (l.notes || []).length;
      });
    });

    let assessmentsCount = (course.courseAssessments || []).length;
    (course.modules || []).forEach((m) => {
      (m.lessons || []).forEach((l) => {
        (l.items || []).forEach((item) => {
          if (item.type === 'quiz' || item.type === 'Quiz') {
            assessmentsCount += 1;
          }
        });
      });
    });

    const courseEnrolments = await Enrolment.find({ courseId: course._id });
    const learnersCount = courseEnrolments.length;

    // 2. Course Progress Breakdown (Not Started, In Progress, Completed)
    let notStartedCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;

    courseEnrolments.forEach((e) => {
      const pct = e.progressPercentage || 0;
      if (pct === 0) {
        notStartedCount += 1;
      } else if (pct >= 100 || e.status === 'completed') {
        completedCount += 1;
      } else {
        inProgressCount += 1;
      }
    });

    const courseProgressData = [
      { category: 'Not Started', count: notStartedCount },
      { category: 'In Progress', count: inProgressCount },
      { category: 'Completed', count: completedCount }
    ];

    // 3. Lesson Analytics
    const lessonAnalyticsData = await Promise.all(
      allLessons.map(async (l) => {
        const completedCountForLesson = await CompletionRecord.countDocuments({
          course_id: course._id,
          lesson_id: l.lessonId
        });
        const completionPercent = learnersCount > 0
          ? Math.round((completedCountForLesson / learnersCount) * 100)
          : 0;

        return {
          lessonId: l.lessonId,
          title: l.title,
          order: l.order,
          completionPercent,
          completedLearnersCount: completedCountForLesson,
          totalLearners: learnersCount
        };
      })
    );

    // 4. Resource Analytics Status
    // Note: Backend does not log views/downloads on note objects, so return available: false
    const resourceAnalyticsData = {
      available: false,
      message: 'Resource usage analytics are not available yet.'
    };

    // 5. Assessment Analytics
    const courseSubmissions = await AssessmentSubmission.find({ courseId: course._id }).sort({ submittedAt: 1 });

    // Build assessment stats grouped by assessmentId or assessmentTitle
    const assessmentMap = {};
    (course.courseAssessments || []).forEach((a) => {
      assessmentMap[a._id.toString()] = {
        title: a.title,
        submissionsCount: 0,
        scoresSum: 0,
        gradedCount: 0,
        passedCount: 0,
        failedCount: 0,
        notGradedCount: 0
      };
    });

    courseSubmissions.forEach((s) => {
      const key = s.assessmentId ? s.assessmentId.toString() : s.assessmentTitle;
      if (!assessmentMap[key]) {
        assessmentMap[key] = {
          title: s.assessmentTitle || 'Assessment',
          submissionsCount: 0,
          scoresSum: 0,
          gradedCount: 0,
          passedCount: 0,
          failedCount: 0,
          notGradedCount: 0
        };
      }

      const item = assessmentMap[key];
      item.submissionsCount += 1;

      if (s.status === 'graded' || (s.gradeResult && s.gradeResult !== 'pending')) {
        item.gradedCount += 1;
        const pct = typeof s.percentage === 'number' && s.percentage >= 0
          ? s.percentage
          : (s.maxScore > 0 ? (s.totalScore / s.maxScore) * 100 : 0);
        item.scoresSum += pct;

        if (s.gradeResult === 'passed') item.passedCount += 1;
        else if (s.gradeResult === 'failed') item.failedCount += 1;
      } else {
        item.notGradedCount += 1;
      }
    });

    const assessmentAnalyticsData = Object.values(assessmentMap).map((a) => {
      const avgScore = a.gradedCount > 0 ? Math.round(a.scoresSum / a.gradedCount) : 0;
      const passRate = a.gradedCount > 0 ? Math.round((a.passedCount / a.gradedCount) * 100) : 0;
      const failRate = a.gradedCount > 0 ? Math.round((a.failedCount / a.gradedCount) * 100) : 0;

      return {
        title: a.title,
        submissionsCount: a.submissionsCount,
        averageScore: avgScore,
        passRate,
        failRate,
        notGradedCount: a.notGradedCount
      };
    });

    // 6. Question Performance
    // Extract question answer records from courseSubmissions.answers array
    const questionStatsMap = {};
    let totalRecordedAnswers = 0;

    courseSubmissions.forEach((sub) => {
      (sub.answers || []).forEach((ans) => {
        totalRecordedAnswers += 1;
        const key = ans.questionId ? ans.questionId.toString() : ans.questionText;
        if (!questionStatsMap[key]) {
          questionStatsMap[key] = {
            questionId: ans.questionId,
            questionText: ans.questionText || 'Question',
            correctCount: 0,
            incorrectCount: 0,
            skippedCount: 0,
            totalAttempts: 0
          };
        }

        const qItem = questionStatsMap[key];
        qItem.totalAttempts += 1;
        if (ans.studentAnswer === undefined || ans.studentAnswer === null || ans.studentAnswer === '') {
          qItem.skippedCount += 1;
        } else if (ans.isCorrect) {
          qItem.correctCount += 1;
        } else {
          qItem.incorrectCount += 1;
        }
      });
    });

    let questionPerformanceData = {
      available: false,
      message: 'Question performance data is not available yet.',
      questions: []
    };

    if (totalRecordedAnswers > 0) {
      const questionsList = Object.values(questionStatsMap).map((q) => {
        const total = q.totalAttempts || 1;
        return {
          questionId: q.questionId,
          questionText: q.questionText,
          correctPercent: Math.round((q.correctCount / total) * 100),
          incorrectPercent: Math.round((q.incorrectCount / total) * 100),
          skippedPercent: Math.round((q.skippedCount / total) * 100)
        };
      });

      questionPerformanceData = {
        available: true,
        message: null,
        questions: questionsList
      };
    }

    // 7. Recent Submissions Table Data for this course
    const recentSubmissionsList = courseSubmissions
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 10)
      .map((s) => ({
        id: s._id,
        learnerName: s.learnerName || 'Learner',
        assessmentTitle: s.assessmentTitle || 'Assessment',
        courseTitle: course.title,
        submittedAt: s.submittedAt,
        score: s.status === 'graded'
          ? `${s.totalScore}/${s.maxScore} (${Math.round(s.percentage || 0)}%)`
          : 'Pending',
        status: s.status === 'graded' ? 'Graded' : 'Not Graded',
        gradeResult: s.gradeResult || 'pending'
      }));

    // 8. Learners Needing Attention
    // Enroled learners with failed submissions or progress < 25%
    const failedSubmissionLearnerIds = new Set(
      courseSubmissions.filter((s) => s.gradeResult === 'failed').map((s) => s.learnerId?.toString())
    );

    const learnersNeedingAttention = courseEnrolments
      .filter((e) => failedSubmissionLearnerIds.has(e.learnerId?.toString()) || (e.progressPercentage || 0) < 25)
      .slice(0, 5)
      .map((e) => ({
        learnerId: e.learnerId,
        learnerName: e.learnerName || 'Learner',
        learnerEmail: e.learnerEmail,
        progressPercentage: e.progressPercentage || 0,
        reason: failedSubmissionLearnerIds.has(e.learnerId?.toString())
          ? 'Failed assessment attempt'
          : 'Low course progress (<25%)'
      }));

    return res.status(200).json({
      success: true,
      viewMode: 'course',
      courseOverview: {
        id: course._id,
        title: course.title,
        status: course.status,
        lessonsCount,
        resourcesCount,
        assessmentsCount,
        learnersCount
      },
      charts: {
        courseProgress: courseProgressData,
        lessonAnalytics: lessonAnalyticsData,
        resourceAnalytics: resourceAnalyticsData,
        assessmentAnalytics: assessmentAnalyticsData,
        questionPerformance: questionPerformanceData
      },
      recentSubmissions: recentSubmissionsList,
      learnersNeedingAttention
    });
  } catch (error) {
    console.error('Get Instructor Analytics Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching instructor analytics.'
    });
  }
};
