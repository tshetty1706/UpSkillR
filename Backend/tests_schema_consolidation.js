const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '.env') });

const Instructor = require('./model/Instructor');
const InstructorApplication = require('./model/InstructorApplication');

const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'upskillr_jwt_secret_key_2026_super_secure';

async function runSchemaConsolidationTests() {
  console.log('====================================================');
  console.log(' RUNNING INSTRUCTOR SCHEMA CONSOLIDATION TEST SUITE ');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGO_URL, { dbName: 'UpSkillr', serverSelectionTimeoutMS: 30000 });
  const db = mongoose.connection.db;

  let total = 0;
  let passed = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`[PASS] Case ${total}: ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] Case ${total}: ${testName}`);
    }
  }

  try {
    // 1. Find or create a dedicated test instructor
    const testEmail = 'test.consolidation.instructor@upskillr.com';
    let instructor = await Instructor.findOne({ email: testEmail });
    if (!instructor) {
      instructor = new Instructor({
        fullName: 'Original Test Name',
        email: testEmail,
        password: '$2a$10$w4r68q5g7h8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z',
        role: 'instructor',
        authProvider: 'local',
        isVerified: true,
        avatar: '',
        designation: 'Software Tester',
        bio: 'Initial Bio',
        keySkills: ['Testing', 'QA']
      });
      await instructor.save();
    }

    const token = jwt.sign(
      { id: instructor._id, role: 'instructor', email: instructor.email, fullName: instructor.fullName },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const authHeaders = {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    // -----------------------------------------------------------
    // Case 1: GET /api/instructor/application returns hydrated canonical fields
    // -----------------------------------------------------------
    const getRes = await axios.get(`${BASE_URL}/instructor/application`, authHeaders);
    assert(getRes.data.success === true, 'GET /api/instructor/application succeeds');
    assert(
      getRes.data.application.personalInfo.fullName === instructor.fullName,
      'Application personalInfo.fullName is hydrated with canonical Instructor.fullName'
    );
    assert(
      getRes.data.application.personalInfo.email === instructor.email,
      'Application personalInfo.email is hydrated with canonical Instructor.email'
    );
    assert(
      Array.isArray(getRes.data.application.professionalInfo.keySkills),
      'Application professionalInfo.keySkills is hydrated with canonical Instructor.keySkills'
    );

    // -----------------------------------------------------------
    // Case 2: PUT /api/instructor/application updates canonical Instructor fields
    // -----------------------------------------------------------
    const updatedName = 'Joy Arthur Updated ' + Date.now();
    const updatedBio = 'Updated Bio via application form at ' + Date.now();
    const updatedSkills = ['Node.js', 'React', 'MongoDB', 'Docker'];

    const putRes = await axios.put(
      `${BASE_URL}/instructor/application`,
      {
        personalInfo: {
          fullName: updatedName,
          bio: updatedBio,
          phone: '9876543210',
          professionalTitle: 'Lead Instructor'
        },
        professionalInfo: {
          currentRole: 'Principal Architect',
          organization: 'UpSkillR Org',
          yearsOfExperience: '7+ Years',
          keySkills: updatedSkills
        }
      },
      authHeaders
    );

    assert(putRes.data.success === true, 'PUT /api/instructor/application succeeds');

    // -----------------------------------------------------------
    // Case 3: Verify Instructor record in MongoDB has updated canonical fields
    // -----------------------------------------------------------
    const refreshedInst = await Instructor.findById(instructor._id);
    assert(refreshedInst.fullName === updatedName, 'Instructor.fullName was canonically updated by application PUT');
    assert(refreshedInst.bio === updatedBio, 'Instructor.bio was canonically updated by application PUT');
    assert(
      JSON.stringify(refreshedInst.keySkills) === JSON.stringify(updatedSkills),
      'Instructor.keySkills was canonically updated by application PUT'
    );

    // -----------------------------------------------------------
    // Case 4: Verify InstructorApplication document in MongoDB has NO redundant fields
    // -----------------------------------------------------------
    const rawAppDoc = await db.collection('instructorApplications').findOne({ instructorId: instructor._id });
    assert(rawAppDoc !== null, 'InstructorApplication document exists in database');
    assert(rawAppDoc.personalInfo.fullName === undefined, 'Raw InstructorApplication does NOT store personalInfo.fullName');
    assert(rawAppDoc.personalInfo.email === undefined, 'Raw InstructorApplication does NOT store personalInfo.email');
    assert(rawAppDoc.personalInfo.bio === undefined, 'Raw InstructorApplication does NOT store personalInfo.bio');
    assert(rawAppDoc.personalInfo.photoUrl === undefined, 'Raw InstructorApplication does NOT store personalInfo.photoUrl');
    assert(rawAppDoc.professionalInfo.keySkills === undefined, 'Raw InstructorApplication does NOT store professionalInfo.keySkills');
    assert(rawAppDoc.personalInfo.phone === '9876543210', 'Raw InstructorApplication stores application-specific phone');
    assert(rawAppDoc.professionalInfo.currentRole === 'Principal Architect', 'Raw InstructorApplication stores currentRole');

    // -----------------------------------------------------------
    // Case 5: Verify GET /api/auth/me returns single source of truth
    // -----------------------------------------------------------
    const meRes = await axios.get(`${BASE_URL}/auth/me`, authHeaders);
    assert(meRes.data.success === true, 'GET /api/auth/me succeeds');
    assert(meRes.data.user.fullName === updatedName, 'GET /api/auth/me reflects the canonical updated fullName');
    assert(meRes.data.user.bio === updatedBio, 'GET /api/auth/me reflects the canonical updated bio');
    assert(
      JSON.stringify(meRes.data.user.keySkills) === JSON.stringify(updatedSkills),
      'GET /api/auth/me reflects the canonical updated keySkills'
    );

    // -----------------------------------------------------------
    // Case 6: Verify applicationStatus lifecycle
    // -----------------------------------------------------------
    assert(rawAppDoc.applicationStatus === 'draft', 'Application status transitioned to draft on update');
    assert(meRes.data.user.applicationStatus === 'draft', 'User applicationStatus correctly retrieved from InstructorApplication');

    // Clean up test data
    await Instructor.deleteOne({ _id: instructor._id });
    await InstructorApplication.deleteOne({ instructorId: instructor._id });
    console.log('\n[+] Cleaned up test instructor and application documents.');

    console.log('\n====================================================');
    console.log(` RESULTS: ${passed} / ${total} TESTS PASSED`);
    console.log('====================================================');
  } catch (error) {
    console.error('Test suite failed:', error.response?.data || error.message);
  } finally {
    await mongoose.disconnect();
  }
}

runSchemaConsolidationTests();
