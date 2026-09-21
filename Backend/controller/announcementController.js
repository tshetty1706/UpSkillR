const mongoose = require('mongoose');
const Announcement = require('../model/Announcement');
const Enrolment = require('../model/Enrolment');
const Course = require('../model/Course');

/**
 * 1. Get Course Announcements (Instructor)
 * Returns all announcements for a course, along with real-time recipient audience metrics.
 */
exports.getCourseAnnouncements = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.params.id;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID format.' });
    }

    // Dynamic audience metrics from real database enrolments
    const totalLearners = await Enrolment.countDocuments({ courseId });
    const completedLearners = await Enrolment.countDocuments({
      courseId,
      $or: [{ status: 'completed' }, { progressPercentage: { $gte: 100 } }]
    });
    const currentLearners = Math.max(0, totalLearners - completedLearners);

    const announcements = await Announcement.find({ courseId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      announcements,
      stats: {
        totalLearners,
        currentLearners,
        completedLearners
      }
    });
  } catch (error) {
    console.error('[ANNOUNCEMENTS] getCourseAnnouncements error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving announcements.' });
  }
};

/**
 * 2. Create Announcement (Instructor)
 * Creates a new course announcement with designated audience and status.
 */
exports.createAnnouncement = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.params.id;
    const { title, message, targetAudience = 'all', status = 'draft' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID format.' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Announcement title is required.' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Announcement message is required.' });
    }

    const validAudiences = ['current', 'completed', 'all'];
    if (!validAudiences.includes(targetAudience)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target audience. Must be "current", "completed", or "all".'
      });
    }

    const isPublished = status === 'published';

    const announcement = await Announcement.create({
      courseId,
      instructorId: req.user.id,
      title: title.trim(),
      message: message.trim(),
      targetAudience,
      status: isPublished ? 'published' : 'draft',
      publishedAt: isPublished ? new Date() : null
    });

    return res.status(201).json({
      success: true,
      message: isPublished ? 'Announcement published successfully!' : 'Announcement saved as draft.',
      announcement
    });
  } catch (error) {
    console.error('[ANNOUNCEMENTS] createAnnouncement error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating announcement.' });
  }
};

/**
 * 3. Update Announcement (Instructor)
 * Updates an existing announcement in-place.
 */
exports.updateAnnouncement = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.params.id;
    const { announcementId } = req.params;
    const { title, message, targetAudience, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(announcementId)) {
      return res.status(400).json({ success: false, message: 'Invalid announcement ID format.' });
    }

    const announcement = await Announcement.findOne({ _id: announcementId, courseId });

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found.' });
    }

    // Security: Strict ownership check
    if (announcement.instructorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to modify this announcement.'
      });
    }

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ success: false, message: 'Title cannot be empty.' });
      }
      announcement.title = title.trim();
    }

    if (message !== undefined) {
      if (!message.trim()) {
        return res.status(400).json({ success: false, message: 'Message cannot be empty.' });
      }
      announcement.message = message.trim();
    }

    if (targetAudience !== undefined) {
      const validAudiences = ['current', 'completed', 'all'];
      if (!validAudiences.includes(targetAudience)) {
        return res.status(400).json({ success: false, message: 'Invalid target audience.' });
      }
      announcement.targetAudience = targetAudience;
    }

    if (status !== undefined) {
      if (!['draft', 'published'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Status must be "draft" or "published".' });
      }
      if (status === 'published' && announcement.status !== 'published') {
        announcement.publishedAt = new Date();
      }
      announcement.status = status;
    }

    await announcement.save();

    return res.status(200).json({
      success: true,
      message: 'Announcement updated successfully.',
      announcement
    });
  } catch (error) {
    console.error('[ANNOUNCEMENTS] updateAnnouncement error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating announcement.' });
  }
};

/**
 * 4. Delete Announcement (Instructor)
 * Permanently deletes an announcement after ownership verification.
 */
exports.deleteAnnouncement = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.params.id;
    const { announcementId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(announcementId)) {
      return res.status(400).json({ success: false, message: 'Invalid announcement ID format.' });
    }

    const announcement = await Announcement.findOne({ _id: announcementId, courseId });

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found.' });
    }

    // Security: Strict ownership check
    if (announcement.instructorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to delete this announcement.'
      });
    }

    await Announcement.findByIdAndDelete(announcementId);

    return res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully.'
    });
  } catch (error) {
    console.error('[ANNOUNCEMENTS] deleteAnnouncement error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting announcement.' });
  }
};

/**
 * 5. Quick Toggle Publish Status (Instructor)
 */
exports.togglePublishAnnouncement = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.params.id;
    const { announcementId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(announcementId)) {
      return res.status(400).json({ success: false, message: 'Invalid announcement ID format.' });
    }

    const announcement = await Announcement.findOne({ _id: announcementId, courseId });

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found.' });
    }

    if (announcement.instructorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to modify this announcement.'
      });
    }

    const newStatus = announcement.status === 'published' ? 'draft' : 'published';
    announcement.status = newStatus;
    if (newStatus === 'published') {
      announcement.publishedAt = new Date();
    }

    await announcement.save();

    return res.status(200).json({
      success: true,
      message: newStatus === 'published' ? 'Announcement published live to learners.' : 'Announcement reverted to draft.',
      announcement
    });
  } catch (error) {
    console.error('[ANNOUNCEMENTS] togglePublishAnnouncement error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating announcement status.' });
  }
};

/**
 * 6. Get Learner Announcements (Learner-Facing Dynamic Delivery)
 * Delivers only published announcements targeted to the learner's actual status (active vs completed).
 */
exports.getLearnerCourseAnnouncements = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.params.id;
    const learnerId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID format.' });
    }

    // Verify learner enrollment
    const enrolment = await Enrolment.findOne({ courseId, learnerId });
    if (!enrolment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to view its announcements.'
      });
    }

    // Determine completion status
    const isCompleted = enrolment.status === 'completed' || enrolment.progressPercentage >= 100;
    const allowedAudiences = isCompleted ? ['all', 'completed'] : ['all', 'current'];

    const announcements = await Announcement.find({
      courseId,
      status: 'published',
      targetAudience: { $in: allowedAudiences }
    })
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      announcements
    });
  } catch (error) {
    console.error('[ANNOUNCEMENTS] getLearnerCourseAnnouncements error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving learner announcements.' });
  }
};
