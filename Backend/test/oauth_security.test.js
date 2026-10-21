const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Learner, Instructor } = require('../model/User');
const authController = require('../controller/authController');
const { protect } = require('../middleware/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'upskillr_jwt_secret_key_2026_super_secure';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

test.describe('UpSkillR Authentication Security & OAuth Regression Tests', () => {
  let originalAxiosGet;
  let originalAxiosPost;

  test.before(async () => {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
      throw new Error('MONGO_URL missing in environment');
    }
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUrl, { dbName: 'UpSkillr' });
    }

    // Clean up any old test accounts
    await Learner.deleteMany({ email: /.*@oauth-audit\.upskillr\.test$/i });
    await Instructor.deleteMany({ email: /.*@oauth-audit\.upskillr\.test$/i });

    // Store original axios methods for restoration
    originalAxiosGet = axios.get;
    originalAxiosPost = axios.post;
  });

  test.after(async () => {
    // Restore axios mocks
    axios.get = originalAxiosGet;
    axios.post = originalAxiosPost;

    // Clean up created test accounts
    await Learner.deleteMany({ email: /.*@oauth-audit\.upskillr\.test$/i });
    await Instructor.deleteMany({ email: /.*@oauth-audit\.upskillr\.test$/i });

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  test.it('1. Unregistered user attempts Google login -> Rejected, NO account created in DB, NO cookies/tokens', async () => {
    const unregisteredEmail = 'unregistered_google@oauth-audit.upskillr.test';
    const unregisteredGoogleId = 'google_uid_unregistered_99901';

    // Verify user does not exist prior to test
    const countBefore = await Learner.countDocuments({ email: unregisteredEmail });
    assert.equal(countBefore, 0, 'User must not exist before test');

    // Mock Google token and userinfo responses
    axios.post = async (url) => {
      if (url.includes('oauth2.googleapis.com/token')) {
        return { data: { access_token: 'mock_token_unreg_google' } };
      }
      return originalAxiosPost(url);
    };

    axios.get = async (url) => {
      if (url.includes('googleapis.com/oauth2/v2/userinfo')) {
        return {
          data: {
            id: unregisteredGoogleId,
            email: unregisteredEmail,
            name: 'Unregistered Google User',
            picture: 'https://example.com/photo.jpg',
            verified_email: true
          }
        };
      }
      return originalAxiosGet(url);
    };

    let redirectedUrl = null;
    let cookieSet = null;

    const req = {
      query: {
        code: 'mock_code_unreg_google_1',
        state: JSON.stringify({ role: 'learner', action: 'login' })
      }
    };

    const res = {
      redirect: (url) => {
        redirectedUrl = url;
      },
      cookie: (name, val, opts) => {
        cookieSet = { name, val, opts };
      }
    };

    await authController.googleOAuthCallback(req, res);

    // Assert redirect to login with no_account error
    assert.ok(redirectedUrl, 'Should redirect');
    assert.equal(redirectedUrl, `${FRONTEND_URL}/login?error=no_account&provider=google`);

    // Assert NO cookie was issued
    assert.equal(cookieSet, null, 'Must NOT issue session cookie for failed OAuth login');

    // Assert database contains NO newly created user
    const countAfterLearner = await Learner.countDocuments({ email: unregisteredEmail });
    const countAfterInstructor = await Instructor.countDocuments({ email: unregisteredEmail });
    assert.equal(countAfterLearner + countAfterInstructor, 0, 'CRITICAL: Must NOT create user document in MongoDB on rejected OAuth login');
  });

  test.it('2. Existing user logs in with linked Google account -> Login succeeds, issues token & cookie', async () => {
    const email = 'linked_google@oauth-audit.upskillr.test';
    const googleId = 'google_uid_linked_12345';

    await Learner.create({
      fullName: 'Linked Google Learner',
      email,
      googleId,
      authProvider: 'google',
      role: 'learner',
      isVerified: true
    });

    axios.post = async (url) => {
      if (url.includes('oauth2.googleapis.com/token')) {
        return { data: { access_token: 'mock_token_linked_google' } };
      }
      return originalAxiosPost(url);
    };

    axios.get = async (url) => {
      if (url.includes('googleapis.com/oauth2/v2/userinfo')) {
        return {
          data: {
            id: googleId,
            email,
            name: 'Linked Google Learner',
            picture: 'https://example.com/linked.jpg',
            verified_email: true
          }
        };
      }
      return originalAxiosGet(url);
    };

    let redirectedUrl = null;
    let cookieSet = null;

    const req = {
      query: {
        code: 'mock_code_linked_google_2',
        state: JSON.stringify({ role: 'learner', action: 'login' })
      }
    };

    const res = {
      redirect: (url) => {
        redirectedUrl = url;
      },
      cookie: (name, val, opts) => {
        cookieSet = { name, val, opts };
      }
    };

    await authController.googleOAuthCallback(req, res);

    assert.equal(redirectedUrl, `${FRONTEND_URL}/dashboard`);
    assert.ok(cookieSet, 'Cookie must be set on successful Google login');
    assert.equal(cookieSet.name, 'token');
    assert.equal(cookieSet.opts.httpOnly, true);

    const decoded = jwt.verify(cookieSet.val, JWT_SECRET);
    assert.equal(decoded.email, email);
    assert.equal(decoded.role, 'learner');
  });

  test.it('3. Local email/password user attempts Google login without linking -> Rejected as unlinked, NO silent linking', async () => {
    const email = 'local_only@oauth-audit.upskillr.test';
    const attackerGoogleId = 'google_uid_spoofed_888';

    const localUser = await Learner.create({
      fullName: 'Local User Only',
      email,
      password: await bcrypt.hash('Password123!', 10),
      authProvider: 'local',
      googleId: null,
      role: 'learner',
      isVerified: true
    });

    axios.post = async (url) => {
      if (url.includes('oauth2.googleapis.com/token')) {
        return { data: { access_token: 'mock_token_spoof_google' } };
      }
      return originalAxiosPost(url);
    };

    axios.get = async (url) => {
      if (url.includes('googleapis.com/oauth2/v2/userinfo')) {
        return {
          data: {
            id: attackerGoogleId,
            email,
            name: 'Attacker or Unlinked Account',
            verified_email: true
          }
        };
      }
      return originalAxiosGet(url);
    };

    let redirectedUrl = null;
    let cookieSet = null;

    const req = {
      query: {
        code: 'mock_code_unlinked_google_3',
        state: JSON.stringify({ role: 'learner', action: 'login' })
      }
    };

    const res = {
      redirect: (url) => {
        redirectedUrl = url;
      },
      cookie: (name, val, opts) => {
        cookieSet = { name, val, opts };
      }
    };

    await authController.googleOAuthCallback(req, res);

    assert.equal(redirectedUrl, `${FRONTEND_URL}/login?error=provider_not_linked&provider=google`);
    assert.equal(cookieSet, null, 'No cookie should be issued for unlinked account');

    // Confirm database record was NOT mutated
    const refreshedUser = await Learner.findById(localUser._id);
    assert.equal(refreshedUser.googleId, null, 'Must NOT silently link googleId to existing local account');
    assert.equal(refreshedUser.authProvider, 'local', 'Must NOT change authProvider to google');
  });

  test.it('4. Unregistered user attempts GitHub login -> Rejected, NO account created in DB, NO cookies/tokens', async () => {
    const unregisteredEmail = 'unregistered_github@oauth-audit.upskillr.test';
    const unregisteredGithubId = '987654321';

    axios.post = async (url) => {
      if (url.includes('github.com/login/oauth/access_token')) {
        return { data: { access_token: 'mock_github_token_unreg' } };
      }
      return originalAxiosPost(url);
    };

    axios.get = async (url) => {
      if (url === 'https://api.github.com/user') {
        return {
          data: {
            id: unregisteredGithubId,
            name: 'Unregistered GitHub User',
            login: 'unreg_gh',
            email: unregisteredEmail
          }
        };
      }
      return originalAxiosGet(url);
    };

    let redirectedUrl = null;
    let cookieSet = null;

    const req = {
      query: {
        code: 'mock_code_unreg_gh_4',
        state: JSON.stringify({ role: 'learner', action: 'login' })
      }
    };

    const res = {
      redirect: (url) => {
        redirectedUrl = url;
      },
      cookie: (name, val, opts) => {
        cookieSet = { name, val, opts };
      }
    };

    await authController.githubOAuthCallback(req, res);

    assert.equal(redirectedUrl, `${FRONTEND_URL}/login?error=no_account&provider=github`);
    assert.equal(cookieSet, null, 'Must NOT issue cookie for unregistered GitHub login');

    const exists = await Learner.findOne({ email: unregisteredEmail });
    assert.equal(exists, null, 'Must NOT create account in MongoDB for unregistered GitHub login attempt');
  });

  test.it('5. Existing user logs in with linked GitHub account -> Login succeeds', async () => {
    const email = 'linked_github@oauth-audit.upskillr.test';
    const githubId = '123456789';

    await Learner.create({
      fullName: 'Linked GitHub Learner',
      email,
      githubId,
      authProvider: 'github',
      role: 'learner',
      isVerified: true
    });

    axios.post = async (url) => {
      if (url.includes('github.com/login/oauth/access_token')) {
        return { data: { access_token: 'mock_github_token_linked' } };
      }
      return originalAxiosPost(url);
    };

    axios.get = async (url) => {
      if (url === 'https://api.github.com/user') {
        return {
          data: {
            id: githubId,
            name: 'Linked GitHub Learner',
            login: 'linked_gh',
            email
          }
        };
      }
      return originalAxiosGet(url);
    };

    let redirectedUrl = null;
    let cookieSet = null;

    const req = {
      query: {
        code: 'mock_code_linked_gh_5',
        state: JSON.stringify({ role: 'learner', action: 'login' })
      }
    };

    const res = {
      redirect: (url) => {
        redirectedUrl = url;
      },
      cookie: (name, val, opts) => {
        cookieSet = { name, val, opts };
      }
    };

    await authController.githubOAuthCallback(req, res);

    assert.equal(redirectedUrl, `${FRONTEND_URL}/dashboard`);
    assert.ok(cookieSet, 'Must set cookie for linked GitHub user');
    const decoded = jwt.verify(cookieSet.val, JWT_SECRET);
    assert.equal(decoded.email, email);
  });

  test.it('6. Explicit Google signup (action=signup) creates user when account does not exist', async () => {
    const newSignupEmail = 'new_google_signup@oauth-audit.upskillr.test';
    const newGoogleId = 'google_uid_new_signup_777';

    axios.post = async (url) => {
      if (url.includes('oauth2.googleapis.com/token')) {
        return { data: { access_token: 'mock_token_new_signup' } };
      }
      return originalAxiosPost(url);
    };

    axios.get = async (url) => {
      if (url.includes('googleapis.com/oauth2/v2/userinfo')) {
        return {
          data: {
            id: newGoogleId,
            email: newSignupEmail,
            name: 'New Google Signup User',
            verified_email: true
          }
        };
      }
      return originalAxiosGet(url);
    };

    let redirectedUrl = null;
    let cookieSet = null;

    const req = {
      query: {
        code: 'mock_code_signup_google_6',
        state: JSON.stringify({ role: 'learner', action: 'signup' })
      }
    };

    const res = {
      redirect: (url) => {
        redirectedUrl = url;
      },
      cookie: (name, val, opts) => {
        cookieSet = { name, val, opts };
      }
    };

    await authController.googleOAuthCallback(req, res);

    assert.equal(redirectedUrl, `${FRONTEND_URL}/dashboard`);
    assert.ok(cookieSet, 'Cookie should be issued after explicit registration');

    const createdUser = await Learner.findOne({ email: newSignupEmail });
    assert.ok(createdUser, 'User document must be created for explicit signup');
    assert.equal(createdUser.authProvider, 'google');
    assert.equal(createdUser.googleId, newGoogleId);
  });

  test.it('7. Explicit Google signup for already existing account redirects to login with account_exists error', async () => {
    const existingEmail = 'new_google_signup@oauth-audit.upskillr.test'; // created in test 6

    let redirectedUrl = null;
    let cookieSet = null;

    const req = {
      query: {
        code: 'mock_code_dup_signup_7',
        state: JSON.stringify({ role: 'learner', action: 'signup' })
      }
    };

    const res = {
      redirect: (url) => {
        redirectedUrl = url;
      },
      cookie: (name, val, opts) => {
        cookieSet = { name, val, opts };
      }
    };

    await authController.googleOAuthCallback(req, res);

    assert.equal(redirectedUrl, `${FRONTEND_URL}/login?error=account_exists&provider=google`);
    assert.equal(cookieSet, null, 'Must not issue new cookie for duplicate registration');
  });

  test.it('8. Manual login with valid credentials logs in directly and issues HttpOnly cookie', async () => {
    const email = 'manual_test_valid@oauth-audit.upskillr.test';
    const plainPassword = 'ValidPassword123!';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    await Learner.create({
      fullName: 'Manual Login Tester',
      email,
      password: hashedPassword,
      authProvider: 'local',
      role: 'learner',
      isVerified: true
    });

    let statusCode = null;
    let responseData = null;
    let cookieSet = null;

    const req = {
      body: { email, password: plainPassword }
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
          }
        };
      },
      cookie: (name, val, opts) => {
        cookieSet = { name, val, opts };
      }
    };

    await authController.manualLogin(req, res);

    assert.equal(statusCode, 200);
    assert.equal(responseData.success, true);
    assert.ok(responseData.token, 'JWT Token issued');
    assert.ok(cookieSet, 'HttpOnly cookie issued upon successful credentials login');
    assert.equal(cookieSet.name, 'token');
    assert.equal(cookieSet.opts.httpOnly, true);
  });

  test.it('9. Manual login with incorrect password is safely rejected', async () => {
    const email = 'manual_test_valid@oauth-audit.upskillr.test';

    let statusCode = null;
    let responseData = null;
    let cookieSet = null;

    const req = {
      body: { email, password: 'WrongPassword999!' }
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
          }
        };
      },
      cookie: (name, val, opts) => {
        cookieSet = { name, val, opts };
      }
    };

    await authController.manualLogin(req, res);

    assert.equal(statusCode, 400);
    assert.equal(responseData.success, false);
    assert.equal(responseData.message, 'Invalid email or password.');
    assert.equal(cookieSet, null, 'Must NOT set cookie on invalid password');
  });

  test.it('10. Manual login with non-existent email is safely rejected', async () => {
    let statusCode = null;
    let responseData = null;

    const req = {
      body: { email: 'does_not_exist@oauth-audit.upskillr.test', password: 'Password123!' }
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
          }
        };
      }
    };

    await authController.manualLogin(req, res);

    assert.equal(statusCode, 400);
    assert.equal(responseData.success, false);
    assert.equal(responseData.message, 'Invalid email or password.');
  });

  test.it('11. Manual signup prevents duplicate registrations', async () => {
    const existingEmail = 'manual_test_valid@oauth-audit.upskillr.test';

    let statusCode = null;
    let responseData = null;

    const req = {
      body: {
        fullName: 'Duplicate Tester',
        email: existingEmail,
        password: 'Password123!',
        role: 'learner'
      }
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
          }
        };
      }
    };

    await authController.manualSignUp(req, res);

    assert.equal(statusCode, 400);
    assert.equal(responseData.success, false);
    assert.equal(responseData.message, 'An account with this email address already exists.');
  });

  test.it('12. Protected endpoint receives no token/cookie -> Access denied (401)', async () => {
    let statusCode = null;
    let responseData = null;
    let nextCalled = false;

    const req = {
      headers: {},
      cookies: {}
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
          }
        };
      }
    };
    const next = () => {
      nextCalled = true;
    };

    await protect(req, res, next);

    assert.equal(nextCalled, false);
    assert.equal(statusCode, 401);
    assert.equal(responseData.success, false);
  });

  test.it('13. Logout endpoint clears authentication cookies cleanly', () => {
    const clearedCookies = [];
    let statusCode = null;
    let responseData = null;

    const req = {};
    const res = {
      clearCookie: (name, opts) => {
        clearedCookies.push({ name, opts });
      },
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
          }
        };
      }
    };

    authController.logout(req, res);

    assert.equal(statusCode, 200);
    assert.equal(responseData.success, true);
    assert.ok(clearedCookies.some((c) => c.name === 'token'));
    assert.ok(clearedCookies.some((c) => c.name === 'upskillr_token'));
  });

  test.it('14. Obsolete test script test_curriculum_api.js is removed and inaccessible', () => {
    const obsoleteFilePath = path.join(__dirname, '../test_curriculum_api.js');
    const exists = fs.existsSync(obsoleteFilePath);
    assert.equal(exists, false, 'test_curriculum_api.js must be deleted');
  });
});
