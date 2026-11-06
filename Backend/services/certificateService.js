const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const QRCode = require('qrcode');
const Certificate = require('../model/Certificate');
const Instructor = require('../model/Instructor');
const Learner = require('../model/Learner');
const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');
const { uploadBufferToCloudinary } = require('../controller/mediaController');

// Load and cache GreatVibes font as base64 for SVG embedded typography
let greatVibesBase64 = '';
const fontPath = path.join(__dirname, '../assets/fonts/GreatVibes.ttf');
try {
  if (fs.existsSync(fontPath)) {
    greatVibesBase64 = fs.readFileSync(fontPath).toString('base64');
  }
} catch (err) {
  console.warn('Warning: Could not load GreatVibes font file:', err.message);
}

// XML-escape helper for SVG text injection
function escapeXml(unsafe) {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a collision-safe certificate ID in format: UPSK-YYYY-XXXXXX
 * e.g., UPSK-2026-000842 or UPSK-2026-7A3F9B
 */
async function generateUniqueCertificateId() {
  const year = new Date().getFullYear();
  let attempts = 0;
  while (attempts < 10) {
    attempts++;
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const candidateId = `UPSK-${year}-${randomHex}`;
    const exists = await Certificate.exists({ certificateId: candidateId });
    if (!exists) {
      return candidateId;
    }
  }
  // Fallback with timestamp suffix
  return `UPSK-${year}-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Render certificate PNG buffer using Sharp, librsvg and QR Code
 */
async function renderCertificateBuffer({
  studentName,
  courseName,
  completionDate,
  certificateId,
  instructorName,
  instructorDesignation,
  verificationUrl
}) {
  // 1. Generate real QR code buffer (88x88 px)
  const qrBuffer = await QRCode.toBuffer(verificationUrl, {
    width: 88,
    margin: 1,
    color: {
      dark: '#064e3b',
      light: '#ffffff'
    }
  });

  // 2. Format completion date
  const dateObj = completionDate ? new Date(completionDate) : new Date();
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // 3. Dynamic font-size scaling for long text
  const cleanStudentName = studentName.trim() || 'Learner';
  const studentFontSize = cleanStudentName.length > 30 ? 22 : (cleanStudentName.length > 24 ? 25 : 28);

  const cleanCourseName = courseName.trim() || 'Course Completion';
  const courseFontSize = cleanCourseName.length > 50 ? 15 : (cleanCourseName.length > 36 ? 17 : 19);

  const cleanInstructorName = instructorName.trim() || 'Course Instructor';
  const cleanDesignation = instructorDesignation?.trim() || 'Course Instructor';

  // 4. Construct SVG overlay
  const fontFaceStyle = greatVibesBase64
    ? `@font-face {
        font-family: 'GreatVibesEmbedded';
        src: url('data:font/truetype;charset=utf-8;base64,${greatVibesBase64}') format('truetype');
      }`
    : '';

  const svgOverlay = Buffer.from(`
    <svg width="1024" height="682" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          ${fontFaceStyle}
          @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&amp;family=Playfair+Display:wght@700&amp;family=Inter:wght@500;600;700&amp;display=swap');
          
          .student-name {
            font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
            font-size: ${studentFontSize}px;
            font-weight: 700;
            fill: #064e3b;
            text-anchor: middle;
            letter-spacing: 0.5px;
          }
          .course-name {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: ${courseFontSize}px;
            font-weight: 700;
            fill: #065f46;
            text-anchor: middle;
            letter-spacing: 0.2px;
          }
          .meta-text {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: 13px;
            font-weight: 700;
            fill: #1f2937;
            text-anchor: middle;
          }
          .instructor-sig {
            font-family: 'GreatVibesEmbedded', 'Great Vibes', 'Brush Script MT', cursive;
            font-size: 38px;
            fill: #064e3b;
            text-anchor: middle;
          }
          .instructor-name {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: 14px;
            font-weight: 700;
            fill: #0f172a;
            text-anchor: middle;
          }
          .instructor-role {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: 11px;
            font-weight: 500;
            fill: #475569;
            text-anchor: middle;
          }
        </style>
      </defs>

      <!-- 1. Student Name Card & Text -->
      <rect x="250" y="226" width="524" height="48" rx="24" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
      <text x="512" y="260" class="student-name">${escapeXml(cleanStudentName)}</text>

      <!-- 2. Course Name Card & Text -->
      <rect x="190" y="316" width="644" height="48" rx="24" fill="#f0fdf4" stroke="#86efac" stroke-width="1.2"/>
      <text x="512" y="347" class="course-name">${escapeXml(cleanCourseName)}</text>

      <!-- 3. Completion Date Card & Text -->
      <rect x="280" y="446" width="180" height="25" rx="6" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
      <text x="370" y="463" class="meta-text">${escapeXml(formattedDate)}</text>

      <!-- 4. Certificate ID Card & Text -->
      <rect x="595" y="446" width="190" height="25" rx="6" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
      <text x="690" y="463" class="meta-text">${escapeXml(certificateId)}</text>

      <!-- 5. Instructor Signature Cover & Handwritten Cursive Signature -->
      <rect x="202" y="515" width="196" height="48" fill="#ffffff"/>
      <text x="300" y="550" class="instructor-sig">${escapeXml(cleanInstructorName)}</text>

      <!-- 6. Instructor Name & Designation Cover & Text -->
      <rect x="195" y="573" width="210" height="42" fill="#ffffff"/>
      <text x="300" y="589" class="instructor-name">${escapeXml(cleanInstructorName)}</text>
      <text x="300" y="605" class="instructor-role">${escapeXml(cleanDesignation)}</text>
    </svg>
  `);

  // 5. Select template
  const templatePath = path.join(__dirname, '../assets/certificate_template_raw.png');

  const finalPngBuffer = await sharp(templatePath)
    .composite([
      // Replace QR placeholder with dynamic verification QR
      { input: qrBuffer, top: 518, left: 85 },
      // Apply clean dynamic SVG overlay
      { input: svgOverlay, top: 0, left: 0 }
    ])
    .png({ quality: 100 })
    .toBuffer();

  return finalPngBuffer;
}

/**
 * Issue or retrieve a course completion certificate
 */
async function issueCourseCertificate({ course, enrolment, learnerId, learnerUser }) {
  if (!course || !learnerId) {
    throw new Error('Course and learnerId are required for certificate issuance.');
  }

  const courseId = course._id;

  // 1. Idempotency Check: Return existing certificate if already generated
  const existingCertificate = await Certificate.findOne({ learnerId, courseId });
  if (existingCertificate) {
    return existingCertificate;
  }

  // 2. Check if certificate is enabled for this course
  const isCertificateEnabled = Boolean(
    course.certificate === true ||
    course.certificateSettings?.enabled === true
  );

  if (!isCertificateEnabled) {
    return null;
  }

  // 3. Verify Enrolment and 100% completion
  let enr = enrolment;
  if (!enr) {
    enr = await Enrolment.findOne({ learnerId, courseId });
  }

  if (!enr || enr.progressPercentage < 100) {
    console.warn(`Cannot issue certificate: Course progress is ${enr?.progressPercentage || 0}%, must be 100%.`);
    return null;
  }

  // 4. Retrieve Learner Full Name
  let studentName = enr.learnerName;
  if (!studentName || studentName === 'Learner') {
    if (learnerUser && learnerUser.fullName) {
      studentName = learnerUser.fullName;
    } else {
      const learnerDoc = await Learner.findById(learnerId).select('fullName');
      if (learnerDoc && learnerDoc.fullName) {
        studentName = learnerDoc.fullName;
      }
    }
  }
  studentName = studentName || 'Learner';

  // 5. Retrieve Instructor Info from instructor profile (not duplicate storage in course)
  let instructorName = course.instructorName || 'UpSkillr Instructor';
  let instructorDesignation = 'Course Instructor';

  if (course.instructorId) {
    try {
      const instructorDoc = await Instructor.findById(course.instructorId).select('fullName designation');
      if (instructorDoc) {
        if (instructorDoc.fullName) instructorName = instructorDoc.fullName;
        if (instructorDoc.designation) instructorDesignation = instructorDoc.designation;
      }
    } catch (iErr) {
      console.warn('Error fetching instructor details for certificate:', iErr.message);
    }
  }

  // 6. Generate Collision-Safe Unique Certificate ID
  const certificateId = await generateUniqueCertificateId();

  // 7. Resolve Frontend Domain & Verification URL
  const domain = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const verificationUrl = `${domain.replace(/\/$/, '')}/verify-certificate/${certificateId}`;

  // 8. Render Certificate PNG Buffer
  const completionDate = enr.completedAt || new Date();
  const pngBuffer = await renderCertificateBuffer({
    studentName,
    courseName: course.title || enr.courseTitle || 'Course',
    completionDate,
    certificateId,
    instructorName,
    instructorDesignation,
    verificationUrl
  });

  // 9. Upload PNG Buffer to Cloudinary
  const folder = `upskillr/certificates/${learnerId}/${courseId}`;
  const filename = `${certificateId}_${Date.now()}.png`;
  const uploadResult = await uploadBufferToCloudinary(
    pngBuffer,
    'image/png',
    filename,
    folder
  );

  // 10. Persist Certificate Document in MongoDB
  try {
    const certificateDoc = await Certificate.create({
      certificateId,
      learnerId,
      courseId,
      instructorId: course.instructorId,
      studentNameSnapshot: studentName,
      courseNameSnapshot: course.title || enr.courseTitle,
      instructorNameSnapshot: instructorName,
      instructorDesignationSnapshot: instructorDesignation,
      completionDate,
      issuedAt: new Date(),
      certificateImageUrl: uploadResult.secure_url,
      certificatePublicId: uploadResult.public_id || '',
      verificationStatus: 'valid',
      verificationUrl,
      metadata: {
        width: 1024,
        height: 682,
        format: 'png',
        bytes: pngBuffer.length
      }
    });

    return certificateDoc;
  } catch (dbErr) {
    // If concurrent request created it first, return that one
    if (dbErr.code === 11000) {
      const raceCert = await Certificate.findOne({ learnerId, courseId });
      if (raceCert) return raceCert;
    }
    throw dbErr;
  }
}

module.exports = {
  generateUniqueCertificateId,
  renderCertificateBuffer,
  issueCourseCertificate
};
