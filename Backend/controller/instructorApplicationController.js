const fs = require('fs');
const path = require('path');
const InstructorApplication = require('../model/InstructorApplication');
const Instructor = require('../model/Instructor');
const { uploadBufferToCloudinary, deleteCloudinaryAsset } = require('./mediaController');

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
      if (personalInfo.professionalTitle !== undefined) {
        const title = personalInfo.professionalTitle?.trim() || '';
        const titleOther = personalInfo.professionalTitleOther?.trim() || '';
        const isOther = title === 'Other' || title.toLowerCase().startsWith('other');
        instructor.designation = isOther && titleOther ? titleOther : title;
      }
      if (personalInfo.bio !== undefined) {
        instructor.bio = personalInfo.bio || '';
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
      if (profData.keySkills !== undefined) {
        instructor.keySkills = profData.keySkills;
      }
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

    let photoUrl = '';

    // Attempt Cloudinary upload first if credentials are configured
    try {
      const uploadResult = await uploadBufferToCloudinary(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        'instructor_photos'
      );
      if (uploadResult && uploadResult.secure_url && !uploadResult.secure_url.startsWith('data:')) {
        photoUrl = uploadResult.secure_url;
      }
    } catch (cErr) {
      console.warn('Cloudinary upload warning:', cErr.message);
    }

    // Fallback: If Cloudinary did not return a remote URL (offline / local development / unconfigured),
    // save to local uploads/photos directory so it is served quickly and reliably via express.static
    if (!photoUrl) {
      const ext = path.extname(req.file.originalname) || (req.file.mimetype.includes('png') ? '.png' : req.file.mimetype.includes('webp') ? '.webp' : '.jpg');
      const filename = `instructor-${instructorId}-${Date.now()}${ext}`;
      const photosDir = path.join(__dirname, '../uploads/photos');
      if (!fs.existsSync(photosDir)) {
        fs.mkdirSync(photosDir, { recursive: true });
      }
      fs.writeFileSync(path.join(photosDir, filename), req.file.buffer);
      photoUrl = `/uploads/photos/${filename}`;
    }

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
      ...(application.personalInfo ? application.personalInfo.toObject() : {}),
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
      if (instructor.avatar && !instructor.avatar.startsWith('/uploads/')) {
        await deleteCloudinaryAsset(instructor.avatar);
      } else if (instructor.avatar && instructor.avatar.startsWith('/uploads/')) {
        const localPath = path.join(__dirname, '..', instructor.avatar);
        if (fs.existsSync(localPath)) {
          try { fs.unlinkSync(localPath); } catch (e) {}
        }
      }
      instructor.avatar = '';
      await instructor.save();
    }

    let application = await InstructorApplication.findOne({ instructorId });
    if (application) {
      application.personalInfo = {
        ...(application.personalInfo ? application.personalInfo.toObject() : {}),
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

    // Direct upload to Cloudinary (Zero Local Disk Writes)
    const uploadResult = await uploadBufferToCloudinary(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      'instructor_resumes'
    );
    const resumeUrl = uploadResult.secure_url;
    const resumeObj = {
      url: resumeUrl,
      publicId: uploadResult.public_id,
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

    // Direct upload to Cloudinary (Zero Local Disk Writes)
    const uploadResult = await uploadBufferToCloudinary(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      'instructor_certificates'
    );
    const certificateUrl = uploadResult.secure_url;
    const certFileObj = {
      url: certificateUrl,
      publicId: uploadResult.public_id,
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
    const targetUrl = req.body?.url || req.body?.fileUrl || req.query?.url;
    const publicId = req.body?.publicId;

    if (publicId || (targetUrl && targetUrl.includes('cloudinary.com'))) {
      const isPdf = typeof targetUrl === 'string' && targetUrl.endsWith('.pdf');
      deleteCloudinaryAsset(publicId || targetUrl, isPdf ? 'raw' : 'image').catch(() => {});
    } else if (targetUrl && targetUrl.startsWith('/uploads/')) {
      try {
        const filePath = path.join(__dirname, '..', targetUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (fErr) {}
    }

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
    const isOtherTitle = pInfo.professionalTitle === 'Other' || pInfo.professionalTitle?.toLowerCase().startsWith('other');
    if (
      !pInfo.fullName?.trim() ||
      !pInfo.email?.trim() ||
      !pInfo.phone?.trim() ||
      !pInfo.professionalTitle?.trim() ||
      (isOtherTitle && !pInfo.professionalTitleOther?.trim()) ||
      !pInfo.bio?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields in Personal Information (including Professional Title and Bio) before submitting.'
      });
    }

    const profInfo = application.professionalInfo || {};
    if (!profInfo.currentRole?.trim() || !profInfo.yearsOfExperience?.trim() || !profInfo.keySkills || profInfo.keySkills.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields in Professional Information (including Key Technical Skills) before submitting.'
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
    const resolvedTitle = isOtherTitle && pInfo.professionalTitleOther?.trim()
      ? pInfo.professionalTitleOther.trim()
      : (pInfo.professionalTitle || '');
    instructor.designation = resolvedTitle;
    instructor.bio = pInfo.bio || '';
    instructor.keySkills = profInfo.keySkills || [];
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

/**
 * Stream/Proxy PDF or document for in-app inline preview (avoids CORS and forces inline header)
 * GET /api/instructor/application/preview-proxy?url=...
 */
exports.previewProxy = async (req, res) => {
  try {
    const fileUrl = req.query.url;
    if (!fileUrl) {
      return res.status(400).json({ success: false, message: 'File URL is required.' });
    }

    const axios = require('axios');
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 20000
    });

    const contentType = response.headers['content-type'] || 'application/pdf';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('Error in previewProxy:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load document preview.' });
  }
};

