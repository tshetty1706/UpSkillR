const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Learner = require('../model/Learner');
const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');
const CourseReview = require('../model/CourseReview');
const reviewController = require('../controller/reviewController');

function createMockRes() {
  const res = {
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
  return res;
}

async function runReviewValidation() {
  console.log('====================================================');
  console.log('🧪 UpSkillR — Course Review & Share Feedback Validation');
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

  const testLearnerId = new mongoose.Types.ObjectId();
  const testCourseId = new mongoose.Types.ObjectId();

  try {
    const learner = await Learner.create({
      _id: testLearnerId,
      fullName: 'Review Test Learner',
      email: `review_test_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'learner'
    });

    const course = await Course.create({
      _id: testCourseId,
      title: 'Review Flow Validation Course',
      category: 'Web Development',
      description: 'Test description',
      status: 'published',
      state: 'published',
      isDeleted: false,
      instructorId: new mongoose.Types.ObjectId(),
      modules: []
    });

    const enrolment = await Enrolment.create({
      learnerId: testLearnerId,
      learnerEmail: learner.email,
      courseId: testCourseId,
      courseTitle: course.title,
      status: 'active',
      progressPercentage: 40
    });

    // 1. Incomplete course cannot submit review (403)
    const reqIncomplete = {
      user: { id: String(testLearnerId) },
      params: {},
      body: {
        courseId: String(testCourseId),
        rating: 5,
        feedback: 'Trying to submit before completing course.',
        tags: ['Well Structured']
      }
    };
    const resIncomplete = createMockRes();
    await reviewController.submitCourseReview(reqIncomplete, resIncomplete);
    assert(resIncomplete.statusCode === 403 && !resIncomplete.body.success, 'Rejects review when course is not completed (403)');

    // Mark course as completed
    enrolment.status = 'completed';
    enrolment.progressPercentage = 100;
    await enrolment.save();

    // 2. Short feedback rejected (400)
    const reqShort = {
      user: { id: String(testLearnerId) },
      params: {},
      body: {
        courseId: String(testCourseId),
        rating: 5,
        feedback: 'ok',
        tags: ['Clear Explanations']
      }
    };
    const resShort = createMockRes();
    await reviewController.submitCourseReview(reqShort, resShort);
    assert(resShort.statusCode === 400 && !resShort.body.success, 'Rejects feedback shorter than 3 characters (400)');

    // 3. First valid submission creates review (201)
    const reqCreate = {
      user: { id: String(testLearnerId) },
      params: {},
      body: {
        courseId: String(testCourseId),
        rating: 5,
        feedback: 'Fantastic course with practical examples!',
        tags: ['Clear Explanations', 'Great Practical Exercises']
      }
    };
    const resCreate = createMockRes();
    await reviewController.submitCourseReview(reqCreate, resCreate);
    assert(resCreate.statusCode === 201 && resCreate.body.success, 'Creates initial CourseReview record cleanly (201)');
    assert(resCreate.body.review.tags.length === 2, 'Selected strength tags persisted');

    const updatedCourse1 = await Course.findById(testCourseId);
    assert(updatedCourse1.rating === 5 && updatedCourse1.reviewCount === 1, 'Course rating (5) and reviewCount (1) updated');

    // 4. GET my-review pre-populates saved rating, tags, and feedback
    const reqGetMine = {
      user: { id: String(testLearnerId) },
      params: { courseId: String(testCourseId) }
    };
    const resGetMine = createMockRes();
    await reviewController.getMyCourseReview(reqGetMine, resGetMine);
    assert(resGetMine.statusCode === 200 && resGetMine.body.hasReviewed === true, 'GET my-review reports hasReviewed: true');
    assert(resGetMine.body.review.rating === 5 && resGetMine.body.review.feedback === 'Fantastic course with practical examples!', 'GET my-review returns exact previously submitted rating and feedback');
    assert(resGetMine.body.review.tags.includes('Clear Explanations'), 'GET my-review returns previously selected strength chips');

    // 5. Re-submitting through shared endpoint updates without creating duplicates (200)
    const reqUpdate = {
      user: { id: String(testLearnerId) },
      params: {},
      body: {
        courseId: String(testCourseId),
        rating: 4,
        feedback: 'Updated review: very clear and helpful!',
        tags: ['Well Structured']
      }
    };
    const resUpdate = createMockRes();
    await reviewController.submitCourseReview(reqUpdate, resUpdate);
    assert(resUpdate.statusCode === 200 && resUpdate.body.isUpdate === true, 'Second submission updates existing review instead of creating duplicate');

    const totalDocs = await CourseReview.countDocuments({ learnerId: testLearnerId, courseId: testCourseId });
    assert(totalDocs === 1, 'Strictly enforces 1 review document per learner per course');

    const updatedCourse2 = await Course.findById(testCourseId);
    assert(updatedCourse2.rating === 4 && updatedCourse2.reviewCount === 1, 'Course rating (4) recalculated accurately without inflating reviewCount');

    // 6. Clearing tags (tags: []) updates cleanly
    const reqClearTags = {
      user: { id: String(testLearnerId) },
      params: {},
      body: {
        courseId: String(testCourseId),
        rating: 4,
        feedback: 'Updated review with tags cleared.',
        tags: []
      }
    };
    const resClearTags = createMockRes();
    await reviewController.submitCourseReview(reqClearTags, resClearTags);
    assert(resClearTags.statusCode === 200 && resClearTags.body.review.tags.length === 0, 'Clearing tags updates tags array cleanly');

  } finally {
    await CourseReview.deleteMany({ learnerId: testLearnerId });
    await Enrolment.deleteMany({ learnerId: testLearnerId });
    await Course.deleteOne({ _id: testCourseId });
    await Learner.deleteOne({ _id: testLearnerId });
    await mongoose.disconnect();
  }

  console.log(`\nSummary: ${passed}/${total} tests passed.`);
  process.exit(passed === total ? 0 : 1);
}

runReviewValidation().catch((err) => {
  console.error('Review validation error:', err);
  process.exit(1);
});
