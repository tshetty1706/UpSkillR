const path = require('path');
const { pathToFileURL } = require('url');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const { Learner, Instructor } = require('../model/User');
const Course = require('../model/Course');
const CourseOverview = require('../model/CourseOverview');
const Enrolment = require('../model/Enrolment');
const CourseReview = require('../model/CourseReview');
const Notification = require('../model/Notification');
const reviewController = require('../controller/reviewController');
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

async function run() {
  console.log('==================================================================');
  console.log('🧪 UpSkillR — Reviewer Identity (Registered Name, Not Username)');
  console.log('==================================================================\n');

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
  const instructorId = new mongoose.Types.ObjectId();
  const learnerId = new mongoose.Types.ObjectId();
  const legacyLearnerId = new mongoose.Types.ObjectId();
  const deletedLearnerId = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();
  const lessonId = new mongoose.Types.ObjectId();
  const moduleId = new mongoose.Types.ObjectId();

  const testUsername = `aarti_handle_${suffix}`;
  const testEmail = `aarti_secret_${suffix}@example.com`;
  const testFullName = 'Aarti Singh';
  const legacyUsername = `legacy_nick_${suffix}`;
  const legacyEmail = `legacy_secret_${suffix}@example.com`;
  const legacyFullName = 'Rohan Mehta';

  try {
    await Instructor.create({
      _id: instructorId,
      fullName: 'Dr. Kavita Rao',
      email: `inst_rev_id_${suffix}@example.com`,
      password: 'Password123!'
    });

    await Learner.create([
      {
        _id: learnerId,
        fullName: testFullName,
        username: testUsername,
        email: testEmail,
        password: 'Password123!',
        avatar: 'https://example.com/aarti.png'
      },
      {
        _id: legacyLearnerId,
        fullName: legacyFullName,
        username: legacyUsername,
        email: legacyEmail,
        password: 'Password123!'
      }
    ]);

    const itemId = new mongoose.Types.ObjectId();

    await Course.create({
      _id: courseId,
      title: `Reviewer Identity Test Course ${suffix}`,
      description: 'Test course validating registered reviewer identity display',
      category: 'Web Development',
      skillLevel: 'Intermediate',
      language: 'English',
      instructorId,
      instructorName: 'Dr. Kavita Rao',
      status: 'published',
      state: 'published',
      isDeleted: false,
      modules: [
        {
          _id: moduleId,
          title: 'Module 1',
          state: 'published',
          order: 1,
          lessons: [
            {
              _id: lessonId,
              title: 'Lesson 1',
              state: 'published',
              order: 1,
              items: [
                {
                  _id: itemId,
                  title: 'Video 1',
                  type: 'article',
                  state: 'published'
                }
              ]
            }
          ]
        }
      ]
    });

    await CourseOverview.create({
      courseId,
      fullDescription: 'Detailed description for test course.'
    });

    // Enrol main learner (100% completed, initially stale Enrolment.learnerName set to handle to verify DB lookup wins)
    await Enrolment.create({
      learnerId,
      learnerName: testUsername,
      learnerEmail: testEmail,
      courseId,
      courseTitle: `Reviewer Identity Test Course ${suffix}`,
      status: 'completed',
      progressPercentage: 100,
      completedAt: new Date(),
      completedLessons: [String(itemId)]
    });

    // Legacy rated enrolment without CourseReview, plus an enrolment referencing a deleted learner
    await Enrolment.create([
      {
        learnerId: legacyLearnerId,
        learnerName: legacyUsername,
        learnerEmail: legacyEmail,
        courseId,
        courseTitle: `Reviewer Identity Test Course ${suffix}`,
        status: 'completed',
        progressPercentage: 100,
        completedAt: new Date(),
        completedLessons: [String(itemId)],
        rating: 4,
        feedback: 'Legacy enrolment feedback still needs real registered name!',
        feedbackTags: ['Well Structured'],
        ratedAt: new Date(Date.now() - 2000)
      },
      {
        learnerId: deletedLearnerId,
        learnerName: `deleted_user_${suffix}`,
        learnerEmail: `deleted_secret_${suffix}@example.com`,
        courseId,
        courseTitle: `Reviewer Identity Test Course ${suffix}`,
        status: 'completed',
        progressPercentage: 100,
        completedAt: new Date(),
        completedLessons: [String(itemId)],
        rating: 5,
        feedback: 'Great course from a deleted account.',
        feedbackTags: ['Clear Explanations'],
        ratedAt: new Date(Date.now() - 5000)
      }
    ]);

    // 1. Submit review attempting to spoof learnerName/username in body
    const resSubmit = createMockRes();
    await reviewController.submitCourseReview(
      {
        user: { id: String(learnerId) },
        params: { courseId: String(courseId) },
        body: {
          rating: 5,
          feedback: 'Exceptional clarity across all modules!',
          tags: ['Clear Explanations'],
          learnerName: 'Spoofed Name From Client',
          username: 'spoofed_handle'
        }
      },
      resSubmit
    );

    const submitJson = JSON.stringify(resSubmit.body);
    assert(
      resSubmit.statusCode === 201 &&
        resSubmit.body.review?.learnerName === testFullName &&
        !submitJson.includes(testUsername) &&
        !submitJson.includes(testEmail) &&
        !submitJson.includes(String(learnerId)) &&
        !submitJson.includes('Spoofed Name'),
      '1. POST submitCourseReview ignores spoofed client name, resolves registered fullName, hides username/email/userId'
    );

    // 2. Learner-facing reviews endpoint (GET /api/courses/:courseId/reviews)
    const resReviews = createMockRes();
    await reviewController.getCourseReviews(
      { params: { courseId: String(courseId) }, user: { id: String(learnerId) } },
      resReviews
    );
    const reviewsList = resReviews.body?.reviews || [];
    const reviewsJson = JSON.stringify(reviewsList);
    const aartiReview = reviewsList.find((r) => r.feedback.includes('Exceptional clarity'));
    const rohanReview = reviewsList.find((r) => r.feedback.includes('Legacy enrolment feedback'));
    const deletedReview = reviewsList.find((r) => r.feedback.includes('deleted account'));

    assert(
      resReviews.statusCode === 200 &&
        reviewsList.length === 3 &&
        aartiReview?.learnerName === testFullName &&
        rohanReview?.learnerName === legacyFullName &&
        deletedReview?.learnerName === 'Learner',
      '2. GET /courses/:courseId/reviews shows registered fullName for existing & legacy users and "Learner" for deleted account',
      JSON.stringify(reviewsList.map((r) => ({ learnerName: r.learnerName, keys: Object.keys(r) })))
    );

    assert(
      !reviewsJson.includes(testUsername) &&
        !reviewsJson.includes(legacyUsername) &&
        !reviewsJson.includes(`deleted_user_${suffix}`) &&
        !reviewsJson.includes(testEmail) &&
        !reviewsJson.includes(legacyEmail) &&
        !reviewsJson.includes(`deleted_secret_${suffix}`) &&
        !reviewsJson.includes(String(learnerId)) &&
        !reviewsJson.includes(String(legacyLearnerId)) &&
        !reviewsJson.includes(String(deletedLearnerId)) &&
        reviewsList.every((r) => !('learnerId' in r) && !('username' in r) && !('email' in r) && !('learnerEmail' in r)),
      '3. GET /courses/:courseId/reviews never exposes username, email, or internal learner user IDs'
    );

    // 3. Instructor-facing overview endpoints (getPublicCourseOverview & getCourseOverview)
    const resPublicOverview = createMockRes();
    await courseController.getPublicCourseOverview(
      { params: { id: String(courseId) }, headers: {}, socket: {} },
      resPublicOverview
    );
    const pubReviews = resPublicOverview.body?.reviews || [];
    const pubJson = JSON.stringify(pubReviews);
    assert(
      resPublicOverview.statusCode === 200 &&
        pubReviews.length === 3 &&
        pubReviews.find((r) => r.feedback.includes('Exceptional clarity'))?.learnerName === testFullName &&
        pubReviews.find((r) => r.feedback.includes('Legacy enrolment feedback'))?.learnerName === legacyFullName &&
        pubReviews.find((r) => r.feedback.includes('deleted account'))?.learnerName === 'Learner' &&
        !pubJson.includes(testUsername) &&
        !pubJson.includes(legacyUsername) &&
        !pubJson.includes(testEmail) &&
        !pubJson.includes(String(learnerId)),
      '4. Instructor Preview / Public Overview returns registered learner names with zero username/email/userId leakage'
    );

    const resInstructorOverview = createMockRes();
    await courseController.getCourseOverview(
      { params: { id: String(courseId) }, user: { id: String(instructorId), role: 'instructor' } },
      resInstructorOverview
    );
    const instReviews = resInstructorOverview.body?.reviews || [];
    const instJson = JSON.stringify(instReviews);
    assert(
      resInstructorOverview.statusCode === 200 &&
        instReviews.length === 3 &&
        instReviews.find((r) => r.feedback.includes('Exceptional clarity'))?.learnerName === testFullName &&
        !instJson.includes(testUsername) &&
        !instJson.includes(String(learnerId)),
      '5. Instructor Studio overview endpoint returns sanitized reviews with registered learnerName'
    );

    // 4. Updating Learner's registered fullName dynamically reflects on reviews & cache invalidates on review update
    await Learner.findByIdAndUpdate(learnerId, { fullName: 'Aarti Verma' });
    const resUpdate = createMockRes();
    await reviewController.updateCourseReview(
      {
        user: { id: String(learnerId) },
        params: { courseId: String(courseId) },
        body: { feedback: 'Updated review checking dynamic fullName sync.' }
      },
      resUpdate
    );
    const resAfterRename = createMockRes();
    await courseController.getPublicCourseOverview(
      { params: { id: String(courseId) }, headers: {}, socket: {} },
      resAfterRename
    );
    const renamedRev = (resAfterRename.body?.reviews || []).find((r) => r.feedback.includes('Updated review'));
    assert(
      resUpdate.statusCode === 200 &&
        resUpdate.body.review?.learnerName === 'Aarti Verma' &&
        renamedRev?.learnerName === 'Aarti Verma' &&
        !JSON.stringify(resAfterRename.body?.reviews).includes(testUsername),
      '6. Dynamic DB name update reflects immediately across updateCourseReview and invalidated overview cache'
    );

    // 5. Frontend reviewerDisplay helper verification
    const helperModuleUrl = pathToFileURL(path.join(__dirname, '../../Frontend/src/utils/reviewerDisplay.js')).href;
    const { getReviewerDisplayName, getReviewerAvatar } = await import(helperModuleUrl);
    assert(
      getReviewerDisplayName({ learnerName: 'Aarti Singh', learnerAvatar: 'img.png' }) === 'Aarti Singh' &&
        getReviewerDisplayName({ learnerId: { fullName: 'Neha Kapoor', username: 'neha_dev' } }) === 'Neha Kapoor' &&
        getReviewerDisplayName({ learnerName: '@aarti_dev', username: 'aarti_dev' }) === 'Learner' &&
        getReviewerDisplayName({ learnerName: 'aarti@example.com' }) === 'Learner' &&
        getReviewerDisplayName({ learnerName: 'aarti_dev', username: 'aarti_dev' }) === 'Learner' &&
        getReviewerDisplayName(null) === 'Learner' &&
        getReviewerAvatar({ learnerId: { avatar: 'https://cdn/av.png' } }) === 'https://cdn/av.png',
      '7. Frontend getReviewerDisplayName & getReviewerAvatar resolve registered names and block @handles/emails/usernames'
    );
  } finally {
    await Promise.all([
      Notification.deleteMany({ $or: [{ courseId }, { link: { $regex: String(courseId) } }] }),
      CourseReview.deleteMany({ courseId }),
      Enrolment.deleteMany({ courseId }),
      CourseOverview.deleteMany({ courseId }),
      Course.deleteOne({ _id: courseId }),
      Learner.deleteMany({ _id: { $in: [learnerId, legacyLearnerId] } }),
      Instructor.deleteOne({ _id: instructorId })
    ]);
    await mongoose.disconnect();
  }

  console.log(`\nSummary: ${passed}/${total} checks passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal validation error:', err);
  process.exit(1);
});
