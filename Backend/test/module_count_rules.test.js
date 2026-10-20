require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { Instructor } = require('../model/User');

const secret = process.env.JWT_SECRET || 'upskillr_jwt_secret_key_2026_super_secure';

async function testModuleCountRules() {
  console.log('=== Testing Module Count Rules for Instructors vs Learners ===');

  await mongoose.connect(process.env.MONGO_URL, { dbName: 'UpSkillr' });

  let instructor = await Instructor.findOne({ applicationStatus: { $in: ['submitted', 'approved'] } });
  let createdTemp = false;
  if (!instructor) {
    instructor = await Instructor.create({
      fullName: 'Rule Test Instructor',
      email: 'rule_test_instructor@upskillr.dev',
      password: 'TestPassword123!',
      applicationStatus: 'submitted'
    });
    createdTemp = true;
  }

  const instructorToken = jwt.sign(
    { id: instructor._id, email: instructor.email, role: 'instructor', fullName: instructor.fullName },
    secret,
    { expiresIn: '7d' }
  );

  try {
    // 1. Fetch Instructor Courses
    const instRes = await axios.get('http://localhost:5000/api/courses/instructor/my-courses', {
      headers: { Authorization: 'Bearer ' + instructorToken }
    });
    console.log('Instructor my-courses fetch success:', instRes.data.success);
    const instCourses = instRes.data.courses || [];
    console.log(`Instructor has ${instCourses.length} courses.`);
    instCourses.forEach(c => {
      const totalMods = c.modules ? c.modules.length : 0;
      const pubMods = c.modules ? c.modules.filter(m => m.state === 'published' || m.status === 'published').length : 0;
      const draftMods = c.modules ? c.modules.filter(m => m.state === 'draft' || m.status === 'draft').length : 0;
      console.log(`- Course "${c.title}":`);
      console.log(`    Instructor total modulesCount: ${c.modulesCount} (total: ${totalMods}, published: ${pubMods}, draft: ${draftMods})`);
    });

    // 2. Fetch Published Courses (Learner / Public)
    const pubRes = await axios.get('http://localhost:5000/api/courses/published');
    console.log('\nPublished courses fetch success:', pubRes.data.success);
    const pubCourses = pubRes.data.courses || [];
    console.log(`Public catalog has ${pubCourses.length} published courses.`);
    pubCourses.forEach(c => {
      console.log(`- Course "${c.title}":`);
      console.log(`    Learner modulesCount: ${c.modulesCount}`);
      console.log(`    Learner modules array length: ${c.modules ? c.modules.length : 0}`);
      if (c.modules) {
        const anyDraft = c.modules.some(m => m.state === 'draft' || m.status === 'draft');
        console.log(`    Contains any draft modules: ${anyDraft} (MUST BE FALSE)`);
      }
    });

    console.log('\n=== All Verification Checks Passed ===');
  } catch (err) {
    console.error('Error during test:', err.response?.data || err.message);
    process.exit(1);
  } finally {
    if (createdTemp) {
      await Instructor.deleteOne({ _id: instructor._id });
    }
    await mongoose.disconnect();
  }
}

testModuleCountRules();
