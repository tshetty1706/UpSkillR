const fs = require('fs');
const path = require('path');
const InstructorApplication = require('../model/InstructorApplication');
const Instructor = require('../model/Instructor');
const { uploadBufferToCloudinary, deleteCloudinaryAsset } = require('./mediaController');

/**
 * Helper to hydrate an application document with canonical instructor identity fields.
 * Ensures backward compatibility with frontend consumers without duplicating fields in MongoDB.
 */
function hydrateApplicationWithInstructor(application, instructor) {
  const appObj = application.toObject ? application.toObject() : { ...application };
  appObj.personalInfo = {
    ...(appObj.personalInfo || {}),
    fullName: instructor.fullName || '',
    email: instructor.email || '',
    photoUrl: instructor.avatar || '',
    bio: instructor.bio || ''
  };
  appObj.professionalInfo = {
    ...(appObj.professionalInfo || {}),
    keySkills: instructor.keySkills || []
  };
  return appObj;
}

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
      // Initialize fresh application companion document
      application = new InstructorApplication({
        instructorId,
        applicationStatus: 'not_started',
        currentSection: 1,
        personalInfo: {
          phone: '',
          country: 'India',
          countryCode: '+91',
          professionalTitle: instructor.designation || '',
          professionalTitleOther: '',
          location: ''
        },
        professionalInfo: {
          currentRole: instructor.designation || '',
          organization: '',
          yearsOfExperience: '',
          linkedinUrl: '',
          websiteUrl: ''
        }
      });
      await application.save();
    }

    const hydratedApplication = hydrateApplicationWithInstructor(application, instructor);

    return res.status(200).json({
      success: true,
      applicationStatus: application.applicationStatus,
      application: hydratedApplication
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

    // 1. Personal Information Handling
    if (personalInfo) {
      // Canonical Instructor Updates:
      if (typeof personalInfo.fullName === 'string' && personalInfo.fullName.trim()) {
        instructor.fullName = personalInfo.fullName.trim();
      }
      if (personalInfo.bio !== undefined && typeof personalInfo.bio === 'string') {
        instructor.bio = personalInfo.bio.trim();
      }
      if (personalInfo.photoUrl !== undefined) {
        instructor.avatar = personalInfo.photoUrl || '';
      }
      if (personalInfo.professionalTitle !== undefined) {
        const title = personalInfo.professionalTitle?.trim() || '';
        const titleOther = personalInfo.professionalTitleOther?.trim() || '';
        const isOther = title === 'Other' || title.toLowerCase().startsWith('other');
        instructor.designation = isOther && titleOther ? titleOther : title;
      }

      // Application-specific personalInfo fields (No redundant fullName/email/bio/photoUrl)
      const currentPersonalInfo = application.personalInfo ? application.personalInfo.toObject() : {};
      application.personalInfo = {
        ...currentPersonalInfo,
        ...(personalInfo.phone !== undefined ? { phone: personalInfo.phone } : {}),
        ...(personalInfo.country !== undefined ? { country: personalInfo.country } : {}),
        ...(personalInfo.countryCode !== undefined ? { countryCode: personalInfo.countryCode } : {}),
        ...(personalInfo.professionalTitle !== undefined ? { professionalTitle: personalInfo.professionalTitle } : {}),
        ...(personalInfo.professionalTitleOther !== undefined ? { professionalTitleOther: personalInfo.professionalTitleOther } : {}),
        ...(personalInfo.location !== undefined ? { location: personalInfo.location } : {})
      };
      application.markModified('personalInfo');
    }

    // 2. Professional Information Handling
    if (professionalInfo) {
      // Canonical Instructor Key Skills Update:
      if (professionalInfo.keySkills !== undefined) {
        let skills = [];
        if (Array.isArray(professionalInfo.keySkills)) {
          skills = professionalInfo.keySkills.map((s) => String(s).trim()).filter(Boolean);
        } else if (typeof professionalInfo.keySkills === 'string') {
          skills = professionalInfo.keySkills.split(',').map((s) => s.trim()).filter(Boolean);
        }
        instructor.keySkills = skills;
      }

      // Application-specific professionalInfo fields (No redundant keySkills)
      const currentProfInfo = application.professionalInfo ? application.professionalInfo.toObject() : {};
      application.professionalInfo = {
        ...currentProfInfo,
        ...(professionalInfo.currentRole !== undefined ? { currentRole: professionalInfo.currentRole } : {}),
        ...(professionalInfo.organization !== undefined ? { organization: professionalInfo.organization } : {}),
        ...(professionalInfo.yearsOfExperience !== undefined ? { yearsOfExperience: professionalInfo.yearsOfExperience } : {}),
        ...(professionalInfo.linkedinUrl !== undefined ? { linkedinUrl: professionalInfo.linkedinUrl } : {}),
        ...(professionalInfo.websiteUrl !== undefined ? { websiteUrl: professionalInfo.websiteUrl } : {})
      };
      application.markModified('professionalInfo');
    }

    // 3. Education
    if (education) {
      application.education = { ...application.education.toObject(), ...education };
      application.markModified('education');
    }

    // 4. Teaching Experience
    if (teachingExperience) {
      application.teachingExperience = { ...application.teachingExperience.toObject(), ...teachingExperience };
      application.markModified('teachingExperience');
    }

    // 5. Courses & Expertise
    if (coursesExpertise) {
      const currentCoursesExpertise = application.coursesExpertise ? application.coursesExpertise.toObject() : {};
      application.coursesExpertise = { ...currentCoursesExpertise, ...coursesExpertise };
      if (coursesExpertise.certifications) {
        application.coursesExpertise.certifications = coursesExpertise.certifications;
      }
      application.markModified('coursesExpertise');
    }

    // 6. Documents
    if (documents) {
      const currentDocuments = application.documents ? application.documents.toObject() : {};
      application.documents = { ...currentDocuments, ...documents };
      if (documents.resume) {
        application.documents.resume = documents.resume;
      }
      if (documents.idDocumentRef !== undefined) {
        application.documents.idDocumentRef = documents.idDocumentRef;
      }
      application.markModified('documents');
    }

    if (currentSection) {
      application.currentSection = currentSection;
    }

    // Transition status to draft if previously not_started
    if (application.applicationStatus === 'not_started') {
      application.applicationStatus = 'draft';
    }

    await instructor.save();
    await application.save();

    const hydratedApplication = hydrateApplicationWithInstructor(application, instructor);

    return res.status(200).json({
      success: true,
      message: 'Application progress saved successfully.',
      applicationStatus: application.applicationStatus,
      application: hydratedApplication,
      user: {
        id: instructor._id,
        fullName: instructor.fullName,
        email: instructor.email,
        avatar: instructor.avatar,
        designation: instructor.designation,
        bio: instructor.bio,
        keySkills: instructor.keySkills,
        applicationStatus: application.applicationStatus
      }
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
 * Upload Profile Photo (Operates canonically on Instructor.avatar)
 * POST /api/instructor/application/upload/photo
 */
exports.uploadPhoto = async (req, res) => {
  try {
    const instructorId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload.' });
    }

    let photoUrl = '';

    // Direct Cloudinary upload
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

    // Fallback: save to local uploads/photos directory
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
    if (!instructor) {
      return res.status(404).json({ success: false, message: 'Instructor not found.' });
    }
    instructor.avatar = photoUrl;
    await instructor.save();

    let application = await InstructorApplication.findOne({ instructorId });
    if (!application) {
      application = new InstructorApplication({ instructorId, applicationStatus: 'draft' });
    }
    if (application.applicationStatus === 'not_started') {
      application.applicationStatus = 'draft';
    }
    await application.save();

    const hydratedApplication = hydrateApplicationWithInstructor(application, instructor);

    return res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully!',
      photoUrl: instructor.avatar,
      avatar: instructor.avatar,
      application: hydratedApplication
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to upload photo.' });
  }
};

/**
 * Remove Profile Photo (Operates canonically on Instructor.avatar)
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

    return res.status(200).json({
      success: true,
      message: 'Profile photo removed. Default profile icon restored.',
      photoUrl: '',
      avatar: ''
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
    application.markModified('documents');
    if (application.applicationStatus === 'not_started') {
      application.applicationStatus = 'draft';
    }
    await application.save();

    const instructor = await Instructor.findById(instructorId);
    const hydratedApplication = instructor ? hydrateApplicationWithInstructor(application, instructor) : application;

    return res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully!',
      resume: resumeObj,
      application: hydratedApplication
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
      application.markModified('documents');
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

    // Check required fields from canonical Instructor record and application
    if (!instructor.fullName?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Full Name is required before submitting your application.'
      });
    }

    if (!instructor.email?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.'
      });
    }

    const pInfo = application.personalInfo || {};
    const isOtherTitle = pInfo.professionalTitle === 'Other' || pInfo.professionalTitle?.toLowerCase().startsWith('other');
    if (
      !pInfo.phone?.trim() ||
      !pInfo.professionalTitle?.trim() ||
      (isOtherTitle && !pInfo.professionalTitleOther?.trim()) ||
      !instructor.bio?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields in Personal Information (including Professional Title, Phone Number, and Bio) before submitting.'
      });
    }

    const profInfo = application.professionalInfo || {};
    if (!profInfo.currentRole?.trim() || !profInfo.yearsOfExperience?.trim() || !instructor.keySkills || instructor.keySkills.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields in Professional Information (including Current Role, Experience, and Key Skills) before submitting.'
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

    // Update canonical application status to submitted
    application.applicationStatus = 'submitted';
    application.submittedAt = new Date();
    await application.save();

    // Ensure designation is aligned with the submitted title
    const resolvedTitle = isOtherTitle && pInfo.professionalTitleOther?.trim()
      ? pInfo.professionalTitleOther.trim()
      : (pInfo.professionalTitle || '');
    if (resolvedTitle && !instructor.designation) {
      instructor.designation = resolvedTitle;
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
        designation: instructor.designation,
        bio: instructor.bio,
        keySkills: instructor.keySkills,
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

    // 1. Handle base64 Data URLs
    if (fileUrl.startsWith('data:')) {
      const matches = fileUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const isPdf = mimeType.toLowerCase().includes('pdf');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="preview.${isPdf ? 'pdf' : 'bin'}"`);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(buffer);
      }
    }

    // 2. Handle local uploads
    if (fileUrl.startsWith('/uploads/') || fileUrl.includes('/uploads/')) {
      const fs = require('fs');
      const cleanPath = fileUrl.startsWith('http') ? new URL(fileUrl).pathname : fileUrl;
      const relativeUploadPath = cleanPath.substring(cleanPath.indexOf('/uploads/'));
      const filePath = path.join(__dirname, '..', relativeUploadPath);

      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        let mimeType = 'application/octet-stream';
        if (ext === '.pdf') mimeType = 'application/pdf';
        else if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else if (ext === '.webp') mimeType = 'image/webp';

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="preview${ext}"`);
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    // 3. Handle Cloudinary or remote URLs
    const isCloudinary = fileUrl.startsWith('https://res.cloudinary.com/') ||
                         fileUrl.startsWith('http://res.cloudinary.com/') ||
                         fileUrl.includes('cloudinary.com');

    if (!isCloudinary && !fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
      return res.status(403).json({ success: false, message: 'Invalid or unauthorized document source.' });
    }

    const axios = require('axios');
    const isPdf = /\.pdf(\?.*)?$/i.test(fileUrl);
    const isImage = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(fileUrl);

    // Fetch the original file buffer directly from storage
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'Accept': isPdf ? 'application/pdf,*/*' : '*/*'
      }
    });

    let contentType = response.headers['content-type'];
    if (!contentType || contentType === 'application/octet-stream') {
      if (isPdf) contentType = 'application/pdf';
      else if (isImage) {
        if (fileUrl.match(/\.png(\?.*)?$/i)) contentType = 'image/png';
        else if (fileUrl.match(/\.jpe?g(\?.*)?$/i)) contentType = 'image/jpeg';
        else if (fileUrl.match(/\.webp(\?.*)?$/i)) contentType = 'image/webp';
      }
    }

    const filename = isPdf ? 'document.pdf' : 'preview';
    res.setHeader('Content-Type', contentType || (isPdf ? 'application/pdf' : 'application/octet-stream'));
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('Error in previewProxy:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load document preview.' });
  }
};
