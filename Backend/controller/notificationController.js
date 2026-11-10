const Notification = require('../model/Notification');
const Enrolment = require('../model/Enrolment');
const Learner = require('../model/Learner');
const Course = require('../model/Course');
const mongoose = require('mongoose');

// Mapping from course navigation tabs to Notification sections and types
const SECTION_TYPE_MAP = {
  reviews: ['NEW_REVIEW', 'COURSE_REVIEW'],
  qa: ['QUESTION_REPLY', 'COURSE_QUESTION', 'NEW_QUESTION'],
  assessments: ['NEW_ASSESSMENT', 'ASSESSMENT_ADDED', 'ASSESSMENT_GRADED'],
  notices: ['NEW_ANNOUNCEMENT', 'COURSE_NOTICE', 'COURSE_ANNOUNCEMENT']
};

const VALID_SECTIONS = Object.keys(SECTION_TYPE_MAP);

const getSectionMatchFilter = (section) => {
  const types = SECTION_TYPE_MAP[section] || [];
  return {
    $or: [
      { section },
      ...(types.length > 0 ? [{ type: { $in: types } }] : [])
    ]
  };
};

const resolveNotificationSection = (doc) => {
  if (doc?.section && VALID_SECTIONS.includes(doc.section)) {
    return doc.section;
  }
  for (const sec of VALID_SECTIONS) {
    if (SECTION_TYPE_MAP[sec].includes(doc?.type)) {
      return sec;
    }
  }
  return null;
};

const getCourseUnreadCountsBySection = async (learnerId, courseId) => {
  const zero = { reviews: 0, qa: 0, assessments: 0, notices: 0, total: 0 };
  if (!learnerId || !courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    return zero;
  }

  const unreadDocs = await Notification.find({
    recipientId: learnerId,
    courseId,
    isRead: false
  })
    .select('section type')
    .lean();

  const counts = { reviews: 0, qa: 0, assessments: 0, notices: 0 };
  for (const doc of unreadDocs) {
    const sec = resolveNotificationSection(doc);
    if (sec && Object.prototype.hasOwnProperty.call(counts, sec)) {
      counts[sec] += 1;
    }
  }

  const total = counts.reviews + counts.qa + counts.assessments + counts.notices;
  return { ...counts, total };
};

exports.SECTION_TYPE_MAP = SECTION_TYPE_MAP;
exports.getCourseUnreadCountsBySection = getCourseUnreadCountsBySection;

/**
 * Shared deduplicated helper to dispatch unread course-section notifications
 * (reviews, qa, assessments, notices) to enrolled learners.
 */
exports.notifyEnrolledLearnersForCourseSection = async ({
  courseId,
  courseTitle = '',
  section,
  type,
  referenceId = null,
  questionId = null,
  title,
  message,
  link = '',
  instructorName = '',
  excludeUserIds = [],
  recipientIdsOverride = null
}) => {
  try {
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) return 0;

    let resolvedTitle = courseTitle;
    if (!resolvedTitle) {
      const course = await Course.findById(courseId).select('title').lean();
      resolvedTitle = course?.title || 'Course';
    }

    let recipientIds = [];
    if (Array.isArray(recipientIdsOverride)) {
      recipientIds = recipientIdsOverride.filter(Boolean).map(String);
    } else {
      const enrolments = await Enrolment.find({ courseId }).select('learnerId').lean();
      recipientIds = enrolments.map((e) => String(e.learnerId)).filter(Boolean);
    }

    const excludedSet = new Set((excludeUserIds || []).filter(Boolean).map(String));
    const uniqueRecipients = [...new Set(recipientIds)].filter((id) => !excludedSet.has(id));
    if (uniqueRecipients.length === 0) return 0;

    let targetRecipients = uniqueRecipients;
    if (referenceId) {
      const refStr = String(referenceId);
      const existing = await Notification.find({
        courseId,
        referenceId: refStr,
        recipientId: { $in: uniqueRecipients }
      })
        .select('recipientId')
        .lean();
      const alreadyHas = new Set(existing.map((d) => String(d.recipientId)));
      targetRecipients = uniqueRecipients.filter((id) => !alreadyHas.has(id));
    }

    if (targetRecipients.length === 0) return 0;

    const targetLink = link || `/courses/${courseId}?tab=${section}`;
    const docs = targetRecipients.map((learnerId) => ({
      recipientId: learnerId,
      courseId,
      courseTitle: resolvedTitle,
      section: section || 'general',
      type,
      referenceId: referenceId ? String(referenceId) : null,
      questionId: questionId || null,
      instructorName: instructorName || '',
      title,
      message,
      link: targetLink,
      isRead: false
    }));

    await Notification.insertMany(docs, { ordered: false });
    return docs.length;
  } catch (err) {
    console.error(`[NOTIFICATIONS ERROR] Failed to notify section ${section}:`, err);
    return 0;
  }
};

/**
 * Dispatch notifications to students when a new module or lesson is uploaded to a course.
 * First targets all students enrolled in the course. If no enrolments exist yet, targets all registered learners.
 */
exports.notifyStudentsOnNewContent = async ({
  courseId,
  courseTitle,
  type = 'NEW_LESSON',
  moduleTitle = '',
  lessonTitle = '',
  title = '',
  message = ''
}) => {
  try {
    if (!courseId) return;

    // Resolve course title if missing
    let resolvedTitle = courseTitle;
    if (!resolvedTitle) {
      const course = await Course.findById(courseId).select('title');
      resolvedTitle = course?.title || 'Course';
    }

    // Find all enrolled learners
    const enrolments = await Enrolment.find({ courseId }).select('learnerId');
    let recipientIds = enrolments.map(e => e.learnerId).filter(Boolean);

    // If no students enrolled yet, notify all active learners so any student stays informed
    if (recipientIds.length === 0) {
      const allLearners = await Learner.find({}).select('_id').limit(150);
      recipientIds = allLearners.map(l => l._id);
    }

    if (recipientIds.length === 0) return;

    // Deduplicate recipient IDs
    const uniqueIds = [...new Set(recipientIds.map(id => id.toString()))];

    const notifTitle = title || (type === 'NEW_MODULE' ? '📦 New Module Added' : '📚 New Lesson Uploaded');
    const notifMessage = message || (type === 'NEW_MODULE'
      ? `A new module "${moduleTitle || 'New Module'}" has been added to "${resolvedTitle}".`
      : `A new lesson "${lessonTitle || 'New Lesson'}" was uploaded to "${resolvedTitle}". Check it out now!`);

    const records = uniqueIds.map(learnerId => ({
      recipientId: learnerId,
      courseId,
      courseTitle: resolvedTitle,
      type,
      moduleTitle,
      lessonTitle,
      title: notifTitle,
      message: notifMessage,
      isRead: false
    }));

    await Notification.insertMany(records, { ordered: false });
    console.log(`[NOTIFICATIONS] Successfully notified ${records.length} students about new ${type} on "${resolvedTitle}"`);
  } catch (err) {
    console.error('[NOTIFICATIONS ERROR] Failed to dispatch notifications:', err);
  }
};

/**
 * GET /api/learners/me/notifications
 * Retrieves unread and recent notifications for the logged-in learner.
 */
exports.getLearnerNotifications = async (req, res) => {
  try {
    const learnerId = req.user.id;

    const [unreadCount, notifications] = await Promise.all([
      Notification.countDocuments({ recipientId: learnerId, isRead: false }),
      Notification.find({ recipientId: learnerId })
        .sort({ isRead: 1, createdAt: -1 })
        .limit(30)
    ]);

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (error) {
    console.error('Error fetching learner notifications:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
};

/**
 * PATCH /api/learners/me/notifications/:id/read
 * Marks a specific notification as read.
 */
exports.markNotificationAsRead = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID format.' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: learnerId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    const unreadCount = await Notification.countDocuments({ recipientId: learnerId, isRead: false });

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      unreadCount,
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
};

/**
 * PATCH /api/learners/me/notifications/read-all
 * Marks all notifications for the logged-in learner as read.
 */
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const learnerId = req.user.id;

    await Notification.updateMany(
      { recipientId: learnerId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      unreadCount: 0
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark all as read.' });
  }
};

/**
 * GET /api/learners/me/notifications/course/:courseId/unread-counts
 * Also accessible via GET /api/courses/:courseId/notifications/unread-counts
 * Computes real unread counts per course overview tab strictly from unread Notification documents.
 */
exports.getCourseSectionUnreadCounts = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { courseId } = req.params;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID format.' });
    }

    const unreadCounts = await getCourseUnreadCountsBySection(learnerId, courseId);

    return res.status(200).json({
      success: true,
      courseId,
      unreadCounts
    });
  } catch (error) {
    console.error('Error fetching course section unread counts:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch unread notification counts.' });
  }
};

/**
 * PATCH /api/learners/me/notifications/course/:courseId/mark-section-read
 * Also accessible via PATCH /api/courses/:courseId/notifications/:section/read
 * Marks currently unread notifications for the authenticated learner, target course, and specific section as read.
 * Strictly scopes by (recipientId, courseId, section, isRead: false, createdAt <= cutoff) so future notifications
 * and other courses/learners remain untouched.
 */
exports.markCourseSectionNotificationsAsRead = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { courseId } = req.params;
    const section = (req.params.section || req.body?.section || '').toLowerCase().trim();

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID format.' });
    }

    if (!VALID_SECTIONS.includes(section)) {
      return res.status(400).json({
        success: false,
        message: `Invalid section "${section}". Must be one of: ${VALID_SECTIONS.join(', ')}.`
      });
    }

    const now = new Date();
    let cutoff = now;
    if (req.body?.viewedAt) {
      const parsed = new Date(req.body.viewedAt);
      if (!isNaN(parsed.getTime()) && parsed.getTime() < now.getTime()) {
        cutoff = parsed;
      }
    }

    const sectionFilter = getSectionMatchFilter(section);
    const updateQuery = {
      recipientId: learnerId,
      courseId,
      isRead: false,
      createdAt: { $lte: cutoff },
      ...sectionFilter
    };

    const updateRes = await Notification.updateMany(
      updateQuery,
      { $set: { isRead: true, readAt: now } }
    );

    const [unreadCounts, bellUnreadCount] = await Promise.all([
      getCourseUnreadCountsBySection(learnerId, courseId),
      Notification.countDocuments({ recipientId: learnerId, isRead: false })
    ]);

    return res.status(200).json({
      success: true,
      section,
      markedCount: updateRes.modifiedCount || 0,
      unreadCounts,
      bellUnreadCount
    });
  } catch (error) {
    console.error('Error marking course section notifications as read:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark section notifications as read.' });
  }
};
