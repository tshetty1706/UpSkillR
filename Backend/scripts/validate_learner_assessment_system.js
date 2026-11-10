const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Course = require('../model/Course');
const Learner = require('../model/Learner');
const Enrolment = require('../model/Enrolment');
const AssessmentSubmission = require('../model/AssessmentSubmission');
const AssessmentAttempt = require('../model/AssessmentAttempt');
const OfficialAssessmentAttempt = require('../model/OfficialAssessmentAttempt');

const learnerAssessmentController = require('../controller/learnerAssessmentController');
const courseContentController = require('../controller/courseContentController');
const quizController = require('../controller/quizController');
const courseController = require('../controller/courseController');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

async function callCtrl(fn, { params = {}, query = {}, body = {}, user }) {
  const req = { params, query, body, user };
  const res = createMockRes();
  await fn(req, res);
  return { status: res.statusCode, body: res.body };
}

async function run() {
  console.log('================================================================');
  console.log('🧪 UpSkillR — Complete Learner Assessment System E2E Validation');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;
  const assert = (cond, label, detail = '') => {
    total++;
    if (cond) {
      console.log(`✅ [PASS] ${label}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${label}${detail ? ' -> ' + detail : ''}`);
    }
  };

  const mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI;
  await mongoose.connect(mongoUrl, { dbName: 'UpSkillr' });

  const suffix = Date.now();
  const createdLearnerIds = [];
  const courseId = new mongoose.Types.ObjectId();

  // Module & item IDs
  const m1Id = new mongoose.Types.ObjectId();
  const m2Id = new mongoose.Types.ObjectId();
  const m3Id = new mongoose.Types.ObjectId();

  const m1L1Id = new mongoose.Types.ObjectId();
  const m1ArticleId = new mongoose.Types.ObjectId();
  const m1VideoId = new mongoose.Types.ObjectId();

  const m2L1Id = new mongoose.Types.ObjectId();
  const m2QuizId = new mongoose.Types.ObjectId();
  const m2QuizQ1Id = new mongoose.Types.ObjectId();

  const m3L1Id = new mongoose.Types.ObjectId();
  const m3DocId = new mongoose.Types.ObjectId();

  const ass1Id = new mongoose.Types.ObjectId();
  const assQ1Id = new mongoose.Types.ObjectId();
  const assQ2Id = new mongoose.Types.ObjectId();
  const assQ3Id = new mongoose.Types.ObjectId();

  try {
    // Create 15 learners so pagination (page size 10 -> 2 pages) is genuinely exercised
    const mainLearnerId = new mongoose.Types.ObjectId();
    const otherLearnerId = new mongoose.Types.ObjectId();
    createdLearnerIds.push(mainLearnerId, otherLearnerId);

    const learnerDocs = [
      {
        _id: mainLearnerId,
        fullName: 'Test Assessment Learner',
        email: `ass_main_${suffix}@example.com`,
        password: 'Password123!',
        role: 'learner'
      },
      {
        _id: otherLearnerId,
        fullName: 'Other Learner Security',
        email: `ass_other_${suffix}@example.com`,
        password: 'Password123!',
        role: 'learner'
      }
    ];

    const extraLearners = [];
    for (let i = 1; i <= 13; i++) {
      const lid = new mongoose.Types.ObjectId();
      createdLearnerIds.push(lid);
      extraLearners.push(lid);
      learnerDocs.push({
        _id: lid,
        fullName: `Peer Learner ${String(i).padStart(2, '0')}`,
        email: `ass_peer_${i}_${suffix}@example.com`,
        password: 'Password123!',
        role: 'learner'
      });
    }
    await Learner.insertMany(learnerDocs);

    const mainUser = { id: String(mainLearnerId), _id: mainLearnerId, role: 'learner', name: 'Test Assessment Learner', email: `ass_main_${suffix}@example.com` };
    const otherUser = { id: String(otherLearnerId), _id: otherLearnerId, role: 'learner', name: 'Other Learner Security', email: `ass_other_${suffix}@example.com` };

    // Create course with 3 modules, video (with playable duration 100s), quiz (4 marks), and milestone assessment (10 marks, 5 min, 70% passing, requires M1 & M2)
    const course = await Course.create({
      _id: courseId,
      title: `Assessment E2E Validation Course ${suffix}`,
      category: 'AI & Machine Learning',
      description: 'Test course for assessment redesign verification',
      status: 'published',
      state: 'published',
      isDeleted: false,
      instructorId: new mongoose.Types.ObjectId(),
      modules: [
        {
          _id: m1Id,
          title: 'Foundations Module',
          state: 'published',
          lessons: [
            {
              _id: m1L1Id,
              title: 'Core Foundations',
              state: 'published',
              items: [
                { _id: m1ArticleId, title: 'Intro Reading', type: 'article', state: 'published' },
                {
                  _id: m1VideoId,
                  title: 'Concept Video',
                  type: 'video',
                  state: 'published',
                  video: {
                    videoUrl: 'https://example.com/video.mp4',
                    duration: 100
                  }
                }
              ]
            }
          ]
        },
        {
          _id: m2Id,
          title: 'Module 2 with Quiz',
          state: 'published',
          lessons: [
            {
              _id: m2L1Id,
              title: 'Quiz Lesson',
              state: 'published',
              items: [
                {
                  _id: m2QuizId,
                  title: 'Module 2 Knowledge Check',
                  type: 'quiz',
                  state: 'published',
                  quiz: {
                    passThresholdPercent: 50,
                    durationMinutes: 5,
                    totalMarks: 4,
                    questions: [
                      {
                        _id: m2QuizQ1Id,
                        questionText: '2 + 2 = ?',
                        type: 'mcq',
                        options: ['3', '4', '5'],
                        correctAnswerIndex: 1,
                        marks: 4
                      }
                    ]
                  }
                }
              ]
            }
          ]
        },
        {
          _id: m3Id,
          title: 'Optional Unrequired Module',
          state: 'published',
          lessons: [
            {
              _id: m3L1Id,
              title: 'Extra Material',
              state: 'published',
              items: [{ _id: m3DocId, title: 'Extra Doc', type: 'pdf', state: 'published' }]
            }
          ]
        }
      ],
      courseAssessments: [
        {
          _id: ass1Id,
          title: 'AI Basics Milestone Exam',
          description: 'Evaluates M1 and M2 mastery.',
          instructions: 'Read carefully. You have 5 minutes.',
          state: 'published',
          requiredModuleIds: [m1Id, m2Id],
          timeLimit: 5,
          durationMinutes: 5,
          passThresholdPercent: 70,
          shuffleQuestions: false,
          shuffleOptions: false,
          totalMarks: 10,
          questions: [
            {
              _id: assQ1Id,
              questionText: 'What is supervised learning?',
              type: 'mcq',
              options: ['Learning with labels', 'Random guessing', 'Sorting files'],
              correctAnswerIndex: 0,
              marks: 4,
              explanation: 'Supervised learning trains on labeled input-output pairs.'
            },
            {
              _id: assQ2Id,
              questionText: 'Select all prime numbers:',
              type: 'multiple_response',
              options: ['2', '3', '4', '5'],
              correctOptionIndexes: [0, 1, 3],
              marks: 4,
              explanation: '2, 3, and 5 are prime numbers.'
            },
            {
              _id: assQ3Id,
              questionText: 'Overfitting occurs when a model memorizes noise.',
              type: 'true_false',
              options: ['True', 'False'],
              correctAnswerIndex: 0,
              marks: 2,
              explanation: 'Overfitting lowers generalization on unseen test data.'
            }
          ]
        }
      ]
    });

    // Enrol all 15 learners
    await Enrolment.insertMany(
      createdLearnerIds.map((lid, idx) => ({
        learnerId: lid,
        learnerName: `Learner ${idx}`,
        learnerEmail: `l${idx}_${suffix}@example.com`,
        courseId,
        courseTitle: course.title,
        completedLessons: [],
        progressPercentage: 0
      }))
    );

    // ─── CHECK 1: Public course sanitization must NOT leak questions/answer keys ───
    const sanitized = courseController.sanitizeCourseForLearner(course);
    const sanitizedAss = (sanitized.courseAssessments || [])[0];
    assert(
      sanitizedAss && sanitizedAss.questions === undefined && sanitizedAss.questionCount === 3 && sanitizedAss.totalMarks === 10,
      'sanitizeCourseForLearner strips assessment questions & answer keys while preserving metadata'
    );

    // ─── CHECK 2: Locked when prerequisites incomplete ───
    const listBefore = await callCtrl(learnerAssessmentController.getCourseAssessments, {
      params: { courseId: String(courseId) },
      user: mainUser
    });
    assert(
      listBefore.status === 200 &&
      listBefore.body.assessments.length === 1 &&
      listBefore.body.assessments[0].unlocked === false &&
      listBefore.body.assessments[0].prerequisiteInfo.incompleteModules.length === 2,
      'Assessment listing reports locked with 2 incomplete prerequisite modules'
    );

    // Direct API start attempt MUST be rejected with 403 PREREQUISITES_INCOMPLETE
    const blockedStart = await callCtrl(learnerAssessmentController.startAssessmentAttempt, {
      params: { courseId: String(courseId), assessmentId: String(ass1Id) },
      user: mainUser
    });
    assert(
      blockedStart.status === 403 && blockedStart.body.code === 'PREREQUISITES_INCOMPLETE',
      '1. Direct POST /start rejected with 403 when prerequisites incomplete'
    );

    // Attempt bypass via quiz route MUST return 404 (quizzes controller must never resolve courseAssessments!)
    const quizBypass = await callCtrl(quizController.startQuizAttempt, {
      params: { courseId: String(courseId), quizId: String(ass1Id) },
      user: mainUser
    });
    assert(
      quizBypass.status === 404,
      '18a. Quiz endpoint rejects courseAssessment ID bypass (404)'
    );

    // Attempt legacy curriculum/assessments/:id/view bypass MUST return 403
    const viewBypass = await callCtrl(courseContentController.getAssessmentForLearner, {
      params: { courseId: String(courseId), assessmentId: String(ass1Id) },
      user: mainUser
    });
    assert(
      viewBypass.status === 403 && viewBypass.body.code === 'PREREQUISITES_INCOMPLETE',
      '18b. Legacy curriculum view endpoint blocks incomplete prerequisites'
    );

    // ─── CHECK 3: Video 80% rule & Quiz submission rule strictly enforced ───
    // Simulate artificial injection into completedLessons without 80% watchPercentage OR quiz submission!
    await Enrolment.updateOne(
      { courseId, learnerId: mainLearnerId },
      {
        $set: {
          completedLessons: [String(m1ArticleId), String(m1VideoId), String(m2QuizId)],
          videoWatchData: {
            [String(m1VideoId)]: {
              lessonId: String(m1L1Id),
              contentItemId: String(m1VideoId),
              totalDuration: 100,
              watchPercentage: 50,
              isEligible: false
            }
          }
        }
      }
    );

    const blockedLowWatch = await callCtrl(learnerAssessmentController.startAssessmentAttempt, {
      params: { courseId: String(courseId), assessmentId: String(ass1Id) },
      user: mainUser
    });
    assert(
      blockedLowWatch.status === 403 && blockedLowWatch.body.incompleteModules?.length === 2,
      '18c. Both 50%-watched video (<80%) and unsubmitted quiz keep prerequisite modules locked'
    );

    // Now watch video >= 80% AND submit Module 2 quiz (scoring 4 marks)
    await Enrolment.updateOne(
      { courseId, learnerId: mainLearnerId },
      {
        $set: {
          videoWatchData: {
            [String(m1VideoId)]: {
              lessonId: String(m1L1Id),
              contentItemId: String(m1VideoId),
              totalDuration: 100,
              watchPercentage: 85,
              isEligible: true
            }
          }
        }
      }
    );
    await AssessmentSubmission.create({
      courseId,
      moduleId: m2Id,
      lessonId: m2L1Id,
      assessmentId: m2QuizId,
      assessmentTitle: 'Module 2 Knowledge Check',
      learnerId: mainLearnerId,
      learnerName: mainUser.name,
      learnerEmail: mainUser.email,
      attemptNumber: 1,
      status: 'submitted',
      totalScore: 4,
      maxScore: 4,
      percentage: 100,
      gradeResult: 'passed',
      isFirstAttempt: true,
      isOfficial: true
    });

    // Note M3 (unrequired module) is STILL incomplete — M1 & M2 are 100% complete -> Assessment must unlock!
    const listUnlocked = await callCtrl(learnerAssessmentController.getCourseAssessments, {
      params: { courseId: String(courseId) },
      user: mainUser
    });
    assert(
      listUnlocked.status === 200 && listUnlocked.body.assessments[0].unlocked === true,
      '2. Completing required modules M1 & M2 (even with M3 incomplete) unlocks assessment'
    );

    // ─── CHECK 4: Start Assessment + No Answer Key Leakage + Single Active Attempt ───
    const startRes = await callCtrl(learnerAssessmentController.startAssessmentAttempt, {
      params: { courseId: String(courseId), assessmentId: String(ass1Id) },
      user: mainUser
    });
    const attempt1Id = startRes.body?.attemptId;
    const returnedQs = startRes.body?.assessment?.questions || [];
    const noKeysLeaked = returnedQs.every(q =>
      q.correctAnswerIndex === undefined &&
      q.correctOptionIndexes === undefined &&
      q.correctAnswer === undefined &&
      q.explanation === undefined
    );
    assert(
      startRes.status === 200 && Boolean(attempt1Id) && startRes.body.durationMinutes === 5 && noKeysLeaked,
      '3 & 8a. Assessment starts with 5-minute server timer and strips all answer keys/explanations'
    );

    // Simultaneous/repeat /start must resume same attemptId (never create duplicate active attempt)
    const resumeRes = await callCtrl(learnerAssessmentController.startAssessmentAttempt, {
      params: { courseId: String(courseId), assessmentId: String(ass1Id) },
      user: mainUser
    });
    assert(
      resumeRes.status === 200 && resumeRes.body.resumed === true && String(resumeRes.body.attemptId) === String(attempt1Id),
      '4. Repeat start resumes exact same active attemptId (no duplicate simultaneous active attempts)'
    );

    // Unauthorized access by otherLearner MUST fail
    const unauthorizedGet = await callCtrl(learnerAssessmentController.getAssessmentAttempt, {
      params: { courseId: String(courseId), assessmentId: String(ass1Id), attemptId: String(attempt1Id) },
      user: otherUser
    });
    assert(
      unauthorizedGet.status === 404,
      '18d. Other learner cannot access another learner private attempt'
    );

    // Save draft answers & reload attempt -> verify persistence & no key leakage
    await callCtrl(learnerAssessmentController.saveAssessmentDraftAnswers, {
      params: { courseId: String(courseId), assessmentId: String(ass1Id), attemptId: String(attempt1Id) },
      body: { answers: { [String(assQ1Id)]: 0 } },
      user: mainUser
    });
    const refreshRes = await callCtrl(learnerAssessmentController.getAssessmentAttempt, {
      params: { courseId: String(courseId), assessmentId: String(ass1Id), attemptId: String(attempt1Id) },
      user: mainUser
    });
    assert(
      refreshRes.status === 200 &&
      refreshRes.body.isSubmitted === false &&
      refreshRes.body.draftAnswers[String(assQ1Id)] === 0 &&
      refreshRes.body.remainingSeconds > 0 &&
      refreshRes.body.remainingSeconds <= 300,
      '5. Page reload preserves draftAnswers & server-computed remaining time without resetting timer'
    );

    // ─── CHECK 5: Concurrent Official Submission & Answer Key Reveal Post-Submit ───
    // Score 8/10 on first (official) attempt: Q1 correct (4), Q2 [0,1] wrong (0), Q3 wrong (Wait: make Q1=4 + Q2=4 = 8/10 -> PASS at 80%!)
    const officialPayload = {
      answers: {
        [String(assQ1Id)]: 0,        // +4
        [String(assQ2Id)]: [0, 1, 3], // +4
        [String(assQ3Id)]: 1         // incorrect (correct is 0) -> 0
      }
    };

    // Fire 2 simultaneous submit requests for Attempt 1!
    const [sub1a, sub1b] = await Promise.all([
      callCtrl(learnerAssessmentController.submitAssessmentAttempt, {
        params: { courseId: String(courseId), assessmentId: String(ass1Id), attemptId: String(attempt1Id) },
        body: officialPayload,
        user: mainUser
      }),
      callCtrl(learnerAssessmentController.submitAssessmentAttempt, {
        params: { courseId: String(courseId), assessmentId: String(ass1Id), attemptId: String(attempt1Id) },
        body: officialPayload,
        user: mainUser
      })
    ]);

    const officialCountAfterRace = await OfficialAssessmentAttempt.countDocuments({
      courseId, assessmentId: ass1Id, learnerId: mainLearnerId
    });
    assert(
      sub1a.status === 200 &&
      sub1b.status === 200 &&
      sub1a.body.result.obtainedMarks === 8 &&
      sub1a.body.result.totalMarks === 10 &&
      sub1a.body.result.percentage === 80 &&
      sub1a.body.result.resultStatus === 'PASS' &&
      sub1a.body.result.attemptType === 'OFFICIAL' &&
      officialCountAfterRace === 1 &&
      sub1a.body.review.questions[0].correctAnswer === 0 &&
      Boolean(sub1a.body.review.questions[0].explanation),
      '7, 8b, 9, 17. Evaluates marks (8/10, 80% PASS), reveals answers+explanations post-submit, and prevents concurrent duplicate official records'
    );

    // ─── CHECK 6: Retake Assessment scoring 10/10 MUST NOT overwrite Official 8/10! ───
    const retakeStart = await callCtrl(learnerAssessmentController.startAssessmentAttempt, {
      params: { courseId: String(courseId), assessmentId: String(ass1Id) },
      user: mainUser
    });
    assert(
      retakeStart.status === 200 &&
      retakeStart.body.attemptNumber === 2 &&
      retakeStart.body.attemptType === 'RETAKE',
      '11. Learner starts Retake (Attempt #2, RETAKE)'
    );

    const retakeSubmit = await callCtrl(learnerAssessmentController.submitAssessmentAttempt, {
      params: { courseId: String(courseId), assessmentId: String(ass1Id), attemptId: String(retakeStart.body.attemptId) },
      body: {
        answers: {
          [String(assQ1Id)]: 0,
          [String(assQ2Id)]: [0, 1, 3],
          [String(assQ3Id)]: 0
        }
      },
      user: mainUser
    });
    const officialAfterRetake = await OfficialAssessmentAttempt.findOne({
      courseId, assessmentId: ass1Id, learnerId: mainLearnerId
    }).lean();
    assert(
      retakeSubmit.status === 200 &&
      retakeSubmit.body.result.obtainedMarks === 10 &&
      retakeSubmit.body.result.attemptType === 'RETAKE' &&
      officialAfterRetake.obtainedMarks === 8,
      '12. Retake scores 10/10 while Official Assessment score stays permanently 8/10'
    );

    // ─── CHECK 7: Retake Leaderboard shows Practice Retakes ONLY ───
    const retakeLb = await callCtrl(learnerAssessmentController.getRetakeLeaderboard, {
      params: { courseId: String(courseId), assessmentId: String(ass1Id) },
      query: { page: '1', limit: '10' },
      user: mainUser
    });
    assert(
      retakeLb.status === 200 &&
      retakeLb.body.retakes.length === 1 &&
      retakeLb.body.retakes[0].attemptNumber === 2 &&
      retakeLb.body.retakes[0].obtainedMarks === 10,
      '13. Inline Retake Leaderboard shows only practice retakes sorted by marks DESC'
    );

    // ─── CHECK 8: Server-Controlled Expiration & Rejection of Late Submissions ───
    const expStart = await callCtrl(learnerAssessmentController.startAssessmentAttempt, {
      params: { courseId: String(courseId), assessmentId: String(ass1Id) },
      user: mainUser
    });
    const expAttemptId = expStart.body.attemptId;
    // Save 1 draft answer (Q3 = 0 -> 2 marks), then force expiresAt into the past (1 minute ago, well beyond grace window!)
    await AssessmentAttempt.updateOne(
      { _id: expAttemptId },
      {
        $set: {
          expiresAt: new Date(Date.now() - 60 * 1000),
          draftAnswers: { [String(assQ3Id)]: 0 }
        }
      }
    );

    // Attempting late manual /submit with manipulated 10/10 payload MUST be rejected (403 DEADLINE_EXPIRED)
    const lateSubmit = await callCtrl(learnerAssessmentController.submitAssessmentAttempt, {
      params: { courseId: String(courseId), assessmentId: String(ass1Id), attemptId: String(expAttemptId) },
      body: {
        answers: { [String(assQ1Id)]: 0, [String(assQ2Id)]: [0, 1, 3], [String(assQ3Id)]: 0 },
        isTimeoutSubmit: false
      },
      user: mainUser
    });
    const autoFinalized = await AssessmentAttempt.findById(expAttemptId).lean();
    assert(
      lateSubmit.status === 403 &&
      lateSubmit.body.code === 'DEADLINE_EXPIRED' &&
      autoFinalized.submissionStatus === 'timed_out' &&
      autoFinalized.obtainedMarks === 2,
      '6 & 18e. Expired late submission rejected with 403 while backend auto-finalized draftAnswers (2/10, timed_out)'
    );

    // Also test valid timeout submission at 00:00 within grace window (expiresAt = 2s ago, isTimeoutSubmit = true)
    const timeoutStart = await callCtrl(learnerAssessmentController.startAssessmentAttempt, {
      params: { courseId: String(courseId), assessmentId: String(ass1Id) },
      user: mainUser
    });
    await AssessmentAttempt.updateOne(
      { _id: timeoutStart.body.attemptId },
      { $set: { expiresAt: new Date(Date.now() - 2000) } }
    );
    const validTimeoutSubmit = await callCtrl(learnerAssessmentController.submitAssessmentAttempt, {
      params: { courseId: String(courseId), assessmentId: String(ass1Id), attemptId: String(timeoutStart.body.attemptId) },
      body: { answers: { [String(assQ1Id)]: 0 }, isTimeoutSubmit: true },
      user: mainUser
    });
    assert(
      validTimeoutSubmit.status === 200 &&
      validTimeoutSubmit.body.result.submissionStatus === 'timed_out' &&
      validTimeoutSubmit.body.result.obtainedMarks === 4,
      '6b. Valid 00:00 timeout submission accepted and graded cleanly'
    );

    // ─── CHECK 9: Course Leaderboard (Quiz Marks + Official Assessment Marks) + Pagination + Global Rank ───
    // Seed Peer Learner scores so mainLearner (4 quiz + 8 assessment = 12 total) ranks deterministically!
    // Give 12 peer learners higher official scores (> 12), and 1 peer learner equal score (12) EARLIER -> mainLearner ranks #14 (Page 2 of 2)!
    const nowBase = Date.now() - 3600 * 1000;
    for (let i = 0; i < extraLearners.length; i++) {
      const peerId = extraLearners[i];
      if (i < 12) {
        // Quiz = 4, Assessment = 10 -> Total 14 (> 12)
        await AssessmentSubmission.create({
          courseId,
          assessmentId: m2QuizId,
          assessmentTitle: 'Quiz',
          learnerId: peerId,
          learnerName: `Peer ${i}`,
          learnerEmail: `p${i}@ex.com`,
          attemptNumber: 1,
          status: 'submitted',
          submittedAt: new Date(nowBase + i * 1000),
          totalScore: 4,
          maxScore: 4,
          percentage: 100,
          gradeResult: 'passed',
          isOfficial: true
        });
        await OfficialAssessmentAttempt.create({
          learnerId: peerId,
          courseId,
          assessmentId: ass1Id,
          attemptId: new mongoose.Types.ObjectId(),
          attemptNumber: 1,
          obtainedMarks: 10,
          totalMarks: 10,
          percentage: 100,
          resultStatus: 'PASS',
          submissionStatus: 'submitted',
          submittedAt: new Date(nowBase + i * 1000)
        });
      } else if (i === 12) {
        // Tie with mainLearner at 12 total (Quiz 4 + Ass 8), submitted EARLIER -> beats mainLearner via earliest completion tie-breaker!
        await AssessmentSubmission.create({
          courseId,
          assessmentId: m2QuizId,
          assessmentTitle: 'Quiz',
          learnerId: peerId,
          learnerName: `Peer ${i}`,
          learnerEmail: `p${i}@ex.com`,
          attemptNumber: 1,
          status: 'submitted',
          submittedAt: new Date(nowBase - 50000),
          totalScore: 4,
          maxScore: 4,
          percentage: 100,
          gradeResult: 'passed',
          isOfficial: true
        });
        await OfficialAssessmentAttempt.create({
          learnerId: peerId,
          courseId,
          assessmentId: ass1Id,
          attemptId: new mongoose.Types.ObjectId(),
          attemptNumber: 1,
          obtainedMarks: 8,
          totalMarks: 10,
          percentage: 80,
          resultStatus: 'PASS',
          submissionStatus: 'submitted',
          submittedAt: new Date(nowBase - 50000)
        });
      }
    }

    const lbPage1 = await callCtrl(quizController.getCourseLeaderboard, {
      params: { courseId: String(courseId) },
      query: { page: '1', limit: '10' },
      user: mainUser
    });
    const lbPage2 = await callCtrl(quizController.getCourseLeaderboard, {
      params: { courseId: String(courseId) },
      query: { page: '2', limit: '10' },
      user: mainUser
    });

    const userRankObj = lbPage1.body?.currentUserRank;
    const foundOnPage2 = (lbPage2.body?.leaderboard || []).find(r => r.isCurrentUser);

    assert(
      lbPage1.status === 200 &&
      lbPage1.body.leaderboard.length === 10 &&
      lbPage1.body.pagination.totalLearners === 15 &&
      lbPage1.body.pagination.totalPages === 2 &&
      lbPage1.body.assessmentStatus === 'active' &&
      !String(lbPage1.body.methodology).includes('Coming Soon'),
      '14 & 15. Course Leaderboard uses Quiz+Assessment official marks, excludes Coming Soon, and paginates Page 1 (10/15)'
    );

    assert(
      userRankObj &&
      userRankObj.rank === 14 &&
      userRankObj.page === 2 &&
      userRankObj.quizMarks === 4 &&
      userRankObj.assessmentMarks === 8 &&
      userRankObj.totalMarks === 12 &&
      foundOnPage2 &&
      foundOnPage2.rank === 14,
      '10, 15, 16. Global rank (#14 of 15 on Page 2) & official scores (4 quiz + 8 official assessment = 12) remain accurate across pages'
    );

    console.log(`\n================================================================`);
    console.log(`🎯 Result: ${passed}/${total} assertions passed`);
    console.log(`================================================================`);

    if (passed !== total) {
      process.exitCode = 1;
    }
  } finally {
    // Cleanup temporary test data completely
    await AssessmentAttempt.deleteMany({ courseId });
    await OfficialAssessmentAttempt.deleteMany({ courseId });
    await AssessmentSubmission.deleteMany({ courseId });
    await Enrolment.deleteMany({ courseId });
    await Course.deleteOne({ _id: courseId });
    await Learner.deleteMany({ _id: { $in: createdLearnerIds } });
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('Validation crashed:', err);
  process.exit(1);
});
