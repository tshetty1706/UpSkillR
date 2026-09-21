const mongoose = require('mongoose');
require('dotenv').config();
const Course = require('../model/Course');
const courseController = require('../controller/courseController');

// Helper to mock Express req and res
const mockReqRes = (reqData = {}) => {
  const req = { ...reqData, query: reqData.query || {}, params: reqData.params || {}, body: reqData.body || {} };
  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  return { req, res, getResult: () => ({ status: statusCode, data: responseData }) };
};

async function runEdgeCases() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log('Connected to MongoDB');

  const course = await Course.findOne({});
  if (!course) {
    console.log('No courses in DB');
    process.exit(1);
  }

  console.log(`Testing with Course: "${course.title}" (_id: ${course._id})`);
  const originalModules = JSON.parse(JSON.stringify(course.modules || []));
  const instructorId = course.instructorId || new mongoose.Types.ObjectId();

  try {
    // ═══════════════════════════════════════════════════════════════
    // CASE 1: 1 Published module, 1 Draft module
    // ═══════════════════════════════════════════════════════════════
    console.log('\n--- CASE 1: 1 Published module, 1 Draft module ---');
    course.status = 'published';
    course.instructorId = instructorId;
    course.modules = [
      {
        title: 'Module 1 - Published Fundamentals',
        state: 'published',
        lessons: [{ title: 'Lesson 1.1', state: 'published', items: [{ title: 'Video 1', type: 'video', state: 'published', video: { muxPlaybackId: 'abc1' } }] }]
      },
      {
        title: 'Module 2 - Draft Advanced',
        state: 'draft',
        lessons: [{ title: 'Lesson 2.1', state: 'draft', items: [{ title: 'Video 2', type: 'video', state: 'draft' }] }]
      }
    ];
    await course.save();

    // Instructor View
    const instReq1 = mockReqRes({ user: { id: instructorId.toString() } });
    await courseController.getInstructorCourses(instReq1.req, instReq1.res);
    const instCourse1 = instReq1.getResult().data.courses.find(c => c._id.toString() === course._id.toString());
    console.log(`Instructor sees: ${instCourse1.modulesCount} Modules (Expected: 2)`);
    if (instCourse1.modulesCount !== 2) throw new Error('Case 1 Instructor count failed');

    // Learner / Public View
    const pubReq1 = mockReqRes();
    await courseController.getPublishedCourses(pubReq1.req, pubReq1.res);
    const pubCourse1 = pubReq1.getResult().data.courses.find(c => c._id.toString() === course._id.toString());
    console.log(`Learner sees: ${pubCourse1.modulesCount} Module (Expected: 1)`);
    console.log(`Learner modules array length: ${pubCourse1.modules.length} (Expected: 1)`);
    if (pubCourse1.modulesCount !== 1 || pubCourse1.modules.length !== 1) throw new Error('Case 1 Learner count failed');
    if (pubCourse1.modules[0].state !== 'published') throw new Error('Draft module leaked to learner in Case 1');

    // ═══════════════════════════════════════════════════════════════
    // CASE 2: All modules Published (3 modules)
    // ═══════════════════════════════════════════════════════════════
    console.log('\n--- CASE 2: All modules Published (3 modules) ---');
    course.modules = [
      { title: 'Mod 1', state: 'published', lessons: [{ title: 'L1', state: 'published', items: [{ title: 'V1', type: 'video', state: 'published' }] }] },
      { title: 'Mod 2', state: 'published', lessons: [{ title: 'L2', state: 'published', items: [{ title: 'V2', type: 'video', state: 'published' }] }] },
      { title: 'Mod 3', state: 'published', lessons: [{ title: 'L3', state: 'published', items: [{ title: 'V3', type: 'video', state: 'published' }] }] }
    ];
    await course.save();

    const instReq2 = mockReqRes({ user: { id: instructorId.toString() } });
    await courseController.getInstructorCourses(instReq2.req, instReq2.res);
    const instCourse2 = instReq2.getResult().data.courses.find(c => c._id.toString() === course._id.toString());
    console.log(`Instructor sees: ${instCourse2.modulesCount} Modules (Expected: 3)`);
    if (instCourse2.modulesCount !== 3) throw new Error('Case 2 Instructor count failed');

    const pubReq2 = mockReqRes();
    await courseController.getPublishedCourses(pubReq2.req, pubReq2.res);
    const pubCourse2 = pubReq2.getResult().data.courses.find(c => c._id.toString() === course._id.toString());
    console.log(`Learner sees: ${pubCourse2.modulesCount} Modules (Expected: 3)`);
    if (pubCourse2.modulesCount !== 3 || pubCourse2.modules.length !== 3) throw new Error('Case 2 Learner count failed');

    // ═══════════════════════════════════════════════════════════════
    // CASE 3: All modules Draft (3 modules)
    // ═══════════════════════════════════════════════════════════════
    console.log('\n--- CASE 3: All modules Draft (3 modules) ---');
    course.modules.forEach(m => { m.state = 'draft'; });
    await course.save();

    const instReq3 = mockReqRes({ user: { id: instructorId.toString() } });
    await courseController.getInstructorCourses(instReq3.req, instReq3.res);
    const instCourse3 = instReq3.getResult().data.courses.find(c => c._id.toString() === course._id.toString());
    console.log(`Instructor sees: ${instCourse3.modulesCount} Modules (Expected: 3)`);
    if (instCourse3.modulesCount !== 3) throw new Error('Case 3 Instructor count failed');

    const pubReq3 = mockReqRes();
    await courseController.getPublishedCourses(pubReq3.req, pubReq3.res);
    const pubCourse3 = pubReq3.getResult().data.courses.find(c => c._id.toString() === course._id.toString());
    console.log(`Learner sees: ${pubCourse3.modulesCount} Modules (Expected: 0)`);
    console.log(`Learner modules array length: ${pubCourse3.modules.length} (Expected: 0)`);
    if (pubCourse3.modulesCount !== 0 || pubCourse3.modules.length !== 0) throw new Error('Case 3 Learner count failed');

    // ═══════════════════════════════════════════════════════════════
    // CASE 4: No modules (0 modules)
    // ═══════════════════════════════════════════════════════════════
    console.log('\n--- CASE 4: No modules (0 modules) ---');
    course.modules = [];
    await course.save();

    const instReq4 = mockReqRes({ user: { id: instructorId.toString() } });
    await courseController.getInstructorCourses(instReq4.req, instReq4.res);
    const instCourse4 = instReq4.getResult().data.courses.find(c => c._id.toString() === course._id.toString());
    console.log(`Instructor sees: ${instCourse4.modulesCount} Modules (Expected: 0)`);
    if (instCourse4.modulesCount !== 0) throw new Error('Case 4 Instructor count failed');

    const pubReq4 = mockReqRes();
    await courseController.getPublishedCourses(pubReq4.req, pubReq4.res);
    const pubCourse4 = pubReq4.getResult().data.courses.find(c => c._id.toString() === course._id.toString());
    console.log(`Learner sees: ${pubCourse4.modulesCount} Modules (Expected: 0)`);
    if (pubCourse4.modulesCount !== 0 || pubCourse4.modules.length !== 0) throw new Error('Case 4 Learner count failed');

    // ═══════════════════════════════════════════════════════════════
    // CASE 5: Publish a Draft module (2 Draft + 1 Published -> 2 Published + 1 Draft)
    // ═══════════════════════════════════════════════════════════════
    console.log('\n--- CASE 5: Publish a Draft module ---');
    course.modules = [
      { title: 'Mod 1', state: 'published', lessons: [{ title: 'L1', state: 'published', items: [{ title: 'V1', type: 'video', state: 'published' }] }] },
      { title: 'Mod 2', state: 'draft', lessons: [{ title: 'L2', state: 'draft', items: [{ title: 'V2', type: 'video', state: 'draft' }] }] },
      { title: 'Mod 3', state: 'draft', lessons: [{ title: 'L3', state: 'draft', items: [{ title: 'V3', type: 'video', state: 'draft' }] }] }
    ];
    await course.save();

    // Before publish
    const pubReq5a = mockReqRes();
    await courseController.getPublishedCourses(pubReq5a.req, pubReq5a.res);
    const pubCourse5a = pubReq5a.getResult().data.courses.find(c => c._id.toString() === course._id.toString());
    console.log(`Before publish -> Learner sees: ${pubCourse5a.modulesCount} Module (Expected: 1)`);

    // Publish Mod 2
    course.modules[1].state = 'published';
    await course.save();

    const pubReq5b = mockReqRes();
    await courseController.getPublishedCourses(pubReq5b.req, pubReq5b.res);
    const pubCourse5b = pubReq5b.getResult().data.courses.find(c => c._id.toString() === course._id.toString());
    console.log(`After publish Mod 2 -> Learner sees: ${pubCourse5b.modulesCount} Modules (Expected: 2)`);
    if (pubCourse5b.modulesCount !== 2) throw new Error('Case 5 Learner count increment failed');

    // ═══════════════════════════════════════════════════════════════
    // CASE 6: Unpublish a Published module
    // ═══════════════════════════════════════════════════════════════
    console.log('\n--- CASE 6: Unpublish a Published module ---');
    course.modules[1].state = 'draft';
    await course.save();

    const pubReq6 = mockReqRes();
    await courseController.getPublishedCourses(pubReq6.req, pubReq6.res);
    const pubCourse6 = pubReq6.getResult().data.courses.find(c => c._id.toString() === course._id.toString());
    console.log(`After unpublish -> Learner sees: ${pubCourse6.modulesCount} Module (Expected: 1)`);
    if (pubCourse6.modulesCount !== 1) throw new Error('Case 6 Learner count decrement failed');

    const instReq6 = mockReqRes({ user: { id: instructorId.toString() } });
    await courseController.getInstructorCourses(instReq6.req, instReq6.res);
    const instCourse6 = instReq6.getResult().data.courses.find(c => c._id.toString() === course._id.toString());
    console.log(`Instructor total remains: ${instCourse6.modulesCount} Modules (Expected: 3)`);
    if (instCourse6.modulesCount !== 3) throw new Error('Case 6 Instructor total change failed');

    console.log('\n✓ ALL 6 EDGE CASES PASSED PERFECTLY!');
  } finally {
    // Restore original course modules
    course.modules = originalModules;
    await course.save();
    console.log('Restored original database state.');
    await mongoose.disconnect();
  }
}

runEdgeCases().catch(err => {
  console.error('Edge cases failed:', err);
  process.exit(1);
});
