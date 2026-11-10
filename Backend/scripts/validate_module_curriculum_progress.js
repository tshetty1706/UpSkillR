const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Learner = require('../model/Learner');
const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');
const courseController = require('../controller/courseController');
const learnerController = require('../controller/learnerController');

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
  console.log('🧪 UpSkillR — Module Curriculum Progress & Access Validation');
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

  const learnerId = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();

  const m1Id = new mongoose.Types.ObjectId();
  const m2Id = new mongoose.Types.ObjectId();
  const m3Id = new mongoose.Types.ObjectId();

  const m1l1Id = new mongoose.Types.ObjectId();
  const m1Item1Id = new mongoose.Types.ObjectId();
  const m1Item2Id = new mongoose.Types.ObjectId();

  const m2l1Id = new mongoose.Types.ObjectId();
  const m2l2Id = new mongoose.Types.ObjectId();
  const m2Item1Id = new mongoose.Types.ObjectId();
  const m2Item2Id = new mongoose.Types.ObjectId();
  const m2Item3Id = new mongoose.Types.ObjectId();

  const m3l1Id = new mongoose.Types.ObjectId();
  const m3Item1Id = new mongoose.Types.ObjectId();

  try {
    const learner = await Learner.create({
      _id: learnerId,
      fullName: 'Module Test Learner',
      email: `mod_test_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'learner'
    });

    const course = await Course.create({
      _id: courseId,
      title: 'Module Simplification Validation Course',
      category: 'Web Development',
      description: 'Test course',
      status: 'published',
      state: 'published',
      isDeleted: false,
      instructorId: new mongoose.Types.ObjectId(),
      modules: [
        {
          _id: m1Id,
          title: 'Foundations of Enterprise React Architecture',
          state: 'published',
          lessons: [
            {
              _id: m1l1Id,
              title: 'Lesson 1',
              state: 'published',
              items: [
                { _id: m1Item1Id, title: 'Article 1', type: 'article', state: 'published' },
                { _id: m1Item2Id, title: 'Video 1', type: 'video', state: 'published' }
              ]
            }
          ]
        },
        {
          _id: m2Id,
          title: 'High-Performance Backend & Database Systems',
          state: 'published',
          lessons: [
            {
              _id: m2l1Id,
              title: 'Lesson 2.1',
              state: 'published',
              items: [
                { _id: m2Item1Id, title: 'Item 2.1', type: 'article', state: 'published' },
                { _id: m2Item2Id, title: 'Item 2.2', type: 'article', state: 'published' }
              ]
            },
            {
              _id: m2l2Id,
              title: 'Lesson 2.2',
              state: 'published',
              items: [
                {
                  _id: m2Item3Id,
                  title: 'Quiz 2.3',
                  type: 'quiz',
                  state: 'published',
                  quiz: { passThresholdPercent: 70, questions: [{ questionText: 'Q1?', type: 'mcq', options: ['A', 'B'], correctAnswerIndex: 0 }] }
                }
              ]
            }
          ]
        },
        {
          _id: m3Id,
          title: 'Introduction to Unsupervised Learning',
          state: 'published',
          lessons: [
            {
              _id: m3l1Id,
              title: 'Lesson 3.1',
              state: 'published',
              items: [
                {
                  _id: m3Item1Id,
                  title: 'Video 3.1',
                  type: 'video',
                  state: 'published',
                  video: {
                    videoUrl: 'https://example.com/video3.mp4',
                    duration: 120
                  }
                }
              ]
            }
          ]
        }
      ]
    });

    // Learner completed M1 (2/2), partially completed M2 (2/3), and not started M3 (0/1)
    await Enrolment.create({
      learnerId,
      learnerEmail: learner.email,
      courseId,
      courseTitle: course.title,
      status: 'in_progress',
      completedLessons: [
        String(m1Item1Id),
        String(m1Item2Id),
        String(m2Item1Id),
        String(m2Item2Id)
      ]
    });

    // 1. Verify getCourseProgress computes exact module stats
    const progRes = createMockRes();
    await courseController.getCourseProgress(
      { user: { id: String(learnerId) }, params: { courseId: String(courseId) } },
      progRes
    );
    assert(progRes.statusCode === 200 && progRes.body.success, 'getCourseProgress returns 200');
    const mp = progRes.body.modulesProgress;
    assert(Array.isArray(mp) && mp.length === 3, 'Returns backend progress for all 3 modules');
    assert(mp[0].progressPercentage === 100 && mp[0].isCompleted === true, 'Module 1 shows 100% & isCompleted: true');
    assert(mp[1].progressPercentage === 67 && mp[1].isCompleted === false, 'Module 2 shows 67% & isCompleted: false');
    assert(mp[2].progressPercentage === 0 && mp[2].isCompleted === false, 'Module 3 shows 0% & isCompleted: false');
    assert(progRes.body.progressPercentage === 67 && progRes.body.isCompleted === false, 'Overall course progress is 67% (4/6 items)');

    // 2. Opening Module 3 and Lesson 3.1 via recordCourseAccess must NOT mark Module 3 completed
    await learnerController.recordCourseAccess(
      {
        user: { id: String(learnerId) },
        params: { courseId: String(courseId) },
        body: { moduleId: String(m3Id), lessonId: String(m3l1Id), itemId: String(m3Item1Id) }
      },
      createMockRes()
    );

    const progAfterAccessRes = createMockRes();
    await courseController.getCourseProgress(
      { user: { id: String(learnerId) }, params: { courseId: String(courseId) } },
      progAfterAccessRes
    );
    const mp2 = progAfterAccessRes.body.modulesProgress;
    assert(
      mp2[2].progressPercentage === 0 && mp2[2].isCompleted === false,
      'Opening Module 3 does NOT mark module as completed'
    );

    // 3. Record per-module access on Module 2 and verify both M2 and M3 entries persist
    await learnerController.recordCourseAccess(
      {
        user: { id: String(learnerId) },
        params: { courseId: String(courseId) },
        body: { moduleId: String(m2Id), lessonId: String(m2l2Id), itemId: String(m2Item3Id) }
      },
      createMockRes()
    );

    const refreshedEnrolment = await Enrolment.findOne({ learnerId, courseId });
    const m2Pos = refreshedEnrolment.lastAccessedByModule.get(String(m2Id));
    const m3Pos = refreshedEnrolment.lastAccessedByModule.get(String(m3Id));
    assert(
      String(m2Pos?.lessonId) === String(m2l2Id) && String(m2Pos?.itemId) === String(m2Item3Id),
      'Per-module lastAccessedByModule saved lesson & item for Module 2'
    );
    assert(
      String(m3Pos?.lessonId) === String(m3l1Id) && String(m3Pos?.itemId) === String(m3Item1Id),
      'Module 3 saved position remains preserved in lastAccessedByModule'
    );

    // 4. Attempting to mark a Video lesson item complete without 80% watch progress is rejected by backend
    const vidFailRes = createMockRes();
    await courseController.updateLessonProgress(
      {
        user: { id: String(learnerId), role: 'learner' },
        params: { courseId: String(courseId), lessonId: String(m3Item1Id) },
        body: { courseId: String(courseId), lessonId: String(m3Item1Id) }
      },
      vidFailRes
    );
    assert(
      vidFailRes.statusCode === 400 && !vidFailRes.body.success,
      'Backend 80% video watch restriction blocks premature completion (400)',
      vidFailRes.body?.message
    );

    // 5. Attempting to mark a Quiz lesson item complete without an AssessmentSubmission is rejected
    const quizFailRes = createMockRes();
    await courseController.updateLessonProgress(
      {
        user: { id: String(learnerId), role: 'learner' },
        params: { courseId: String(courseId), lessonId: String(m2Item3Id) },
        body: { courseId: String(courseId), lessonId: String(m2Item3Id) }
      },
      quizFailRes
    );
    assert(
      quizFailRes.statusCode === 400 && !quizFailRes.body.success,
      'Backend quiz completion restriction blocks manual mark-complete without submission (400)',
      quizFailRes.body?.message
    );

  } finally {
    await Promise.all([
      Enrolment.deleteMany({ learnerId }),
      Course.deleteOne({ _id: courseId }),
      Learner.deleteOne({ _id: learnerId })
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
