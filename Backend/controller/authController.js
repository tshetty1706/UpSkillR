const { Learner, Instructor, findUserByEmail, findUserById } = require('../model/User');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'upskillr_jwt_secret_key_2026_super_secure';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback';

// Temporary In-Memory Store for Pending Registrations
const pendingRegistrations = new Map();

// Helper to generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      isVerified: user.isVerified
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Helper to send Verification Email via Gmail Nodemailer SMTP
const sendVerificationOtpEmail = async (userEmail, otpCode) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.warn('EMAIL_USER or EMAIL_PASS is missing in backend .env file!');
    return { success: false, message: 'Gmail credentials (EMAIL_USER/EMAIL_PASS) missing in .env' };
  }

  try {
    console.log(`Sending Gmail verification email to: ${userEmail} with OTP: ${otpCode}`);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    const mailOptions = {
      from: `"UpSkillr" <${emailUser}>`,
      to: userEmail,
      subject: 'UpSkillr - Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0;">
          <h2 style="color: #22c55e; margin-bottom: 12px; text-align: center;">Welcome to UpSkillr! 🚀</h2>
          <p style="font-size: 15px; color: #475569; text-align: center;">Your 6-digit email verification code is:</p>
          <div style="background-color: #ffffff; padding: 18px; border-radius: 10px; text-align: center; border: 2px dashed #22c55e; margin: 20px 0;">
            <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #22c55e;">${otpCode}</span>
          </div>
          <p style="font-size: 13px; color: #94a3b8; text-align: center;">This code will expire in 10 minutes. If you did not request this verification, please ignore this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Gmail Dispatch Success:', info.messageId);
    return { success: true, info };
  } catch (error) {
    console.error('Gmail SMTP Dispatch Failed:', error.message || error);
    throw error;
  }
};

// 1. Manual Sign Up (Save user directly to MongoDB collection based on role)
exports.manualSignUp = async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide full name, email, and password.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists in either 'learners' or 'instructors' collection
    const existingUserResult = await findUserByEmail(normalizedEmail);
    if (existingUserResult) {
      return res.status(400).json({ success: false, message: 'An account with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const userRole = role === 'instructor' ? 'instructor' : 'learner';
    const TargetModel = userRole === 'instructor' ? Instructor : Learner;

    // SAVE USER TO MONGO DB IMMEDIATELY
    const newUser = new TargetModel({
      fullName,
      email: normalizedEmail,
      password: hashedPassword,
      role: userRole,
      authProvider: 'local',
      isVerified: false,
      verificationOtp: otpCode,
      otpExpiresAt
    });

    await newUser.save();
    console.log(`[USER CREATED & SAVED TO MONGO DB (${userRole}s collection)] ${newUser.email}`);

    // Store in pendingRegistrations Map as fallback
    pendingRegistrations.set(normalizedEmail, {
      fullName,
      email: normalizedEmail,
      hashedPassword,
      role: userRole,
      otpCode,
      otpExpiresAt
    });

    // Attempt to send OTP Email
    try {
      await sendVerificationOtpEmail(normalizedEmail, otpCode);
    } catch (emailErr) {
      console.warn(`[OTP EMAIL WARNING] Email dispatch failed for ${normalizedEmail}. Verification OTP: ${otpCode}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Account created! Verification code sent to your email. Enter the code to complete registration.',
      email: normalizedEmail
    });
  } catch (error) {
    console.error('=== MANUAL SIGNUP ERROR ===', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to create account. Please try again.'
    });
  }
};

// 2. Send / Resend Verification OTP
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUserResult = await findUserByEmail(normalizedEmail);
    if (existingUserResult) {
      const user = existingUserResult.user;
      if (user.isVerified) {
        return res.status(400).json({ success: false, message: 'Email address is already verified.' });
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.verificationOtp = otpCode;
      user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      // Update pendingRegistrations if present
      const pendingData = pendingRegistrations.get(normalizedEmail);
      if (pendingData) {
        pendingData.otpCode = otpCode;
        pendingData.otpExpiresAt = user.otpExpiresAt;
        pendingRegistrations.set(normalizedEmail, pendingData);
      }

      try {
        await sendVerificationOtpEmail(user.email, otpCode);
      } catch (emailErr) {
        console.warn(`[RESEND OTP EMAIL WARNING] Verification OTP for ${normalizedEmail}: ${otpCode}`);
      }

      return res.status(200).json({
        success: true,
        message: 'A new 6-digit verification code has been sent to your email.'
      });
    }

    // Fallback: pendingRegistrations check
    const pendingData = pendingRegistrations.get(normalizedEmail);
    if (pendingData) {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      pendingData.otpCode = newOtp;
      pendingData.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      pendingRegistrations.set(normalizedEmail, pendingData);

      try {
        await sendVerificationOtpEmail(normalizedEmail, newOtp);
      } catch (emailErr) {
        console.warn(`[RESEND OTP WARNING] Verification OTP for ${normalizedEmail}: ${newOtp}`);
      }

      return res.status(200).json({
        success: true,
        message: 'A new 6-digit verification code has been sent to your email.'
      });
    }

    return res.status(404).json({ success: false, message: 'Registration details not found. Please sign up again.' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to send verification email.'
    });
  }
};

// 3. Verify OTP Code (Mark user as verified in MongoDB collection)
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Please enter both email and verification code.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    // 1. Check existing MongoDB record in Learners or Instructors collection
    const existingUserResult = await findUserByEmail(normalizedEmail);
    if (existingUserResult) {
      const existingUser = existingUserResult.user;
      if (existingUser.isVerified) {
        const token = generateToken(existingUser);
        return res.status(200).json({
          success: true,
          message: 'Account is already verified!',
          token,
          user: {
            id: existingUser._id,
            fullName: existingUser.fullName,
            email: existingUser.email,
            role: existingUser.role,
            isVerified: true,
            avatar: existingUser.avatar
          }
        });
      }

      if (existingUser.verificationOtp && existingUser.verificationOtp === cleanOtp) {
        existingUser.isVerified = true;
        existingUser.verificationOtp = null;
        existingUser.otpExpiresAt = null;
        await existingUser.save();

        pendingRegistrations.delete(normalizedEmail);
        const token = generateToken(existingUser);
        return res.status(200).json({
          success: true,
          message: 'Email verified successfully!',
          token,
          user: {
            id: existingUser._id,
            fullName: existingUser.fullName,
            email: existingUser.email,
            role: existingUser.role,
            isVerified: true,
            avatar: existingUser.avatar
          }
        });
      }
    }

    // 2. Fallback: Check Pending Registration
    const pendingData = pendingRegistrations.get(normalizedEmail);
    if (pendingData && pendingData.otpCode === cleanOtp) {
      const userRole = pendingData.role === 'instructor' ? 'instructor' : 'learner';
      const TargetModel = userRole === 'instructor' ? Instructor : Learner;

      let user = await TargetModel.findOne({ email: normalizedEmail });
      if (!user) {
        user = new TargetModel({
          fullName: pendingData.fullName,
          email: pendingData.email,
          password: pendingData.hashedPassword,
          role: userRole,
          authProvider: 'local',
          isVerified: true
        });
      } else {
        user.isVerified = true;
        user.verificationOtp = null;
        user.otpExpiresAt = null;
      }

      await user.save();
      pendingRegistrations.delete(normalizedEmail);

      const token = generateToken(user);
      return res.status(201).json({
        success: true,
        message: 'Email verified & account created successfully!',
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isVerified: true,
          avatar: user.avatar
        }
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during OTP verification.' });
  }
};

// 4. Manual Login
exports.manualLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter both email and password.' });
    }

    const existingUserResult = await findUserByEmail(email.toLowerCase().trim());
    if (!existingUserResult) {
      return res.status(400).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    const user = existingUserResult.user;

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
        isVerified: user.isVerified,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Manual Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// 5. Google OAuth Redirect
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

// 6. Google OAuth Callback
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

    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_CALLBACK_URL
    });

    const { access_token } = tokenResponse.data;

    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const { id: googleId, email, name, picture } = profileResponse.data;

    if (!email) {
      return res.status(400).send('Could not retrieve email from Google account.');
    }

    const normalizedEmail = email.toLowerCase();
    let learner = await Learner.findOne({ $or: [{ googleId }, { email: normalizedEmail }] });
    let instructor = await Instructor.findOne({ $or: [{ googleId }, { email: normalizedEmail }] });
    let user = learner || instructor;

    if (user) {
      user.googleId = googleId;
      user.isVerified = true;
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();
    } else {
      const userRole = role === 'instructor' ? 'instructor' : 'learner';
      const TargetModel = userRole === 'instructor' ? Instructor : Learner;

      user = new TargetModel({
        fullName: name || 'Google User',
        email: normalizedEmail,
        role: userRole,
        authProvider: 'google',
        googleId,
        isVerified: true,
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
        isVerified: true,
        avatar: user.avatar
      })
    );

    return res.redirect(`${FRONTEND_URL}/?token=${token}&user=${userPayload}&provider=google`);
  } catch (error) {
    console.error('Google OAuth Callback Error:', error?.response?.data || error.message);
    return res.redirect(`${FRONTEND_URL}/?error=google_oauth_failed`);
  }
};

// 7. GitHub OAuth Redirect
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

// 8. GitHub OAuth Callback
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

    const profileResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${access_token}` }
    });

    const { id: githubId, name, login, avatar_url } = profileResponse.data;
    let email = profileResponse.data.email;

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

    const normalizedEmail = email.toLowerCase();
    let learner = await Learner.findOne({ $or: [{ githubId: String(githubId) }, { email: normalizedEmail }] });
    let instructor = await Instructor.findOne({ $or: [{ githubId: String(githubId) }, { email: normalizedEmail }] });
    let user = learner || instructor;

    if (user) {
      user.githubId = String(githubId);
      user.isVerified = true;
      if (avatar_url && !user.avatar) user.avatar = avatar_url;
      await user.save();
    } else {
      const userRole = role === 'instructor' ? 'instructor' : 'learner';
      const TargetModel = userRole === 'instructor' ? Instructor : Learner;

      user = new TargetModel({
        fullName: name || login || 'GitHub User',
        email: normalizedEmail,
        role: userRole,
        authProvider: 'github',
        githubId: String(githubId),
        isVerified: true,
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
        isVerified: true,
        avatar: user.avatar
      })
    );

    return res.redirect(`${FRONTEND_URL}/?token=${token}&user=${userPayload}&provider=github`);
  } catch (error) {
    console.error('GitHub OAuth Callback Error:', error?.response?.data || error.message);
    return res.redirect(`${FRONTEND_URL}/?error=github_oauth_failed`);
  }
};

// 9. Get Current User Profile
exports.getCurrentUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Token missing.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await findUserById(decoded.id, decoded.role);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.password;

    return res.status(200).json({ success: true, user: userObj });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// 10. Get All Registered Instructors with Stats
exports.getInstructors = async (req, res) => {
  try {
    const instructors = await Instructor.find({}, 'fullName email avatar');
    
    const Course = require('../model/Course');
    const Enrolment = require('../model/Enrolment');
    
    const instructorsWithStats = await Promise.all(
      instructors.map(async (inst) => {
        const courses = await Course.find({ instructorId: inst._id, status: 'published' });
        const courseIds = courses.map(c => c._id);
        const learnersCount = await Enrolment.countDocuments({ courseId: { $in: courseIds } });
        
        return {
          _id: inst._id,
          fullName: inst.fullName,
          email: inst.email,
          avatar: inst.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(inst.fullName)}&backgroundType=gradientLinear&fontSize=40`,
          coursesCount: courses.length,
          learnersCount,
          expertise: courses.map(c => c.category).filter((v, i, a) => a.indexOf(v) === i)
        };
      })
    );
    
    return res.status(200).json({ success: true, instructors: instructorsWithStats });
  } catch (error) {
    console.error('Get Instructors Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching instructors.' });
  }
};

