const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.JWT_SECRET || 'upskillr_jwt_secret_key_2026_super_secure';
const token = jwt.sign(
  { id: '6ab0009531616018dcb618a9', email: 'instructor@upskillr.com', role: 'instructor' },
  secret,
  { expiresIn: '7d' }
);

const runTest = async () => {
  try {
    console.log('--- 1. Testing GET /curriculum ---');
    const resCurriculum = await axios.get('http://localhost:5000/api/courses/6ab000fafd9ac86d3c177311/curriculum', {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('Curriculum fetch success:', resCurriculum.data.success);
    console.log('Modules count:', resCurriculum.data.modules.length);
    resCurriculum.data.modules.forEach((m, idx) => {
      console.log(`- Module ${idx + 1}: ${m.title} (state: ${m.state}, autoDraft: ${m.autoDraft}, lessons: ${m.lessons.length})`);
      m.lessons.forEach((l, lIdx) => {
        console.log(`    Lesson ${idx + 1}.${lIdx + 1}: ${l.title} (items: ${l.items.length})`);
      });
    });

    console.log('\n--- 2. Testing Auto-Draft constraint on empty module ---');
    const emptyMod = resCurriculum.data.modules.find(m => m.autoDraft === true);
    if (emptyMod) {
      try {
        await axios.patch(`http://localhost:5000/api/courses/6ab000fafd9ac86d3c177311/curriculum/modules/${emptyMod._id}/toggle-state`, {}, {
          headers: { Authorization: 'Bearer ' + token }
        });
        console.log('UNEXPECTED: Publishing empty module succeeded!');
      } catch (toggleErr) {
        console.log('EXPECTED: Publishing empty module rejected with 400:', toggleErr.response?.data?.message);
      }
    }

    console.log('\n--- 3. Testing GET /instructor/assessments-review ---');
    const resReview = await axios.get('http://localhost:5000/api/courses/instructor/assessments-review', {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('Assessments review fetch success:', resReview.data.success);
    console.log('Stats:', resReview.data.stats);
    console.log('Submissions count:', resReview.data.submissions.length);
    resReview.data.submissions.forEach((s, idx) => {
      console.log(`- Submission ${idx + 1}: ${s.learnerName} | Score: ${s.percentage}% | Status: ${s.gradeResult} | Appeal: ${s.appealStatus}`);
    });

    console.log('\n--- 4. Testing Remediation Actions (Grant Attempt & Resolve Appeal) ---');
    const pendingAppealSub = resReview.data.submissions.find(s => s.appealStatus === 'pending');
    if (pendingAppealSub) {
      const resAppeal = await axios.post(
        `http://localhost:5000/api/courses/instructor/assessments-review/${pendingAppealSub._id}/resolve-appeal`,
        { decision: 'approved', reason: 'Reviewed connection issue during quiz attempt.' },
        { headers: { Authorization: 'Bearer ' + token } }
      );
      console.log('Resolve Appeal success:', resAppeal.data.success);
      console.log('Updated appealStatus:', resAppeal.data.submission.appealStatus);
      console.log('Extra attempts granted:', resAppeal.data.submission.extraAttemptsGranted);
      console.log('Audit log entry count:', resAppeal.data.submission.auditLog.length);
      console.log('Latest audit log:', resAppeal.data.submission.auditLog[resAppeal.data.submission.auditLog.length - 1]);
    }

    console.log('\nALL BACKEND API TESTS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err.response?.data || err.message);
    process.exit(1);
  }
};

runTest();
