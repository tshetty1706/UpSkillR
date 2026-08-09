const User = require('../model/User');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const JWT_SECRET = process.env.JWT_SECRET || 'upskillr_jwt_secret_key_2026_super_secure';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback';

// Helper to generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      fullName: user.fullName
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Helper to check DB connection
const checkDbConnection = (res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database connection failed. Please whitelist your IP address on MongoDB Atlas (Network Access -> 0.0.0.0/0).'
    });
  }
  return null;
};

// 1. Manual Sign Up
exports.manualSignUp = async (req, res) => {
  const dbError = checkDbConnection(res);
  if (dbError) return dbError;

  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide full name, email, and password.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role === 'instructor' ? 'instructor' : 'learner',
      authProvider: 'local'
    });

    await newUser.save();
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar
      }
    });
  } catch (error) {
    console.error('=== MANUAL SIGNUP ERROR ===');
    console.error(error);
    console.error('===========================');
    
    // Duplicate Key Error (E11000)
    if (error && error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || String(error) || 'Server error during sign up. Please try again.',
      details: error?.stack || String(error)
    });
  }
};

// 2. Manual Login
exports.manualLogin = async (req, res) => {
  const dbError = checkDbConnection(res);
  if (dbError) return dbError;

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter both email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: `This email registered using ${user.authProvider.toUpperCase()} OAuth. Please sign in with ${user.authProvider}.`
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    return res.status(200).json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Manual Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// 3. Google OAuth Redirect
exports.googleOAuthRedirect = (req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    return res.status(500).send('Google Client ID is missing in backend .env file.');
  }

  const role = req.query.role || 'learner';
  const redirectUri = encodeURIComponent(GOOGLE_CALLBACK_URL);
  const scope = encodeURIComponent('openid profile email');
  const state = encodeURIComponent(JSON.stringify({ role }));

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;

  return res.redirect(authUrl);
};

// 4. Google OAuth Callback
exports.googleOAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.status(400).send('OAuth authorization code missing.');
    }

    let role = 'learner';
    if (state) {
      try {
        const parsedState = JSON.parse(decodeURIComponent(state));
        if (parsedState.role) role = parsedState.role;
      } catch (e) {
        console.warn('Could not parse state parameter');
      }
    }

    // Exchange auth code for access token
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_CALLBACK_URL
    });

    const { access_token } = tokenResponse.data;

    // Retrieve profile from Google
    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const { id: googleId, email, name, picture } = profileResponse.data;

    if (!email) {
      return res.status(400).send('Could not retrieve email from Google account.');
    }

    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }]
    });

    if (user) {
      user.googleId = googleId;
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();
    } else {
      user = new User({
        fullName: name || 'Google User',
        email: email.toLowerCase(),
        role: role === 'instructor' ? 'instructor' : 'learner',
        authProvider: 'google',
        googleId,
        avatar: picture || ''
      });
      await user.save();
    }

    const token = generateToken(user);
    const userPayload = encodeURIComponent(
      JSON.stringify({
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      })
    );

    return res.redirect(`${FRONTEND_URL}/?token=${token}&user=${userPayload}&provider=google`);
  } catch (error) {
    console.error('Google OAuth Callback Error:', error?.response?.data || error.message);
    return res.redirect(`${FRONTEND_URL}/?error=google_oauth_failed`);
  }
};

// 5. GitHub OAuth Redirect
exports.githubOAuthRedirect = (req, res) => {
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  if (!githubClientId) {
    return res.status(500).send('GitHub Client ID is missing in backend .env file.');
  }

  const role = req.query.role || 'learner';
  const redirectUri = encodeURIComponent(GITHUB_CALLBACK_URL);
  const state = encodeURIComponent(JSON.stringify({ role }));

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=user:email&state=${state}`;

  return res.redirect(authUrl);
};

// 6. GitHub OAuth Callback
exports.githubOAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.status(400).send('OAuth code missing.');
    }

    let role = 'learner';
    if (state) {
      try {
        const parsedState = JSON.parse(decodeURIComponent(state));
        if (parsedState.role) role = parsedState.role;
      } catch (e) {
        console.warn('Could not parse state parameter');
      }
    }

    // Exchange auth code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_CALLBACK_URL
      },
      { headers: { Accept: 'application/json' } }
    );

    const { access_token } = tokenResponse.data;
    if (!access_token) {
      return res.redirect(`${FRONTEND_URL}/?error=github_token_failed`);
    }

    // Get GitHub Profile
    const profileResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${access_token}` }
    });

    const { id: githubId, name, login, avatar_url } = profileResponse.data;
    let email = profileResponse.data.email;

    // If GitHub email is null (private email setting), fetch from /user/emails
    if (!email) {
      const emailResponse = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `token ${access_token}` }
      });

      const primaryEmailObj = emailResponse.data.find((e) => e.primary && e.verified) || emailResponse.data[0];
      if (primaryEmailObj) {
        email = primaryEmailObj.email;
      }
    }

    if (!email) {
      email = `${login}@github.user`;
    }

    let user = await User.findOne({
      $or: [{ githubId: String(githubId) }, { email: email.toLowerCase() }]
    });

    if (user) {
      user.githubId = String(githubId);
      if (avatar_url && !user.avatar) user.avatar = avatar_url;
      await user.save();
    } else {
      user = new User({
        fullName: name || login || 'GitHub User',
        email: email.toLowerCase(),
        role: role === 'instructor' ? 'instructor' : 'learner',
        authProvider: 'github',
        githubId: String(githubId),
        avatar: avatar_url || ''
      });
      await user.save();
    }

    const token = generateToken(user);
    const userPayload = encodeURIComponent(
      JSON.stringify({
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      })
    );

    return res.redirect(`${FRONTEND_URL}/?token=${token}&user=${userPayload}&provider=github`);
  } catch (error) {
    console.error('GitHub OAuth Callback Error:', error?.response?.data || error.message);
    return res.redirect(`${FRONTEND_URL}/?error=github_oauth_failed`);
  }
};

// 7. Get Current User Profile
exports.getCurrentUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Token missing.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};
