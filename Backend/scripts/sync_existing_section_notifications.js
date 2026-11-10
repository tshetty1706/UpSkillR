const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Course = require('../model/Course');
const Announcement = require('../model/Announcement');
const CourseReview = require('../model/CourseReview');
const Enrolment = require('../model/Enrolment');
const { notifyEnrolledLearnersForCourseSection } = require('../controller/notificationController');

async function syncExisting() {
  const mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI;
  await mongoose.connect(mongoUrl, { dbName: 'UpSkillr' });

  let createdCount = 0;

  // 1. Existing published announcements
  const announcements = await Announcement.find({ status: 'published' }).lean();
  for (const ann of announcements) {
    const enrolments = await Enrolment.find({ courseId: ann.courseId }).select('learnerId status progressPercentage').lean();
    const targetIds = enrolments
      .filter((e) => {
        if (ann.targetAudience === 'all') return true;
        const isComp = e.status === 'completed' || (e.progressPercentage && e.progressPercentage >= 100);
        return ann.targetAudience === 'completed' ? isComp : !isComp;
      })
      .map((e) => e.learnerId);
    createdCount += await notifyEnrolledLearnersForCourseSection({
      courseId: ann.courseId,
      section: 'notices',
      type: 'NEW_ANNOUNCEMENT',
      referenceId: ann._id,
      title: `New Notice: ${ann.title}`,
      message: ann.message || '',
      link: `/courses/${ann.courseId}?tab=notices`,
      recipientIdsOverride: targetIds
    });
  }

  // 2. Existing published courseAssessments
  const courses = await Course.find({ isDeleted: { $ne: true }, status: 'published' })
    .select('title courseAssessments')
    .lean();
  for (const c of courses) {
    for (const ca of c.courseAssessments || []) {
      if (ca.state === 'published' || ca.status === 'published') {
        createdCount += await notifyEnrolledLearnersForCourseSection({
          courseId: c._id,
          courseTitle: c.title,
          section: 'assessments',
          type: 'NEW_ASSESSMENT',
          referenceId: ca._id,
          title: `New Assessment Published: ${ca.title}`,
          message: `Assessment "${ca.title}" is available in "${c.title}".`,
          link: `/courses/${c._id}?tab=assessments`
        });
      }
    }
  }

  // 3. Existing CourseReviews (notifying fellow enrolled learners excluding author)
  const reviews = await CourseReview.find({}).lean();
  for (const rev of reviews) {
    createdCount += await notifyEnrolledLearnersForCourseSection({
      courseId: rev.courseId,
      section: 'reviews',
      type: 'NEW_REVIEW',
      referenceId: rev._id,
      title: `New ${rev.rating}-Star Course Review`,
      message: rev.feedback || 'A learner reviewed this course.',
      link: `/courses/${rev.courseId}?tab=reviews`,
      excludeUserIds: [rev.learnerId]
    });
  }

  console.log(`Idempotent initial section notifications sync complete. Created: ${createdCount}`);
  await mongoose.disconnect();
}

syncExisting().catch((err) => {
  console.error(err);
  process.exit(1);
});
