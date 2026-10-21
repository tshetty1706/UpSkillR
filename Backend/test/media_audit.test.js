require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const axios = require('axios');
const mongoose = require('mongoose');
const { Instructor } = require('../model/User');
const Course = require('../model/Course');

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'upskillr_jwt_secret_key_2026_super_secure';

async function testMediaFlows() {
  console.log('--- Testing Media Endpoints & Ownership Protections ---');
  await mongoose.connect(process.env.MONGO_URL, { dbName: 'UpSkillr' });

  // 1. Unauthenticated request to /api/media/upload-credentials
  try {
    await axios.post(API_BASE + '/media/upload-credentials', { type: 'video' });
    console.error('FAIL: Unauthenticated upload-credentials should return 401');
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('PASS: Unauthenticated upload-credentials returns 401');
    } else {
      console.error('FAIL: Expected 401, got', err.response?.status);
    }
  }

  // 2. Create temporary instructor
  const email = 'media_audit_' + Date.now() + '@upskillr.com';
  const inst = await Instructor.create({
    fullName: 'Media Audit Instructor',
    email,
    password: 'Password123!',
    role: 'instructor',
    applicationStatus: 'submitted',
    isVerified: true
  });
  const token = jwt.sign({ id: inst._id, role: 'instructor' }, JWT_SECRET, { expiresIn: '1h' });

  // 3. Test Mux credentials generation with authenticated instructor
  try {
    const credRes = await axios.post(API_BASE + '/media/upload-credentials', { type: 'video' }, {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('PASS: Authenticated Mux upload-credentials success:', credRes.data.success, '| uploadUrl present:', !!credRes.data.uploadUrl);
  } catch (err) {
    console.error('FAIL: Authenticated upload-credentials error:', err.response?.data || err.message);
  }

  // 4. Test ownership on curriculum video upload endpoint
  const otherInst = await Instructor.create({
    fullName: 'Other Instructor',
    email: 'other_' + Date.now() + '@upskillr.com',
    password: 'Password123!',
    role: 'instructor',
    applicationStatus: 'submitted',
    isVerified: true
  });
  const otherCourse = await Course.create({
    title: 'Other Course',
    category: 'Testing',
    instructorId: otherInst._id,
    instructorName: otherInst.fullName
  });

  try {
    await axios.post(API_BASE + '/courses/' + otherCourse._id + '/curriculum/upload/video', {}, {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.error('FAIL: Uploading to other course should fail with 403');
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('PASS: Uploading to other course correctly rejected with 403 Forbidden');
    } else {
      console.error('FAIL: Expected 403, got', err.response?.status);
    }
  }

  // 5. Test ownership on curriculum resource upload endpoint
  try {
    await axios.post(API_BASE + '/courses/' + otherCourse._id + '/curriculum/upload/resource', {}, {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.error('FAIL: Uploading resource to other course should fail with 403');
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('PASS: Uploading resource to other course correctly rejected with 403 Forbidden');
    } else {
      console.error('FAIL: Expected 403, got', err.response?.status);
    }
  }

  // Clean up fixtures
  await Instructor.deleteMany({ _id: { $in: [inst._id, otherInst._id] } });
  await Course.deleteMany({ _id: otherCourse._id });
  await mongoose.disconnect();
  console.log('--- Media tests finished cleanly ---');
}

testMediaFlows().catch(console.error);
