require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const axios = require('axios');
const Course = require('../model/Course');

const API_BASE = 'http://localhost:5000/api';

async function testPublicCourseOverviewSecurity() {
  console.log('--- Testing Public Course Overview Access Control & Security ---');
  await mongoose.connect(process.env.MONGO_URL, { dbName: 'UpSkillr' });

  const publishedCourse = await Course.findOne({ status: 'published' }).lean();
  if (!publishedCourse) {
    console.log('No published course found to test.');
    await mongoose.disconnect();
    return;
  }

  const res = await axios.get(`${API_BASE}/courses/public/${publishedCourse._id}/overview`);
  const data = res.data;

  console.log('API Status:', res.status, '| Success:', data.success);
  console.log('Course title:', data.course?.title);

  // Assertions
  const assertions = [
    { name: 'Response is successful', pass: data.success === true },
    { name: 'Course object present', pass: !!data.course },
    { name: 'Course notes are stripped', pass: data.course.notes === undefined },
    { name: 'Course assessments are stripped', pass: data.course.courseAssessments === undefined },
    { name: 'Modules array present', pass: Array.isArray(data.course.modules) },
    {
      name: 'Lesson items are stripped from public overview',
      pass: data.course.modules.every(m =>
        Array.isArray(m.lessons) && m.lessons.every(l => l.items === undefined && l.quiz === undefined)
      )
    },
    { name: 'Stats object present', pass: typeof data.stats?.totalEnrolments === 'number' },
    { name: 'Overview metadata object present', pass: !!data.overview },
    { name: 'Reviews array present', pass: Array.isArray(data.reviews) },
    { name: 'Questions array present', pass: Array.isArray(data.questions) }
  ];

  let allPassed = true;
  for (const a of assertions) {
    if (a.pass) {
      console.log(`[PASS] ${a.name}`);
    } else {
      console.error(`[FAIL] ${a.name}`);
      allPassed = false;
    }
  }

  await mongoose.disconnect();
  if (allPassed) {
    console.log('\n✓ All public overview security & data integrity checks passed!');
    process.exit(0);
  } else {
    console.error('\n✗ Some checks failed.');
    process.exit(1);
  }
}

testPublicCourseOverviewSecurity().catch(err => {
  console.error(err);
  process.exit(1);
});
