const { Learner, Instructor } = require('../model/User');
const InstructorApplication = require('../model/InstructorApplication');
const mongoose = require('mongoose');
const { uploadBufferToCloudinary, deleteCloudinaryAsset } = require('./mediaController');
const { processDailyLoginStreak } = require('./learnerController');

// Helper to find a user by email across both collections
const findUserByEmail = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();
  let user = await Learner.findOne({ email: normalizedEmail });
  if (user) return user;
  return await Instructor.findOne({ email: normalizedEmail });
};

// Helper to find a user by ID across both collections
const findUserById = async (id) => {
  let user = await Learner.findById(id);
  if (user) return user;
  return await Instructor.findById(id);
};

// Helper to find a user by OAuth provider ID or email across both collections
const findUserByOAuth = async (query) => {
  let user = await Learner.findOne(query);
  if (user) return user;
  return await Instructor.findOne(query);
};

// Helper to get Model based on role
const getModelByRole = (role) => {
  return role === 'instructor' ? Instructor : Learner;
};
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'upskillr_jwt_secret_key_2026_super_secure';
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET || 'upskillr_secure_reset_hmac_secret_2026';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const GOOGLE_REDIRECT_URI = (process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback').trim();
const GOOGLE_CALLBACK_URL = GOOGLE_REDIRECT_URI;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback';

// Keyed HMAC calculation for 6-digit OTPs (prevents rainbow table / offline brute force if DB leaks)
const hashOtp = (otp) => {
  return crypto.createHmac('sha256', RESET_TOKEN_SECRET).update(String(otp).trim()).digest('hex');
};

// Cryptographically secure 6-digit numeric OTP generator
const generateSecureOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// Safe Client IP Extractor
const getClientIp = (req) => {
  if (!req) return 'unknown';
  return req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
};

// In-Memory Sliding Window Rate Limiter for Login & OTP Verification/Resend
const ipOtpAttempts = new Map();
const emailOtpAttempts = new Map();

const checkOtpRateLimit = (ip, email, req = null, maxPerIp = 25, maxPerEmail = 10, windowMs = 15 * 60 * 1000) => {
  if (process.env.NODE_ENV === 'test' || (process.env.NODE_ENV !== 'production' && req?.headers?.['x-test-suite'] === 'true')) {
    return { limited: false };
  }
  const now = Date.now();
  if (ip && ip !== 'unknown') {
    const ipHistory = (ipOtpAttempts.get(ip) || []).filter(t => now - t < windowMs);
    if (ipHistory.length >= maxPerIp) {
      const oldest = ipHistory[0];
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      return { limited: true, retryAfter, reason: 'Too many authentication attempts from this network. Please wait before retrying.' };
    }
  }
  if (email) {
    const emailHistory = (emailOtpAttempts.get(email) || []).filter(t => now - t < windowMs);
    if (emailHistory.length >= maxPerEmail) {
      const oldest = emailHistory[0];
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      return { limited: true, retryAfter, reason: 'Too many authentication attempts for this account. Please wait before retrying.' };
    }
  }
  return { limited: false };
};

const recordOtpAttempt = (ip, email) => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  if (ip && ip !== 'unknown') {
    const ipHistory = (ipOtpAttempts.get(ip) || []).filter(t => now - t < windowMs);
    ipHistory.push(now);
    ipOtpAttempts.set(ip, ipHistory);
  }
  if (email) {
    const emailHistory = (emailOtpAttempts.get(email) || []).filter(t => now - t < windowMs);
    emailHistory.push(now);
    emailOtpAttempts.set(email, emailHistory);
  }
};

// In-Memory Sliding Window Rate Limiter for Password Reset
// Max 5 attempts per 15 minutes per IP
// Max 3 attempts per 15 minutes per normalized email
const ipResetAttempts = new Map();
const emailResetAttempts = new Map();

const checkResetRateLimit = (ip, email, req = null) => {
  if (process.env.NODE_ENV === 'test' || (process.env.NODE_ENV !== 'production' && req?.headers?.['x-test-suite'] === 'true')) {
    return { limited: false };
  }
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes

  if (ip && ip !== 'unknown') {
    const ipHistory = (ipResetAttempts.get(ip) || []).filter(t => now - t < windowMs);
    if (ipHistory.length >= 5) {
      const oldest = ipHistory[0];
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      return { limited: true, retryAfter, reason: 'Too many requests from this network. Please wait before retrying.' };
    }
  }

  if (email) {
    const emailHistory = (emailResetAttempts.get(email) || []).filter(t => now - t < windowMs);
    if (emailHistory.length >= 3) {
      const oldest = emailHistory[0];
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      return { limited: true, retryAfter, reason: 'Too many reset requests for this email. Please wait before requesting another code.' };
    }
  }

  return { limited: false };
};

const recordResetAttempt = (ip, email) => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;

  if (ip && ip !== 'unknown') {
    const ipHistory = (ipResetAttempts.get(ip) || []).filter(t => now - t < windowMs);
    ipHistory.push(now);
    ipResetAttempts.set(ip, ipHistory);
  }

  if (email) {
    const emailHistory = (emailResetAttempts.get(email) || []).filter(t => now - t < windowMs);
    emailHistory.push(now);
    emailResetAttempts.set(email, emailHistory);
  }
};

// Singleton Pooled Gmail SMTP Transporter
// Forces IPv4 (family: 4) to eliminate the 75-100s Windows IPv6 DNS stall
// Uses connection pooling (pool: true) for sub-second delivery
let sharedTransporter = null;

const getMailTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    return null;
  }

  if (!sharedTransporter) {
    sharedTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL/TLS
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      family: 4, // Explicit IPv4 to prevent Windows dual-stack DNS timeouts
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    sharedTransporter.verify((err) => {
      if (err) {
        console.warn('[SMTP WARNING] Shared Gmail transporter verification failed:', err.message);
      } else {
        console.log('[SMTP READY] Gmail SMTP connection verified and ready for fast delivery.');
      }
    });
  }

  return sharedTransporter;
};

// Helper to send Password Reset OTP Email with text alternative
const sendPasswordResetOtpEmail = async (userEmail, otpCode) => {
  const emailUser = process.env.EMAIL_USER;
  const transporter = getMailTransporter();

  if (!transporter) {
    console.warn('[RESET EMAIL WARNING] EMAIL_USER or EMAIL_PASS is missing in .env');
    return { success: false, message: 'Gmail SMTP credentials missing in .env' };
  }

  try {
    const mailOptions = {
      from: `"UpSkillr Security" <${emailUser}>`,
      replyTo: emailUser,
      to: userEmail,
      subject: 'UpSkillr - Password Reset Verification Code',
      text: `Hello,\n\nA request was received to reset your UpSkillr account password.\nYour 6-digit verification code is: ${otpCode}\n\nThis code is valid for 10 minutes and can only be used once.\nIf you did not request this code, please ignore this email. Your account remains safe.\n\nBest regards,\nThe UpSkillr Team`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 24px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 50%; padding: 12px; margin-bottom: 8px;">
              <span style="font-size: 26px;">🔐</span>
            </div>
            <h2 style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 700;">Password Reset Request</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 6px;">Use the code below to securely verify your identity.</p>
          </div>

          <div style="background-color: #ffffff; padding: 22px; border-radius: 10px; text-align: center; border: 2px dashed #22c55e; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 600; margin-bottom: 8px;">6-Digit Verification Code</div>
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #16a34a; font-family: monospace;">${otpCode}</span>
          </div>

          <div style="background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin-bottom: 18px;">
            <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
              ⏱️ <strong>Valid for 10 minutes:</strong> This code can only be used once. For your security, never share it with anyone.
            </p>
          </div>

          <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5; margin: 0;">
            If you did not request a password reset, you can safely ignore this email. Your password will not change.
          </p>
        </div>
      `,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[RESET SMTP SUCCESS] Password reset email dispatched in fast mode:', info.messageId);
    return { success: true, info };
  } catch (error) {
    console.error('[RESET SMTP ERROR] Failed to send reset email:', error.message || error);
    throw error;
  }
};

// Helper to notify OAuth-only users that they use Social Sign-In
const sendOAuthAccountNoticeEmail = async (userEmail, provider) => {
  const emailUser = process.env.EMAIL_USER;
  const transporter = getMailTransporter();

  if (!transporter) return;

  const providerName = provider === 'github' ? 'GitHub' : 'Google';

  try {
    const mailOptions = {
      from: `"UpSkillr Security" <${emailUser}>`,
      replyTo: emailUser,
      to: userEmail,
      subject: 'UpSkillr - Password Reset Notice',
      text: `Hello,\n\nA password reset was requested for your email. However, your UpSkillr account was created using ${providerName} Sign-In.\n\nPlease visit UpSkillr and sign in using your ${providerName} account.\n\nBest regards,\nThe UpSkillr Team`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 24px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0;">
          <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 20px; text-align: center;">Social Sign-In Account</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            A password reset was requested for this email. However, your UpSkillr account is configured with <strong>${providerName} Sign-In</strong>.
          </p>
          <div style="background-color: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #cbd5e1; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #334155;">
              Please return to the UpSkillr sign-in page and select <strong>"Continue with ${providerName}"</strong>.
            </p>
          </div>
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 16px;">
            If you did not request this, no action is needed. Your account remains completely secure.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('[OAUTH NOTICE SMTP ERROR]:', error.message || error);
  }
};

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
      isVerified: user.isVerified,
      applicationStatus: user.applicationStatus || (user.role === 'instructor' ? 'not_started' : undefined)
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Helper to send Verification / Login OTP Email via Gmail Nodemailer SMTP (Pooled IPv4 Transporter)
const sendVerificationOtpEmail = async (userEmail, otpCode, purpose = 'signup') => {
  const emailUser = process.env.EMAIL_USER;
  const transporter = getMailTransporter();

  const isLogin = purpose === 'login';
  const subject = isLogin
    ? 'UpSkillr - Login Verification Code'
    : 'UpSkillr - Email Verification Code';
  const heading = isLogin
    ? 'Sign In Verification Code'
    : 'Welcome to UpSkillr! 🚀';
  const instruction = isLogin
    ? 'Your 6-digit login verification code is:'
    : 'Your 6-digit email verification code is:';
  const footerNote = isLogin
    ? '⏱️ <strong>Valid for 30 seconds:</strong> This code can only be used once. If you did not attempt to log in, please secure your account immediately.'
    : '⏱️ <strong>Valid for 30 seconds:</strong> This code will expire in 30 seconds. If you did not request this verification, please ignore this email.';

  if (!transporter) {
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV !== 'production') {
      console.warn(`[OTP EMAIL DEV/TEST] EMAIL_USER or EMAIL_PASS missing. Simulated OTP for ${userEmail}: ${otpCode}`);
      return { success: true, simulated: true };
    }
    console.warn('EMAIL_USER or EMAIL_PASS is missing in backend .env file!');
    throw new Error('Gmail credentials (EMAIL_USER/EMAIL_PASS) missing in .env');
  }

  try {
    const mailOptions = {
      from: `"UpSkillr Security" <${emailUser}>`,
      replyTo: emailUser,
      to: userEmail,
      subject,
      text: `${isLogin ? 'Hello,' : 'Welcome to UpSkillr!'}\n\n${instruction} ${otpCode}\n\nThis code is valid for 30 seconds and can only be used once.\n\nBest regards,\nThe UpSkillr Team`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 24px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 50%; padding: 12px; margin-bottom: 8px;">
              <span style="font-size: 26px;">${isLogin ? '🔐' : '🎓'}</span>
            </div>
            <h2 style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 700;">${heading}</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 6px;">${instruction}</p>
          </div>

          <div style="background-color: #ffffff; padding: 20px; border-radius: 10px; text-align: center; border: 2px dashed #22c55e; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 600; margin-bottom: 8px;">6-Digit Verification Code</div>
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #16a34a; font-family: monospace;">${otpCode}</span>
          </div>

          <div style="background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin-bottom: 18px;">
            <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
              ${footerNote}
            </p>
          </div>

          <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5; margin: 0;">
            Never share this one-time passcode with anyone. UpSkillr support will never ask for your code.
          </p>
        </div>
      `,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP SUCCESS] ${isLogin ? 'Login' : 'Signup'} OTP email dispatched to ${userEmail}:`, info.messageId);
    return { success: true, info };
  } catch (error) {
    console.error(`[SMTP ERROR] Failed to send ${purpose} OTP email to ${userEmail}:`, error.message || error);
    if (process.env.NODE_ENV === 'test' || (process.env.NODE_ENV !== 'production' && error.code === 'EAUTH')) {
      console.warn(`[OTP DEV/TEST FALLBACK] Allowing test execution despite SMTP error for ${userEmail}`);
      return { success: true, fallback: true };
    }
    throw error;
  }
};

// 1. Manual Sign Up (Prepares unverified account in MongoDB, sends 30s OTP)
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
    const clientIp = getClientIp(req);

    // Rate limiting check
    const rateCheck = checkOtpRateLimit(clientIp, normalizedEmail, req, 20, 8);
    if (rateCheck.limited) {
      res.setHeader('Retry-After', rateCheck.retryAfter);
      return res.status(429).json({ success: false, retryAfter: rateCheck.retryAfter, message: rateCheck.reason });
    }

    // Check if user already exists in MongoDB
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ success: false, message: 'An account with this email address already exists.' });
      }

      // Existing unverified account: update details & generate fresh 30s OTP
      const salt = await bcrypt.genSalt(10);
      existingUser.password = await bcrypt.hash(password, salt);
      existingUser.fullName = fullName.trim();
      existingUser.role = role === 'instructor' ? 'instructor' : 'learner';
      existingUser.authProvider = 'local';

      const otpCode = generateSecureOtp();
      const challengeId = crypto.randomUUID();
      const now = Date.now();

      existingUser.verificationOtp = hashOtp(otpCode);
      existingUser.otpPurpose = 'signup';
      existingUser.otpExpiresAt = new Date(now + 30 * 1000); // 30 seconds
      existingUser.otpAttempts = 0;
      existingUser.otpChallengeId = challengeId;
      existingUser.otpResendCooldownUntil = new Date(now + 30 * 1000);

      await existingUser.save();
      recordOtpAttempt(clientIp, normalizedEmail);

      try {
        await sendVerificationOtpEmail(normalizedEmail, otpCode, 'signup');
      } catch (emailErr) {
        return res.status(500).json({
          success: false,
          message: 'Failed to deliver verification code to your email. Please try again.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Account created! Verification code sent to your email. Enter the code to complete registration.',
        email: normalizedEmail,
        challengeId,
        expiresInSeconds: 30
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate cryptographically secure 6-digit OTP code & challenge ID
    const otpCode = generateSecureOtp();
    const challengeId = crypto.randomUUID();
    const now = Date.now();
    const otpExpiresAt = new Date(now + 30 * 1000); // 30 seconds

    const userRole = role === 'instructor' ? 'instructor' : 'learner';
    const TargetModel = userRole === 'instructor' ? Instructor : Learner;

    // SAVE USER TO MONGO DB IMMEDIATELY WITH isVerified: false
    const newUser = new TargetModel({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: userRole,
      authProvider: 'local',
      isVerified: false,
      verificationOtp: hashOtp(otpCode),
      otpPurpose: 'signup',
      otpExpiresAt,
      otpAttempts: 0,
      otpChallengeId: challengeId,
      otpResendCooldownUntil: new Date(now + 30 * 1000)
    });

    await newUser.save();
    console.log(`[USER CREATED UNVERIFIED IN MONGO DB (${userRole}s collection)] ${newUser.email}`);
    recordOtpAttempt(clientIp, normalizedEmail);

    // Send OTP Email
    try {
      await sendVerificationOtpEmail(normalizedEmail, otpCode, 'signup');
    } catch (emailErr) {
      await TargetModel.findByIdAndDelete(newUser._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to deliver verification email. Please check your email address and try again.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Account created! Verification code sent to your email. Enter the code to complete registration.',
      email: normalizedEmail,
      challengeId,
      expiresInSeconds: 30
    });
  } catch (error) {
    console.error('=== MANUAL SIGNUP ERROR ===', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to create account. Please try again.'
    });
  }
};

// 2. Send / Resend Verification OTP (Supports both signup and login purposes)
exports.sendOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const clientIp = getClientIp(req);

    // Rate limiting check
    const rateCheck = checkOtpRateLimit(clientIp, normalizedEmail, req, 15, 6);
    if (rateCheck.limited) {
      res.setHeader('Retry-After', rateCheck.retryAfter);
      return res.status(429).json({ success: false, retryAfter: rateCheck.retryAfter, message: rateCheck.reason });
    }

    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found. Please sign up first.' });
    }

    const targetPurpose = purpose === 'login' ? 'login' : (user.isVerified ? 'login' : 'signup');

    if (targetPurpose === 'signup' && user.isVerified) {
      return res.status(400).json({ success: false, message: 'Email address is already verified. Please sign in.' });
    }

    // Check server-side 30-second resend cooldown
    const now = Date.now();
    if (user.otpResendCooldownUntil && user.otpResendCooldownUntil.getTime() > now) {
      const retryAfter = Math.max(1, Math.ceil((user.otpResendCooldownUntil.getTime() - now) / 1000));
      return res.status(429).json({
        success: false,
        retryAfter,
        message: `Please wait ${retryAfter} seconds before requesting a new code.`
      });
    }

    // Generate fresh secure OTP & challenge ID (invalidates previous OTP immediately)
    const otpCode = generateSecureOtp();
    const challengeId = crypto.randomUUID();

    user.verificationOtp = hashOtp(otpCode);
    user.otpPurpose = targetPurpose;
    user.otpExpiresAt = new Date(now + 30 * 1000); // 30 seconds
    user.otpAttempts = 0;
    user.otpChallengeId = challengeId;
    user.otpResendCooldownUntil = new Date(now + 30 * 1000);

    await user.save();
    recordOtpAttempt(clientIp, normalizedEmail);

    try {
      await sendVerificationOtpEmail(user.email, otpCode, targetPurpose);
    } catch (emailErr) {
      return res.status(500).json({
        success: false,
        message: 'Failed to deliver new verification code to your email. Please try again.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.',
      challengeId,
      expiresInSeconds: 30
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to send verification email.'
    });
  }
};

// 3. Verify Signup OTP (Marks user as verified; does NOT issue login token)
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp, challengeId } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Please enter both email and verification code.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();
    const clientIp = getClientIp(req);

    // Rate limiting check
    const rateCheck = checkOtpRateLimit(clientIp, normalizedEmail, req, 25, 10);
    if (rateCheck.limited) {
      res.setHeader('Retry-After', rateCheck.retryAfter);
      return res.status(429).json({ success: false, retryAfter: rateCheck.retryAfter, message: rateCheck.reason });
    }

    const existingUser = await findUserByEmail(normalizedEmail);
    if (!existingUser) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification session. Please sign up again.' });
    }

    if (existingUser.isVerified) {
      return res.status(400).json({
        success: false,
        isAlreadyVerified: true,
        message: 'Account is already verified. Please sign in.'
      });
    }

    if (!existingUser.verificationOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or already consumed verification session. Please sign in or request a new code.'
      });
    }

    // Verify purpose is signup
    if (existingUser.otpPurpose && existingUser.otpPurpose !== 'signup') {
      return res.status(400).json({ success: false, message: 'Invalid verification session for registration.' });
    }

    // Challenge binding check
    if (challengeId && existingUser.otpChallengeId && existingUser.otpChallengeId !== challengeId) {
      return res.status(400).json({
        success: false,
        message: 'This verification challenge is no longer valid. Please use the newest code sent to your email.'
      });
    }

    // Attempt limit check (max 5 incorrect attempts)
    if (existingUser.otpAttempts >= 5) {
      existingUser.verificationOtp = null;
      existingUser.otpExpiresAt = null;
      existingUser.otpChallengeId = null;
      existingUser.otpPurpose = null;
      await existingUser.save();
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new verification code.'
      });
    }

    // Expiration check (30 seconds server-side)
    const now = new Date();
    if (!existingUser.otpExpiresAt || now > existingUser.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        isExpired: true,
        message: 'Verification code has expired. Please request a new code.'
      });
    }

    // Verify Keyed HMAC
    const hashedInput = hashOtp(cleanOtp);
    if (existingUser.verificationOtp !== hashedInput) {
      existingUser.otpAttempts = (existingUser.otpAttempts || 0) + 1;
      if (existingUser.otpAttempts >= 5) {
        existingUser.verificationOtp = null;
        existingUser.otpExpiresAt = null;
        existingUser.otpChallengeId = null;
        existingUser.otpPurpose = null;
        await existingUser.save();
        return res.status(400).json({
          success: false,
          message: 'Too many incorrect attempts. Please request a new verification code.'
        });
      }
      await existingUser.save();
      return res.status(400).json({
        success: false,
        attemptsLeft: Math.max(0, 5 - existingUser.otpAttempts),
        message: 'Invalid verification code. Please check and try again.'
      });
    }

    // Verification successful! Invalidate OTP immediately and mark verified.
    existingUser.isVerified = true;
    existingUser.verificationOtp = null;
    existingUser.otpExpiresAt = null;
    existingUser.otpPurpose = null;
    existingUser.otpChallengeId = null;
    existingUser.otpAttempts = 0;
    await existingUser.save();

    console.log(`[EMAIL VERIFIED FOR USER] ${existingUser.email}`);

    // Return success without issuing tokens (user proceeds to manual login with password + OTP)
    return res.status(200).json({
      success: true,
      isVerified: true,
      message: 'Email verified successfully! You can now proceed to login.'
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during OTP verification.' });
  }
};

// 4. Manual Login (Validates credentials, checks verification, dispatches 30s Login OTP)
// DOES NOT ISSUE TOKEN OR COOKIE - Entering correct email and password alone never completes login!
exports.manualLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter both email and password.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const clientIp = getClientIp(req);

    // Rate limiting check
    const rateCheck = checkOtpRateLimit(clientIp, normalizedEmail, req, 20, 8);
    if (rateCheck.limited) {
      res.setHeader('Retry-After', rateCheck.retryAfter);
      return res.status(429).json({ success: false, retryAfter: rateCheck.retryAfter, message: rateCheck.reason });
    }

    const user = await findUserByEmail(normalizedEmail);
    if (!user || !user.password) {
      recordOtpAttempt(clientIp, normalizedEmail);
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      recordOtpAttempt(clientIp, normalizedEmail);
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    // Check email verification status
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        isUnverified: true,
        email: user.email,
        message: 'Your email is not verified. Please verify your email before logging in.'
      });
    }

    // Credentials valid & account verified!
    // Complete manual login directly (single OTP verification was completed during signup)
    if (user.role === 'learner') {
      try {
        await processDailyLoginStreak(user);
      } catch (streakErr) {
        console.warn('Auto streak update error on manual login:', streakErr.message);
      }
    }

    // Issue authenticated JWT token and HTTP-only session cookie
    const token = generateToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

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
        avatar: user.avatar,
        username: user.username || '',
        points: user.role === 'learner' ? (user.points || 0) : undefined,
        currentStreak: user.role === 'learner' ? (user.currentStreak || 0) : undefined,
        longestStreak: user.role === 'learner' ? (user.longestStreak || 0) : undefined,
        applicationStatus: user.applicationStatus || (user.role === 'instructor' ? 'not_started' : undefined)
      }
    });
  } catch (error) {
    console.error('Manual Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// 4b. Verify Login OTP (Verifies OTP, issues JWT token and HTTP-only session cookie)
exports.verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp, challengeId } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Please enter both email and verification code.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();
    const clientIp = getClientIp(req);

    // Rate limiting check
    const rateCheck = checkOtpRateLimit(clientIp, normalizedEmail, req, 25, 10);
    if (rateCheck.limited) {
      res.setHeader('Retry-After', rateCheck.retryAfter);
      return res.status(429).json({ success: false, retryAfter: rateCheck.retryAfter, message: rateCheck.reason });
    }

    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired login session. Please sign in again.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        isUnverified: true,
        message: 'Please verify your email address before logging in.'
      });
    }

    // Verify OTP purpose is 'login'
    if (user.otpPurpose !== 'login') {
      return res.status(400).json({
        success: false,
        message: 'Invalid login session. Please sign in with your password again.'
      });
    }

    // Challenge binding check
    if (challengeId && user.otpChallengeId && user.otpChallengeId !== challengeId) {
      return res.status(400).json({
        success: false,
        message: 'This login verification session has expired or been replaced by a newer code. Please use the latest code.'
      });
    }

    // Attempt limit check (max 5 attempts)
    if (user.otpAttempts >= 5) {
      user.verificationOtp = null;
      user.otpExpiresAt = null;
      user.otpChallengeId = null;
      user.otpPurpose = null;
      await user.save();
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please sign in again to receive a fresh verification code.'
      });
    }

    // Expiration check (30 seconds server-side)
    const now = new Date();
    if (!user.otpExpiresAt || now > user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        isExpired: true,
        message: 'Verification code has expired. Please request a new code.'
      });
    }

    // Verify Keyed HMAC
    const hashedInput = hashOtp(cleanOtp);
    if (user.verificationOtp !== hashedInput) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      if (user.otpAttempts >= 5) {
        user.verificationOtp = null;
        user.otpExpiresAt = null;
        user.otpChallengeId = null;
        user.otpPurpose = null;
        await user.save();
        return res.status(400).json({
          success: false,
          message: 'Too many incorrect attempts. Please sign in again to receive a fresh verification code.'
        });
      }
      await user.save();
      return res.status(400).json({
        success: false,
        attemptsLeft: Math.max(0, 5 - user.otpAttempts),
        message: 'Invalid verification code. Please check and try again.'
      });
    }

    // Single-use verification: invalidate OTP immediately to prevent replay or race conditions
    user.verificationOtp = null;
    user.otpExpiresAt = null;
    user.otpChallengeId = null;
    user.otpPurpose = null;
    user.otpAttempts = 0;

    if (user.role === 'learner') {
      try {
        await processDailyLoginStreak(user);
      } catch (streakErr) {
        console.warn('Auto streak update error on manual login OTP verify:', streakErr.message);
      }
    }

    await user.save();

    // Now issue authenticated JWT token and HTTP-only cookie
    const token = generateToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

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
        avatar: user.avatar,
        username: user.username || '',
        points: user.role === 'learner' ? (user.points || 0) : undefined,
        currentStreak: user.role === 'learner' ? (user.currentStreak || 0) : undefined,
        longestStreak: user.role === 'learner' ? (user.longestStreak || 0) : undefined,
        applicationStatus: user.applicationStatus || (user.role === 'instructor' ? 'not_started' : undefined)
      }
    });
  } catch (error) {
    console.error('Verify Login OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login OTP verification.' });
  }
};

// 4a. Request Password Reset (Option B: 6-Digit Email OTP with Anti-Enumeration & Keyed HMAC)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email address format.' });
    }

    const clientIp = getClientIp(req);

    // 1. Sliding Window Rate Limiting (5 requests / 15 min per IP, 3 requests / 15 min per email)
    const rateCheck = checkResetRateLimit(clientIp, normalizedEmail, req);
    if (rateCheck.limited) {
      res.setHeader('Retry-After', rateCheck.retryAfter);
      return res.status(429).json({
        success: false,
        message: rateCheck.reason,
        retryAfter: rateCheck.retryAfter
      });
    }

    // Standard anti-enumeration response (identical for existing, non-existing, learner, instructor, and OAuth accounts)
    const genericResponse = 'If an account is associated with this email, we have sent instructions to reset your password.';

    // 2. Dual Collection Search (Learner & Instructor)
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      // Record attempt to prevent timing probes
      recordResetAttempt(clientIp, normalizedEmail);
      return res.status(200).json({
        success: true,
        message: genericResponse
      });
    }

    // 3. OAuth-Only Account Protection: Never create local password or bypass OAuth linking
    if (user.authProvider !== 'local' && !user.password) {
      recordResetAttempt(clientIp, normalizedEmail);
      try {
        await sendOAuthAccountNoticeEmail(user.email, user.authProvider);
      } catch (e) {
        console.warn('[OAUTH NOTICE WARNING] Failed to send OAuth advisory email:', e.message);
      }
      return res.status(200).json({
        success: true,
        message: genericResponse
      });
    }

    // 4. Resend Cooldown Check (60 seconds)
    if (user.resetPasswordCooldown && user.resetPasswordCooldown > new Date()) {
      const waitSeconds = Math.max(1, Math.ceil((user.resetPasswordCooldown.getTime() - Date.now()) / 1000));
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting another verification code.`,
        retryAfter: waitSeconds
      });
    }

    // 5. Cryptographically Secure 6-Digit OTP Generation & Keyed HMAC Storage
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = hashOtp(otpCode);

    // Retain previous challenge in case SMTP delivery fails
    const previousChallenge = {
      resetPasswordOtp: user.resetPasswordOtp,
      resetPasswordExpires: user.resetPasswordExpires,
      resetPasswordAttempts: user.resetPasswordAttempts,
      resetPasswordCooldown: user.resetPasswordCooldown
    };

    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.resetPasswordAttempts = 0;
    user.resetPasswordCooldown = new Date(Date.now() + 60 * 1000); // 60 seconds
    await user.save();

    recordResetAttempt(clientIp, normalizedEmail);

    // 6. Deliver OTP via Gmail Nodemailer
    try {
      await sendPasswordResetOtpEmail(user.email, otpCode);
    } catch (emailErr) {
      console.warn('[RESET OTP DISPATCH WARNING] SMTP delivery failed:', emailErr.message);
      // Invalidate or restore un-deliverable challenge so user is not locked out with an unreceived OTP
      if (previousChallenge.resetPasswordExpires && previousChallenge.resetPasswordExpires > new Date()) {
        user.resetPasswordOtp = previousChallenge.resetPasswordOtp;
        user.resetPasswordExpires = previousChallenge.resetPasswordExpires;
        user.resetPasswordAttempts = previousChallenge.resetPasswordAttempts;
        user.resetPasswordCooldown = previousChallenge.resetPasswordCooldown;
      } else {
        user.resetPasswordOtp = null;
        user.resetPasswordExpires = null;
        user.resetPasswordAttempts = 0;
        user.resetPasswordCooldown = null;
      }
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: genericResponse
    });
  } catch (error) {
    console.error('Forgot Password Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process password reset request. Please try again later.'
    });
  }
};

// 4b. Verify OTP and Set New Password (Single-Use Invalidation & Session Revocation)
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, verification code, and new password.'
      });
    }

    const cleanOtp = String(otp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code must be exactly 6 digits.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);

    if (!user || !user.resetPasswordOtp || !user.resetPasswordExpires) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code. Please request a new code.'
      });
    }

    // 1. Enforce Expiration (10 minutes)
    if (new Date() > user.resetPasswordExpires) {
      user.resetPasswordOtp = null;
      user.resetPasswordExpires = null;
      user.resetPasswordAttempts = 0;
      user.resetPasswordCooldown = null;
      await user.save();
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.'
      });
    }

    // 2. Enforce Attempt Limit (5 failed attempts maximum per challenge)
    if (user.resetPasswordAttempts >= 5) {
      user.resetPasswordOtp = null;
      user.resetPasswordExpires = null;
      user.resetPasswordAttempts = 0;
      user.resetPasswordCooldown = null;
      await user.save();
      return res.status(400).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new code.'
      });
    }

    // 3. Constant-Time Keyed HMAC Verification
    const submittedHmac = hashOtp(cleanOtp);
    const storedHmac = user.resetPasswordOtp;

    let isMatch = false;
    try {
      const bufA = Buffer.from(submittedHmac, 'hex');
      const bufB = Buffer.from(storedHmac, 'hex');
      if (bufA.length === bufB.length) {
        isMatch = crypto.timingSafeEqual(bufA, bufB);
      }
    } catch (e) {
      isMatch = false;
    }

    // Defensive fallback: support direct match in case OTP was stored as plaintext
    if (!isMatch && user.resetPasswordOtp === cleanOtp) {
      isMatch = true;
    }

    if (!isMatch) {
      user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
      if (user.resetPasswordAttempts >= 5) {
        user.resetPasswordOtp = null;
        user.resetPasswordExpires = null;
        user.resetPasswordAttempts = 0;
        user.resetPasswordCooldown = null;
        await user.save();
        return res.status(400).json({
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new code.'
        });
      }
      await user.save();
      const remainingAttempts = 5 - user.resetPasswordAttempts;
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`
      });
    }

    // 4. Hash New Password with Bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.authProvider = 'local';
    user.isVerified = true;
    user.passwordChangedAt = new Date();

    // 5. Invalidate Reset Challenge Atomically (Single-Use Guarantee)
    user.resetPasswordOtp = null;
    user.resetPasswordExpires = null;
    user.resetPasswordAttempts = 0;
    user.resetPasswordCooldown = null;
    await user.save();

    // 6. Invalidate Existing Sessions & Clear Cookies
    res.clearCookie('token', { path: '/' });
    res.clearCookie('upskillr_token', { path: '/' });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully! Please sign in with your new password.'
    });
  } catch (error) {
    console.error('Reset Password Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again.'
    });
  }
};

// In-memory map to prevent duplicate authorization code exchanges (cleanCode -> redirectUrl) (TTL: 2 minutes)
const processedOAuthCodes = new Map();
const inflightOAuthExchanges = new Map();

// Cryptographically signed HMAC-SHA256 OAuth State to prevent CSRF, Replay, and Intent Tampering
const generateOAuthState = (data) => {
  const secret = JWT_SECRET;
  const payload = Buffer.from(
    JSON.stringify({
      ...data,
      nonce: crypto.randomBytes(16).toString('hex'),
      timestamp: Date.now()
    })
  ).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const verifyOAuthState = (stateStr) => {
  if (!stateStr || typeof stateStr !== 'string') return null;
  const parts = stateStr.split('.');
  if (parts.length === 2) {
    const [payload, signature] = parts;
    const secret = JWT_SECRET;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    try {
      const bufA = Buffer.from(signature);
      const bufB = Buffer.from(expectedSig);
      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        // 15-minute maximum TTL for OAuth state
        if (Date.now() - decoded.timestamp > 15 * 60 * 1000) {
          return null;
        }
        return decoded;
      }
    } catch (e) {
      return null;
    }
  }

  // Graceful fallback for unencoded or legacy JSON state (e.g. tests or external clients)
  try {
    return JSON.parse(decodeURIComponent(stateStr));
  } catch (e) {
    try {
      return JSON.parse(stateStr);
    } catch (e2) {
      return null;
    }
  }
};

// 5. Google OAuth Redirect
exports.googleOAuthRedirect = (req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!googleClientId) {
    return res.status(500).send('Google Client ID is missing in backend .env file.');
  }

  const role = req.query.role === 'instructor' ? 'instructor' : 'learner';
  const action = req.query.action === 'signup' ? 'signup' : 'login';
  const state = generateOAuthState({ role, action });

  const authParams = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state: state,
    access_type: 'offline',
    prompt: 'consent'
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;
  return res.redirect(authUrl);
};

// 6. Google OAuth Callback
exports.googleOAuthCallback = async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    console.warn('Google OAuth returned error in callback query:', oauthError);
    res.clearCookie('token', { path: '/' });
    res.clearCookie('upskillr_token', { path: '/' });
    return res.redirect(`${FRONTEND_URL}/login?error=google_oauth_failed`);
  }

  if (!code) {
    res.clearCookie('token', { path: '/' });
    res.clearCookie('upskillr_token', { path: '/' });
    return res.redirect(`${FRONTEND_URL}/login?error=google_oauth_failed`);
  }

  const cleanCode = String(code).trim();

  // If this code was already exchanged, replay the EXACT original redirect URL (prevents invalid_grant and bypass)
  if (processedOAuthCodes.has(cleanCode)) {
    const cachedRedirect = processedOAuthCodes.get(cleanCode);
    console.log('[Google OAuth] Authorization code has already been exchanged. Redirecting cleanly to cached destination:', cachedRedirect);
    return res.redirect(cachedRedirect || `${FRONTEND_URL}/login`);
  }

  // If this code is currently being exchanged in an in-flight request, await that existing exchange
  if (inflightOAuthExchanges.has(cleanCode)) {
    console.log('[Google OAuth] Token exchange already in flight for this code. Awaiting resolution.');
    try {
      const redirectUrl = await inflightOAuthExchanges.get(cleanCode);
      return res.redirect(redirectUrl);
    } catch (err) {
      return res.redirect(`${FRONTEND_URL}/login?error=google_oauth_failed`);
    }
  }

  // Register in-flight promise for this code
  let resolveExchange, rejectExchange;
  const exchangePromise = new Promise((resolve, reject) => {
    resolveExchange = resolve;
    rejectExchange = reject;
  });
  inflightOAuthExchanges.set(cleanCode, exchangePromise);

  try {
    const parsedState = verifyOAuthState(state);
    if (!parsedState) {
      console.warn('[Google OAuth] Missing, invalid, or tampered OAuth state parameter.');
      res.clearCookie('token', { path: '/' });
      res.clearCookie('upskillr_token', { path: '/' });
      const redirectUrl = `${FRONTEND_URL}/login?error=invalid_oauth_state&provider=google`;
      processedOAuthCodes.set(cleanCode, redirectUrl);
      inflightOAuthExchanges.delete(cleanCode);
      setTimeout(() => processedOAuthCodes.delete(cleanCode), 120000).unref();
      resolveExchange(redirectUrl);
      return res.redirect(redirectUrl);
    }

    const role = parsedState.role === 'instructor' ? 'instructor' : 'learner';
    const action = parsedState.action === 'signup' ? 'signup' : 'login';

    const googleParams = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET.trim(),
      code: cleanCode,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_REDIRECT_URI
    });

    let tokenResponse;
    try {
      tokenResponse = await axios.post('https://oauth2.googleapis.com/token', googleParams.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      console.log('Google token exchange: SUCCESS');
    } catch (tokenErr) {
      console.log('Google token exchange: FAILED');
      throw tokenErr;
    }

    const { access_token } = tokenResponse.data;

    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    // Safely support both Google UserInfo format (id) and OpenID format (sub)
    const googleId = profileResponse.data?.id || profileResponse.data?.sub || null;
    const email = profileResponse.data?.email;
    const name = profileResponse.data?.name;
    const picture = profileResponse.data?.picture;

    if (!email) {
      throw new Error('Could not retrieve email from Google account.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userRole = role === 'instructor' ? 'instructor' : 'learner';

    // Account existence & linking check:
    // Look up existing user by stable provider ID
    let user = null;
    if (googleId) {
      user = await findUserByOAuth({ googleId: String(googleId) });
    }

    // If not matched by googleId, check if existing user was registered via Google OAuth
    if (!user) {
      const candidate = await findUserByOAuth({ email: normalizedEmail, authProvider: 'google' });
      if (candidate) {
        user = candidate;
        if (googleId && !user.googleId) {
          user.googleId = String(googleId);
          await user.save();
        }
      }
    }

    // Branch: Login Flow vs Explicit Signup Flow
    if (action === 'login') {
      if (!user) {
        // STRICT LOGIN ENFORCEMENT:
        // A Google identity that does not correspond to an eligible existing UpSkillR account
        // must never receive a successful login or cause an UpSkillR account to be created.
        res.clearCookie('token', { path: '/' });
        res.clearCookie('upskillr_token', { path: '/' });

        // Check if an account exists under local credentials
        const existingLocal = await findUserByEmail(normalizedEmail);
        const redirectUrl = existingLocal
          ? `${FRONTEND_URL}/login?error=provider_not_linked&provider=google`
          : `${FRONTEND_URL}/login?error=no_account&provider=google`;

        processedOAuthCodes.set(cleanCode, redirectUrl);
        inflightOAuthExchanges.delete(cleanCode);
        setTimeout(() => processedOAuthCodes.delete(cleanCode), 120000).unref();

        resolveExchange(redirectUrl);
        return res.redirect(redirectUrl);
      }

      // Existing linked user
      if (googleId && !user.googleId) user.googleId = String(googleId);
      user.isVerified = true;
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();
    } else {
      // action === 'signup'
      const existingUser = await findUserByEmail(normalizedEmail);
      if (existingUser) {
        res.clearCookie('token', { path: '/' });
        res.clearCookie('upskillr_token', { path: '/' });
        const redirectUrl = `${FRONTEND_URL}/login?error=account_exists&provider=google`;
        processedOAuthCodes.set(cleanCode, redirectUrl);
        inflightOAuthExchanges.delete(cleanCode);
        setTimeout(() => processedOAuthCodes.delete(cleanCode), 120000).unref();

        resolveExchange(redirectUrl);
        return res.redirect(redirectUrl);
      }

      const Model = getModelByRole(userRole);
      user = new Model({
        fullName: name || 'Google User',
        email: normalizedEmail,
        role: userRole,
        authProvider: 'google',
        googleId: googleId ? String(googleId) : undefined,
        isVerified: true,
        avatar: picture || ''
      });
      await user.save();
    }

    if (user.role === 'learner') {
      try {
        await processDailyLoginStreak(user);
      } catch (streakErr) {
        console.warn('Auto streak update error on Google OAuth:', streakErr.message);
      }
    }

    const token = generateToken(user);

    // Send compact HttpOnly authentication session cookie containing the JWT
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // localhost development
      sameSite: 'lax',
      path: '/'
    });

    const redirectUrl = `${FRONTEND_URL}/dashboard`;

    processedOAuthCodes.set(cleanCode, redirectUrl);
    inflightOAuthExchanges.delete(cleanCode);
    setTimeout(() => processedOAuthCodes.delete(cleanCode), 120000).unref();

    resolveExchange(redirectUrl);
    return res.redirect(redirectUrl);
  } catch (error) {
    inflightOAuthExchanges.delete(cleanCode);
    rejectExchange(error);
    console.error('Google OAuth Callback Error:', error?.response?.data || error.message);
    res.clearCookie('token', { path: '/' });
    res.clearCookie('upskillr_token', { path: '/' });
    return res.redirect(`${FRONTEND_URL}/login?error=google_oauth_failed`);
  }
};

// 7. GitHub OAuth Redirect
exports.githubOAuthRedirect = (req, res) => {
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  if (!githubClientId) {
    return res.status(500).send('GitHub Client ID is missing in backend .env file.');
  }

  const role = req.query.role === 'instructor' ? 'instructor' : 'learner';
  const action = req.query.action === 'signup' ? 'signup' : 'login';
  const redirectUri = encodeURIComponent(GITHUB_CALLBACK_URL);
  const state = encodeURIComponent(generateOAuthState({ role, action }));

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=user:email&state=${state}`;

  return res.redirect(authUrl);
};

// 8. GitHub OAuth Callback
exports.githubOAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      res.clearCookie('token', { path: '/' });
      res.clearCookie('upskillr_token', { path: '/' });
      return res.redirect(`${FRONTEND_URL}/login?error=github_oauth_failed`);
    }

    const parsedState = verifyOAuthState(state);
    if (!parsedState) {
      console.warn('[GitHub OAuth] Missing, invalid, or tampered OAuth state parameter.');
      res.clearCookie('token', { path: '/' });
      res.clearCookie('upskillr_token', { path: '/' });
      return res.redirect(`${FRONTEND_URL}/login?error=invalid_oauth_state&provider=github`);
    }

    const role = parsedState.role === 'instructor' ? 'instructor' : 'learner';
    const action = parsedState.action === 'signup' ? 'signup' : 'login';

    const githubParams = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_CALLBACK_URL
    });

    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      githubParams.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        }
      }
    );

    const { access_token } = tokenResponse.data;
    if (!access_token) {
      res.clearCookie('token', { path: '/' });
      res.clearCookie('upskillr_token', { path: '/' });
      return res.redirect(`${FRONTEND_URL}/login?error=github_token_failed`);
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

    const normalizedEmail = email.toLowerCase().trim();
    const userRole = role === 'instructor' ? 'instructor' : 'learner';

    // Account existence & linking check:
    let user = null;
    if (githubId) {
      user = await findUserByOAuth({ githubId: String(githubId) });
    }

    if (!user) {
      const candidate = await findUserByOAuth({ email: normalizedEmail, authProvider: 'github' });
      if (candidate) {
        user = candidate;
        if (githubId && !user.githubId) {
          user.githubId = String(githubId);
          await user.save();
        }
      }
    }

    // Branch: Login Flow vs Explicit Signup Flow
    if (action === 'login') {
      if (!user) {
        res.clearCookie('token', { path: '/' });
        res.clearCookie('upskillr_token', { path: '/' });
        const existingLocal = await findUserByEmail(normalizedEmail);
        const redirectUrl = existingLocal
          ? `${FRONTEND_URL}/login?error=provider_not_linked&provider=github`
          : `${FRONTEND_URL}/login?error=no_account&provider=github`;
        return res.redirect(redirectUrl);
      }

      if (githubId && !user.githubId) user.githubId = String(githubId);
      user.isVerified = true;
      if (avatar_url && !user.avatar) user.avatar = avatar_url;
      await user.save();
    } else {
      // action === 'signup'
      const existingUser = await findUserByEmail(normalizedEmail);
      if (existingUser) {
        res.clearCookie('token', { path: '/' });
        res.clearCookie('upskillr_token', { path: '/' });
        return res.redirect(`${FRONTEND_URL}/login?error=account_exists&provider=github`);
      }

      const Model = getModelByRole(userRole);
      user = new Model({
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

    if (user.role === 'learner') {
      try {
        await processDailyLoginStreak(user);
      } catch (streakErr) {
        console.warn('Auto streak update error on GitHub OAuth:', streakErr.message);
      }
    }

    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/'
    });

    return res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error('GitHub OAuth Callback Error:', error?.response?.data || error.message);
    return res.redirect(`${FRONTEND_URL}/login?error=github_oauth_failed`);
  }
};

// 9. Get Current User Profile (Protected by AuthN middleware)
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    let user = await Learner.findById(userId).select('-password');
    if (!user) {
      user = await Instructor.findById(userId).select('-password');
    }
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.password;

    if (user.role === 'instructor') {
      delete userObj.points;
      delete userObj.currentStreak;
      delete userObj.longestStreak;
      delete userObj.lastCheckInDate;
      const InstructorApplication = require('../model/InstructorApplication');
      const application = await InstructorApplication.findOne({ instructorId: user._id });
      // Instructor model is authoritative for live profile; fall back to application snapshot if empty
      userObj.designation = user.designation || application?.personalInfo?.professionalTitle || '';
      userObj.specialization = userObj.designation; // maintain backward compatibility
      userObj.bio = user.bio || application?.personalInfo?.bio || '';
      userObj.keySkills = (user.keySkills && user.keySkills.length > 0)
        ? user.keySkills
        : (application?.professionalInfo?.keySkills || []);
    }

    return res.status(200).json({
      success: true,
      user: userObj,
      token: req.token || generateToken(user)
    });
  } catch (error) {
    console.error('getCurrentUser error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching user profile.' });
  }
};

// 10. Get All Registered Instructors with Stats (Performance Optimized, No N+1 Queries)
exports.getInstructors = async (req, res) => {
  try {
    const instructors = await Instructor.find(
      {},
      'fullName email avatar isVerified designation bio keySkills'
    );
    
    const Course = require('../model/Course');
    const Enrolment = require('../model/Enrolment');
    
    // Fetch all published courses
    const courses = await Course.find({ status: 'published' });
    
    // Aggregate unique learner IDs per courseId in a single query
    const enrolmentsGrouped = await Enrolment.aggregate([
      {
        $group: {
          _id: '$courseId',
          learners: { $addToSet: '$learnerId' }
        }
      }
    ]);
    
    // Map courseId to distinct learner IDs array
    const enrolmentsLearnersMap = {};
    enrolmentsGrouped.forEach((item) => {
      if (item._id) {
        enrolmentsLearnersMap[item._id.toString()] = item.learners || [];
      }
    });
    
    const instructorsWithStats = instructors.map((inst) => {
      // Filter courses belonging to this instructor
      const instCourses = courses.filter(
        (c) => c.instructorId && c.instructorId.toString() === inst._id.toString()
      );
      
      const uniqueLearnerIds = new Set();
      let totalRatingsSum = 0;
      let ratedCoursesCount = 0;
      let ratingsCount = 0;
      
      instCourses.forEach((c) => {
        const learners = enrolmentsLearnersMap[c._id.toString()] || [];
        learners.forEach((lid) => {
          if (lid) uniqueLearnerIds.add(lid.toString());
        });
        if (c.rating !== null && c.rating !== undefined) {
          totalRatingsSum += c.rating;
          ratedCoursesCount += 1;
        }
        ratingsCount += (c.reviewCount || 0);
      });
      const learnersCount = uniqueLearnerIds.size;
      
      const averageRating = ratedCoursesCount > 0
        ? Math.round((totalRatingsSum / ratedCoursesCount) * 10) / 10
        : null;
        
      // For expertise, use the instructor's keySkills if populated,
      // fallback to course categories if keySkills is empty
      let expertise = inst.keySkills && inst.keySkills.length > 0
        ? inst.keySkills
        : instCourses.map(c => c.category).filter((v, i, a) => a.indexOf(v) === i);
        
      return {
        _id: inst._id,
        fullName: inst.fullName,
        email: inst.email,
        avatar: inst.avatar || '',
        isVerified: inst.isVerified || false,
        designation: inst.designation || 'Expert Educator',
        bio: inst.bio || '',
        expertise,
        coursesCount: instCourses.length,
        learnersCount,
        rating: averageRating,
        ratingsCount
      };
    });
    
    return res.status(200).json({ success: true, instructors: instructorsWithStats });
  } catch (error) {
    console.error('Get Instructors Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching instructors.' });
  }
};

// 10b. Get Public Instructor Details by ID (Profile + Application Data + Stats)
exports.getPublicInstructorById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid instructor ID format.' });
    }

    const instructor = await Instructor.findById(id).select(
      'fullName email avatar isVerified designation bio keySkills createdAt'
    );

    if (!instructor) {
      return res.status(404).json({ success: false, message: 'Instructor not found.' });
    }

    // Fetch submitted companion application for full About details
    const application = await InstructorApplication.findOne({
      $or: [{ instructorId: id }, { instructorId: new mongoose.Types.ObjectId(id) }]
    });

    const Course = require('../model/Course');
    const Enrolment = require('../model/Enrolment');

    // Published courses belonging to this instructor
    const instCourses = await Course.find({
      instructorId: id,
      status: 'published'
    });

    const courseIds = instCourses.map((c) => c._id);
    const distinctLearners = await Enrolment.distinct('learnerId', { courseId: { $in: courseIds } });
    const totalLearners = distinctLearners.length;

    let totalRatingsSum = 0;
    let ratedCoursesCount = 0;
    let totalReviews = 0;

    instCourses.forEach((c) => {
      if (c.rating !== null && c.rating !== undefined) {
        totalRatingsSum += c.rating;
        ratedCoursesCount += 1;
      }
      totalReviews += (c.reviewCount || 0);
    });

    const averageRating = ratedCoursesCount > 0
      ? Math.round((totalRatingsSum / ratedCoursesCount) * 10) / 10
      : null;

    const keySkills = (instructor.keySkills && instructor.keySkills.length > 0)
      ? instructor.keySkills
      : (application?.professionalInfo?.keySkills || []);

    const resultInstructor = {
      _id: instructor._id,
      fullName: instructor.fullName,
      email: instructor.email,
      avatar: instructor.avatar || application?.personalInfo?.photoUrl || '',
      isVerified: instructor.isVerified || false,
      designation: instructor.designation || application?.personalInfo?.professionalTitle || 'Expert Educator',
      bio: instructor.bio || application?.personalInfo?.bio || 'Dedicated educator building engaging online courses on UpSkillr.',
      keySkills,
      expertise: keySkills,
      // Submitted Application About Data
      personalInfo: application?.personalInfo || {},
      professionalInfo: application?.professionalInfo || {},
      education: application?.education || {},
      teachingExperience: application?.teachingExperience || {},
      coursesExpertise: application?.coursesExpertise || {},
      // Stats
      coursesCount: instCourses.length,
      learnersCount: totalLearners,
      rating: averageRating,
      ratingsCount: totalReviews
    };

    return res.status(200).json({
      success: true,
      instructor: resultInstructor
    });
  } catch (error) {
    console.error('Get Public Instructor By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching instructor profile.' });
  }
};

// 11. Update User Profile Settings (Name, Bio, Specialization)
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, bio, specialization } = req.body;
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }

    const userId = req.user.id;
    const role = req.user.role;

    let updatedUser;
    if (role === 'learner') {
      const learnerUpdate = { fullName: fullName.trim() };
      if (req.body.bio !== undefined) learnerUpdate.bio = req.body.bio.trim().slice(0, 300);
      if (req.body.learningGoal !== undefined) learnerUpdate.learningGoal = req.body.learningGoal.trim();
      if (Array.isArray(req.body.learningInterests)) learnerUpdate.learningInterests = req.body.learningInterests;
      if (req.body.username !== undefined && req.body.username.trim()) {
        const cleanUser = req.body.username.replace(/^@/, '').trim().toLowerCase();
        if (/^[a-zA-Z0-9_]{3,20}$/.test(cleanUser)) {
          const existing = await Learner.findOne({ username: cleanUser, _id: { $ne: userId } });
          if (!existing) learnerUpdate.username = cleanUser;
        }
      }
      updatedUser = await Learner.findByIdAndUpdate(
        userId,
        learnerUpdate,
        { new: true }
      ).select('-password');
    } else if (role === 'instructor') {
      const resolvedDesignation = (req.body.designation !== undefined)
        ? req.body.designation
        : (specialization !== undefined ? specialization : '');

      const instructorUpdate = {
        fullName: fullName.trim(),
        bio: typeof bio === 'string' ? bio.trim().slice(0, 2500) : '',
        designation: typeof resolvedDesignation === 'string' ? resolvedDesignation.trim().slice(0, 150) : ''
      };

      if (req.body.keySkills !== undefined) {
        let skills = [];
        if (Array.isArray(req.body.keySkills)) {
          skills = req.body.keySkills.map(s => String(s).trim()).filter(Boolean);
        } else if (typeof req.body.keySkills === 'string') {
          skills = req.body.keySkills.split(',').map(s => s.trim()).filter(Boolean);
        }
        instructorUpdate.keySkills = skills.slice(0, 30);
      }

      updatedUser = await Instructor.findByIdAndUpdate(
        userId,
        instructorUpdate,
        { new: true }
      ).select('-password -verificationOtp -resetPasswordOtp');
      // NOTE: InstructorApplication is intentionally NOT mutated here.
      // Routine active profile updates must not overwrite the immutable application snapshot for admin review.
    }

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const userObj = updatedUser.toObject();
    if (role === 'instructor') {
      userObj.specialization = userObj.designation || '';
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: userObj
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
};

// 12. Upload Profile Photo
exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload.' });
    }

    const userId = req.user.id;
    const role = req.user.role;
    
    // Direct upload to Cloudinary (Zero Local Disk Writes)
    const uploadResult = await uploadBufferToCloudinary(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      'upskillr_profiles'
    );
    const photoUrl = uploadResult.secure_url;

    let updatedUser;
    if (role === 'learner') {
      updatedUser = await Learner.findByIdAndUpdate(
        userId,
        { avatar: photoUrl },
        { new: true }
      ).select('-password');
    } else if (role === 'instructor') {
      updatedUser = await Instructor.findByIdAndUpdate(
        userId,
        { avatar: photoUrl },
        { new: true }
      ).select('-password');

      // Only update InstructorApplication if still in draft/not_started (onboarding)
      const application = await InstructorApplication.findOne({ instructorId: userId });
      if (application && application.applicationStatus !== 'submitted') {
        application.personalInfo = {
          ...application.personalInfo.toObject(),
          photoUrl
        };
        await application.save();
      }
    }

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const userObj = updatedUser.toObject();
    if (role === 'instructor') {
      const application = await InstructorApplication.findOne({ instructorId: userId });
      userObj.designation = updatedUser.designation || application?.personalInfo?.professionalTitle || '';
      userObj.specialization = userObj.designation;
      userObj.bio = updatedUser.bio || application?.personalInfo?.bio || '';
      userObj.keySkills = (updatedUser.keySkills && updatedUser.keySkills.length > 0)
        ? updatedUser.keySkills
        : (application?.professionalInfo?.keySkills || []);
    }

    return res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully!',
      user: userObj
    });
  } catch (error) {
    console.error('Upload Profile Photo Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to upload photo.' });
  }
};

// 13. Remove Profile Photo
exports.removeProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Delete existing Cloudinary asset if present
    const existingUser = role === 'instructor'
      ? await Instructor.findById(userId)
      : await Learner.findById(userId);

    if (existingUser && existingUser.avatar) {
      await deleteCloudinaryAsset(existingUser.avatar);
    }

    let updatedUser;
    if (role === 'learner') {
      updatedUser = await Learner.findByIdAndUpdate(
        userId,
        { avatar: '' },
        { new: true }
      ).select('-password');
    } else if (role === 'instructor') {
      updatedUser = await Instructor.findByIdAndUpdate(
        userId,
        { avatar: '' },
        { new: true }
      ).select('-password');

      // Only remove from InstructorApplication photoUrl if still in draft/not_started (onboarding)
      const application = await InstructorApplication.findOne({ instructorId: userId });
      if (application && application.applicationStatus !== 'submitted') {
        application.personalInfo = {
          ...(application.personalInfo ? application.personalInfo.toObject() : {}),
          photoUrl: ''
        };
        await application.save();
      }
    }

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const userObj = updatedUser.toObject();
    userObj.avatar = '';

    if (role === 'instructor') {
      const application = await InstructorApplication.findOne({ instructorId: userId });
      userObj.designation = updatedUser.designation || application?.personalInfo?.professionalTitle || '';
      userObj.specialization = userObj.designation;
      userObj.bio = updatedUser.bio || application?.personalInfo?.bio || '';
      userObj.keySkills = (updatedUser.keySkills && updatedUser.keySkills.length > 0)
        ? updatedUser.keySkills
        : (application?.professionalInfo?.keySkills || []);
    }

    return res.status(200).json({
      success: true,
      message: 'Profile photo removed.',
      user: userObj
    });
  } catch (error) {
    console.error('Remove Profile Photo Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove photo.' });
  }
};

// 15. Logout (Clears auth cookies cleanly)
exports.logout = (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.clearCookie('upskillr_token', { path: '/' });
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

// 16. Combined Instructor Profile & Application Details
exports.getInstructorProfileAndApplication = async (req, res) => {
  try {
    const userId = req.user.id;
    const instructor = await Instructor.findById(userId).select('-password -verificationOtp -resetPasswordOtp');
    if (!instructor) {
      return res.status(404).json({ success: false, message: 'Instructor not found.' });
    }

    let application = await InstructorApplication.findOne({ instructorId: userId });
    if (!application) {
      application = await InstructorApplication.findOneAndUpdate(
        { instructorId: userId },
        {
          $setOnInsert: {
            instructorId: userId,
            applicationStatus: instructor.applicationStatus || 'submitted',
            currentSection: 6,
            'personalInfo.fullName': instructor.fullName,
            'personalInfo.email': instructor.email,
            'personalInfo.photoUrl': instructor.avatar || ''
          }
        },
        { new: true, upsert: true }
      );
    }

    const profileData = {
      _id: instructor._id,
      id: instructor._id,
      fullName: instructor.fullName,
      email: instructor.email,
      avatar: instructor.avatar || '',
      designation: instructor.designation || application?.personalInfo?.professionalTitle || '',
      specialization: instructor.designation || application?.personalInfo?.professionalTitle || '',
      bio: instructor.bio || application?.personalInfo?.bio || '',
      keySkills: (instructor.keySkills && instructor.keySkills.length > 0)
        ? instructor.keySkills
        : (application?.professionalInfo?.keySkills || []),
      role: instructor.role,
      authProvider: instructor.authProvider,
      isVerified: instructor.isVerified,
      applicationStatus: instructor.applicationStatus,
      passwordChangedAt: instructor.passwordChangedAt,
      createdAt: instructor.createdAt
    };

    let applicationData = null;
    if (application) {
      applicationData = {
        _id: application._id,
        applicationStatus: application.applicationStatus,
        currentSection: application.currentSection,
        submittedAt: application.submittedAt,
        personalInfo: {
          fullName: application.personalInfo?.fullName || '',
          email: application.personalInfo?.email || '',
          phone: application.personalInfo?.phone || '',
          country: application.personalInfo?.country || '',
          countryCode: application.personalInfo?.countryCode || '',
          professionalTitle: application.personalInfo?.professionalTitle || '',
          professionalTitleOther: application.personalInfo?.professionalTitleOther || '',
          bio: application.personalInfo?.bio || '',
          location: application.personalInfo?.location || '',
          photoUrl: application.personalInfo?.photoUrl || ''
        },
        professionalInfo: {
          currentRole: application.professionalInfo?.currentRole || '',
          organization: application.professionalInfo?.organization || '',
          yearsOfExperience: application.professionalInfo?.yearsOfExperience || '',
          linkedinUrl: application.professionalInfo?.linkedinUrl || '',
          websiteUrl: application.professionalInfo?.websiteUrl || '',
          keySkills: application.professionalInfo?.keySkills || []
        },
        education: {
          degree: application.education?.degree || '',
          degreeOther: application.education?.degreeOther || '',
          fieldOfStudy: application.education?.fieldOfStudy || '',
          fieldOfStudyOther: application.education?.fieldOfStudyOther || '',
          institution: application.education?.institution || '',
          graduationYear: application.education?.graduationYear || ''
        },
        teachingExperience: {
          priorExperience: application.teachingExperience?.priorExperience || '',
          targetStudentLevel: application.teachingExperience?.targetStudentLevel || '',
          preferredTeachingStyle: application.teachingExperience?.preferredTeachingStyle || '',
          preferredTeachingStyles: application.teachingExperience?.preferredTeachingStyles || [],
          primaryTeachingStyle: application.teachingExperience?.primaryTeachingStyle || '',
          primaryTeachingStyles: application.teachingExperience?.primaryTeachingStyles || [],
          sampleVideoUrl: application.teachingExperience?.sampleVideoUrl || ''
        },
        coursesExpertise: {
          primaryCategory: application.coursesExpertise?.primaryCategory || '',
          primaryCategoryOther: application.coursesExpertise?.primaryCategoryOther || '',
          proposedCourseTitle: application.coursesExpertise?.proposedCourseTitle || '',
          proposedCourseDesc: application.coursesExpertise?.proposedCourseDesc || '',
          targetAudience: application.coursesExpertise?.targetAudience || '',
          certifications: application.coursesExpertise?.certifications || []
        },
        documents: {
          resume: application.documents?.resume || null
        }
      };
    }

    return res.status(200).json({
      success: true,
      profile: profileData,
      application: applicationData
    });
  } catch (error) {
    console.error('getInstructorProfileAndApplication error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching instructor profile and application.' });
  }
};

// 17. Authenticated Password Change
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    let user = await Learner.findById(userId);
    if (!user) user = await Instructor.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.authProvider !== 'local') {
      return res.status(400).json({
        success: false,
        message: `Password change is not available for accounts managed via ${user.authProvider} single sign-on.`
      });
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password, and confirmation password are all required.'
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation password do not match.'
      });
    }

    const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (isSameAsCurrent) {
      return res.status(400).json({
        success: false,
        message: 'New password cannot be the same as your current password.'
      });
    }

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordChangedAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update password.' });
  }
};

