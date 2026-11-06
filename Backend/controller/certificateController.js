const Certificate = require('../model/Certificate');
const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');
const Learner = require('../model/Learner');
const Instructor = require('../model/Instructor');
const { issueCourseCertificate } = require('../services/certificateService');

/**
 * 1. GET /api/certificates/me
 * Fetch all certificates earned by the authenticated learner
 */
exports.getMyCertificates = async (req, res) => {
  try {
    const learnerId = req.user.id;

    // 1. Fetch real certificate records
    const certDocs = await Certificate.find({ learnerId })
      .populate('courseId', 'title thumbnail category instructorName')
      .sort({ issuedAt: -1 });

    // Format output
    const certificates = certDocs.map(c => ({
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

    return res.status(200).json({
      success: true,
      count: certificates.length,
      certificates
    });
  } catch (error) {
    console.error('Error fetching learner certificates:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve certificates.' });
  }
};

/**
 * 2. POST /api/certificates/claim/:courseId
 * Claim or regenerate certificate for a completed course
 */
exports.claimCertificate = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID is required.' });
    }

    // Check existing certificate first
    const existing = await Certificate.findOne({ learnerId, courseId });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Certificate already issued.',
        certificate: existing
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const isEnabled = Boolean(course.certificate === true || course.certificateSettings?.enabled === true);
    if (!isEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Certificates are not enabled for this course by the instructor.'
      });
    }

    const enrolment = await Enrolment.findOne({ learnerId, courseId });
    if (!enrolment || enrolment.progressPercentage < 100) {
      return res.status(400).json({
        success: false,
        message: 'You must complete 100% of the course before receiving a certificate.'
      });
    }

    const certificate = await issueCourseCertificate({
      course,
      enrolment,
      learnerId,
      learnerUser: req.user
    });

    if (!certificate) {
      return res.status(500).json({
        success: false,
        message: 'Could not generate certificate. Please ensure all lessons are finished.'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Certificate generated successfully!',
      certificate
    });
  } catch (error) {
    console.error('Claim Certificate Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error claiming certificate.' });
  }
};

/**
 * 3. GET /api/certificates/verify/:certificateId
 * Public verification endpoint (no auth required)
 */
exports.verifyCertificatePublic = async (req, res) => {
  try {
    const rawId = req.params.certificateId;
    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Certificate ID is required.' });
    }

    const cleanId = rawId.trim().toUpperCase();
    const cert = await Certificate.findOne({ certificateId: cleanId });

    if (!cert) {
      return res.status(404).json({
        success: false,
        status: 'not_found',
        message: `No certificate found with ID: ${cleanId}. Please check the ID or contact support.`
      });
    }

    if (cert.verificationStatus === 'revoked') {
      return res.status(200).json({
        success: true,
        status: 'revoked',
        message: 'This certificate has been revoked and is no longer valid.',
        certificate: {
          certificateId: cert.certificateId,
          studentName: cert.studentNameSnapshot,
          courseName: cert.courseNameSnapshot,
          verificationStatus: 'revoked'
        }
      });
    }

    return res.status(200).json({
      success: true,
      status: 'valid',
      message: 'Certificate is authentic and officially verified by UpSkillR.',
      certificate: {
        certificateId: cert.certificateId,
        studentName: cert.studentNameSnapshot,
        courseName: cert.courseNameSnapshot,
        instructorName: cert.instructorNameSnapshot,
        instructorDesignation: cert.instructorDesignationSnapshot,
        completionDate: cert.completionDate,
        issuedAt: cert.issuedAt,
        certificateImageUrl: cert.certificateImageUrl,
        verificationStatus: cert.verificationStatus,
        verificationUrl: cert.verificationUrl
      }
    });
  } catch (error) {
    console.error('Verify Certificate Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during certificate verification.' });
  }
};

/**
 * 4. GET /api/certificates/course/:courseId
 * Instructor endpoint: View issued certificate stats and recipient list
 */
exports.getCourseCertificateStats = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findOne({ _id: courseId, instructorId: req.user.id });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or access denied.' });
    }

    const certificates = await Certificate.find({ courseId })
      .populate('learnerId', 'fullName email avatar')
      .sort({ issuedAt: -1 });

    const isEnabled = Boolean(course.certificate === true || course.certificateSettings?.enabled === true);

    return res.status(200).json({
      success: true,
      courseId,
      certificateEnabled: isEnabled,
      totalIssued: certificates.length,
      recipients: certificates.map(c => ({
        certificateId: c.certificateId,
        studentName: c.studentNameSnapshot,
        email: c.learnerId?.email || '',
        avatar: c.learnerId?.avatar || '',
        issuedAt: c.issuedAt,
        completionDate: c.completionDate,
        certificateImageUrl: c.certificateImageUrl,
        verificationStatus: c.verificationStatus
      }))
    });
  } catch (error) {
    console.error('Error fetching course certificate stats:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve certificate statistics.' });
  }
};
