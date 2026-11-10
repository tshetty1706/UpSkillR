const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Learner = require('../model/Learner');
const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');
const CourseReview = require('../model/CourseReview');
const reviewController = require('../controller/reviewController');

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
  console.log('🧪 UpSkillR — Course Review 100% Completion Restriction Validation');
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
  const completedLearnerId = new mongoose.Types.ObjectId();
  const partialLearnerId = new mongoose.Types.ObjectId();
  const unenrolledLearnerId = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();

  // Create a 100-item-like multi-module course? Even simpler: 4 items -> 0/4 (0%), 2/4 (50%), plus 100-item lesson OR 100 items so we explicitly test 0%, 50%, 99%, and 100%!
  // Wait: making 100 small items across 2 modules lets us test EXACTLY 0% (0/100), 50% (50/100), 99% (99/100), and 100% (100/100)!
  const m1Id = new mongoose.Types.ObjectId();
  const m2Id = new mongoose.Types.ObjectId();
  const l1Id = new mongoose.Types.ObjectId();
  const l2Id = new mongoose.Types.ObjectId();

  const itemIds = Array.from({ length: 100 }, () => new mongoose.Types.ObjectId());
  const m1Items = itemIds.slice(0, 50).map((id, i) => ({
    _id: id,
    title: `Lesson Item ${i + 1}`,
    type: 'article',
    state: 'published'
  }));
  const m2Items = itemIds.slice(50, 100).map((id, i) => ({
    _id: id,
    title: `Lesson Item ${i + 51}`,
    type: 'article',
    state: 'published'
  }));

  try {
    await Learner.insertMany([
      {
        _id: completedLearnerId,
        fullName: 'Completed Reviewer',
        email: `rev_comp_${suffix}@example.com`,
        password: 'Password123!',
        role: 'learner'
      },
      {
        _id: partialLearnerId,
        fullName: 'Partial Learner',
        email: `rev_part_${suffix}@example.com`,
        password: 'Password123!',
        role: 'learner'
      },
      {
        _id: unenrolledLearnerId,
        fullName: 'Unenrolled User',
        email: `rev_unenr_${suffix}@example.com`,
        password: 'Password123!',
        role: 'learner'
      }
    ]);

    const course = await Course.create({
      _id: courseId,
      title: `Review Gate Course ${suffix}`,
      category: 'Web Development',
      description: 'Test course for 100% review eligibility',
      status: 'published',
      state: 'published',
      isDeleted: false,
      instructorId: new mongoose.Types.ObjectId(),
      modules: [
        {
          _id: m1Id,
          title: 'Module 1',
          state: 'published',
          lessons: [{ _id: l1Id, title: 'Lesson 1', state: 'published', items: m1Items }]
        },
        {
          _id: m2Id,
          title: 'Module 2',
          state: 'published',
          lessons: [{ _id: l2Id, title: 'Lesson 2', state: 'published', items: m2Items }]
        }
      ]
    });

    await Enrolment.insertMany([
      {
        learnerId: partialLearnerId,
        learnerEmail: `rev_part_${suffix}@example.com`,
        courseId,
        courseTitle: course.title,
        completedLessons: [],
        status: 'active',
        progressPercentage: 0
      },
      {
        learnerId: completedLearnerId,
        learnerEmail: `rev_comp_${suffix}@example.com`,
        courseId,
        courseTitle: course.title,
        completedLessons: itemIds.map(String),
        status: 'completed',
        progressPercentage: 100
      }
    ]);

    // 1. Unenrolled learner cannot submit rating (403)
    const rUnenr = createMockRes();
    await reviewController.submitCourseReview(
      {
        user: { id: String(unenrolledLearnerId) },
        params: { courseId: String(courseId) },
        body: { rating: 5, feedback: 'Trying without enrolment', isCompleted: true, progress: 100 }
      },
      rUnenr
    );
    assert(rUnenr.statusCode === 403 && !rUnenr.body.success, '5. Unenrolled learner rejected with 403');

    // 2. Learner at 0% cannot rate even if passing spoofed isCompleted/progress flags (403)
    const rZero = createMockRes();
    await reviewController.submitCourseReview(
      {
        user: { id: String(partialLearnerId) },
        params: { courseId: String(courseId) },
        body: {
          rating: 5,
          feedback: 'Trying at 0 percent',
          isCompleted: true,
          progress: 100,
          userId: String(completedLearnerId)
        }
      },
      rZero
    );
    assert(rZero.statusCode === 403 && rZero.body.progressPercentage === 0, '1 & 7. Learner at 0% rejected with 403 (ignores spoofed body flags)');

    // 3. Learner at 50% cannot rate (403)
    await Enrolment.updateOne(
      { learnerId: partialLearnerId, courseId },
      { $set: { completedLessons: itemIds.slice(0, 50).map(String), progressPercentage: 50, status: 'in_progress' } }
    );
    const rFifty = createMockRes();
    await reviewController.submitCourseReview(
      {
        user: { id: String(partialLearnerId) },
        params: {},
        body: { courseId: String(courseId), rating: 4, feedback: 'Trying at 50 percent' }
      },
      rFifty
    );
    assert(rFifty.statusCode === 403 && rFifty.body.progressPercentage === 50, '2. Learner at 50% rejected with 403');

    // 4. Learner at 99% cannot rate — EVEN if DB enrolment had stale status='completed' / progressPercentage=100!
    await Enrolment.updateOne(
      { learnerId: partialLearnerId, courseId },
      { $set: { completedLessons: itemIds.slice(0, 99).map(String), progressPercentage: 100, status: 'completed' } }
    );
    const rNinetyNine = createMockRes();
    await reviewController.submitCourseReview(
      {
        user: { id: String(partialLearnerId) },
        params: { courseId: String(courseId) },
        body: { rating: 5, feedback: 'Trying at 99 percent with stale flag' }
      },
      rNinetyNine
    );
    assert(
      rNinetyNine.statusCode === 403 && rNinetyNine.body.progressPercentage === 99,
      '3 & 7. Learner at 99% rejected with 403 using canonical curriculum progress calculation'
    );

    // Check GET /my-review reports canReview: false at 99%
    const rMy99 = createMockRes();
    await reviewController.getMyCourseReview(
      { user: { id: String(partialLearnerId) }, params: { courseId: String(courseId) } },
      rMy99
    );
    assert(
      rMy99.statusCode === 200 && rMy99.body.canReview === false && rMy99.body.progressPercentage === 99,
      'GET my-review reports canReview: false when incomplete (99%)'
    );

    // 5. Completed learner (100%) CAN rate & review (via POST /rate or POST /review)
    const rCompCreate = createMockRes();
    await reviewController.submitCourseReview(
      {
        user: { id: String(completedLearnerId) },
        params: {},
        body: {
          courseId: String(courseId),
          rating: 5,
          feedback: 'Completed all lessons and loved the depth!',
          tags: ['Well Structured']
        }
      },
      rCompCreate
    );
    assert(rCompCreate.statusCode === 201 && rCompCreate.body.success, '4 & 8. 100% completed learner submits review cleanly (201)');
    const createdReviewId = rCompCreate.body.review._id;

    // 6. Incomplete learner CAN STILL READ existing course reviews (GET /reviews)
    const rReadReviews = createMockRes();
    await reviewController.getCourseReviews(
      { params: { courseId: String(courseId) }, user: { id: String(partialLearnerId) } },
      rReadReviews
    );
    assert(
      rReadReviews.statusCode === 200 && rReadReviews.body.count === 1 && rReadReviews.body.reviews[0].rating === 5,
      '6. Incomplete learner can read existing course reviews cleanly'
    );

    // 7. Re-submitting via Share Feedback / Rate Course updates without duplicates
    const rCompUpdateSubmit = createMockRes();
    await reviewController.submitCourseReview(
      {
        user: { id: String(completedLearnerId) },
        params: { courseId: String(courseId) },
        body: {
          rating: 4,
          feedback: 'Updated through shared endpoint cleanly.',
          tags: ['Clear Explanations']
        }
      },
      rCompUpdateSubmit
    );
    const revDocsCount = await CourseReview.countDocuments({ learnerId: completedLearnerId, courseId });
    assert(
      rCompUpdateSubmit.statusCode === 200 && rCompUpdateSubmit.body.isUpdate === true && revDocsCount === 1,
      '8 & 9. Re-submission updates existing review cleanly without duplicates'
    );

    // 8. PATCH updateCourseReview ALSO blocks if instructor adds a lesson dropping completion below 100%!
    const newUncompletedItemId = new mongoose.Types.ObjectId();
    await Course.updateOne(
      { _id: courseId, 'modules._id': m2Id },
      { $push: { 'modules.$.lessons.0.items': { _id: newUncompletedItemId, title: 'New Bonus Lesson', type: 'article', state: 'published' } } }
    );
    const rPatchDropped = createMockRes();
    await reviewController.updateCourseReview(
      {
        user: { id: String(completedLearnerId) },
        params: { reviewId: String(createdReviewId) },
        body: { rating: 3, feedback: 'Trying PATCH edit after completion dropped below 100%' }
      },
      rPatchDropped
    );
    assert(
      rPatchDropped.statusCode === 403 && rPatchDropped.body.code === 'COURSE_NOT_COMPLETED',
      '7b. PATCH /me/reviews/:reviewId enforces 100% completion and returns 403 when below 100%'
    );

    // Complete the 101st item -> learner back to 100% -> PATCH succeeds and course rating recalculates
    await Enrolment.updateOne(
      { learnerId: completedLearnerId, courseId },
      { $push: { completedLessons: String(newUncompletedItemId) } }
    );
    const rPatchAllowed = createMockRes();
    await reviewController.updateCourseReview(
      {
        user: { id: String(completedLearnerId) },
        params: { courseId: String(courseId) },
        body: { rating: 5, feedback: 'Finished new lesson too, restoring 100%!' }
      },
      rPatchAllowed
    );
    const refreshedCourse = await Course.findById(courseId).lean();
    assert(
      rPatchAllowed.statusCode === 200 && refreshedCourse.rating === 5 && refreshedCourse.reviewCount === 1,
      '9b. Completing 100% re-enables PATCH edit and recalculates course average rating accurately'
    );

    console.log(`\n==================================================================`);
    console.log(`🎯 Result: ${passed}/${total} assertions passed`);
    console.log(`==================================================================`);

    if (passed !== total) {
      process.exitCode = 1;
    }
  } finally {
    await CourseReview.deleteMany({ courseId });
    await Enrolment.deleteMany({ courseId });
    await Course.deleteOne({ _id: courseId });
    await Learner.deleteMany({ _id: { $in: [completedLearnerId, partialLearnerId, unenrolledLearnerId] } });
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('Review validation crashed:', err);
  process.exit(1);
});
