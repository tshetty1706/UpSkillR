const mongoose = require('mongoose');

const certificateFileSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    originalName: { type: String, default: '' },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: '' }
  },
  { _id: false }
);

const certificationSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    issuingOrganization: { type: String, default: '' },
    issueDate: { type: String, default: '' },
    expirationDate: { type: String, default: '' },
    doesNotExpire: { type: Boolean, default: false },
    credentialId: { type: String, default: '' },
    credentialUrl: { type: String, default: '' },
    certificateFile: { type: certificateFileSchema, default: () => ({}) }
  },
  { _id: true }
);

const instructorApplicationSchema = new mongoose.Schema(
  {
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instructor',
      required: true,
      unique: true
    },
    applicationStatus: {
      type: String,
      enum: ['not_started', 'draft', 'submitted'],
      default: 'not_started'
    },
    currentSection: {
      type: Number,
      default: 1
    },
    // 1. Personal Information
    personalInfo: {
      fullName: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      country: { type: String, default: 'India' },
      countryCode: { type: String, default: '+91' },
      professionalTitle: { type: String, default: '' },
      professionalTitleOther: { type: String, default: '' },
      bio: { type: String, default: '' },
      location: { type: String, default: '' },
      photoUrl: { type: String, default: '' }
    },
    // 2. Professional Information
    professionalInfo: {
      currentRole: { type: String, default: '' },
      organization: { type: String, default: '' },
      yearsOfExperience: { type: String, default: '' },
      linkedinUrl: { type: String, default: '' },
      websiteUrl: { type: String, default: '' },
      keySkills: { type: [String], default: [] }
    },
    // 3. Education
    education: {
      degree: { type: String, default: '' },
      degreeOther: { type: String, default: '' },
      fieldOfStudy: { type: String, default: '' },
      fieldOfStudyOther: { type: String, default: '' },
      institution: { type: String, default: '' },
      graduationYear: { type: String, default: '' }
    },
    // 4. Teaching Experience
    teachingExperience: {
      priorExperience: { type: String, default: '' },
      targetStudentLevel: { type: String, default: '' },
      preferredTeachingStyle: { type: String, default: '' },
      preferredTeachingStyles: { type: [String], default: [] },
      preferredTeachingStyleOther: { type: String, default: '' },
      primaryTeachingStyle: { type: String, default: '' },
      primaryTeachingStyles: { type: [String], default: [] },
      primaryTeachingStyleOther: { type: String, default: '' },
      sampleVideoUrl: { type: String, default: '' }
    },
    // 5. Courses & Expertise
    coursesExpertise: {
      primaryCategory: { type: String, default: '' },
      primaryCategoryOther: { type: String, default: '' },
      proposedCourseTitle: { type: String, default: '' },
      proposedCourseDesc: { type: String, default: '' },
      targetAudience: { type: String, default: '' },
      certifications: { type: [certificationSchema], default: [] }
    },
    // 6. Documents
    documents: {
      idDocumentRef: { type: String, default: '' },
      resume: {
        url: { type: String, default: '' },
        originalName: { type: String, default: '' },
        size: { type: Number, default: 0 },
        mimeType: { type: String, default: '' }
      },
      additionalNotes: { type: String, default: '' }
    },
    submittedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'InstructorApplication',
  instructorApplicationSchema,
  'instructorApplications'
);
