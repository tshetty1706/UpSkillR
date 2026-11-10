/**
 * Comprehensive Mandatory Account Deletion Audit & Cleanup Verification Suite
 * Covers all 15 scenarios in Section 7 + ACID transaction rollback, concurrency safety,
 * Cloudinary failure tracking & retry recovery, OAuth/JWT lockouts, and shared-data isolation.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { Learner, Instructor } = require('../model/User');
const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');
const PersonalNote = require('../model/PersonalNote');
const Bookmark = require('../model/Bookmark');
const BookmarkFolder = require('../model/BookmarkFolder');
const Certificate = require('../model/Certificate');
const CompletionRecord = require('../model/CompletionRecord');
const AssessmentSubmission = require('../model/AssessmentSubmission');
const AssessmentAttempt = require('../model/AssessmentAttempt');
const OfficialAssessmentAttempt = require('../model/OfficialAssessmentAttempt');
const PointTransaction = require('../model/PointTransaction');
const LearnerActivity = require('../model/LearnerActivity');
const Notification = require('../model/Notification');
const CourseQuestion = require('../model/CourseQuestion');
const CourseReview = require('../model/CourseReview');
const DeletionJob = require('../model/DeletionJob');

const learnerController = require('../controller/learnerController');
const authController = require('../controller/authController');
const { protect } = require('../middleware/authMiddleware');
const mediaController = require('../controller/mediaController');
const {
  executePermanentDeletion,
  retryDeletionJob,
  hashDeleteOtp,
  hashToken
} = require('../services/accountDeletionService');

const JWT_SECRET = process.env.JWT_SECRET || 'upskillr_jwt_secret_key_2026_super_secure';

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    clearedCookies: [],
    cookies: {},
    headers: {},
    redirectUrl: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    clearCookie(name, opts) {
      this.clearedCookies.push({ name, opts });
      return this;
    },
    cookie(name, val, opts) {
      this.cookies[name] = { val, opts };
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
    },
    redirect(url) {
      this.redirectUrl = url;
      return this;
    }
  };
  return res;
}

async function runProtectMiddleware(token) {
  const req = {
    headers: { authorization: `Bearer ${token}`, 'x-test-suite': 'true' },
    cookies: {},
    originalUrl: '/api/learners/me'
  };
  const res = createMockRes();
  let nextCalled = false;
  await protect(req, res, () => {
    nextCalled = true;
  });
  return { nextCalled, statusCode: res.statusCode, body: res.body, user: req.user };
}

async function assertAllLearnerRecordsGone(learnerId) {
  const [
    learner,
    enrolments,
    notes,
    bookmarks,
    folders,
    certs,
    completions,
    submissions,
    attempts,
    officialAttempts,
    points,
    activities,
    notifications,
    questions,
    reviews
  ] = await Promise.all([
    Learner.findById(learnerId),
    Enrolment.countDocuments({ learnerId }),
    PersonalNote.countDocuments({ learnerId }),
    Bookmark.countDocuments({ learnerId }),
    BookmarkFolder.countDocuments({ learnerId }),
    Certificate.countDocuments({ learnerId }),
    CompletionRecord.countDocuments({ learner_id: learnerId }),
    AssessmentSubmission.countDocuments({ learnerId }),
    AssessmentAttempt.countDocuments({ learnerId }),
    OfficialAssessmentAttempt.countDocuments({ learnerId }),
    PointTransaction.countDocuments({ $or: [{ learnerId }, { userId: learnerId }] }),
    LearnerActivity.countDocuments({ learnerId }),
    Notification.countDocuments({ recipientId: learnerId }),
    CourseQuestion.countDocuments({ userId: learnerId }),
    CourseReview.countDocuments({ learnerId })
  ]);

  assert.strictEqual(learner, null, 'Learner document must be deleted');
  assert.strictEqual(enrolments, 0, 'Enrolment count must be 0');
  assert.strictEqual(notes, 0, 'PersonalNote count must be 0');
  assert.strictEqual(bookmarks, 0, 'Bookmark count must be 0');
  assert.strictEqual(folders, 0, 'BookmarkFolder count must be 0');
  assert.strictEqual(certs, 0, 'Certificate count must be 0');
  assert.strictEqual(completions, 0, 'CompletionRecord count must be 0');
  assert.strictEqual(submissions, 0, 'AssessmentSubmission count must be 0');
  assert.strictEqual(attempts, 0, 'AssessmentAttempt count must be 0');
  assert.strictEqual(officialAttempts, 0, 'OfficialAssessmentAttempt count must be 0');
  assert.strictEqual(points, 0, 'PointTransaction count must be 0');
  assert.strictEqual(activities, 0, 'LearnerActivity count must be 0');
  assert.strictEqual(notifications, 0, 'Notification count must be 0');
  assert.strictEqual(questions, 0, 'CourseQuestion with deleted userId count must be 0');
  assert.strictEqual(reviews, 0, 'CourseReview count must be 0');
}

async function runSuite() {
  if (!process.env.MONGO_URL) {
    throw new Error('MONGO_URL is missing in Backend/.env');
  }

  await mongoose.connect(process.env.MONGO_URL);
  console.log('[TEST] Connected to MongoDB.');

  const createdIds = {
    learners: [],
    instructors: [],
    courses: [],
    jobIds: [],
    extraQuestions: [],
    extraNotifications: [],
    localTempFiles: []
  };

  try {
    const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // ─── Shared Fixtures: Instructor, Two Courses, Peer Learner ───
    const instructor = await Instructor.create({
      fullName: `Deletion Test Instructor ${suffix}`,
      email: `del_inst_${suffix}@upskillr.test`,
      password: '$2b$10$hashedpasswordplaceholderfortesting1234567890',
      role: 'instructor',
      authProvider: 'local',
      isVerified: true,
      avatar: 'https://res.cloudinary.com/demo/image/upload/v1/upskillr_profiles/instructor_keep.png',
      avatarPublicId: 'upskillr_profiles/instructor_keep'
    });
    createdIds.instructors.push(instructor._id);

    const courseAId = new mongoose.Types.ObjectId();
    const courseBId = new mongoose.Types.ObjectId();
    const moduleAId = new mongoose.Types.ObjectId();
    const lessonAId = new mongoose.Types.ObjectId();
    const itemQuizId = new mongoose.Types.ObjectId();
    const assessAId = new mongoose.Types.ObjectId();

    const courseA = await Course.create({
      _id: courseAId,
      title: `Audit Course A ${suffix}`,
      category: 'Computer Science',
      instructorId: instructor._id,
      instructorName: instructor.fullName,
      status: 'published',
      state: 'published',
      thumbnail: 'https://res.cloudinary.com/demo/image/upload/v1/upskillr_thumbnails/course_a_keep.png',
      thumbnail_public_id: 'upskillr_thumbnails/course_a_keep',
      modules: [
        {
          _id: moduleAId,
          title: 'Module 1',
          order: 1,
          lessons: [
            {
              _id: lessonAId,
              title: 'Lesson 1',
              type: 'quiz',
              items: [{ _id: itemQuizId, title: 'Quiz 1', type: 'quiz' }]
            }
          ]
        }
      ],
      courseAssessments: [
        {
          _id: assessAId,
          title: 'Final Assessment A',
          state: 'published',
          questions: [{ questionText: 'Q1?', type: 'mcq', options: ['A', 'B'], correctAnswer: 'A', marks: 10 }]
        }
      ]
    });
    const courseB = await Course.create({
      _id: courseBId,
      title: `Audit Course B ${suffix}`,
      category: 'Web Development',
      instructorId: instructor._id,
      instructorName: instructor.fullName,
      status: 'published',
      state: 'published',
      thumbnail: 'https://res.cloudinary.com/demo/image/upload/v1/upskillr_thumbnails/course_b_keep.png',
      thumbnail_public_id: 'upskillr_thumbnails/course_b_keep'
    });
    createdIds.courses.push(courseA._id, courseB._id);

    // Peer Learner whose records and rankings must stay 100% untouched
    const peerLearner = await Learner.create({
      fullName: `Peer Learner ${suffix}`,
      email: `del_peer_${suffix}@upskillr.test`,
      password: '$2b$10$hashedpasswordplaceholderfortesting1234567890',
      role: 'learner',
      authProvider: 'local',
      isVerified: true,
      points: 200
    });
    createdIds.learners.push(peerLearner._id);

    await Enrolment.create({
      learnerId: peerLearner._id,
      learnerEmail: peerLearner.email,
      learnerName: peerLearner.fullName,
      courseId: courseA._id,
      courseTitle: courseA.title,
      progressPercentage: 100,
      status: 'completed',
      rating: 5,
      feedback: 'Excellent course kept intact!',
      ratedAt: new Date()
    });
    const peerReview = await CourseReview.create({
      learnerId: peerLearner._id,
      courseId: courseA._id,
      rating: 5,
      feedback: 'Peer learner 5 star review',
      tags: ['Clear']
    });
    const peerBookmark = await Bookmark.create({
      learnerId: peerLearner._id,
      resourceType: 'course',
      courseId: courseA._id,
      title: 'Peer Bookmark Keep'
    });
    const peerNotif = await Notification.create({
      recipientId: peerLearner._id,
      courseId: courseA._id,
      courseTitle: courseA.title,
      title: 'Peer Own Notification',
      message: 'Should never be deleted',
      type: 'COURSE_UPDATE'
    });
    createdIds.extraNotifications.push(peerNotif._id);

    // ─── Scenario 1: Learner with NO enrolled courses (Full Controller OTP + Confirm + Concurrent Race) ───
    const emptyLearner = await Learner.create({
      fullName: `Empty Learner ${suffix}`,
      email: `del_empty_${suffix}@upskillr.test`,
      username: `delempty_${suffix}`,
      password: '$2b$10$hashedpasswordplaceholderfortesting1234567890',
      role: 'learner',
      authProvider: 'local',
      isVerified: true
    });
    createdIds.learners.push(emptyLearner._id);

    const emptyJwt = jwt.sign(
      { id: emptyLearner._id, email: emptyLearner.email, role: 'learner', fullName: emptyLearner.fullName, isVerified: true },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const beforeAuth = await runProtectMiddleware(emptyJwt);
    assert.strictEqual(beforeAuth.nextCalled, true, 'Scenario 1: JWT must authorize before deletion');

    // Simulate OTP issued + verifyDeleteAccountOtp -> deletionToken
    const otpCode = '654321';
    emptyLearner.deleteAccountOtp = hashDeleteOtp(otpCode, emptyLearner._id);
    emptyLearner.deleteAccountOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
    emptyLearner.deleteAccountOtpPurpose = 'ACCOUNT_DELETION';
    await emptyLearner.save();

    const verifyReq = { user: { id: String(emptyLearner._id), role: 'learner' }, body: { otp: otpCode } };
    const verifyRes = createMockRes();
    await learnerController.verifyDeleteAccountOtp(verifyReq, verifyRes);
    assert.strictEqual(verifyRes.statusCode, 200, 'Scenario 1: verifyDeleteAccountOtp should return 200');
    const deletionToken = verifyRes.body.deletionToken;
    assert(deletionToken, 'Scenario 1: deletionToken issued');

    // Concurrent confirm race check: invoke confirmDeleteAccount twice in parallel with same token
    const reqC1 = { user: { id: String(emptyLearner._id), role: 'learner' }, body: { deletionToken }, headers: {} };
    const resC1 = createMockRes();
    const reqC2 = { user: { id: String(emptyLearner._id), role: 'learner' }, body: { deletionToken }, headers: {} };
    const resC2 = createMockRes();
    await Promise.all([
      learnerController.confirmDeleteAccount(reqC1, resC1),
      learnerController.confirmDeleteAccount(reqC2, resC2)
    ]);

    const codes = [resC1.statusCode, resC2.statusCode].sort();
    assert.deepStrictEqual(codes, [200, 409], `Concurrent confirmation race must allow one 200 and reject second with 409, got ${codes}`);
    const successBody = resC1.statusCode === 200 ? resC1.body : resC2.body;
    createdIds.jobIds.push(successBody.jobId);

    await assertAllLearnerRecordsGone(emptyLearner._id);
    const afterAuth = await runProtectMiddleware(emptyJwt);
    assert.strictEqual(afterAuth.nextCalled, false, 'Scenario 1: deleted JWT must be rejected');
    assert.strictEqual(afterAuth.statusCode, 401, 'Scenario 1: deleted user middleware status must be 401');

    const emptyJob = await DeletionJob.findOne({ jobId: successBody.jobId }).lean();
    assert.strictEqual(emptyJob.status, 'completed');
    assert.strictEqual(emptyJob.email, 'anonymized@deleted.local', 'DeletionJob email PII must be anonymized upon completion');
    assert.strictEqual(emptyJob.emailHash, hashToken(emptyLearner.email), 'DeletionJob should store non-reversible sha256 emailHash');
    console.log('✓ Scenario 1 & Concurrency Race passed');

    // ─── Scenarios 2–13 & 15: Rich Learner across EVERY feature + Local file + Cloudinary + Shared Q&A ───
    const uploadsTestDir = path.resolve(__dirname, '../uploads/avatars');
    fs.mkdirSync(uploadsTestDir, { recursive: true });
    const tempLocalAvatarName = `test_del_avatar_${suffix}.png`;
    const tempLocalAvatarFullPath = path.join(uploadsTestDir, tempLocalAvatarName);
    fs.writeFileSync(tempLocalAvatarFullPath, 'fake-png-content');
    createdIds.localTempFiles.push(tempLocalAvatarFullPath);

    const richLearner = await Learner.create({
      fullName: `Rich Audit Learner ${suffix}`,
      email: `del_rich_${suffix}@upskillr.test`,
      username: `delrich_${suffix}`,
      password: '$2b$10$hashedpasswordplaceholderfortesting1234567890',
      role: 'learner',
      authProvider: 'local',
      isVerified: true,
      avatar: `https://res.cloudinary.com/demo/image/upload/v123/upskillr_profiles/rich_avatar_${suffix}.png`,
      avatarPublicId: `upskillr_profiles/rich_avatar_${suffix}`,
      points: 450,
      currentStreak: 12,
      longestStreak: 20,
      badges: [
        { badgeId: 'streak_normal', name: '7-Day Streak', category: 'streak', tier: 'normal', threshold: 7, earnedAt: new Date() }
      ],
      education: [{ institution: 'MIT', degree: 'BSc', fieldOfStudy: 'CS' }],
      experience: [{ company: 'Acme', role: 'Software Developer' }]
    });
    createdIds.learners.push(richLearner._id);

    // Scenarios 2 & 3: Multiple courses (Course A completed, Course B incomplete)
    await Enrolment.create([
      {
        learnerId: richLearner._id,
        learnerEmail: richLearner.email,
        learnerName: richLearner.fullName,
        courseId: courseA._id,
        courseTitle: courseA.title,
        progressPercentage: 100,
        status: 'completed',
        completedAt: new Date(),
        rating: 1,
        feedback: 'Learner review to remove'
      },
      {
        learnerId: richLearner._id,
        learnerEmail: richLearner.email,
        learnerName: richLearner.fullName,
        courseId: courseB._id,
        courseTitle: courseB.title,
        progressPercentage: 35,
        status: 'active'
      }
    ]);
    await CompletionRecord.create({
      learner_id: richLearner._id,
      course_id: courseA._id,
      lesson_id: lessonAId,
      content_version: 1
    });

    // Scenario 4: Quiz attempts & retakes
    await AssessmentSubmission.create([
      {
        courseId: courseA._id,
        moduleId: moduleAId,
        lessonId: lessonAId,
        assessmentId: itemQuizId,
        learnerId: richLearner._id,
        learnerName: richLearner.fullName,
        learnerEmail: richLearner.email,
        attemptNumber: 1,
        isFirstAttempt: true,
        isOfficial: true,
        status: 'graded',
        totalScore: 7,
        maxScore: 10,
        percentage: 70
      },
      {
        courseId: courseA._id,
        moduleId: moduleAId,
        lessonId: lessonAId,
        assessmentId: itemQuizId,
        learnerId: richLearner._id,
        learnerName: richLearner.fullName,
        learnerEmail: richLearner.email,
        attemptNumber: 2,
        isFirstAttempt: false,
        isOfficial: false,
        status: 'graded',
        totalScore: 10,
        maxScore: 10,
        percentage: 100
      }
    ]);

    // Scenario 5: Official & Retake Milestone Assessments
    const officialAtt = await AssessmentAttempt.create({
      learnerId: richLearner._id,
      learnerName: richLearner.fullName,
      learnerEmail: richLearner.email,
      courseId: courseA._id,
      assessmentId: assessAId,
      attemptNumber: 1,
      attemptType: 'OFFICIAL',
      startedAt: new Date(Date.now() - 60000),
      expiresAt: new Date(Date.now() + 600000),
      submittedAt: new Date(),
      submissionStatus: 'submitted',
      durationMinutes: 10,
      obtainedMarks: 8,
      totalMarks: 10,
      percentage: 80,
      resultStatus: 'PASS'
    });
    await AssessmentAttempt.create({
      learnerId: richLearner._id,
      learnerName: richLearner.fullName,
      learnerEmail: richLearner.email,
      courseId: courseA._id,
      assessmentId: assessAId,
      attemptNumber: 2,
      attemptType: 'RETAKE',
      startedAt: new Date(Date.now() - 30000),
      expiresAt: new Date(Date.now() + 600000),
      submittedAt: new Date(),
      submissionStatus: 'submitted',
      durationMinutes: 10,
      obtainedMarks: 10,
      totalMarks: 10,
      percentage: 100,
      resultStatus: 'PASS'
    });
    await OfficialAssessmentAttempt.create({
      learnerId: richLearner._id,
      courseId: courseA._id,
      assessmentId: assessAId,
      attemptId: officialAtt._id,
      attemptNumber: 1,
      obtainedMarks: 8,
      totalMarks: 10,
      percentage: 80,
      resultStatus: 'PASS',
      submissionStatus: 'submitted',
      submittedAt: new Date()
    });

    // Scenario 6 & 7: Points & Streak/Activity history
    await PointTransaction.create([
      {
        learnerId: richLearner._id,
        userId: richLearner._id,
        courseId: courseA._id,
        points: 50,
        type: 'COURSE_COMPLETION',
        description: 'Completed Course A'
      },
      {
        learnerId: richLearner._id,
        points: 10,
        type: 'DAILY_LOGIN',
        description: 'Daily streak reward'
      }
    ]);
    await LearnerActivity.create({
      learnerId: richLearner._id,
      courseId: courseA._id,
      activityType: 'daily_login',
      title: 'Daily Streak Login',
      description: 'Logged in to learn'
    });

    // Scenario 8: Bookmarks, BookmarkFolders & PersonalNotes
    const folder = await BookmarkFolder.create({ learnerId: richLearner._id, name: 'Revision Folder' });
    await Bookmark.create({
      learnerId: richLearner._id,
      courseId: courseA._id,
      folderId: folder._id,
      resourceType: 'lesson',
      lessonId: lessonAId,
      title: 'Lesson Bookmark'
    });
    await PersonalNote.create({
      learnerId: richLearner._id,
      courseId: courseA._id,
      folderId: folder._id,
      title: 'My Notes',
      content: 'Important summary content'
    });

    // Scenario 9: Course Review & Rating Recalculation
    const richReview = await CourseReview.create({
      learnerId: richLearner._id,
      courseId: courseA._id,
      rating: 1,
      feedback: 'Temporary 1 star review by rich learner'
    });
    await Course.findByIdAndUpdate(courseA._id, { rating: 3.0, reviewCount: 2 });

    // Peer notification pointing to the deleted review (should be deleted)
    const peerReviewNotif = await Notification.create({
      recipientId: peerLearner._id,
      courseId: courseA._id,
      courseTitle: courseA.title,
      section: 'reviews',
      type: 'NEW_REVIEW',
      referenceId: String(richReview._id),
      title: 'New 1-Star Review',
      message: '"Temporary 1 star review"',
      isRead: false
    });
    createdIds.extraNotifications.push(peerReviewNotif._id);

    // Scenario 10: Course Q&A (1 unanswered pending + 1 answered with instructor reply)
    const unansweredQ = await CourseQuestion.create({
      courseId: courseA._id,
      userId: richLearner._id,
      userName: richLearner.fullName,
      userAvatar: richLearner.avatar,
      question: 'Pending question without instructor reply?',
      status: 'pending'
    });
    const answeredQ = await CourseQuestion.create({
      courseId: courseA._id,
      userId: richLearner._id,
      userName: richLearner.fullName,
      userAvatar: richLearner.avatar,
      question: 'Important concept question?',
      status: 'answered',
      instructorId: instructor._id,
      instructorName: instructor.fullName,
      instructorReply: 'Here is the preserved instructor explanation!',
      replyTimestamp: new Date()
    });
    createdIds.extraQuestions.push(answeredQ._id);

    // Instructor & peer notifications referencing both questions
    const instUnansweredNotif = await Notification.create({
      recipientId: instructor._id,
      courseId: courseA._id,
      section: 'qa',
      type: 'COURSE_QUESTION',
      questionId: unansweredQ._id,
      referenceId: String(unansweredQ._id),
      title: 'New Question',
      message: `${richLearner.fullName} asked: "Pending question without instructor reply?"`
    });
    const instAnsweredNotif = await Notification.create({
      recipientId: instructor._id,
      courseId: courseA._id,
      section: 'qa',
      type: 'COURSE_QUESTION',
      questionId: answeredQ._id,
      referenceId: String(answeredQ._id),
      title: 'New Question',
      message: `${richLearner.fullName} asked: "Important concept question?"`
    });
    createdIds.extraNotifications.push(instUnansweredNotif._id, instAnsweredNotif._id);

    // Scenario 11: Unread & Read Notifications for richLearner
    await Notification.create([
      { recipientId: richLearner._id, courseId: courseA._id, title: 'Unread Note', message: 'Unread msg', isRead: false },
      { recipientId: richLearner._id, courseId: courseA._id, title: 'Read Note', message: 'Read msg', isRead: true, readAt: new Date() }
    ]);

    // Scenario 12 & 13: Certificates (with Cloudinary PNG publicId & raw PDF URL)
    await Certificate.create({
      certificateId: `UPSK-TEST-${suffix}`,
      learnerId: richLearner._id,
      courseId: courseA._id,
      instructorId: instructor._id,
      studentNameSnapshot: richLearner.fullName,
      courseNameSnapshot: courseA.title,
      instructorNameSnapshot: instructor.fullName,
      certificateImageUrl: `https://res.cloudinary.com/demo/image/upload/v1/upskillr/certificates/${richLearner._id}/cert.png`,
      certificatePublicId: `upskillr/certificates/${richLearner._id}/cert`,
      certificatePdfUrl: `https://res.cloudinary.com/demo/raw/upload/v1/upskillr/certificates/${richLearner._id}/cert.pdf`
    });

    // Track Cloudinary asset deletions explicitly & simulate FIRST failure then recovery retry!
    const cloudinaryDestroyCalls = [];
    let shouldFailCertPdf = true;
    const mockDeleteAssetFn = async (target, resourceType = 'image') => {
      cloudinaryDestroyCalls.push({ target, resourceType });
      if (shouldFailCertPdf && String(target).includes('cert.pdf')) {
        return { ok: false, publicId: target, resourceType, error: 'Simulated transient Cloudinary 503' };
      }
      return { ok: true, deleted: true, notFound: false, publicId: target, resourceType };
    };

    // Attempt 1: simulate Cloudinary failure on cert.pdf -> MUST record failed job & NOT delete Mongo records!
    let failedErr = null;
    try {
      await executePermanentDeletion(richLearner._id, richLearner.email, 'local', { deleteAssetFn: mockDeleteAssetFn });
    } catch (e) {
      failedErr = e;
    }
    const attempt1Targets = [...new Set(cloudinaryDestroyCalls.map((c) => c.target))];
    assert(attempt1Targets.includes(`upskillr_profiles/rich_avatar_${suffix}`), 'Must attempt Cloudinary destroy using stored avatarPublicId');
    assert(attempt1Targets.includes(`upskillr/certificates/${richLearner._id}/cert`), 'Must attempt Cloudinary destroy using stored certificatePublicId');
    assert(attempt1Targets.some((t) => t.includes('cert.pdf')), 'Must attempt Cloudinary destroy for certificate PDF');
    assert(!attempt1Targets.includes('upskillr_thumbnails/course_a_keep'), 'Instructor thumbnail must NEVER be passed to destroy');
    assert(!attempt1Targets.includes('upskillr_profiles/instructor_keep'), 'Instructor avatar must NEVER be passed to destroy');
    assert(failedErr && failedErr.code === 'EXTERNAL_STORAGE_CLEANUP_FAILED', 'Cloudinary failure must reject rather than swallow error');
    createdIds.jobIds.push(failedErr.jobId);

    const failedJob = await DeletionJob.findOne({ jobId: failedErr.jobId }).lean();
    assert.strictEqual(failedJob.status, 'failed', 'DeletionJob must record failed status when Cloudinary fails');
    assert.strictEqual(failedJob.step, 'external_cleanup_failed');
    assert.strictEqual(failedJob.pendingAssetCleanup.length, 1, 'Pending cleanup must track failed cert.pdf asset');

    // Verify DB records were NOT partially wiped when external cleanup failed
    assert(await Learner.findById(richLearner._id), 'Learner doc should still exist before external retry completes');
    assert.strictEqual(await Enrolment.countDocuments({ learnerId: richLearner._id }), 2);

    // Ensure login is blocked when DeletionJob fails after learner marked pending_deletion (if marked by confirm endpoint)
    await Learner.findByIdAndUpdate(richLearner._id, { deletionStatus: 'pending_deletion' });
    const blockedLoginRes = createMockRes();
    await authController.manualLogin(
      { body: { email: richLearner.email, password: 'any' }, headers: { 'x-test-suite': 'true' } },
      blockedLoginRes
    );
    assert.strictEqual(blockedLoginRes.statusCode, 403, 'Pending-deletion learner must be blocked from manualLogin');

    // Attempt 2: Cloudinary recovers -> retryDeletionJob completes external cleanup + transactional DB wipe!
    shouldFailCertPdf = false;
    cloudinaryDestroyCalls.length = 0;
    const retryResult = await retryDeletionJob(failedErr.jobId, { deleteAssetFn: mockDeleteAssetFn });
    assert.strictEqual(retryResult.success, true, 'retryDeletionJob must succeed once Cloudinary recovers');
    assert.strictEqual(cloudinaryDestroyCalls.length, 1, 'retryDeletionJob should only retry the pending failed asset');

    await assertAllLearnerRecordsGone(richLearner._id);

    // Check local avatar file cleanup via separate direct check if local /uploads path used
    assert(fs.existsSync(tempLocalAvatarFullPath), 'sanity pre-check');
    const localAvatarLearner = await Learner.create({
      fullName: `Local Avatar Learner ${suffix}`,
      email: `del_localimg_${suffix}@upskillr.test`,
      password: '$2b$10$hashedpasswordplaceholderfortesting1234567890',
      role: 'learner',
      authProvider: 'local',
      isVerified: true,
      avatar: `/uploads/avatars/${tempLocalAvatarName}`
    });
    createdIds.learners.push(localAvatarLearner._id);
    const localRes = await executePermanentDeletion(localAvatarLearner._id, localAvatarLearner.email, 'local', {
      deleteAssetFn: mockDeleteAssetFn
    });
    createdIds.jobIds.push(localRes.jobId);
    assert.strictEqual(fs.existsSync(tempLocalAvatarFullPath), false, 'Local /uploads avatar file must be deleted from disk');

    // Verify Shared Data Protection: Course A, Rating Recalculation, Instructor Reply, Peer Learner!
    const updatedCourseA = await Course.findById(courseA._id).lean();
    assert(updatedCourseA, 'Course A must still exist');
    assert.strictEqual(updatedCourseA.thumbnail_public_id, 'upskillr_thumbnails/course_a_keep', 'Instructor thumbnail must be preserved');
    assert.strictEqual(updatedCourseA.rating, 5, 'Course A rating must recalculate to 5.0 after richLearner 1-star review removal');
    assert.strictEqual(updatedCourseA.reviewCount, 1, 'Course A reviewCount must be 1');

    const checkUnanswered = await CourseQuestion.findById(unansweredQ._id);
    assert.strictEqual(checkUnanswered, null, 'Unanswered Q&A thread must be deleted');
    const checkInstUnansNotif = await Notification.findById(instUnansweredNotif._id);
    assert.strictEqual(checkInstUnansNotif, null, 'Notification for deleted unanswered Q&A must be deleted');
    const checkPeerRevNotif = await Notification.findById(peerReviewNotif._id);
    assert.strictEqual(checkPeerRevNotif, null, 'Notification for deleted course review must be deleted');

    const checkAnswered = await CourseQuestion.findById(answeredQ._id).lean();
    assert(checkAnswered, 'Answered Q&A thread with instructor reply must be preserved');
    assert.strictEqual(checkAnswered.userId, null, 'Answered Q&A userId must be null/anonymized');
    assert.strictEqual(checkAnswered.userName, 'Deleted Learner', 'Answered Q&A userName must be anonymized');
    assert.strictEqual(checkAnswered.userAvatar, '', 'Answered Q&A userAvatar must be cleared');
    assert.strictEqual(checkAnswered.instructorReply, 'Here is the preserved instructor explanation!', 'Instructor reply must remain intact');

    const checkInstAnsNotif = await Notification.findById(instAnsweredNotif._id).lean();
    assert(checkInstAnsNotif && checkInstAnsNotif.message.startsWith('Deleted Learner asked:'), 'Answered Q&A notification must anonymize learner name');

    // Ensure instructor and peer learner records untouched
    assert(await Instructor.findById(instructor._id), 'Instructor must remain untouched');
    assert(await Learner.findById(peerLearner._id), 'Peer learner must remain untouched');
    assert(await CourseReview.findById(peerReview._id), 'Peer learner review must remain untouched');
    assert(await Bookmark.findById(peerBookmark._id), 'Peer learner bookmark must remain untouched');
    assert(await Notification.findById(peerNotif._id), 'Peer learner own notification must remain untouched');

    // Never destroyed instructor asset or peer asset
    const destroyedTargets = cloudinaryDestroyCalls.map((c) => c.target);
    assert(!destroyedTargets.includes('upskillr_thumbnails/course_a_keep'), 'Instructor thumbnail must NEVER be destroyed');
    assert(!destroyedTargets.includes('upskillr_profiles/instructor_keep'), 'Instructor avatar must NEVER be destroyed');

    console.log('✓ Scenarios 2–13, 15, Cloudinary Retry, Local Disk Cleanup & Shared Data Isolation passed');

    // ─── Scenario 14: Google & GitHub OAuth Users + Re-Auth Prevention ───
    const googleLearner = await Learner.create({
      fullName: `Google User ${suffix}`,
      email: `del_google_${suffix}@upskillr.test`,
      role: 'learner',
      authProvider: 'google',
      googleId: `g_id_${suffix}`,
      isVerified: true,
      avatar: 'https://lh3.googleusercontent.com/a/external-avatar-keep'
    });
    const githubLearner = await Learner.create({
      fullName: `GitHub User ${suffix}`,
      email: `del_github_${suffix}@upskillr.test`,
      role: 'learner',
      authProvider: 'github',
      githubId: `gh_id_${suffix}`,
      isVerified: true,
      avatar: 'https://avatars.githubusercontent.com/u/123456?v=4'
    });
    createdIds.learners.push(googleLearner._id, githubLearner._id);

    const oauthDestroyAttempted = [];
    const trackingOAuthDelete = async (target, type) => {
      oauthDestroyAttempted.push({ target, type });
      return mediaController.deleteCloudinaryAsset(target, type);
    };

    const gJwt = jwt.sign({ id: googleLearner._id, email: googleLearner.email, role: 'learner' }, JWT_SECRET, { expiresIn: '1h' });
    const gDel = await executePermanentDeletion(googleLearner._id, googleLearner.email, 'google', { deleteAssetFn: trackingOAuthDelete });
    const ghDel = await executePermanentDeletion(githubLearner._id, githubLearner.email, 'github', { deleteAssetFn: trackingOAuthDelete });
    createdIds.jobIds.push(gDel.jobId, ghDel.jobId);

    assert.strictEqual(oauthDestroyAttempted.length, 0, 'External Google/GitHub avatars must NOT be sent to Cloudinary destroy');
    await assertAllLearnerRecordsGone(googleLearner._id);
    await assertAllLearnerRecordsGone(githubLearner._id);

    const gPostAuth = await runProtectMiddleware(gJwt);
    assert.strictEqual(gPostAuth.nextCalled, false, 'Deleted Google OAuth JWT must fail');
    assert.strictEqual(gPostAuth.statusCode, 401);

    const reloginRes = createMockRes();
    await authController.manualLogin(
      { body: { email: googleLearner.email, password: 'any' }, headers: { 'x-test-suite': 'true' } },
      reloginRes
    );
    assert.strictEqual(reloginRes.statusCode, 400, 'Deleted account manualLogin must reject with invalid credentials');

    // Verify extractCloudinaryPublicId skips Google/GitHub & parses Cloudinary URLs properly
    assert.strictEqual(
      mediaController.extractCloudinaryPublicId('https://lh3.googleusercontent.com/a/avatar'),
      ''
    );
    assert.strictEqual(
      mediaController.extractCloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/c_fill,w_200/v170000/upskillr_profiles/user1.png?v=1'),
      'upskillr_profiles/user1'
    );
    console.log('✓ Scenario 14 (Google/GitHub OAuth Deletion & Auth Block + URL Extraction) passed');

    // ─── Test 16: ACID Transaction Rollback Safety Check ───
    const txLearner = await Learner.create({
      fullName: `Tx Rollback Learner ${suffix}`,
      email: `del_tx_${suffix}@upskillr.test`,
      password: '$2b$10$hashedpasswordplaceholderfortesting1234567890',
      role: 'learner',
      authProvider: 'local',
      isVerified: true
    });
    createdIds.learners.push(txLearner._id);
    await Bookmark.create({ learnerId: txLearner._id, courseId: courseA._id, resourceType: 'course', title: 'Keep On Rollback' });

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Bookmark.deleteMany({ learnerId: txLearner._id }, { session });
        await Learner.findByIdAndDelete(txLearner._id, { session });
        throw new Error('Simulated mid-transaction failure');
      });
    } catch (txErr) {
      assert(txErr.message.includes('Simulated mid-transaction failure'));
    } finally {
      await session.endSession();
    }
    assert(await Learner.findById(txLearner._id), 'Transaction rollback must restore Learner');
    assert.strictEqual(await Bookmark.countDocuments({ learnerId: txLearner._id }), 1, 'Transaction rollback must restore Bookmark');
    const cleanTx = await executePermanentDeletion(txLearner._id, txLearner.email, 'local');
    createdIds.jobIds.push(cleanTx.jobId);
    console.log('✓ Test 16 (Live MongoDB ACID Transaction Rollback Safety) passed');

    console.log('\n==============================================================');
    console.log('ALL 15 MANDATORY DELETION SCENARIOS + ACID & RACE CHECKS PASSED');
    console.log('==============================================================');
  } finally {
    // Cleanup temporary fixtures created for tests
    for (const f of createdIds.localTempFiles) {
      if (fs.existsSync(f)) {
        try { fs.unlinkSync(f); } catch (_) {}
      }
    }
    if (createdIds.extraQuestions.length > 0) {
      await CourseQuestion.deleteMany({ _id: { $in: createdIds.extraQuestions } }).catch(() => {});
    }
    if (createdIds.extraNotifications.length > 0) {
      await Notification.deleteMany({ _id: { $in: createdIds.extraNotifications } }).catch(() => {});
    }
    if (createdIds.learners.length > 0) {
      const lIds = createdIds.learners;
      await Promise.all([
        Enrolment.deleteMany({ learnerId: { $in: lIds } }),
        Bookmark.deleteMany({ learnerId: { $in: lIds } }),
        BookmarkFolder.deleteMany({ learnerId: { $in: lIds } }),
        PersonalNote.deleteMany({ learnerId: { $in: lIds } }),
        Certificate.deleteMany({ learnerId: { $in: lIds } }),
        CompletionRecord.deleteMany({ learner_id: { $in: lIds } }),
        AssessmentSubmission.deleteMany({ learnerId: { $in: lIds } }),
        AssessmentAttempt.deleteMany({ learnerId: { $in: lIds } }),
        OfficialAssessmentAttempt.deleteMany({ learnerId: { $in: lIds } }),
        PointTransaction.deleteMany({ $or: [{ learnerId: { $in: lIds } }, { userId: { $in: lIds } }] }),
        LearnerActivity.deleteMany({ learnerId: { $in: lIds } }),
        Notification.deleteMany({ recipientId: { $in: lIds } }),
        CourseQuestion.deleteMany({ userId: { $in: lIds } }),
        CourseReview.deleteMany({ learnerId: { $in: lIds } }),
        DeletionJob.deleteMany({ learnerId: { $in: lIds } }),
        Learner.deleteMany({ _id: { $in: lIds } })
      ]).catch(() => {});
    }
    if (createdIds.jobIds.length > 0) {
      await DeletionJob.deleteMany({ jobId: { $in: createdIds.jobIds } }).catch(() => {});
    }
    if (createdIds.courses.length > 0) {
      await Course.deleteMany({ _id: { $in: createdIds.courses } }).catch(() => {});
    }
    if (createdIds.instructors.length > 0) {
      await Instructor.deleteMany({ _id: { $in: createdIds.instructors } }).catch(() => {});
    }

    await mongoose.disconnect();
    console.log('[TEST] Cleaned up temporary fixtures and disconnected from MongoDB.');
  }
}

runSuite().catch((err) => {
  console.error('[TEST FAILURE]', err);
  process.exit(1);
});
