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
const AssessmentAttempt = require('../model/AssessmentAttempt');
const OfficialAssessmentAttempt = require('../model/OfficialAssessmentAttempt');
const Certificate = require('../model/Certificate');
const PointTransaction = require('../model/PointTransaction');
const LearnerActivity = require('../model/LearnerActivity');
const Notification = require('../model/Notification');
const CourseQuestion = require('../model/CourseQuestion');
const CourseReview = require('../model/CourseReview');
const Course = require('../model/Course');
const DeletionJob = require('../model/DeletionJob');
const {
  deleteCloudinaryAsset,
  extractCloudinaryPublicId,
  isCloudinaryUrl
} = require('../controller/mediaController');

// ─── Course Cache Invalidation Helper ───
const invalidateCourseCaches = (courseIds = []) => {
  if (!Array.isArray(courseIds) || courseIds.length === 0) return;
  try {
    const { courseCache } = require('../controller/courseController');
    if (!courseCache) return;
    for (const cId of courseIds) {
      if (!cId) continue;
      courseCache.invalidateCourse?.(cId);
      courseCache.overviews?.delete?.(String(cId));
    }
  } catch (_) {
    // Non-fatal cache invalidation
  }
};

// ─── Course Rating Recalculation Helper ───
const updateCourseRatingStats = async (courseId, session = null) => {
  try {
    const query = CourseReview.find({ courseId });
    if (session) query.session(session);
    const reviews = await query;

    if (reviews.length === 0) {
      await Course.findByIdAndUpdate(
        courseId,
        { rating: null, reviewCount: 0 },
        session ? { session } : {}
      );
    } else {
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      const avg = Number((sum / reviews.length).toFixed(1));
      await Course.findByIdAndUpdate(
        courseId,
        { rating: avg, reviewCount: reviews.length },
        session ? { session } : {}
      );
    }
    invalidateCourseCaches([courseId]);
  } catch (err) {
    console.error(`[ACCOUNT DELETION] Error recalculating rating for course ${courseId}:`, err.message);
    if (session) throw err;
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Ownership-Aware External Asset Inventory Collector ───
const collectLearnerAssets = (learner, certificates = []) => {
  const cloudinaryMap = new Map();
  const localFileSet = new Set();
  const uploadsRoot = path.resolve(__dirname, '..', 'uploads');

  const registerAsset = (candidate, resourceType = 'image') => {
    if (!candidate || typeof candidate !== 'string') return;
    const trimmed = candidate.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('/uploads/')) {
      const resolved = path.resolve(__dirname, '..', trimmed.replace(/^\//, ''));
      if (resolved.startsWith(uploadsRoot + path.sep)) {
        localFileSet.add(resolved);
      }
      return;
    }
    const publicId = extractCloudinaryPublicId(trimmed, resourceType);
    if (!publicId) return; // Skips data: URLs & external non-Cloudinary OAuth avatars
    const key = `${resourceType}:${publicId}`;
    if (!cloudinaryMap.has(key)) {
      cloudinaryMap.set(key, {
        target: trimmed,
        publicId,
        resourceType
      });
    }
  };

  // Certificates owned by this learner (publicId prioritized over URL reconstruction)
  for (const cert of certificates) {
    if (cert.certificatePublicId) {
      registerAsset(cert.certificatePublicId, 'image');
    } else if (cert.certificateImageUrl && isCloudinaryUrl(cert.certificateImageUrl)) {
      registerAsset(cert.certificateImageUrl, 'image');
    } else if (cert.certificateImageUrl && cert.certificateImageUrl.startsWith('/uploads/')) {
      registerAsset(cert.certificateImageUrl, 'image');
    }

    if (cert.certificatePdfUrl) {
      registerAsset(cert.certificatePdfUrl, 'raw');
    }
  }

  // Profile avatar owned by this learner (stored public_id prioritized over URL fallback)
  if (learner?.avatarPublicId) {
    registerAsset(learner.avatarPublicId, 'image');
  } else if (learner?.avatar) {
    if (learner.avatar.startsWith('/uploads/') || isCloudinaryUrl(learner.avatar) || (!learner.avatar.startsWith('http') && !learner.avatar.startsWith('data:'))) {
      registerAsset(learner.avatar, 'image');
    }
  }

  return {
    cloudinaryAssets: Array.from(cloudinaryMap.values()),
    localFilePaths: Array.from(localFileSet)
  };
};

// ─── External Storage Cleanup With Retries & Failure Tracking ───
const executeExternalAssetCleanup = async (
  cloudinaryAssets = [],
  localFilePaths = [],
  deleteAssetFn = deleteCloudinaryAsset
) => {
  const failedAssets = [];
  const deletedAssets = [];

  for (const asset of cloudinaryAssets) {
    const target = asset.publicId || asset.target;
    const resourceType = asset.resourceType || 'image';
    let lastResult = null;
    let attemptsMade = 0;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      attemptsMade = attempt;
      lastResult = await deleteAssetFn(target, resourceType, { strict: false });
      if (lastResult && lastResult.ok) {
        break;
      }
      if (attempt < 3) {
        await sleep(120 * attempt);
      }
    }

    if (!lastResult || !lastResult.ok) {
      failedAssets.push({
        target: asset.target || target,
        publicId: asset.publicId || target,
        resourceType,
        lastError: lastResult?.error || 'Cloudinary deletion failed.',
        attempts: attemptsMade
      });
    } else {
      deletedAssets.push({
        publicId: lastResult.publicId || asset.publicId || target,
        resourceType: lastResult.resourceType || resourceType,
        skipped: Boolean(lastResult.skipped)
      });
    }
  }

  // Remove any legacy local disk uploads scoped strictly to this learner
  for (const localFilePath of localFilePaths) {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
  }

  return { deletedAssets, failedAssets };
};

// ─── MongoDB Multi-Document Transaction Runner ───
const runInTransaction = async (workFn) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      result = await workFn(session);
    });
    return result;
  } catch (err) {
    const msg = String(err?.message || '');
    const unsupported =
      err?.code === 20 ||
      err?.code === 263 ||
      msg.includes('Transaction numbers are only allowed on a replica set member') ||
      msg.includes('Transactions are not supported');
    if (unsupported) {
      return await workFn(null);
    }
    throw err;
  } finally {
    if (session) {
      await session.endSession().catch(() => {});
    }
  }
};

// ─── Transactional Database Cleanup & Shared-Data Anonymization ───
const executeTransactionalMongoCleanup = async (learnerId) => {
  return await runInTransaction(async (session) => {
    const sOpt = session ? { session } : {};

    // Identify reviews, rated enrolments, and Q&A threads sequentially (MongoDB transactions forbid parallel ops on same ClientSession)
    const reviews = await CourseReview.find({ learnerId }, '_id courseId', sOpt);
    const ratedEnrolments = await Enrolment.find({ learnerId, rating: { $ne: null } }, '_id courseId', sOpt);
    const learnerQuestions = await CourseQuestion.find({ userId: learnerId }, '_id courseId status instructorReply', sOpt);

    const reviewAffectedCourseIds = [
      ...new Set([
        ...reviews.map((r) => String(r.courseId)),
        ...ratedEnrolments.map((e) => String(e.courseId))
      ])
    ];
    const qaCourseIds = [...new Set(learnerQuestions.map((q) => String(q.courseId)))];
    const allCacheCourseIds = [...new Set([...reviewAffectedCourseIds, ...qaCourseIds])];

    const unansweredQuestions = [];
    const answeredQuestions = [];
    for (const q of learnerQuestions) {
      const hasReply = Boolean(q.instructorReply && String(q.instructorReply).trim());
      if (q.status === 'answered' || hasReply) {
        answeredQuestions.push(q);
      } else {
        unansweredQuestions.push(q);
      }
    }

    const unansweredIds = unansweredQuestions.map((q) => q._id);
    const unansweredIdStrs = unansweredIds.map(String);
    const answeredIds = answeredQuestions.map((q) => q._id);
    const answeredIdStrs = answeredIds.map(String);
    const deletedReviewIdStrs = reviews.map((r) => String(r._id));

    // Delete all strictly learner-owned records
    await PersonalNote.deleteMany({ learnerId }, sOpt);
    await Bookmark.deleteMany({ learnerId }, sOpt);
    await BookmarkFolder.deleteMany({ learnerId }, sOpt);
    await Enrolment.deleteMany({ learnerId }, sOpt);
    await CompletionRecord.deleteMany({ learner_id: learnerId }, sOpt);
    await AssessmentSubmission.deleteMany({ learnerId }, sOpt);
    await AssessmentAttempt.deleteMany({ learnerId }, sOpt);
    await OfficialAssessmentAttempt.deleteMany({ learnerId }, sOpt);
    await Certificate.deleteMany({ learnerId }, sOpt);
    await PointTransaction.deleteMany({ $or: [{ learnerId }, { userId: learnerId }] }, sOpt);
    await LearnerActivity.deleteMany({ learnerId }, sOpt);
    await Notification.deleteMany({ recipientId: learnerId }, sOpt);
    await CourseReview.deleteMany({ learnerId }, sOpt);

    // Delete unanswered Q&A threads so no dangling unanswered learner questions remain
    if (unansweredIds.length > 0) {
      await CourseQuestion.deleteMany({ _id: { $in: unansweredIds } }, sOpt);
    }

    // Shared data protection: preserve answered Q&A threads & instructor replies, anonymizing learner PII & reference
    if (answeredIds.length > 0) {
      await CourseQuestion.updateMany(
        { _id: { $in: answeredIds } },
        {
          $set: {
            userId: null,
            userName: 'Deleted Learner',
            userAvatar: ''
          }
        },
        sOpt
      );
    }

    // Remove or anonymize instructor/peer notifications pointing to this learner's deleted reviews/questions
    let notificationsReferencedCleaned = 0;
    const orphanNotifFilters = [];
    if (deletedReviewIdStrs.length > 0) {
      orphanNotifFilters.push({
        referenceId: { $in: deletedReviewIdStrs },
        type: { $in: ['NEW_REVIEW', 'COURSE_REVIEW'] }
      });
    }
    if (unansweredIds.length > 0) {
      orphanNotifFilters.push({ questionId: { $in: unansweredIds } });
      orphanNotifFilters.push({
        referenceId: { $in: unansweredIdStrs },
        type: { $in: ['COURSE_QUESTION', 'NEW_QUESTION'] }
      });
    }
    if (orphanNotifFilters.length > 0) {
      const delRes = await Notification.deleteMany({ $or: orphanNotifFilters }, sOpt);
      notificationsReferencedCleaned += delRes.deletedCount || 0;
    }

    // Anonymize learner name snippets on preserved answered-question notifications
    if (answeredIds.length > 0) {
      const preservedNotifs = await Notification.find(
        {
          $or: [
            { questionId: { $in: answeredIds } },
            { referenceId: { $in: answeredIdStrs }, type: { $in: ['COURSE_QUESTION', 'NEW_QUESTION'] } }
          ]
        },
        '_id message',
        sOpt
      );
      for (const notif of preservedNotifs) {
        if (notif.message && /^.+?\sasked:\s*/.test(notif.message)) {
          const anonymizedMsg = notif.message.replace(/^.+?\sasked:\s*/, 'Deleted Learner asked: ');
          if (anonymizedMsg !== notif.message) {
            await Notification.updateOne(
              { _id: notif._id },
              { $set: { message: anonymizedMsg } },
              sOpt
            );
            notificationsReferencedCleaned += 1;
          }
        }
      }
    }

    // Recalculate rating & reviewCount for affected courses atomically inside transaction
    for (const cId of reviewAffectedCourseIds) {
      await updateCourseRatingStats(cId, session);
    }

    // Delete primary Learner document
    await Learner.findByIdAndDelete(learnerId, sOpt);

    // Exhaustive verification inside transaction boundary (sequential on ClientSession)
    const remainingLearner = await Learner.findById(learnerId, '_id', sOpt);
    const remainingEnrolments = await Enrolment.countDocuments({ learnerId }).session(session || null);
    const remainingCerts = await Certificate.countDocuments({ learnerId }).session(session || null);
    const remainingNotes = await PersonalNote.countDocuments({ learnerId }).session(session || null);
    const remainingBookmarks = await Bookmark.countDocuments({ learnerId }).session(session || null);
    const remainingFolders = await BookmarkFolder.countDocuments({ learnerId }).session(session || null);
    const remainingSubmissions = await AssessmentSubmission.countDocuments({ learnerId }).session(session || null);
    const remainingAttempts = await AssessmentAttempt.countDocuments({ learnerId }).session(session || null);
    const remainingOfficialAttempts = await OfficialAssessmentAttempt.countDocuments({ learnerId }).session(session || null);
    const remainingRecords = await CompletionRecord.countDocuments({ learner_id: learnerId }).session(session || null);
    const remainingPoints = await PointTransaction.countDocuments({ $or: [{ learnerId }, { userId: learnerId }] }).session(session || null);
    const remainingActivities = await LearnerActivity.countDocuments({ learnerId }).session(session || null);
    const remainingNotifs = await Notification.countDocuments({ recipientId: learnerId }).session(session || null);
    const remainingQuestions = await CourseQuestion.countDocuments({ userId: learnerId }).session(session || null);
    const remainingReviews = await CourseReview.countDocuments({ learnerId }).session(session || null);

    const totalRemaining =
      (remainingLearner ? 1 : 0) +
      remainingEnrolments +
      remainingCerts +
      remainingNotes +
      remainingBookmarks +
      remainingFolders +
      remainingSubmissions +
      remainingAttempts +
      remainingOfficialAttempts +
      remainingRecords +
      remainingPoints +
      remainingActivities +
      remainingNotifs +
      remainingQuestions +
      remainingReviews;

    if (totalRemaining > 0) {
      throw new Error(`Data verification failed: ${totalRemaining} orphaned records still detected.`);
    }

    return {
      reviewAffectedCourseIds,
      allCacheCourseIds,
      courseQuestionsDeleted: unansweredIds.length,
      courseQuestionsAnonymized: answeredIds.length,
      notificationsReferencedCleaned
    };
  });
};

// ─── Durable Permanent Deletion Runner ───
/**
 * Permanently deletes all personal data, associations, external assets, and the learner account document.
 * This execution is idempotent, transactional across MongoDB collections, and tracked via DeletionJob.
 */
const executePermanentDeletion = async (learnerId, email, authProvider = 'local', options = {}) => {
  const { existingJob = null, deleteAssetFn = deleteCloudinaryAsset } = options || {};

  // Concurrency guard: reject overlapping active processing jobs for the same learnerId
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const inflight = await DeletionJob.findOne({
    learnerId,
    status: 'processing',
    updatedAt: { $gt: fiveMinutesAgo },
    ...(existingJob ? { _id: { $ne: existingJob._id } } : {})
  });
  if (inflight) {
    const err = new Error('Account deletion is already in progress for this account.');
    err.code = 'DELETION_IN_PROGRESS';
    err.jobId = inflight.jobId;
    throw err;
  }

  const normalizedEmail = String(email || '').toLowerCase().trim();
  const emailHash =
    normalizedEmail && normalizedEmail !== 'anonymized@deleted.local'
      ? hashToken(normalizedEmail)
      : (existingJob?.emailHash || '');
  const jobId = existingJob?.jobId || crypto.randomUUID();
  let job = existingJob;

  if (!job) {
    job = await DeletionJob.create({
      jobId,
      learnerId,
      email: normalizedEmail || 'unknown@deleted.local',
      emailHash,
      authProvider,
      status: 'processing',
      step: 'inventorying',
      attempts: 1
    });
  } else {
    job.status = 'processing';
    job.step = 'inventorying';
    job.attempts = (job.attempts || 0) + 1;
    job.error = null;
    await job.save();
  }

  try {
    const learner = await Learner.findById(learnerId);
    if (!learner) {
      throw new Error('Learner document not found in database.');
    }

    // 1. Inventory external assets, affected courses, and collection counts
    const [
      certificates,
      reviews,
      ratedEnrolments,
      learnerQuestions,
      enrolmentsCount,
      personalNotesCount,
      bookmarksCount,
      bookmarkFoldersCount,
      completionRecordsCount,
      assessmentSubmissionsCount,
      assessmentAttemptsCount,
      officialAssessmentAttemptsCount,
      pointTransactionsCount,
      learnerActivitiesCount,
      notificationsCount
    ] = await Promise.all([
      Certificate.find({ learnerId }),
      CourseReview.find({ learnerId }, 'courseId'),
      Enrolment.find({ learnerId, rating: { $ne: null } }, 'courseId'),
      CourseQuestion.find({ userId: learnerId }, 'status instructorReply'),
      Enrolment.countDocuments({ learnerId }),
      PersonalNote.countDocuments({ learnerId }),
      Bookmark.countDocuments({ learnerId }),
      BookmarkFolder.countDocuments({ learnerId }),
      CompletionRecord.countDocuments({ learner_id: learnerId }),
      AssessmentSubmission.countDocuments({ learnerId }),
      AssessmentAttempt.countDocuments({ learnerId }),
      OfficialAssessmentAttempt.countDocuments({ learnerId }),
      PointTransaction.countDocuments({ $or: [{ learnerId }, { userId: learnerId }] }),
      LearnerActivity.countDocuments({ learnerId }),
      Notification.countDocuments({ recipientId: learnerId })
    ]);

    const { cloudinaryAssets, localFilePaths } = collectLearnerAssets(learner, certificates);
    const affectedCourseIds = [
      ...new Set([
        ...reviews.map((r) => String(r.courseId)),
        ...ratedEnrolments.map((e) => String(e.courseId))
      ])
    ];

    const unansweredCount = learnerQuestions.filter(
      (q) => q.status !== 'answered' && (!q.instructorReply || !String(q.instructorReply).trim())
    ).length;
    const answeredCount = learnerQuestions.length - unansweredCount;

    const inventoryCounts = {
      enrolments: enrolmentsCount,
      personalNotes: personalNotesCount,
      bookmarks: bookmarksCount,
      bookmarkFolders: bookmarkFoldersCount,
      certificates: certificates.length,
      completionRecords: completionRecordsCount,
      assessmentSubmissions: assessmentSubmissionsCount,
      assessmentAttempts: assessmentAttemptsCount,
      officialAssessmentAttempts: officialAssessmentAttemptsCount,
      pointTransactions: pointTransactionsCount,
      learnerActivities: learnerActivitiesCount,
      notifications: notificationsCount,
      notificationsReferencedCleaned: 0,
      courseQuestions: learnerQuestions.length,
      courseQuestionsDeleted: unansweredCount,
      courseQuestionsAnonymized: answeredCount,
      courseReviews: reviews.length,
      cloudinaryAssetsCount: cloudinaryAssets.length,
      cloudinaryAssets: cloudinaryAssets.map((a) => a.publicId || a.target),
      coursesToRecalculate: affectedCourseIds
    };

    job.inventory = inventoryCounts;
    job.step = 'external_cleanup';
    await job.save();

    // 2. Clean up external Cloudinary & local disk assets strictly (retry + fail cleanly if any remain)
    const assetsToDelete =
      existingJob && Array.isArray(existingJob.pendingAssetCleanup) && existingJob.pendingAssetCleanup.length > 0
        ? existingJob.pendingAssetCleanup.map((p) => ({
            target: p.target,
            publicId: p.publicId,
            resourceType: p.resourceType || 'image'
          }))
        : cloudinaryAssets;

    const { failedAssets } = await executeExternalAssetCleanup(
      assetsToDelete,
      localFilePaths,
      deleteAssetFn
    );

    if (failedAssets.length > 0) {
      job.status = 'failed';
      job.step = 'external_cleanup_failed';
      job.pendingAssetCleanup = failedAssets;
      job.error = `External asset cleanup incomplete for ${failedAssets.length} file(s).`;
      await job.save();

      const cloudErr = new Error(job.error);
      cloudErr.code = 'EXTERNAL_STORAGE_CLEANUP_FAILED';
      cloudErr.jobId = jobId;
      cloudErr.failedAssets = failedAssets;
      throw cloudErr;
    }

    job.pendingAssetCleanup = [];
    job.step = 'mongo_cleanup';
    await job.save();

    // 3. Execute atomic transactional MongoDB deletion + shared-data anonymization + verification
    const cleanupMeta = await executeTransactionalMongoCleanup(learnerId);
    invalidateCourseCaches(cleanupMeta.allCacheCourseIds);

    // 4. Minimize & anonymize DeletionJob PII upon successful completion (retained only for 30-day audit TTL)
    job.email = 'anonymized@deleted.local';
    job.emailHash = emailHash;
    job.inventory.notificationsReferencedCleaned = cleanupMeta.notificationsReferencedCleaned;
    job.inventory.courseQuestionsDeleted = cleanupMeta.courseQuestionsDeleted;
    job.inventory.courseQuestionsAnonymized = cleanupMeta.courseQuestionsAnonymized;
    job.inventory.cloudinaryAssets = [];
    job.pendingAssetCleanup = [];
    job.status = 'completed';
    job.step = 'completed';
    job.completedAt = new Date();
    job.error = null;
    await job.save();

    return {
      success: true,
      jobId,
      inventory: {
        ...inventoryCounts,
        notificationsReferencedCleaned: cleanupMeta.notificationsReferencedCleaned,
        courseQuestionsDeleted: cleanupMeta.courseQuestionsDeleted,
        courseQuestionsAnonymized: cleanupMeta.courseQuestionsAnonymized
      },
      message: 'Your UpSkillR account has been permanently deleted.'
    };
  } catch (err) {
    console.error('[ACCOUNT DELETION ERROR]', err);
    if (job && job.status !== 'failed') {
      job.status = 'failed';
      job.error = err.message || 'Account deletion failed.';
      await job.save().catch(() => {});
    }
    if (!err.jobId) err.jobId = jobId;
    throw err;
  }
};

// ─── Retry Failed Deletion Job (External Storage & Incomplete Runs) ───
const retryDeletionJob = async (jobId, options = {}) => {
  const job = await DeletionJob.findOne({ jobId });
  if (!job) {
    throw new Error(`DeletionJob not found: ${jobId}`);
  }
  if (job.status === 'completed') {
    return {
      success: true,
      alreadyCompleted: true,
      jobId: job.jobId,
      inventory: job.inventory
    };
  }

  return await executePermanentDeletion(
    job.learnerId,
    job.email,
    job.authProvider,
    { ...options, existingJob: job }
  );
};

module.exports = {
  generateSecureOtp,
  hashDeleteOtp,
  hashToken,
  checkDeleteOtpRateLimit,
  recordDeleteOtpAttempt,
  sendDeletionOtpEmail,
  executePermanentDeletion,
  retryDeletionJob,
  collectLearnerAssets,
  executeExternalAssetCleanup,
  updateCourseRatingStats
};
