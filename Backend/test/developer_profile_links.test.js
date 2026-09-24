require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const Learner = require('../model/Learner');

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'upskillr_jwt_secret_key_2026_super_secure';

async function runDeveloperProfileLinksTest() {
  console.log('====================================================');
  console.log('🔗 DEVELOPER PROFILE LINKS INTEGRATION & AUDIT TEST');
  console.log('====================================================\n');

  const MONGO_URL = process.env.MONGO_URL;
  if (!MONGO_URL) {
    throw new Error('MONGO_URL missing in .env');
  }

  await mongoose.connect(MONGO_URL, { dbName: 'UpSkillr' });
  console.log('✅ Connected to MongoDB Atlas for test runner');

  const testEmail1 = 'dev_links_learner1@upskillr.test';
  const testEmail2 = 'dev_links_learner2@upskillr.test';

  await Learner.deleteMany({ email: { $in: [testEmail1, testEmail2] } });

  // Create test learners
  const learner1 = await Learner.create({
    fullName: 'Test Developer One',
    email: testEmail1,
    password: 'Password123!',
    role: 'learner',
    username: 'dev_tester_1',
    bio: 'Test bio for developer 1',
    learningGoal: 'Web Development',
    isVerified: true
  });

  const learner2 = await Learner.create({
    fullName: 'Test Developer Two',
    email: testEmail2,
    password: 'Password123!',
    role: 'learner',
    username: 'dev_tester_2',
    bio: 'Test bio for developer 2',
    learningGoal: 'Cloud Computing & DevOps',
    isVerified: true
  });

  const token1 = jwt.sign(
    { id: learner1._id, email: learner1.email, role: 'learner', fullName: learner1.fullName },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const token2 = jwt.sign(
    { id: learner2._id, email: learner2.email, role: 'learner', fullName: learner2.fullName },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const authHeader1 = { headers: { Authorization: `Bearer ${token1}` } };
  const authHeader2 = { headers: { Authorization: `Bearer ${token2}` } };

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Test 1: Backward compatibility - learner without socialLinks defaults safely
    console.log('\n--- 1. Backward Compatibility ---');
    const getRes1 = await axios.get(`${API_BASE}/learners/me`, authHeader1);
    assert(getRes1.status === 200, 'GET /api/learners/me returns 200');
    assert(getRes1.data.user.socialLinks !== undefined, 'socialLinks object is returned in user payload');
    assert(getRes1.data.user.socialLinks.github === '', 'Default github is empty string');
    assert(getRes1.data.user.socialLinks.linkedin === '', 'Default linkedin is empty string');
    assert(getRes1.data.user.socialLinks.leetcode === '', 'Default leetcode is empty string');

    // Test 2: Validation - Reject invalid GitHub URLs
    console.log('\n--- 2. Validation: Invalid URLs Rejected ---');
    const invalidGithubs = ['github.com/user', 'hello', 'https://example.com/user', 'https://github.com/'];
    for (const badGh of invalidGithubs) {
      try {
        await axios.patch(`${API_BASE}/learners/me`, { socialLinks: { github: badGh } }, authHeader1);
        assert(false, `Should have rejected invalid GitHub URL: "${badGh}"`);
      } catch (err) {
        assert(err.response?.status === 400, `Rejected invalid GitHub URL "${badGh}" with 400 Bad Request`);
      }
    }

    // Test 3: Validation - Reject invalid LinkedIn URLs
    const invalidLinkedins = ['https://linkedin.com/user', 'linkedin.com/in/user', 'random text', 'https://example.com/in/user'];
    for (const badLi of invalidLinkedins) {
      try {
        await axios.patch(`${API_BASE}/learners/me`, { socialLinks: { linkedin: badLi } }, authHeader1);
        assert(false, `Should have rejected invalid LinkedIn URL: "${badLi}"`);
      } catch (err) {
        assert(err.response?.status === 400, `Rejected invalid LinkedIn URL "${badLi}" with 400 Bad Request`);
      }
    }

    // Test 4: Validation - Reject invalid LeetCode URLs
    const invalidLeetCodes = ['https://leetcode.com/user', 'leetcode.com/u/user', 'hello', 'https://example.com/u/user'];
    for (const badLc of invalidLeetCodes) {
      try {
        await axios.patch(`${API_BASE}/learners/me`, { socialLinks: { leetcode: badLc } }, authHeader1);
        assert(false, `Should have rejected invalid LeetCode URL: "${badLc}"`);
      } catch (err) {
        assert(err.response?.status === 400, `Rejected invalid LeetCode URL "${badLc}" with 400 Bad Request`);
      }
    }

    // Test 5: Save only one link (GitHub only)
    console.log('\n--- 3. Saving Individual & Multiple Links ---');
    const saveGhOnlyRes = await axios.patch(
      `${API_BASE}/learners/me`,
      { socialLinks: { github: 'https://github.com/aartisingh07' } },
      authHeader1
    );
    assert(saveGhOnlyRes.status === 200, 'Saving only GitHub succeeds');
    assert(saveGhOnlyRes.data.user.socialLinks.github === 'https://github.com/aartisingh07', 'GitHub URL matches');
    assert(saveGhOnlyRes.data.user.socialLinks.linkedin === '', 'LinkedIn is empty');
    assert(saveGhOnlyRes.data.user.socialLinks.leetcode === '', 'LeetCode is empty');

    // Test 6: Save all three links together
    const saveAllRes = await axios.patch(
      `${API_BASE}/learners/me`,
      {
        socialLinks: {
          github: 'https://github.com/aartisingh07',
          linkedin: 'https://www.linkedin.com/in/aartissingh/',
          leetcode: 'https://leetcode.com/u/aartisingh2007/'
        }
      },
      authHeader1
    );
    assert(saveAllRes.status === 200, 'Saving all three links succeeds');
    assert(saveAllRes.data.user.socialLinks.github === 'https://github.com/aartisingh07', 'All: GitHub saved');
    assert(saveAllRes.data.user.socialLinks.linkedin === 'https://www.linkedin.com/in/aartissingh/', 'All: LinkedIn saved');
    assert(saveAllRes.data.user.socialLinks.leetcode === 'https://leetcode.com/u/aartisingh2007/', 'All: LeetCode saved');

    // Test 7: Persistence - check via GET /api/learners/me (simulating refresh/reload)
    console.log('\n--- 4. Database Persistence & Reload ---');
    const reloadRes = await axios.get(`${API_BASE}/learners/me`, authHeader1);
    assert(reloadRes.status === 200, 'Reloading profile returns 200');
    assert(reloadRes.data.user.socialLinks.github === 'https://github.com/aartisingh07', 'Persistent GitHub matches after reload');
    assert(reloadRes.data.user.socialLinks.linkedin === 'https://www.linkedin.com/in/aartissingh/', 'Persistent LinkedIn matches after reload');
    assert(reloadRes.data.user.socialLinks.leetcode === 'https://leetcode.com/u/aartisingh2007/', 'Persistent LeetCode matches after reload');

    // Directly inspect MongoDB document
    const dbLearner = await Learner.findById(learner1._id);
    assert(dbLearner.socialLinks.github === 'https://github.com/aartisingh07', 'MongoDB document contains github');
    assert(dbLearner.socialLinks.linkedin === 'https://www.linkedin.com/in/aartissingh/', 'MongoDB document contains linkedin');
    assert(dbLearner.socialLinks.leetcode === 'https://leetcode.com/u/aartisingh2007/', 'MongoDB document contains leetcode');

    // Test 8: Edit existing link
    console.log('\n--- 5. Edit Existing Link ---');
    const editRes = await axios.patch(
      `${API_BASE}/learners/me`,
      { socialLinks: { github: 'https://github.com/aarti_updated_handle' } },
      authHeader1
    );
    assert(editRes.data.user.socialLinks.github === 'https://github.com/aarti_updated_handle', 'GitHub link edited successfully');
    assert(editRes.data.user.socialLinks.linkedin === 'https://www.linkedin.com/in/aartissingh/', 'LinkedIn link preserved while editing GitHub');

    // Test 9: Remove a link
    console.log('\n--- 6. Remove a Link ---');
    const removeRes = await axios.patch(
      `${API_BASE}/learners/me`,
      { socialLinks: { linkedin: '' } },
      authHeader1
    );
    assert(removeRes.data.user.socialLinks.linkedin === '', 'LinkedIn removed (empty string)');
    const dbLearnerAfterRemove = await Learner.findById(learner1._id);
    assert(dbLearnerAfterRemove.socialLinks.linkedin === '', 'LinkedIn in MongoDB is cleared');

    // Test 10: Security - Learner 2 cannot modify Learner 1's links
    console.log('\n--- 7. Security Isolation ---');
    await axios.patch(
      `${API_BASE}/learners/me`,
      { socialLinks: { github: 'https://github.com/learner2_user' } },
      authHeader2
    );
    const dbLearner2 = await Learner.findById(learner2._id);
    assert(dbLearner2.socialLinks.github === 'https://github.com/learner2_user', "Learner 2's profile updated independently");

    const recheckLearner1 = await Learner.findById(learner1._id);
    assert(recheckLearner1.socialLinks.github === 'https://github.com/aarti_updated_handle', "Learner 1's profile was NOT modified by Learner 2");

    // Test 11: Existing profile fields still work alongside socialLinks
    console.log('\n--- 8. Overall Profile Integrity ---');
    const fullProfileUpdate = await axios.patch(
      `${API_BASE}/learners/me`,
      {
        fullName: 'Test Developer One Updated',
        bio: 'Updated bio information',
        learningGoal: 'AI & Machine Learning',
        learningInterests: ['React', 'Python', 'AI & Machine Learning'],
        socialLinks: {
          github: 'https://github.com/aartisingh07',
          linkedin: 'https://www.linkedin.com/in/aartissingh/',
          leetcode: 'https://leetcode.com/u/aartisingh2007/'
        }
      },
      authHeader1
    );
    assert(fullProfileUpdate.data.user.fullName === 'Test Developer One Updated', 'Full name updated');
    assert(fullProfileUpdate.data.user.bio === 'Updated bio information', 'Bio updated');
    assert(fullProfileUpdate.data.user.learningGoal === 'AI & Machine Learning', 'Learning goal updated');
    assert(fullProfileUpdate.data.user.learningInterests.includes('Python'), 'Learning interests updated');
    assert(fullProfileUpdate.data.user.socialLinks.github === 'https://github.com/aartisingh07', 'Social links preserved during full update');

  } finally {
    // Cleanup test data
    await Learner.deleteMany({ email: { $in: [testEmail1, testEmail2] } });
    await mongoose.disconnect();
  }

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDeveloperProfileLinksTest().catch(err => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
