const Notification = require('../model/Notification');
const Enrolment = require('../model/Enrolment');
const Learner = require('../model/Learner');
const Course = require('../model/Course');
const mongoose = require('mongoose');

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
