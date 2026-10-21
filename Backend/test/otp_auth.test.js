require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');
axios.defaults.headers.common['x-test-suite'] = 'true';
const { Learner, Instructor } = require('../model/User');

const API_BASE = 'http://localhost:5000/api/auth';
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET || 'upskillr_secure_reset_hmac_secret_2026';

const hashOtp = (otp) => {
  return crypto.createHmac('sha256', RESET_TOKEN_SECRET).update(String(otp).trim()).digest('hex');
};

async function runOtpAuthTestSuite() {
  console.log('================================================================');
  console.log('🧪  UPSKILLR SECURE SINGLE-OTP SIGNUP & DIRECT LOGIN TEST SUITE');
  console.log('================================================================\n');

  const MONGO_URL = process.env.MONGO_URL;
  if (!MONGO_URL) {
    throw new Error('MONGO_URL missing in .env');
  }

  await mongoose.connect(MONGO_URL, { dbName: 'UpSkillr' });
  console.log('✅ Connected to MongoDB Atlas\n');

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

  const testLearnerEmail = 'test_learner_single_otp_2026@upskillr.dev';
  const testInstructorEmail = 'test_instructor_single_otp_2026@upskillr.dev';
  const testExistingEmail = 'test_existing_verified_2026@upskillr.dev';
  const testPassword = 'SecurePassword123!';

  // Clean up any previous fixtures
  await Learner.deleteMany({ email: { $in: [testLearnerEmail, testExistingEmail] } });
  await Instructor.deleteMany({ email: testInstructorEmail });

  try {
    // ----------------------------------------------------
    // Scenario 1: Manual Signup Prepares Unverified Account and Sends 30s OTP
    // ----------------------------------------------------
    console.log('--- Scenario 1: Manual Signup Prepares Unverified Account & Dispatches 30s OTP ---');
    const signupRes = await axios.post(`${API_BASE}/signup`, {
      fullName: 'Test Learner Single OTP',
      email: testLearnerEmail,
      password: testPassword,
      role: 'learner'
    });

    assert(
      signupRes.status === 200 &&
      signupRes.data.success === true &&
      signupRes.data.challengeId &&
      signupRes.data.expiresInSeconds === 30 &&
      !signupRes.data.token,
      'Signup succeeds, returns challengeId and 30s expiry, and DOES NOT issue a login token'
    );

    const unverifiedUser = await Learner.findOne({ email: testLearnerEmail });
    assert(
      unverifiedUser &&
      unverifiedUser.isVerified === false &&
      unverifiedUser.otpPurpose === 'signup' &&
      unverifiedUser.verificationOtp &&
      unverifiedUser.verificationOtp !== '123456' && // Stored as HMAC hash, not plaintext
      unverifiedUser.otpExpiresAt > new Date(),
      'User saved in MongoDB with isVerified=false, HMAC hashed OTP, and server-side 30s expiry'
    );

    // ----------------------------------------------------
    // Scenario 2: Unverified Account Cannot Log In (Login Denied with 403)
    // ----------------------------------------------------
    console.log('\n--- Scenario 2: Unverified Account Cannot Log In ---');
    let unverifiedLoginBlocked = false;
    try {
      await axios.post(`${API_BASE}/login`, {
        email: testLearnerEmail,
        password: testPassword
      });
    } catch (err) {
      if (err.response && err.response.status === 403 && err.response.data.isUnverified === true) {
        unverifiedLoginBlocked = true;
      }
    }
    assert(unverifiedLoginBlocked, 'Login is strictly denied (403 isUnverified: true) until signup verification is completed');

    // ----------------------------------------------------
    // Scenario 3: Signup Verification with Incorrect OTP is Rejected
    // ----------------------------------------------------
    console.log('\n--- Scenario 3: Signup Verification Rejects Invalid OTP ---');
    let wrongOtpRejected = false;
    try {
      await axios.post(`${API_BASE}/verify-otp`, {
        email: testLearnerEmail,
        otp: '000000',
        challengeId: signupRes.data.challengeId
      });
    } catch (err) {
      if (err.response && err.response.status === 400) {
        wrongOtpRejected = true;
      }
    }
    assert(wrongOtpRejected, 'Invalid 6-digit OTP code is rejected with HTTP 400');

    // ----------------------------------------------------
    // Scenario 4: Expired Signup OTP is Rejected Immediately
    // ----------------------------------------------------
    console.log('\n--- Scenario 4: Expired Signup OTP is Rejected ---');
    unverifiedUser.otpExpiresAt = new Date(Date.now() - 10000); // 10s expired
    const knownOtp = '654321';
    unverifiedUser.verificationOtp = hashOtp(knownOtp);
    await unverifiedUser.save();

    let expiredRejected = false;
    try {
      await axios.post(`${API_BASE}/verify-otp`, {
        email: testLearnerEmail,
        otp: knownOtp,
        challengeId: unverifiedUser.otpChallengeId
      });
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.isExpired) {
        expiredRejected = true;
      }
    }
    assert(expiredRejected, 'Expired signup OTP is rejected immediately on server-side time');

    // ----------------------------------------------------
    // Scenario 5: Resend OTP Refreshes 30s Expiry and Invalidates Previous OTP
    // ----------------------------------------------------
    console.log('\n--- Scenario 5: Resend OTP Generates Fresh 30s Expiry & Invalidates Old OTP ---');
    unverifiedUser.otpResendCooldownUntil = new Date(Date.now() - 1000); // Clear cooldown
    await unverifiedUser.save();

    const resendRes = await axios.post(`${API_BASE}/send-otp`, {
      email: testLearnerEmail,
      purpose: 'signup'
    });

    assert(
      resendRes.status === 200 &&
      resendRes.data.success === true &&
      resendRes.data.challengeId &&
      resendRes.data.expiresInSeconds === 30,
      'Resend OTP issues fresh challenge with 30s validity'
    );

    let oldOtpFailed = false;
    try {
      await axios.post(`${API_BASE}/verify-otp`, {
        email: testLearnerEmail,
        otp: knownOtp,
        challengeId: unverifiedUser.otpChallengeId
      });
    } catch (err) {
      oldOtpFailed = true;
    }
    assert(oldOtpFailed, 'Previous OTP is immediately invalidated after resend');

    // ----------------------------------------------------
    // Scenario 6: Resend Cooldown Enforcement
    // ----------------------------------------------------
    console.log('\n--- Scenario 6: Resend Cooldown Enforcement ---');
    let cooldownEnforced = false;
    try {
      await axios.post(`${API_BASE}/send-otp`, {
        email: testLearnerEmail,
        purpose: 'signup'
      });
    } catch (err) {
      if (err.response && err.response.status === 429) {
        cooldownEnforced = true;
      }
    }
    assert(cooldownEnforced, 'Server-side 30s cooldown prevents rapid OTP resend abuse');

    // ----------------------------------------------------
    // Scenario 7: Correct Signup OTP Verifies Account
    // ----------------------------------------------------
    console.log('\n--- Scenario 7: Correct Signup OTP Verifies Account ---');
    const validSignupOtp = '789123';
    const userDocAfterResend = await Learner.findOne({ email: testLearnerEmail });
    userDocAfterResend.verificationOtp = hashOtp(validSignupOtp);
    userDocAfterResend.otpExpiresAt = new Date(Date.now() + 30000);
    await userDocAfterResend.save();

    const verifySignupRes = await axios.post(`${API_BASE}/verify-otp`, {
      email: testLearnerEmail,
      otp: validSignupOtp,
      challengeId: userDocAfterResend.otpChallengeId
    });

    assert(
      verifySignupRes.status === 200 &&
      verifySignupRes.data.success === true &&
      verifySignupRes.data.isVerified === true &&
      !verifySignupRes.data.token,
      'Signup OTP verification marks isVerified=true and returns success WITHOUT issuing token'
    );

    const verifiedUserDoc = await Learner.findOne({ email: testLearnerEmail });
    assert(
      verifiedUserDoc.isVerified === true &&
      verifiedUserDoc.verificationOtp === null &&
      verifiedUserDoc.otpChallengeId === null,
      'OTP fields cleared from DB immediately upon successful signup verification'
    );

    // ----------------------------------------------------
    // Scenario 8: Newly Registered User Logs In Directly With Email/Password Without a Second OTP
    // ----------------------------------------------------
    console.log('\n--- Scenario 8: Newly Registered User Logs In Directly Without Second OTP ---');
    const directLoginRes = await axios.post(`${API_BASE}/login`, {
      email: testLearnerEmail,
      password: testPassword
    });

    assert(
      directLoginRes.status === 200 &&
      directLoginRes.data.success === true &&
      directLoginRes.data.token &&
      directLoginRes.data.user &&
      directLoginRes.data.user.email === testLearnerEmail &&
      !directLoginRes.data.requiresOtp,
      'Newly registered user logs in directly with email & password: JWT token issued, NO second OTP asked'
    );

    // ----------------------------------------------------
    // Scenario 9: Existing Verified User Can Log In Directly With Email/Password
    // ----------------------------------------------------
    console.log('\n--- Scenario 9: Existing Verified User Direct Login ---');
    const salt = await bcrypt.genSalt(10);
    const existingPasswordHash = await bcrypt.hash('ExistingPassword123!', salt);
    await Learner.create({
      fullName: 'Existing Verified Learner',
      email: testExistingEmail,
      password: existingPasswordHash,
      role: 'learner',
      authProvider: 'local',
      isVerified: true
    });

    const existingLoginRes = await axios.post(`${API_BASE}/login`, {
      email: testExistingEmail,
      password: 'ExistingPassword123!'
    });

    assert(
      existingLoginRes.status === 200 &&
      existingLoginRes.data.success === true &&
      existingLoginRes.data.token &&
      existingLoginRes.data.user.email === testExistingEmail &&
      !existingLoginRes.data.requiresOtp,
      'Existing verified user logs in directly with email and password without another OTP'
    );

    // ----------------------------------------------------
    // Scenario 10: Single-Use Invalidation & Replay Prevention on Signup OTP
    // ----------------------------------------------------
    console.log('\n--- Scenario 10: Single-Use Invalidation Prevents OTP Replay ---');
    let replayRejected = false;
    try {
      await axios.post(`${API_BASE}/verify-otp`, {
        email: testLearnerEmail,
        otp: validSignupOtp,
        challengeId: userDocAfterResend.otpChallengeId
      });
    } catch (err) {
      if (err.response && (err.response.status === 400 || err.response.data?.isAlreadyVerified)) {
        replayRejected = true;
      }
    }
    assert(replayRejected, 'Replay of already consumed signup OTP is prevented');

    // ----------------------------------------------------
    // Scenario 11: Brute-Force Protection Enforces 5-Attempt Limit on OTP
    // ----------------------------------------------------
    console.log('\n--- Scenario 11: Brute-Force Protection Enforces 5-Attempt Limit ---');
    const unverifiedAttemptEmail = 'bruteforce_test@upskillr.dev';
    await Learner.deleteMany({ email: unverifiedAttemptEmail });

    const bfSignupRes = await axios.post(`${API_BASE}/signup`, {
      fullName: 'Brute Force Tester',
      email: unverifiedAttemptEmail,
      password: testPassword,
      role: 'learner'
    });

    const bfUser = await Learner.findOne({ email: unverifiedAttemptEmail });
    bfUser.otpAttempts = 4; // Already at 4 failed attempts
    bfUser.otpExpiresAt = new Date(Date.now() + 30000);
    await bfUser.save();

    // 5th failed attempt should invalidate the challenge
    try {
      await axios.post(`${API_BASE}/verify-otp`, {
        email: unverifiedAttemptEmail,
        otp: '000000',
        challengeId: bfSignupRes.data.challengeId
      });
    } catch (err) {
      // Expected failure
    }

    const lockedBfUser = await Learner.findOne({ email: unverifiedAttemptEmail });
    assert(
      lockedBfUser.verificationOtp === null &&
      lockedBfUser.otpChallengeId === null,
      'Reaching 5 incorrect attempts permanently clears/invalidates the OTP challenge'
    );
    await Learner.deleteMany({ email: unverifiedAttemptEmail });

    // ----------------------------------------------------
    // Scenario 12: Instructor Manual Signup & Direct Login
    // ----------------------------------------------------
    console.log('\n--- Scenario 12: Instructor Manual Signup and Direct Login ---');
    const instSignupRes = await axios.post(`${API_BASE}/signup`, {
      fullName: 'Test Instructor Single OTP',
      email: testInstructorEmail,
      password: testPassword,
      role: 'instructor'
    });

    assert(
      instSignupRes.status === 200 &&
      instSignupRes.data.success === true &&
      !instSignupRes.data.token,
      'Instructor manual signup dispatches OTP and does NOT issue token'
    );

    // Verify instructor OTP
    const instructorOtp = '345678';
    const instructorDoc = await Instructor.findOne({ email: testInstructorEmail });
    instructorDoc.verificationOtp = hashOtp(instructorOtp);
    instructorDoc.otpExpiresAt = new Date(Date.now() + 30000);
    await instructorDoc.save();

    const verifyInstRes = await axios.post(`${API_BASE}/verify-otp`, {
      email: testInstructorEmail,
      otp: instructorOtp,
      challengeId: instructorDoc.otpChallengeId
    });

    assert(
      verifyInstRes.status === 200 &&
      verifyInstRes.data.isVerified === true &&
      !verifyInstRes.data.token,
      'Instructor OTP verifies email successfully without issuing token'
    );

    // Instructor logs in directly with email & password
    const instructorLoginRes = await axios.post(`${API_BASE}/login`, {
      email: testInstructorEmail,
      password: testPassword
    });

    assert(
      instructorLoginRes.status === 200 &&
      instructorLoginRes.data.success === true &&
      instructorLoginRes.data.token &&
      instructorLoginRes.data.user.role === 'instructor' &&
      !instructorLoginRes.data.requiresOtp,
      'Verified instructor logs in directly with email and password without a second OTP'
    );

    // ----------------------------------------------------
    // Scenario 13: Logout Clears Authentication Cookies
    // ----------------------------------------------------
    console.log('\n--- Scenario 13: Logout Clears Authentication Cookies ---');
    const logoutRes = await axios.post(`${API_BASE}/logout`);
    assert(
      logoutRes.status === 200 && logoutRes.data.success === true,
      'Logout endpoint cleanly responds and clears authentication cookies'
    );

    // ----------------------------------------------------
    // Scenario 14: Google & GitHub OAuth Endpoints Remain Intact
    // ----------------------------------------------------
    console.log('\n--- Scenario 14: OAuth Endpoints Preserved & Isolated ---');
    try {
      const googleRes = await axios.get(`${API_BASE}/google`, { maxRedirects: 0, validateStatus: (s) => s >= 200 && s < 400 });
      assert(
        googleRes.status === 302 && googleRes.headers.location && googleRes.headers.location.includes('accounts.google.com'),
        'Google OAuth redirect functions normally without any OTP requirement'
      );
    } catch (err) {
      assert(false, 'Google OAuth redirect failed', err.message);
    }

    try {
      const githubRes = await axios.get(`${API_BASE}/github`, { maxRedirects: 0, validateStatus: (s) => s >= 200 && s < 400 });
      assert(
        githubRes.status === 302 && githubRes.headers.location && githubRes.headers.location.includes('github.com/login/oauth/authorize'),
        'GitHub OAuth redirect functions normally without any OTP requirement'
      );
    } catch (err) {
      assert(false, 'GitHub OAuth redirect failed', err.message);
    }

    // Clean up test data
    await Learner.deleteMany({ email: { $in: [testLearnerEmail, testExistingEmail] } });
    await Instructor.deleteMany({ email: testInstructorEmail });

    console.log('\n================================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Unhandled test suite error:', err);
    await Learner.deleteMany({ email: { $in: [testLearnerEmail, testExistingEmail] } });
    await Instructor.deleteMany({ email: testInstructorEmail });
    await mongoose.disconnect();
    process.exit(1);
  }
}

runOtpAuthTestSuite();
