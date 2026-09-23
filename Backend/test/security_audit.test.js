require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Instructor, Learner } = require('../model/User');
const Course = require('../model/Course');

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'upskillr_jwt_secret_key_2026_super_secure';

async function runSecurityAudit() {
  console.log('====================================================');
  console.log('🛡️  UPSKILLR BACKEND SECURITY ARCHITECTURE AUDIT');
  console.log('====================================================\n');

  // 1. Connect to MongoDB to seed test fixtures
  const MONGO_URL = process.env.MONGO_URL;
  if (!MONGO_URL) {
    throw new Error('MONGO_URL missing in .env');
  }

  await mongoose.connect(MONGO_URL, { dbName: 'UpSkillr' });
  console.log('✅ Connected to MongoDB Atlas for test fixture management');

  // 2. Create or find test instructors & learner
  const instAEmail = 'audit_inst_a@upskillr.security';
  const instBEmail = 'audit_inst_b@upskillr.security';
  const learnerEmail = 'audit_learner@upskillr.security';

  await Instructor.deleteMany({ email: { $in: [instAEmail, instBEmail] } });
  await Learner.deleteMany({ email: learnerEmail });

  const instructorA = await Instructor.create({
    fullName: 'Security Audit Instructor A',
    email: instAEmail,
    password: 'Password123!',
    role: 'instructor',
    applicationStatus: 'submitted',
    isVerified: true
  });

  const instructorB = await Instructor.create({
    fullName: 'Security Audit Instructor B',
    email: instBEmail,
    password: 'Password123!',
    role: 'instructor',
    applicationStatus: 'submitted',
    isVerified: true
  });

  const learnerUser = await Learner.create({
    fullName: 'Security Audit Learner',
    email: learnerEmail,
    password: 'Password123!',
    role: 'learner',
    isVerified: true
  });

  // 3. Create courses for Instructor A and Instructor B
  await Course.deleteMany({ instructorId: { $in: [instructorA._id, instructorB._id] } });

  const courseA = await Course.create({
    title: 'Audit Course A',
    description: 'Course belonging to Instructor A',
    category: 'Cybersecurity',
    skillLevel: 'Intermediate',
    instructorId: instructorA._id,
    instructorName: instructorA.fullName,
    status: 'draft',
    state: 'draft',
    modules: [
      {
        title: 'Module A1',
        lessons: [
          {
            title: 'Lesson A1',
            description: 'Intro A1',
            items: [{ title: 'Video A1', type: 'video', state: 'published' }]
          }
        ],
        notes: [
          { title: 'Resource A1', content: 'Resource A1 Note', type: 'article' }
        ]
      }
    ],
    notes: [
      { title: 'Course Resource A1', content: 'Course Note A1', type: 'article' }
    ],
    courseAssessments: [
      { title: 'Quiz A1', instructions: 'Quiz A1 instructions', questions: [] }
    ]
  });

  const courseB = await Course.create({
    title: 'Audit Course B',
    description: 'Course belonging to Instructor B',
    category: 'Cloud Computing',
    skillLevel: 'Advanced',
    instructorId: instructorB._id,
    instructorName: instructorB.fullName,
    status: 'draft',
    state: 'draft',
    modules: [
      {
        title: 'Module B1',
        lessons: [
          {
            title: 'Lesson B1',
            description: 'Intro B1',
            items: [{ title: 'Video B1', type: 'video', state: 'published' }]
          }
        ],
        notes: [
          { title: 'Resource B1', content: 'Resource B1 Note', type: 'article' }
        ]
      }
    ],
    notes: [
      { title: 'Course Resource B1', content: 'Course Note B1', type: 'article' }
    ],
    courseAssessments: [
      { title: 'Quiz B1', instructions: 'Quiz B1 instructions', questions: [] }
    ]
  });

  // 4. Generate Tokens
  const tokenInstA = jwt.sign(
    { id: instructorA._id, email: instructorA.email, role: 'instructor', fullName: instructorA.fullName },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const tokenInstB = jwt.sign(
    { id: instructorB._id, email: instructorB.email, role: 'instructor', fullName: instructorB.fullName },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const tokenLearner = jwt.sign(
    { id: learnerUser._id, email: learnerUser.email, role: 'learner', fullName: learnerUser.fullName },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const expiredToken = jwt.sign(
    { id: instructorA._id, email: instructorA.email, role: 'instructor' },
    JWT_SECRET,
    { expiresIn: '-10s' } // Expired in the past
  );

  const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed_payload.signature';

  const results = [];

  function recordResult(caseId, description, expected, actual, pass) {
    results.push({ caseId, description, expected, actual, pass });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${caseId}: ${description}`);
    console.log(`       Expected: ${expected} | Actual: ${actual}\n`);
  }

  // ─── CASE 1: No JWT → instructor route ───
  try {
    const res = await axios.get(`${API_BASE}/courses/instructor/my-courses`);
    recordResult('CASE 1', 'No JWT → instructor route', 401, res.status, false);
  } catch (err) {
    const status = err.response?.status;
    recordResult('CASE 1', 'No JWT → instructor route', 401, status, status === 401);
  }

  // ─── CASE 2: Expired JWT → instructor route ───
  try {
    const res = await axios.get(`${API_BASE}/courses/instructor/my-courses`, {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    recordResult('CASE 2', 'Expired JWT → instructor route', 401, res.status, false);
  } catch (err) {
    const status = err.response?.status;
    recordResult('CASE 2', 'Expired JWT → instructor route', 401, status, status === 401);
  }

  // ─── CASE 3: Malformed JWT → instructor route ───
  try {
    const res = await axios.get(`${API_BASE}/courses/instructor/my-courses`, {
      headers: { Authorization: `Bearer ${malformedToken}` }
    });
    recordResult('CASE 3', 'Malformed JWT → instructor route', 401, res.status, false);
  } catch (err) {
    const status = err.response?.status;
    recordResult('CASE 3', 'Malformed JWT → instructor route', 401, status, status === 401);
  }

  // ─── CASE 4: Valid learner JWT → instructor route ───
  try {
    const res = await axios.get(`${API_BASE}/courses/instructor/my-courses`, {
      headers: { Authorization: `Bearer ${tokenLearner}` }
    });
    recordResult('CASE 4', 'Valid learner JWT → instructor route', 403, res.status, false);
  } catch (err) {
    const status = err.response?.status;
    recordResult('CASE 4', 'Valid learner JWT → instructor route', 403, status, status === 403);
  }

  // ─── CASE 5: Valid instructor JWT → own course ───
  try {
    const res = await axios.get(`${API_BASE}/courses/${courseA._id}`, {
      headers: { Authorization: `Bearer ${tokenInstA}` }
    });
    recordResult('CASE 5', 'Valid instructor JWT → own course', 200, res.status, res.status === 200);
  } catch (err) {
    const status = err.response?.status;
    recordResult('CASE 5', 'Valid instructor JWT → own course', 200, status, false);
  }

  // ─── CASE 6: Instructor A → Instructor B's course ───
  try {
    const res = await axios.get(`${API_BASE}/courses/${courseB._id}`, {
      headers: { Authorization: `Bearer ${tokenInstA}` }
    });
    recordResult('CASE 6', "Instructor A → Instructor B's course", 403, res.status, false);
  } catch (err) {
    const status = err.response?.status;
    recordResult('CASE 6', "Instructor A → Instructor B's course", 403, status, status === 403);
  }

  // ─── CASE 7: Instructor A → Instructor B's curriculum endpoint ───
  try {
    const res = await axios.get(`${API_BASE}/courses/${courseB._id}/curriculum`, {
      headers: { Authorization: `Bearer ${tokenInstA}` }
    });
    recordResult('CASE 7', "Instructor A → Instructor B's curriculum endpoint", 403, res.status, false);
  } catch (err) {
    const status = err.response?.status;
    recordResult('CASE 7', "Instructor A → Instructor B's curriculum endpoint", 403, status, status === 403);
  }

  // ─── CASE 8: Instructor A → Instructor B's module toggle endpoint ───
  const moduleBId = courseB.modules[0]._id.toString();
  try {
    const res = await axios.patch(
      `${API_BASE}/courses/${courseB._id}/curriculum/modules/${moduleBId}/toggle-state`,
      {},
      { headers: { Authorization: `Bearer ${tokenInstA}` } }
    );
    recordResult('CASE 8', "Instructor A → Instructor B's module toggle endpoint", 403, res.status, false);
  } catch (err) {
    const status = err.response?.status;
    recordResult('CASE 8', "Instructor A → Instructor B's module toggle endpoint", 403, status, status === 403);
  }

  // ─── CASE 9: Instructor A → Instructor B's course overview endpoint ───
  try {
    const res = await axios.get(`${API_BASE}/courses/${courseB._id}/overview`, {
      headers: { Authorization: `Bearer ${tokenInstA}` }
    });
    recordResult('CASE 9', "Instructor A → Instructor B's course overview endpoint", 403, res.status, false);
  } catch (err) {
    const status = err.response?.status;
    recordResult('CASE 9', "Instructor A → Instructor B's course overview endpoint", 403, status, status === 403);
  }

  // ─── CASE 10: Instructor A changes courseId in URL to courseB ───
  try {
    const res = await axios.put(
      `${API_BASE}/courses/${courseB._id}`,
      { title: 'Hacked Title Attempt' },
      { headers: { Authorization: `Bearer ${tokenInstA}` } }
    );
    recordResult('CASE 10', 'Instructor A changes courseId in URL', 403, res.status, false);
  } catch (err) {
    const status = err.response?.status;
    recordResult('CASE 10', 'Instructor A changes courseId in URL', 403, status, status === 403);
  }

  // ─── CASE 11: Instructor A modifies instructorId in request body ───
  try {
    const res = await axios.post(
      `${API_BASE}/courses`,
      {
        title: 'Audit Substituted ID Course',
        description: 'Testing if instructorId can be spoofed in body',
        category: 'Data Science',
        instructorId: instructorB._id.toString() // Spoofed ID
      },
      { headers: { Authorization: `Bearer ${tokenInstA}` } }
    );

    const createdCourse = await Course.findById(res.data.course._id);
    const spoofFailed = createdCourse.instructorId.toString() === instructorA._id.toString();
    recordResult(
      'CASE 11',
      'Instructor A modifies instructorId in body (server ignores spoofed ID)',
      `Bound to Instructor A (${instructorA._id})`,
      `Bound to: ${createdCourse.instructorId}`,
      spoofFailed
    );
    await Course.findByIdAndDelete(res.data.course._id);
  } catch (err) {
    recordResult('CASE 11', 'Instructor A modifies instructorId in body', 201, err.response?.status, false);
  }

  // ─── CASE 12: Instructor A attempts nested resource access belonging to another course ───
  // Instructor A tries to modify Module B1 via Course A URL: /courses/:courseA/curriculum/modules/:moduleBId/toggle-state
  const moduleBIdCross = courseB.modules[0]._id.toString();
  try {
    const res = await axios.patch(
      `${API_BASE}/courses/${courseA._id}/curriculum/modules/${moduleBIdCross}/toggle-state`,
      {},
      { headers: { Authorization: `Bearer ${tokenInstA}` } }
    );
    recordResult('CASE 12', 'Nested resource belonging to another course (Cross-course IDOR)', 404, res.status, false);
  } catch (err) {
    const status = err.response?.status;
    recordResult('CASE 12', 'Nested resource belonging to another course (Cross-course IDOR)', 404, status, status === 404);
  }

  // ─── CASE 13: Valid instructor performs normal course creation ───
  let newlyCreatedCourseId = null;
  try {
    const res = await axios.post(
      `${API_BASE}/courses`,
      {
        title: 'Valid Creation Course',
        description: 'A test course created under normal workflow',
        category: 'Software Engineering',
        skillLevel: 'Beginner'
      },
      { headers: { Authorization: `Bearer ${tokenInstA}` } }
    );
    newlyCreatedCourseId = res.data.course?._id;
    recordResult('CASE 13', 'Valid instructor performs normal course creation', 201, res.status, res.status === 201);
  } catch (err) {
    recordResult('CASE 13', 'Valid instructor performs normal course creation', 201, err.response?.status, false);
  }

  // ─── CASE 14: Valid instructor edits own course ───
  try {
    const res = await axios.put(
      `${API_BASE}/courses/${courseA._id}`,
      {
        title: 'Updated Audit Course A Title',
        description: 'Updated description for Course A'
      },
      { headers: { Authorization: `Bearer ${tokenInstA}` } }
    );
    const passed = res.status === 200 && res.data.course?.title === 'Updated Audit Course A Title';
    recordResult('CASE 14', 'Valid instructor edits own course', 200, res.status, passed);
  } catch (err) {
    recordResult('CASE 14', 'Valid instructor edits own course', 200, err.response?.status, false);
  }

  // ─── CASE 15: Valid instructor publishes own valid course ───
  try {
    const res = await axios.post(
      `${API_BASE}/courses/${courseA._id}/publish`,
      { status: 'published' },
      { headers: { Authorization: `Bearer ${tokenInstA}` } }
    );
    const passed = res.status === 200 && res.data.course?.status === 'published';
    recordResult('CASE 15', 'Valid instructor publishes own valid course', 200, res.status, passed);
  } catch (err) {
    recordResult('CASE 15', 'Valid instructor publishes own valid course', 200, err.response?.status, false);
  }

  // Cleanup temporary fixtures
  console.log('🧹 Cleaning up test fixtures...');
  if (newlyCreatedCourseId) await Course.findByIdAndDelete(newlyCreatedCourseId);
  await Course.deleteMany({ instructorId: { $in: [instructorA._id, instructorB._id] } });
  await Instructor.deleteMany({ email: { $in: [instAEmail, instBEmail] } });
  await Learner.deleteMany({ email: learnerEmail });
  await mongoose.disconnect();
  console.log('✅ Cleanup complete\n');

  // Summary
  const passedCount = results.filter((r) => r.pass).length;
  const totalCount = results.length;
  console.log('====================================================');
  console.log(`AUDIT RESULT: ${passedCount}/${totalCount} SCENARIOS PASSED`);
  console.log('====================================================');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runSecurityAudit().catch((err) => {
  console.error('Audit run failed with unhandled error:', err);
  process.exit(1);
});
