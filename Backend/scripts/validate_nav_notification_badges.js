const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Learner = require('../model/Learner');
const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');
const Announcement = require('../model/Announcement');
const CourseReview = require('../model/CourseReview');
const CourseQuestion = require('../model/CourseQuestion');
const Notification = require('../model/Notification');

const notificationController = require('../controller/notificationController');
const reviewController = require('../controller/reviewController');
const announcementController = require('../controller/announcementController');
const courseContentController = require('../controller/courseContentController');
const courseController = require('../controller/courseController');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(p) {
      this.body = p;
      return this;
    }
  };
}

async function runValidation() {
  console.log('====================================================');
  console.log('🧪 UpSkillR — Navigation Unread Notification Badges Validation');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;
  function assert(cond, label, extra = '') {
    total++;
    if (cond) {
      console.log(`✅ [PASS] ${label}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${label} ${extra ? '- ' + extra : ''}`);
    }
  }

  const mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI;
  await mongoose.connect(mongoUrl, { dbName: 'UpSkillr' });

  const instructorId = new mongoose.Types.ObjectId();
  const learner1Id = new mongoose.Types.ObjectId();
  const learner2Id = new mongoose.Types.ObjectId();
  const courseAId = new mongoose.Types.ObjectId();
  const courseBId = new mongoose.Types.ObjectId();
  const assessmentAId = new mongoose.Types.ObjectId();

  try {
    const [learner1, learner2] = await Promise.all([
      Learner.create({
        _id: learner1Id,
        fullName: 'Badge Test Learner 1',
        email: `badge_l1_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'learner'
      }),
      Learner.create({
        _id: learner2Id,
        fullName: 'Badge Test Learner 2',
        email: `badge_l2_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'learner'
      })
    ]);

    const courseA = await Course.create({
      _id: courseAId,
      title: 'Course A Validation',
      category: 'Web Development',
      description: 'Test Course A',
      status: 'published',
      state: 'published',
      isDeleted: false,
      instructorId,
      courseAssessments: [
        {
          _id: assessmentAId,
          title: 'Final Assessment A',
          state: 'draft',
          questions: [{ questionText: 'Q1?', type: 'mcq', options: ['A', 'B'], correctAnswerIndex: 0, marks: 10 }]
        }
      ],
      modules: []
    });

    const courseB = await Course.create({
      _id: courseBId,
      title: 'Course B Isolation',
      category: 'Web Development',
      description: 'Test Course B',
      status: 'published',
      state: 'published',
      isDeleted: false,
      instructorId,
      modules: []
    });

    await Enrolment.create([
      {
        learnerId: learner1Id,
        learnerEmail: learner1.email,
        courseId: courseAId,
        courseTitle: courseA.title,
        status: 'completed',
        progressPercentage: 100
      },
      {
        learnerId: learner2Id,
        learnerEmail: learner2.email,
        courseId: courseAId,
        courseTitle: courseA.title,
        status: 'completed',
        progressPercentage: 100
      },
      {
        learnerId: learner1Id,
        learnerEmail: learner1.email,
        courseId: courseBId,
        courseTitle: courseB.title,
        status: 'active',
        progressPercentage: 20
      }
    ]);

    // 1. Dispatch events across all 4 sections on Course A + 1 event on Course B
    // 1a. Learner 2 posts a Review on Course A -> notifies Learner 1 in 'reviews'
    const reviewRes = createMockRes();
    await reviewController.submitCourseReview(
      {
        user: { id: String(learner2Id) },
        params: { courseId: String(courseAId) },
        body: { rating: 5, feedback: 'Great Course A!' }
      },
      reviewRes
    );
    assert(reviewRes.statusCode === 201, 'Learner 2 submits review on Course A');

    // 1b. Instructor publishes Announcement on Course A -> notifies Learner 1 & Learner 2 in 'notices'
    const annRes = createMockRes();
    await announcementController.createAnnouncement(
      {
        user: { id: String(instructorId), role: 'instructor' },
        params: { courseId: String(courseAId) },
        body: { title: 'Welcome Notice', message: 'Check syllabus', targetAudience: 'all', status: 'published' }
      },
      annRes
    );
    assert(annRes.statusCode === 201, 'Instructor publishes announcement on Course A');

    // 1c. Instructor toggles Assessment on Course A to published -> notifies Learner 1 & Learner 2 in 'assessments'
    const assRes = createMockRes();
    await courseContentController.toggleAssessmentState(
      {
        user: { id: String(instructorId), _id: instructorId, role: 'instructor' },
        params: { courseId: String(courseAId), assessmentId: String(assessmentAId) }
      },
      assRes
    );
    assert(assRes.statusCode === 200 && assRes.body.state === 'published', 'Instructor publishes assessment on Course A');

    // 1d. Learner 1 asks Q&A question and Instructor replies -> notifies Learner 1 in 'qa'
    const askRes = createMockRes();
    await courseController.askCourseQuestion(
      {
        user: { id: String(learner1Id), fullName: learner1.fullName },
        params: { id: String(courseAId) },
        body: { question: 'How does grading work?' }
      },
      askRes
    );
    const questionId = askRes.body?.question?._id;
    assert(Boolean(questionId), 'Learner 1 asks question on Course A');

    const replyRes = createMockRes();
    await courseController.replyCourseQuestion(
      {
        user: { id: String(instructorId), fullName: 'Instructor' },
        params: { id: String(courseAId), questionId: String(questionId) },
        body: { reply: 'Passing threshold is 70%.' }
      },
      replyRes
    );
    assert(replyRes.statusCode === 200, 'Instructor replies to Learner 1 question on Course A');

    // 1e. Also create an unread Notice on Course B for Learner 1 (to verify course scoping!)
    await notificationController.notifyEnrolledLearnersForCourseSection({
      courseId: courseBId,
      courseTitle: courseB.title,
      section: 'notices',
      type: 'NEW_ANNOUNCEMENT',
      referenceId: 'notice-course-b-1',
      title: 'Course B Notice',
      message: 'Course B update'
    });

    // 2. Verify initial unread counts for Learner 1 on Course A
    const countsRes1 = createMockRes();
    await notificationController.getCourseSectionUnreadCounts(
      { user: { id: String(learner1Id) }, params: { courseId: String(courseAId) } },
      countsRes1
    );
    const c1 = countsRes1.body.unreadCounts;
    assert(
      c1.reviews === 1 && c1.qa === 1 && c1.assessments === 1 && c1.notices === 1,
      'Learner 1 initially has 1 unread in each section (reviews=1, qa=1, assessments=1, notices=1)',
      JSON.stringify(c1)
    );

    // 3. Open Reviews tab -> marks Reviews read ONLY for Learner 1 on Course A
    const markReviewsRes = createMockRes();
    await notificationController.markCourseSectionNotificationsAsRead(
      {
        user: { id: String(learner1Id) },
        params: { courseId: String(courseAId) },
        body: { section: 'reviews', viewedAt: new Date().toISOString() }
      },
      markReviewsRes
    );
    assert(markReviewsRes.body.markedCount === 1, 'Marking Reviews read marks 1 notification');
    assert(
      markReviewsRes.body.unreadCounts.reviews === 0 &&
        markReviewsRes.body.unreadCounts.qa === 1 &&
        markReviewsRes.body.unreadCounts.assessments === 1 &&
        markReviewsRes.body.unreadCounts.notices === 1,
      'Reviews cleared to 0 while QA/Assessments/Notices remain unread'
    );

    // 4. Verify Learner 2 was NOT affected when Learner 1 cleared Notices/Assessments
    const markNoticesRes = createMockRes();
    await notificationController.markCourseSectionNotificationsAsRead(
      {
        user: { id: String(learner1Id) },
        params: { courseId: String(courseAId) },
        body: { section: 'notices', viewedAt: new Date().toISOString() }
      },
      markNoticesRes
    );
    assert(markNoticesRes.body.unreadCounts.notices === 0, 'Learner 1 Course A Notices cleared to 0');

    const learner2CountsRes = createMockRes();
    await notificationController.getCourseSectionUnreadCounts(
      { user: { id: String(learner2Id) }, params: { courseId: String(courseAId) } },
      learner2CountsRes
    );
    assert(
      learner2CountsRes.body.unreadCounts.notices === 1 &&
        learner2CountsRes.body.unreadCounts.assessments === 1,
      'Learner 2 unread notices & assessments remain intact (scoping verified)',
      JSON.stringify(learner2CountsRes.body.unreadCounts)
    );

    // 5. Verify Course B Notices for Learner 1 remain intact when Course A Notices cleared
    const courseBCountsRes = createMockRes();
    await notificationController.getCourseSectionUnreadCounts(
      { user: { id: String(learner1Id) }, params: { courseId: String(courseBId) } },
      courseBCountsRes
    );
    assert(courseBCountsRes.body.unreadCounts.notices === 1, 'Course B Notices unread count untouched when Course A cleared');

    // 6. Verify future notification protection (`createdAt > viewedAt` stays unread)
    const pastViewedAt = new Date(Date.now() - 5000).toISOString();
    // Create a brand new announcement AFTER pastViewedAt (createdAt === now)
    const futureAnnRes = createMockRes();
    await announcementController.createAnnouncement(
      {
        user: { id: String(instructorId), role: 'instructor' },
        params: { courseId: String(courseAId) },
        body: { title: 'Future Notice', message: 'Brand new announcement', targetAudience: 'all', status: 'published' }
      },
      futureAnnRes
    );
    // Learner 1 clicks with older viewedAt -> should NOT mark the newer notification as read
    const futureCheckRes = createMockRes();
    await notificationController.markCourseSectionNotificationsAsRead(
      {
        user: { id: String(learner1Id) },
        params: { courseId: String(courseAId) },
        body: { section: 'notices', viewedAt: pastViewedAt }
      },
      futureCheckRes
    );
    assert(
      futureCheckRes.body.unreadCounts.notices === 1,
      'Future notification created after viewedAt stays unread (count=1)',
      JSON.stringify(futureCheckRes.body.unreadCounts)
    );

    // Now open Notices cleanly with current timestamp -> clears to 0
    const clearNowRes = createMockRes();
    await notificationController.markCourseSectionNotificationsAsRead(
      {
        user: { id: String(learner1Id) },
        params: { courseId: String(courseAId) },
        body: { section: 'notices', viewedAt: new Date().toISOString() }
      },
      clearNowRes
    );
    assert(clearNowRes.body.unreadCounts.notices === 0, 'Opening Notices with current timestamp clears the new notice to 0');

    // 7. Clear QA & Assessments and verify persisted across fresh GET (page refresh simulation)
    await notificationController.markCourseSectionNotificationsAsRead(
      { user: { id: String(learner1Id) }, params: { courseId: String(courseAId) }, body: { section: 'qa' } },
      createMockRes()
    );
    await notificationController.markCourseSectionNotificationsAsRead(
      { user: { id: String(learner1Id) }, params: { courseId: String(courseAId) }, body: { section: 'assessments' } },
      createMockRes()
    );

    const refreshRes = createMockRes();
    await notificationController.getCourseSectionUnreadCounts(
      { user: { id: String(learner1Id) }, params: { courseId: String(courseAId) } },
      refreshRes
    );
    assert(
      refreshRes.body.unreadCounts.total === 0,
      'Fresh GET after clearing all sections returns total=0 (persisted across refresh)',
      JSON.stringify(refreshRes.body.unreadCounts)
    );
  } finally {
    await Promise.all([
      Notification.deleteMany({ courseId: { $in: [courseAId, courseBId] } }),
      CourseQuestion.deleteMany({ courseId: { $in: [courseAId, courseBId] } }),
      CourseReview.deleteMany({ courseId: { $in: [courseAId, courseBId] } }),
      Announcement.deleteMany({ courseId: { $in: [courseAId, courseBId] } }),
      Enrolment.deleteMany({ learnerId: { $in: [learner1Id, learner2Id] } }),
      Course.deleteMany({ _id: { $in: [courseAId, courseBId] } }),
      Learner.deleteMany({ _id: { $in: [learner1Id, learner2Id] } })
    ]);
    await mongoose.disconnect();
  }

  console.log(`\nSummary: ${passed}/${total} tests passed.`);
  process.exit(passed === total ? 0 : 1);
}

runValidation().catch((err) => {
  console.error('Validation error:', err);
  process.exit(1);
});
