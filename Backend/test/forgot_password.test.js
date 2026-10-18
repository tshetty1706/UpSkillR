require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { Learner, Instructor } = require('../model/User');

const API_BASE = 'http://localhost:5000/api/auth';
const JWT_SECRET = process.env.JWT_SECRET || 'upskillr_jwt_secret_key_2026_super_secure';
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET || 'upskillr_secure_reset_hmac_secret_2026';

const hashOtp = (otp) => {
  return crypto.createHmac('sha256', RESET_TOKEN_SECRET).update(String(otp).trim()).digest('hex');
};

async function runForgotPasswordTestSuite() {
  console.log('====================================================');
  console.log('🧪  UPSKILLR FORGOT PASSWORD & RECOVERY TEST SUITE');
  console.log('====================================================\n');

  const MONGO_URL = process.env.MONGO_URL;
  if (!MONGO_URL) {
    throw new Error('MONGO_URL missing in .env');
  }

  await mongoose.connect(MONGO_URL, { dbName: 'UpSkillr' });
  console.log('✅ Connected to MongoDB Atlas');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  };

  // 1. Seed Test Fixtures
  const learnerEmail = 'test_learner_recovery@upskillr.dev';
  const instructorEmail = 'test_instructor_recovery@upskillr.dev';
  const oauthEmail = 'test_oauth_recovery@upskillr.dev';

  await Learner.deleteMany({ email: { $in: [learnerEmail, oauthEmail] } });
  await Instructor.deleteMany({ email: instructorEmail });

  const salt = await bcrypt.genSalt(10);
  const initialPasswordHash = await bcrypt.hash('InitialPassword123!', salt);

  const testLearner = await Learner.create({
    fullName: 'Test Learner Recovery',
    email: learnerEmail,
    password: initialPasswordHash,
    role: 'learner',
    authProvider: 'local',
    isVerified: true
  });

  const testInstructor = await Instructor.create({
    fullName: 'Test Instructor Recovery',
    email: instructorEmail,
    password: initialPasswordHash,
    role: 'instructor',
    authProvider: 'local',
    isVerified: true
  });

  const testOAuthUser = await Learner.create({
    fullName: 'Test Google OAuth User',
    email: oauthEmail,
    role: 'learner',
    authProvider: 'google',
    googleId: 'google_1234567890',
    isVerified: true
  });

  console.log('✅ Test fixtures seeded (Learner, Instructor, OAuth user)\n');

  try {
    // ----------------------------------------------------
    // Test 1: Anti-Enumeration with Non-Existent Account
    // ----------------------------------------------------
    console.log('--- Test 1: Anti-Enumeration Protection ---');
    const nonExistentEmail = 'ghost_account_random987@upskillr.dev';
    const nonExistentRes = await axios.post(`${API_BASE}/forgot-password`, { email: nonExistentEmail });
    assert(
      nonExistentRes.status === 200 &&
      nonExistentRes.data.success === true &&
      nonExistentRes.data.message === 'If an account is associated with this email, we have sent instructions to reset your password.',
      'Non-existent email returns generic 200 OK without disclosing account existence'
    );

    // ----------------------------------------------------
    // Test 2: OAuth-Only Account Protection
    // ----------------------------------------------------
    console.log('\n--- Test 2: OAuth-Only Account Handling ---');
    const oauthRes = await axios.post(`${API_BASE}/forgot-password`, { email: oauthEmail });
    assert(
      oauthRes.status === 200 &&
      oauthRes.data.success === true &&
      oauthRes.data.message === 'If an account is associated with this email, we have sent instructions to reset your password.',
      'OAuth user receives identical public response without leaking provider details'
    );

    const refetchedOAuthUser = await Learner.findOne({ email: oauthEmail });
    assert(
      refetchedOAuthUser.resetPasswordOtp === null && !refetchedOAuthUser.password,
      'OAuth-only user has no password created and no reset OTP stored'
    );

    // ----------------------------------------------------
    // Test 3: Local Learner OTP Generation
    // ----------------------------------------------------
    console.log('\n--- Test 3: Local Learner Reset Request ---');
    const learnerRes = await axios.post(`${API_BASE}/forgot-password`, { email: learnerEmail });
    assert(
      learnerRes.status === 200 &&
      learnerRes.data.success === true &&
      learnerRes.data.message === 'If an account is associated with this email, we have sent instructions to reset your password.',
      'Local learner receives standard generic 200 OK'
    );

    const refetchedLearner = await Learner.findOne({ email: learnerEmail });
    assert(
      Boolean(refetchedLearner.resetPasswordOtp) && refetchedLearner.resetPasswordOtp.length === 64,
      'Reset OTP is cryptographically stored as 64-char keyed SHA-256 HMAC'
    );
    assert(
      refetchedLearner.resetPasswordExpires > new Date(),
      'Reset OTP expiry is set in the future (10 minutes)'
    );

    // ----------------------------------------------------
    // Test 4: Resend Cooldown Enforcement
    // ----------------------------------------------------
    console.log('\n--- Test 4: Resend Cooldown Enforcement ---');
    try {
      await axios.post(`${API_BASE}/forgot-password`, { email: learnerEmail });
      assert(false, 'Rapid second request should trigger 429 cooldown');
    } catch (cooldownErr) {
      assert(
        cooldownErr.response && cooldownErr.response.status === 429,
        'Rapid request returns HTTP 429 Too Many Requests with cooldown message',
        cooldownErr.response?.data?.message
      );
    }

    // ----------------------------------------------------
    // Test 5: Invalid OTP Rejection & Failed Attempt Counter
    // ----------------------------------------------------
    console.log('\n--- Test 5: Invalid OTP Rejection ---');
    try {
      await axios.post(`${API_BASE}/reset-password`, {
        email: learnerEmail,
        otp: '000000',
        newPassword: 'BrandNewSecurePassword1!',
        confirmPassword: 'BrandNewSecurePassword1!'
      });
      assert(false, 'Invalid OTP should be rejected');
    } catch (otpErr) {
      assert(
        otpErr.response && otpErr.response.status === 400 && otpErr.response.data.message.includes('attempt'),
        'Invalid OTP rejected with remaining attempts counter'
      );
    }

    const learnerAfter1Fail = await Learner.findOne({ email: learnerEmail });
    assert(learnerAfter1Fail.resetPasswordAttempts === 1, 'Failed attempt counter correctly incremented to 1');

    // ----------------------------------------------------
    // Test 6: 5 Failed Attempts Invalidation / Lockout
    // ----------------------------------------------------
    console.log('\n--- Test 6: Brute-Force Defense (5 Attempts Invalidation) ---');
    for (let i = 2; i <= 5; i++) {
      try {
        await axios.post(`${API_BASE}/reset-password`, {
          email: learnerEmail,
          otp: '111111',
          newPassword: 'BrandNewSecurePassword1!',
          confirmPassword: 'BrandNewSecurePassword1!'
        });
      } catch (err) {}
    }

    const learnerAfter5Fails = await Learner.findOne({ email: learnerEmail });
    assert(
      learnerAfter5Fails.resetPasswordOtp === null,
      '5th failed attempt permanently invalidates the challenge (OTP set to null)'
    );

    // ----------------------------------------------------
    // Test 7: Successful Password Reset for Learner
    // ----------------------------------------------------
    console.log('\n--- Test 7: Successful Password Reset (Learner) ---');
    // Set a known test OTP directly into database for deterministic verification
    const testOtp = '482915';
    const testHmac = hashOtp(testOtp);
    await Learner.updateOne(
      { email: learnerEmail },
      {
        resetPasswordOtp: testHmac,
        resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000),
        resetPasswordAttempts: 0,
        resetPasswordCooldown: null
      }
    );

    // Save old session token to test session revocation later
    const oldLearnerToken = jwt.sign(
      { id: testLearner._id, email: learnerEmail, role: 'learner' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Wait 1 second to ensure new passwordChangedAt timestamp is strictly after token iat
    await new Promise((r) => setTimeout(r, 1100));

    const newLearnerPassword = 'NewLearnerSecret2026!';
    const resetRes = await axios.post(`${API_BASE}/reset-password`, {
      email: learnerEmail,
      otp: testOtp,
      newPassword: newLearnerPassword,
      confirmPassword: newLearnerPassword
    });

    assert(
      resetRes.status === 200 && resetRes.data.success === true,
      'Valid OTP and password returns 200 OK success'
    );

    // Verify Learner can log in with new password
    const loginRes = await axios.post(`${API_BASE}/login`, {
      email: learnerEmail,
      password: newLearnerPassword
    });

    assert(
      loginRes.status === 200 && loginRes.data.success === true && loginRes.data.token,
      'Learner successfully logs in using new password'
    );

    // Verify old password fails
    try {
      await axios.post(`${API_BASE}/login`, {
        email: learnerEmail,
        password: 'InitialPassword123!'
      });
      assert(false, 'Old password should fail');
    } catch (oldLoginErr) {
      assert(
        oldLoginErr.response && oldLoginErr.response.status === 400,
        'Old password is completely rejected after reset'
      );
    }

    // ----------------------------------------------------
    // Test 8: Single-Use Challenge Guarantee
    // ----------------------------------------------------
    console.log('\n--- Test 8: Single-Use Challenge Invalidation ---');
    try {
      await axios.post(`${API_BASE}/reset-password`, {
        email: learnerEmail,
        otp: testOtp,
        newPassword: 'AnotherPassword999!',
        confirmPassword: 'AnotherPassword999!'
      });
      assert(false, 'Already consumed OTP must be rejected');
    } catch (replayErr) {
      assert(
        replayErr.response && replayErr.response.status === 400,
        'Consumed challenge is single-use and cannot be replayed'
      );
    }

    // ----------------------------------------------------
    // Test 9: Session Revocation (Tokens issued before reset are revoked)
    // ----------------------------------------------------
    console.log('\n--- Test 9: Session Revocation Verification ---');
    try {
      await axios.get(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${oldLearnerToken}` }
      });
      assert(false, 'Old token should be rejected by protect middleware');
    } catch (revocationErr) {
      assert(
        revocationErr.response && revocationErr.response.status === 401,
        'Old session token issued prior to password reset is immediately revoked (401 Unauthorized)'
      );
    }

    // ----------------------------------------------------
    // Test 10: Successful Password Reset for Instructor
    // ----------------------------------------------------
    console.log('\n--- Test 10: Instructor Password Reset ---');
    const instructorOtp = '918273';
    const instructorHmac = hashOtp(instructorOtp);
    await Instructor.updateOne(
      { email: instructorEmail },
      {
        resetPasswordOtp: instructorHmac,
        resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000),
        resetPasswordAttempts: 0,
        resetPasswordCooldown: null
      }
    );

    const newInstructorPassword = 'NewInstructorSecret2026!';
    const instResetRes = await axios.post(`${API_BASE}/reset-password`, {
      email: instructorEmail,
      otp: instructorOtp,
      newPassword: newInstructorPassword,
      confirmPassword: newInstructorPassword
    });

    assert(
      instResetRes.status === 200 && instResetRes.data.success === true,
      'Instructor password reset succeeds via dual collection lookup'
    );

    const instLoginRes = await axios.post(`${API_BASE}/login`, {
      email: instructorEmail,
      password: newInstructorPassword
    });

    assert(
      instLoginRes.status === 200 && instLoginRes.data.user.role === 'instructor',
      'Instructor successfully logs in with new password'
    );

    // ----------------------------------------------------
    // Test 11: Validation Errors (Short password, Mismatched confirmation)
    // ----------------------------------------------------
    console.log('\n--- Test 11: Password Policy Validation ---');
    try {
      await axios.post(`${API_BASE}/reset-password`, {
        email: instructorEmail,
        otp: '123456',
        newPassword: 'short',
        confirmPassword: 'short'
      });
      assert(false, 'Short password should be rejected');
    } catch (shortErr) {
      assert(
        shortErr.response && shortErr.response.status === 400 && shortErr.response.data.message.includes('8 characters'),
        'Password shorter than 8 characters is strictly rejected'
      );
    }

    try {
      await axios.post(`${API_BASE}/reset-password`, {
        email: instructorEmail,
        otp: '123456',
        newPassword: 'LongValidPassword123!',
        confirmPassword: 'MismatchedPassword123!'
      });
      assert(false, 'Mismatched password confirmation should be rejected');
    } catch (mismatchErr) {
      assert(
        mismatchErr.response && mismatchErr.response.status === 400 && mismatchErr.response.data.message.includes('not match'),
        'Mismatched password confirmation is rejected'
      );
    }

    // ----------------------------------------------------
    // Test 12: Challenge Clearance & State Invariant
    // ----------------------------------------------------
    console.log('\n--- Test 12: Challenge Clearance & State Invariant ---');
    const finalLearner = await Learner.findOne({ email: learnerEmail });
    assert(
      finalLearner.resetPasswordOtp === null,
      'Learner reset OTP challenge is completely cleared after consumption'
    );
    assert(
      finalLearner.resetPasswordAttempts === 0,
      'Learner failed attempt counter is reset to 0'
    );
    const finalInstructor = await Instructor.findOne({ email: instructorEmail });
    assert(
      finalInstructor.resetPasswordOtp === null,
      'Instructor reset OTP challenge is completely cleared after consumption'
    );

  } catch (unexpectedErr) {
    console.error('Unexpected test error:', unexpectedErr);
    failed++;
  } finally {
    // Clean up test fixtures
    await Learner.deleteMany({ email: { $in: [learnerEmail, oauthEmail] } });
    await Instructor.deleteMany({ email: instructorEmail });
    await mongoose.disconnect();
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runForgotPasswordTestSuite().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
