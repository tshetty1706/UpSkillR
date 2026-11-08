const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const Learner = require('../model/Learner');
const PersonalNote = require('../model/PersonalNote');
const Bookmark = require('../model/Bookmark');
const BookmarkFolder = require('../model/BookmarkFolder');
const Enrolment = require('../model/Enrolment');
const CompletionRecord = require('../model/CompletionRecord');
const AssessmentSubmission = require('../model/AssessmentSubmission');
const Certificate = require('../model/Certificate');
const PointTransaction = require('../model/PointTransaction');
const LearnerActivity = require('../model/LearnerActivity');
const Notification = require('../model/Notification');
const CourseQuestion = require('../model/CourseQuestion');
const CourseReview = require('../model/CourseReview');
const Course = require('../model/Course');
const DeletionJob = require('../model/DeletionJob');
const { deleteCloudinaryAsset } = require('../controller/mediaController');

// ─── Course Rating Recalculation Helper ───
const updateCourseRatingStats = async (courseId) => {
  try {
    const reviews = await CourseReview.find({ courseId });
    if (reviews.length === 0) {
      await Course.findByIdAndUpdate(courseId, { rating: null, reviewCount: 0 });
      return;
    }
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = Number((sum / reviews.length).toFixed(1));
    await Course.findByIdAndUpdate(courseId, { rating: avg, reviewCount: reviews.length });
  } catch (err) {
    console.error(`[ACCOUNT DELETION] Error recalculating rating for course ${courseId}:`, err.message);
  }
};

// ─── Cryptographic OTP Helpers ───
const generateSecureOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashDeleteOtp = (otp, learnerId) => {
  const secret = process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET || 'upskillr_deletion_secret_2026';
  return crypto.createHmac('sha256', secret)
    .update(`ACCOUNT_DELETION:${String(learnerId)}:${String(otp).trim()}`)
    .digest('hex');
};

const hashToken = (token) => {
  return crypto.createHash('sha256').update(String(token).trim()).digest('hex');
};

// ─── Rate Limiter for Account Deletion OTP ───
const ipDeleteAttempts = new Map();
const emailDeleteAttempts = new Map();

const checkDeleteOtpRateLimit = (ip, email, req = null) => {
  if (process.env.NODE_ENV === 'test' || (process.env.NODE_ENV !== 'production' && req?.headers?.['x-test-suite'] === 'true')) {
    return { limited: false };
  }
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 min sliding window

  if (ip && ip !== 'unknown') {
    const ipHistory = (ipDeleteAttempts.get(ip) || []).filter(t => now - t < windowMs);
    if (ipHistory.length >= 10) {
      const oldest = ipHistory[0];
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      return { limited: true, retryAfter, message: `Too many deletion requests from this IP. Please wait ${retryAfter}s.` };
    }
  }

  if (email) {
    const emailHistory = (emailDeleteAttempts.get(email) || []).filter(t => now - t < windowMs);
    if (emailHistory.length >= 5) {
      const oldest = emailHistory[0];
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      return { limited: true, retryAfter, message: `Too many deletion requests for this account. Please wait ${retryAfter}s.` };
    }
  }

  return { limited: false };
};

const recordDeleteOtpAttempt = (ip, email) => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  if (ip && ip !== 'unknown') {
    const ipHistory = (ipDeleteAttempts.get(ip) || []).filter(t => now - t < windowMs);
    ipHistory.push(now);
    ipDeleteAttempts.set(ip, ipHistory);
  }
  if (email) {
    const emailHistory = (emailDeleteAttempts.get(email) || []).filter(t => now - t < windowMs);
    emailHistory.push(now);
    emailDeleteAttempts.set(email, emailHistory);
  }
};

// ─── Email Dispatcher with IPv4 Optimization ───
let deleteMailTransporter = null;
const getDeleteMailTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) return null;
  if (!deleteMailTransporter) {
    deleteMailTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      maxConnections: 3,
      family: 4,
      auth: { user: emailUser, pass: emailPass }
    });
  }
  return deleteMailTransporter;
};

const sendDeletionOtpEmail = async (email, otp, name) => {
  const transporter = getDeleteMailTransporter();
  const emailUser = process.env.EMAIL_USER;
  if (!transporter || !emailUser) {
    console.warn('[DELETE ACCOUNT] SMTP credentials missing in .env');
    console.log(`\n========================================================================`);
    console.log(`[DEVELOPMENT NOTICE] Account Deletion Verification Code for ${email}:`);
    console.log(`>>> VERIFICATION CODE: ${otp} <<<`);
    console.log(`(Valid for 5 minutes. SMTP credentials missing in Backend/.env)`);
    console.log(`========================================================================\n`);
    return false;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f5f7; margin:0; padding: 24px;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
        <div style="background-color: #dc2626; color: #ffffff; padding: 20px 24px;">
          <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700;">UpSkillR Security Alert</h2>
          <p style="margin: 4px 0 0 0; font-size: 0.85rem; opacity: 0.9;">Account Deletion Verification Code</p>
        </div>
        <div style="padding: 24px; color: #1f2937;">
          <p style="font-size: 1rem; margin-top: 0;">Hi <strong>${name || "Learner"}</strong>,</p>
          <p style="font-size: 0.95rem; line-height: 1.5; color: #374151;">
            We received a request to permanently delete your UpSkillR learner account. If you confirm this action, your enrolled courses, certificates, achievements, notes, bookmarks, and all personal learning data will be permanently erased.
          </p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
            <span style="display: block; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: #991b1b; font-weight: 600; margin-bottom: 6px;">Your 6-Digit Deletion Code</span>
            <span style="font-size: 2rem; font-weight: 800; letter-spacing: 6px; color: #b91c1c; font-family: monospace;">${otp}</span>
            <span style="display: block; font-size: 0.78rem; color: #7f1d1d; margin-top: 6px;">Valid for 5 minutes. Never share this code with anyone.</span>
          </div>
          <p style="font-size: 0.85rem; color: #6b7280; line-height: 1.4;">
            If you did NOT request to delete your account, please secure your account immediately.
          </p>
        </div>
        <div style="border-top: 1px solid #e5e7eb; padding: 14px 24px; background: #fafafa; text-align: center; font-size: 0.75rem; color: #9ca3af;">
          UpSkillR Security &amp; Privacy Team &bull; Automated notification
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"UpSkillR Security" <${emailUser}>`,
      to: email,
      subject: "[Urgent] Your UpSkillR Account Deletion Code",
      html,
      text: `Your UpSkillR account deletion code is: ${otp}. It is valid for 5 minutes.`
    });
    console.log(`[ACCOUNT DELETION] Verification email successfully sent to ${email}`);
    return true;
  } catch (err) {
    console.error(`[DELETE ACCOUNT EMAIL ERROR] Failed to send email to ${email}:`, err.message);
    console.log(`\n========================================================================`);
    console.log(`[DEVELOPMENT NOTICE] Account Deletion Verification Code for ${email}:`);
    console.log(`>>> VERIFICATION CODE: ${otp} <<<`);
    console.log(`(Email failed due to SMTP error: ${err.message}. Use the code above.)`);
    console.log(`========================================================================\n`);
    return false;
  }
};

// ─── Durable Permanent Deletion Runner ───
/**
 * Permanently deletes all personal data, associations, external assets, and the learner account document.
 * This execution is idempotent and tracked via DeletionJob.
 */
const executePermanentDeletion = async (learnerId, email, authProvider = 'local') => {
  const jobId = crypto.randomUUID();
  let job;

  try {
    job = await DeletionJob.create({
      jobId,
      learnerId,
      email,
      authProvider,
      status: 'processing',
      step: 'inventorying',
      attempts: 1
    });
  } catch (dbErr) {
    console.warn('[ACCOUNT DELETION] Could not record initial DeletionJob, proceeding with inline tracking:', dbErr.message);
  }

  try {
    const learner = await Learner.findById(learnerId);
    if (!learner) {
      throw new Error('Learner document not found in database.');
    }

    // 1. Inventory external Cloudinary assets & affected courses
    const certificates = await Certificate.find({ learnerId });
    const cloudinaryAssets = [];

    certificates.forEach(c => {
      if (c.certificatePublicId) cloudinaryAssets.push({ target: c.certificatePublicId, type: 'image' });
      if (c.certificateImageUrl && c.certificateImageUrl.includes('cloudinary.com')) cloudinaryAssets.push({ target: c.certificateImageUrl, type: 'image' });
      if (c.certificatePdfUrl && c.certificatePdfUrl.includes('cloudinary.com')) cloudinaryAssets.push({ target: c.certificatePdfUrl, type: 'raw' });
    });

    if (learner.avatar) {
      if (learner.avatar.includes('cloudinary.com') || (!learner.avatar.startsWith('/') && !learner.avatar.startsWith('http') && !learner.avatar.startsWith('data:'))) {
        cloudinaryAssets.push({ target: learner.avatar, type: 'image' });
      }
    }

    const reviews = await CourseReview.find({ learnerId });
    const affectedCourseIds = [...new Set(reviews.map(r => r.courseId.toString()))];

    // Document counts before deletion
    const inventoryCounts = {
      enrolments: await Enrolment.countDocuments({ learnerId }),
      personalNotes: await PersonalNote.countDocuments({ learnerId }),
      bookmarks: await Bookmark.countDocuments({ learnerId }),
      bookmarkFolders: await BookmarkFolder.countDocuments({ learnerId }),
      certificates: certificates.length,
      completionRecords: await CompletionRecord.countDocuments({ learner_id: learnerId }),
      assessmentSubmissions: await AssessmentSubmission.countDocuments({ learnerId }),
      pointTransactions: await PointTransaction.countDocuments({ $or: [{ learnerId }, { userId: learnerId }] }),
      learnerActivities: await LearnerActivity.countDocuments({ learnerId }),
      notifications: await Notification.countDocuments({ recipientId: learnerId }),
      courseQuestions: await CourseQuestion.countDocuments({ userId: learnerId }),
      courseReviews: reviews.length,
      cloudinaryAssets: cloudinaryAssets.map(a => a.target),
      coursesToRecalculate: affectedCourseIds
    };

    if (job) {
      job.inventory = inventoryCounts;
      job.step = 'external_cleanup';
      await job.save();
    }

    // 2. Clean up external Cloudinary assets
    for (const asset of cloudinaryAssets) {
      try {
        await deleteCloudinaryAsset(asset.target, asset.type);
      } catch (cloudErr) {
        console.warn(`[ACCOUNT DELETION] Non-fatal Cloudinary cleanup error for ${asset.target}:`, cloudErr.message);
      }
    }

    // Clean up local avatar file if stored on disk
    if (learner.avatar && learner.avatar.startsWith('/uploads/')) {
      const localFilePath = path.join(__dirname, '..', learner.avatar.replace(/^\//, ''));
      if (fs.existsSync(localFilePath)) {
        try {
          fs.unlinkSync(localFilePath);
        } catch (fErr) {
          console.warn(`[ACCOUNT DELETION] Could not delete local avatar file: ${localFilePath}`);
        }
      }
    }

    // 3. Delete user-owned and user-associated MongoDB records
    if (job) {
      job.step = 'mongo_cleanup';
      await job.save();
    }

    await PersonalNote.deleteMany({ learnerId });
    await Bookmark.deleteMany({ learnerId });
    await BookmarkFolder.deleteMany({ learnerId });
    await Enrolment.deleteMany({ learnerId });
    await CompletionRecord.deleteMany({ learner_id: learnerId });
    await AssessmentSubmission.deleteMany({ learnerId });
    await Certificate.deleteMany({ learnerId });
    await PointTransaction.deleteMany({ $or: [{ learnerId }, { userId: learnerId }] });
    await LearnerActivity.deleteMany({ learnerId });
    await Notification.deleteMany({ recipientId: learnerId });
    await CourseQuestion.deleteMany({ userId: learnerId });
    await CourseReview.deleteMany({ learnerId });

    // 4. Recalculate rating stats for courses where the learner had left a review
    for (const cId of affectedCourseIds) {
      await updateCourseRatingStats(cId);
    }

    // 5. Delete the Learner document
    if (job) {
      job.step = 'user_document_deletion';
      await job.save();
    }
    await Learner.findByIdAndDelete(learnerId);

    // 6. Verification phase: ensure 0 records remain
    const remainingLearner = await Learner.findById(learnerId);
    const remainingEnrolments = await Enrolment.countDocuments({ learnerId });
    const remainingCerts = await Certificate.countDocuments({ learnerId });
    const remainingNotes = await PersonalNote.countDocuments({ learnerId });
    const remainingBookmarks = await Bookmark.countDocuments({ learnerId });
    const remainingSubmissions = await AssessmentSubmission.countDocuments({ learnerId });
    const remainingRecords = await CompletionRecord.countDocuments({ learner_id: learnerId });

    const totalRemaining = (remainingLearner ? 1 : 0) + remainingEnrolments + remainingCerts + remainingNotes + remainingBookmarks + remainingSubmissions + remainingRecords;

    if (totalRemaining > 0) {
      throw new Error(`Data verification failed: ${totalRemaining} orphaned records still detected.`);
    }

    // 7. Mark DeletionJob as completed
    if (job) {
      job.status = 'completed';
      job.step = 'completed';
      job.completedAt = new Date();
      job.error = null;
      await job.save();
    }

    return {
      success: true,
      jobId,
      inventory: inventoryCounts,
      message: 'Your UpSkillR account has been permanently deleted.'
    };
  } catch (err) {
    console.error('[ACCOUNT DELETION ERROR]', err);
    if (job) {
      job.status = 'failed';
      job.error = err.message;
      await job.save();
    }
    throw err;
  }
};

module.exports = {
  generateSecureOtp,
  hashDeleteOtp,
  hashToken,
  checkDeleteOtpRateLimit,
  recordDeleteOtpAttempt,
  sendDeletionOtpEmail,
  executePermanentDeletion,
  updateCourseRatingStats
};
