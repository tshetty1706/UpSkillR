/**
 * Resolves the authoritative certificate availability boolean from a Course document.
 * Never infers certificate eligibility from completion percentage or enrolment status.
 */
const isCourseCertificateEnabled = (course) => {
  if (!course || typeof course !== 'object') return false;
  return Boolean(course.certificate === true || course.certificateSettings?.enabled === true);
};

/**
 * Normalizes `certificate` and `certificateSettings.enabled` fields in-place on a course object
 * so all learner and public API payloads reflect the exact instructor setting.
 */
const syncCourseCertificateFields = (courseObj, enabled) => {
  if (!courseObj || typeof courseObj !== 'object') return courseObj;
  const boolVal = Boolean(enabled);
  courseObj.certificate = boolVal;
  courseObj.certificateSettings = { enabled: boolVal };
  return courseObj;
};

/**
 * Builds the live learner certificate list for Achievements & Profile endpoints:
 * - Auto-issues certificates for completed courses whose certificate setting is currently enabled.
 * - Filters out certificates for live courses whose instructor has disabled certificates.
 * - Never generates or exposes certificates for courses without certificates enabled.
 */
const buildLearnerCertificatesPayload = async ({
  Certificate,
  Enrolment,
  issueCourseCertificate,
  learnerId,
  learnerUser
}) => {
  const [issuedCerts, completedEnrolments] = await Promise.all([
    Certificate.find({ learnerId })
      .populate('courseId', 'title thumbnail category instructorName certificate certificateSettings')
      .sort({ issuedAt: -1 }),
    Enrolment.find({
      learnerId,
      $or: [{ status: 'completed' }, { progressPercentage: { $gte: 100 } }]
    }).populate('courseId', 'title thumbnail category certificate certificateSettings instructorName instructorId')
  ]);

  const issuedCourseIds = new Set(issuedCerts.map((c) => String(c.courseId?._id || c.courseId)));

  for (const enr of completedEnrolments) {
    if (!enr.courseId) continue;
    const cIdStr = String(enr.courseId._id || enr.courseId);
    if (isCourseCertificateEnabled(enr.courseId) && !issuedCourseIds.has(cIdStr)) {
      if (typeof issueCourseCertificate === 'function') {
        try {
          const newCert = await issueCourseCertificate({
            course: enr.courseId,
            enrolment: enr,
            learnerId,
            learnerUser
          });
          if (newCert) {
            issuedCerts.push(newCert);
            issuedCourseIds.add(cIdStr);
          }
        } catch (genErr) {
          console.warn('Auto-issuing certificate for completed course error:', genErr.message);
        }
      }
    }
  }

  // Only include certificates for live courses that have certificates enabled (or archived deleted-course records)
  const visibleCerts = issuedCerts.filter((c) => {
    if (c.courseId && typeof c.courseId === 'object' && 'certificate' in c.courseId) {
      return isCourseCertificateEnabled(c.courseId);
    }
    return true;
  });

  return visibleCerts.map((c) => ({
    _id: c._id,
    certificateId: c.certificateId,
    courseId: c.courseId?._id || c.courseId,
    courseTitle: c.courseNameSnapshot || c.courseId?.title || 'Completed Course',
    courseThumbnail: c.courseId?.thumbnail || '',
    category: c.courseId?.category || 'General',
    studentName: c.studentNameSnapshot,
    instructorName: c.instructorNameSnapshot || c.courseId?.instructorName || 'UpSkillr Instructor',
    instructorDesignation: c.instructorDesignationSnapshot || 'Course Instructor',
    completionDate: c.completionDate,
    issuedAt: c.issuedAt,
    certificateImageUrl: c.certificateImageUrl,
    verificationUrl: c.verificationUrl,
    verificationStatus: c.verificationStatus,
    hasCertificate: true
  }));
};

module.exports = {
  isCourseCertificateEnabled,
  syncCourseCertificateFields,
  buildLearnerCertificatesPayload
};
