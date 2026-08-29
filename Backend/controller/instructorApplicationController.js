const InstructorApplication = require('../model/InstructorApplication');
const Instructor = require('../model/Instructor');
const path = require('path');
const fs = require('fs');

/**
 * Get current instructor application and status
 * GET /api/instructor/application
 */
exports.getApplication = async (req, res) => {
  try {
    const instructorId = req.user.id;

    const instructor = await Instructor.findById(instructorId);
    if (!instructor) {
      return res.status(404).json({ success: false, message: 'Instructor account not found.' });
    }

    let application = await InstructorApplication.findOne({ instructorId });

    if (!application) {
      // Initialize fresh application with instructor details
      application = new InstructorApplication({
        instructorId,
        applicationStatus: instructor.applicationStatus || 'not_started',
        currentSection: 1,
        personalInfo: {
          fullName: instructor.fullName || '',
          email: instructor.email || '',
          phone: '',
          professionalTitle: '',
          bio: '',
          location: '',
          photoUrl: instructor.avatar || ''
        }
      });
      await application.save();
    }

    return res.status(200).json({
      success: true,
      applicationStatus: instructor.applicationStatus || application.applicationStatus,
      application
    });
  } catch (error) {
    console.error('Error fetching instructor application:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch instructor application details.'
    });
  }
};

/**
 * Auto-save / Update application section data
 * PUT /api/instructor/application
 */
exports.updateApplication = async (req, res) => {
  try {
    const instructorId = req.user.id;
    const {
      personalInfo,
      professionalInfo,
      education,
      teachingExperience,
      coursesExpertise,
      documents,
      currentSection
    } = req.body;

    const instructor = await Instructor.findById(instructorId);
    if (!instructor) {
      return res.status(404).json({ success: false, message: 'Instructor account not found.' });
    }

    let application = await InstructorApplication.findOne({ instructorId });

    if (!application) {
      application = new InstructorApplication({
        instructorId,
        applicationStatus: 'draft',
        currentSection: currentSection || 1
      });
    }

    if (personalInfo) {
      application.personalInfo = { ...application.personalInfo.toObject(), ...personalInfo };
      if (personalInfo.photoUrl !== undefined) {
        instructor.avatar = personalInfo.photoUrl || '';
      }
    }

    if (professionalInfo) {
      const profData = { ...professionalInfo };
      if (typeof profData.keySkills === 'string') {
        profData.keySkills = profData.keySkills
          ? profData.keySkills.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
      }
      application.professionalInfo = { ...application.professionalInfo.toObject(), ...profData };
    }

    if (education) {
      application.education = { ...application.education.toObject(), ...education };
    }

    if (teachingExperience) {
      application.teachingExperience = { ...application.teachingExperience.toObject(), ...teachingExperience };
    }

    if (coursesExpertise) {
      application.coursesExpertise = { ...application.coursesExpertise.toObject(), ...coursesExpertise };
    }

    if (documents) {
      application.documents = { ...application.documents.toObject(), ...documents };
    }

    if (currentSection) {
      application.currentSection = currentSection;
    }

    // Move status from not_started to draft if user starts filling out data
    if (application.applicationStatus === 'not_started' || instructor.applicationStatus === 'not_started') {
      application.applicationStatus = 'draft';
      instructor.applicationStatus = 'draft';
    }

    await instructor.save();
    await application.save();

    return res.status(200).json({
      success: true,
      message: 'Application progress saved successfully.',
      applicationStatus: instructor.applicationStatus || application.applicationStatus,
      application
    });
  } catch (error) {
    console.error('Error auto-saving instructor application:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save application data. Please try again.'
    });
  }
};

/**
 * Upload Profile Photo
 * POST /api/instructor/application/upload/photo
 */
exports.uploadPhoto = async (req, res) => {
  try {
    const instructorId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload.' });
    }

    const photoUrl = `/uploads/photos/${req.file.filename}`;

    const instructor = await Instructor.findById(instructorId);
    if (instructor) {
      instructor.avatar = photoUrl;
      if (instructor.applicationStatus === 'not_started') {
        instructor.applicationStatus = 'draft';
      }
      await instructor.save();
    }

    let application = await InstructorApplication.findOne({ instructorId });
    if (!application) {
      application = new InstructorApplication({ instructorId, applicationStatus: 'draft' });
    }

    application.personalInfo = {
      ...application.personalInfo.toObject(),
      photoUrl
    };
    if (application.applicationStatus === 'not_started') {
      application.applicationStatus = 'draft';
    }
    await application.save();

    return res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully!',
      photoUrl,
      application
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to upload photo.' });
  }
};

/**
 * Remove Profile Photo
 * DELETE /api/instructor/application/upload/photo
 */
exports.removePhoto = async (req, res) => {
  try {
    const instructorId = req.user.id;

    const instructor = await Instructor.findById(instructorId);
    if (instructor) {
      instructor.avatar = '';
      await instructor.save();
    }

    let application = await InstructorApplication.findOne({ instructorId });
    if (application) {
      application.personalInfo = {
        ...application.personalInfo.toObject(),
        photoUrl: ''
      };
      await application.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Profile photo removed. Default profile icon restored.',
      photoUrl: ''
    });
  } catch (error) {
    console.error('Error removing photo:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove photo.' });
  }
};

/**
 * Upload Resume Document
 * POST /api/instructor/application/upload/resume
 */
exports.uploadResume = async (req, res) => {
  try {
    const instructorId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a resume file (PDF/DOC/DOCX) to upload.' });
    }

    const resumeUrl = `/uploads/resumes/${req.file.filename}`;
    const resumeObj = {
      url: resumeUrl,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    };

    let application = await InstructorApplication.findOne({ instructorId });
    if (!application) {
      application = new InstructorApplication({ instructorId, applicationStatus: 'draft' });
    }

    application.documents = {
      ...application.documents.toObject(),
      resume: resumeObj
    };
    if (application.applicationStatus === 'not_started') {
      application.applicationStatus = 'draft';
      const instructor = await Instructor.findById(instructorId);
      if (instructor && instructor.applicationStatus === 'not_started') {
        instructor.applicationStatus = 'draft';
        await instructor.save();
      }
    }
    await application.save();

    return res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully!',
      resume: resumeObj,
      application
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to upload resume.' });
  }
};

/**
 * Remove Resume Document
 * DELETE /api/instructor/application/upload/resume
 */
exports.removeResume = async (req, res) => {
  try {
    const instructorId = req.user.id;

    let application = await InstructorApplication.findOne({ instructorId });
    if (application) {
      application.documents = {
        ...application.documents.toObject(),
        resume: { url: '', originalName: '', size: 0, mimeType: '' }
      };
      await application.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Resume removed.',
      resume: { url: '', originalName: '', size: 0, mimeType: '' }
    });
  } catch (error) {
    console.error('Error removing resume:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove resume.' });
  }
};

/**
 * Upload Certification File
 * POST /api/instructor/application/upload/certificate
 */
exports.uploadCertificate = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a certificate file (PDF/JPG/PNG/WEBP) to upload.' });
    }

    const certificateUrl = `/uploads/certificates/${req.file.filename}`;
    const certFileObj = {
      url: certificateUrl,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    };

    return res.status(200).json({
      success: true,
      message: 'Certificate uploaded successfully!',
      certificateFile: certFileObj
    });
  } catch (error) {
    console.error('Error uploading certificate:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to upload certificate file.' });
  }
};

/**
 * Remove Certification File
 * DELETE /api/instructor/application/upload/certificate
 */
exports.removeCertificate = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Certificate file reference removed.',
      certificateFile: { url: '', originalName: '', size: 0, mimeType: '' }
    });
  } catch (error) {
    console.error('Error removing certificate file:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove certificate file.' });
  }
};

/**
 * Validate & Submit application
 * POST /api/instructor/application/submit
 */
exports.submitApplication = async (req, res) => {
  try {
    const instructorId = req.user.id;

    const instructor = await Instructor.findById(instructorId);
    if (!instructor) {
      return res.status(404).json({ success: false, message: 'Instructor account not found.' });
    }

    let application = await InstructorApplication.findOne({ instructorId });
    if (!application) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required application sections before submitting.'
      });
    }

    // Check required fields per section
    const pInfo = application.personalInfo || {};
    if (!pInfo.fullName?.trim() || !pInfo.email?.trim() || !pInfo.phone?.trim() || !pInfo.professionalTitle?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields in Personal Information before submitting.'
      });
    }

    const profInfo = application.professionalInfo || {};
    if (!profInfo.currentRole?.trim() || !profInfo.yearsOfExperience?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields in Professional Information before submitting.'
      });
    }

    const eduInfo = application.education || {};
    if (!eduInfo.degree?.trim() || !eduInfo.institution?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please complete Education details before submitting.'
      });
    }

    const teachInfo = application.teachingExperience || {};
    if (!teachInfo.priorExperience?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please complete Teaching Experience details before submitting.'
      });
    }

    const courseInfo = application.coursesExpertise || {};
    if (!courseInfo.primaryCategory?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please complete Courses & Expertise section before submitting.'
      });
    }

    const docInfo = application.documents || {};
    if (!docInfo.idDocumentRef?.trim() && !docInfo.resume?.url) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an ID Document Reference or upload a Resume before submitting.'
      });
    }

    // Update status to submitted
    application.applicationStatus = 'submitted';
    application.submittedAt = new Date();
    await application.save();

    instructor.applicationStatus = 'submitted';
    if (pInfo.photoUrl) {
      instructor.avatar = pInfo.photoUrl;
    }
    await instructor.save();

    return res.status(200).json({
      success: true,
      message: 'Congratulations! Your Instructor Application has been submitted successfully.',
      applicationStatus: 'submitted',
      user: {
        id: instructor._id,
        fullName: instructor.fullName,
        email: instructor.email,
        role: instructor.role,
        isVerified: instructor.isVerified,
        avatar: instructor.avatar,
        applicationStatus: 'submitted'
      }
    });
  } catch (error) {
    console.error('Error submitting instructor application:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit application. Please try again.'
    });
  }
};
