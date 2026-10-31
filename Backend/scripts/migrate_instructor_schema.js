const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  console.log('====================================================');
  console.log('   UPSKILLR INSTRUCTOR SCHEMA CONSOLIDATION MIGRATION');
  console.log('====================================================\n');

  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    throw new Error('MONGO_URL not found in environment.');
  }

  await mongoose.connect(mongoUrl, { dbName: 'UpSkillr', serverSelectionTimeoutMS: 30000 });
  const db = mongoose.connection.db;

  const instructorsColl = db.collection('instructors');
  const applicationsColl = db.collection('instructorApplications');

  const instructors = await instructorsColl.find({}).toArray();
  const applications = await applicationsColl.find({}).toArray();

  console.log(`Found ${instructors.length} instructors and ${applications.length} applications.\n`);

  const auditLogs = [];

  for (const inst of instructors) {
    console.log(`Processing instructor: ${inst.email} (${inst._id})...`);
    let app = applications.find(a => String(a.instructorId) === String(inst._id));

    const instUpdates = {};
    const conflictNotes = [];

    // 1. Ensure companion InstructorApplication document exists
    if (!app) {
      console.log(`  [+] Creating missing companion application document for ${inst.email}...`);
      const newApp = {
        instructorId: inst._id,
        applicationStatus: inst.applicationStatus || 'not_started',
        currentSection: 1,
        personalInfo: {
          phone: '',
          country: 'India',
          countryCode: '+91',
          professionalTitle: inst.designation || '',
          professionalTitleOther: '',
          location: ''
        },
        professionalInfo: {
          currentRole: inst.designation || '',
          organization: '',
          yearsOfExperience: '',
          linkedinUrl: '',
          websiteUrl: ''
        },
        education: {
          degree: '',
          degreeOther: '',
          fieldOfStudy: '',
          fieldOfStudyOther: '',
          institution: '',
          graduationYear: ''
        },
        teachingExperience: {
          priorExperience: '',
          targetStudentLevel: '',
          preferredTeachingStyles: [],
          preferredTeachingStyleOther: '',
          primaryTeachingStyles: [],
          primaryTeachingStyleOther: '',
          sampleVideoUrl: ''
        },
        coursesExpertise: {
          primaryCategory: '',
          primaryCategoryOther: '',
          proposedCourseTitle: '',
          proposedCourseDesc: '',
          targetAudience: '',
          certifications: []
        },
        documents: {
          idDocumentRef: '',
          resume: { url: '', originalName: '', size: 0, mimeType: '' },
          additionalNotes: ''
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const insertResult = await applicationsColl.insertOne(newApp);
      app = { ...newApp, _id: insertResult.insertedId };
      auditLogs.push({
        instructorId: inst._id,
        email: inst.email,
        action: 'CREATED_APPLICATION',
        status: newApp.applicationStatus
      });
    }

    // 2. Full Name Consolidation
    const appFullName = app.personalInfo?.fullName?.trim();
    const instFullName = inst.fullName?.trim();
    if (appFullName && appFullName !== instFullName) {
      conflictNotes.push(`Full Name mismatch: Instructor had '${instFullName}', Application had '${appFullName}'. Adopting '${appFullName}' as canonical profile name.`);
      instUpdates.fullName = appFullName;
      auditLogs.push({
        instructorId: inst._id,
        email: inst.email,
        field: 'fullName',
        oldValue: instFullName,
        newValue: appFullName,
        reason: 'Consolidated from submitted application name'
      });
    }

    // 3. Profile Image Consolidation (avatar vs photoUrl)
    const appPhoto = app.personalInfo?.photoUrl?.trim();
    if (!inst.avatar && appPhoto) {
      instUpdates.avatar = appPhoto;
      auditLogs.push({
        instructorId: inst._id,
        email: inst.email,
        field: 'avatar',
        oldValue: inst.avatar,
        newValue: appPhoto,
        reason: 'Copied from application photoUrl'
      });
    }

    // 4. Bio Consolidation
    const appBio = app.personalInfo?.bio?.trim();
    if (!inst.bio && appBio) {
      instUpdates.bio = appBio;
      auditLogs.push({
        instructorId: inst._id,
        email: inst.email,
        field: 'bio',
        oldValue: inst.bio,
        newValue: appBio,
        reason: 'Copied from application bio'
      });
    }

    // 5. Key Skills Consolidation
    const appSkills = app.professionalInfo?.keySkills;
    if ((!inst.keySkills || inst.keySkills.length === 0) && Array.isArray(appSkills) && appSkills.length > 0) {
      instUpdates.keySkills = appSkills;
      auditLogs.push({
        instructorId: inst._id,
        email: inst.email,
        field: 'keySkills',
        oldValue: inst.keySkills,
        newValue: appSkills,
        reason: 'Copied from application professionalInfo.keySkills'
      });
    }

    // 6. Designation Consolidation
    const appTitle = app.personalInfo?.professionalTitle?.trim();
    if (!inst.designation && appTitle) {
      instUpdates.designation = appTitle;
      auditLogs.push({
        instructorId: inst._id,
        email: inst.email,
        field: 'designation',
        oldValue: inst.designation,
        newValue: appTitle,
        reason: 'Copied from application professionalTitle'
      });
    }

    // 7. Synchronize Application Status to canonical InstructorApplication
    const canonicalStatus = app.applicationStatus || inst.applicationStatus || 'not_started';
    if (app.applicationStatus !== canonicalStatus) {
      await applicationsColl.updateOne(
        { _id: app._id },
        { $set: { applicationStatus: canonicalStatus, updatedAt: new Date() } }
      );
      auditLogs.push({
        instructorId: inst._id,
        email: inst.email,
        field: 'applicationStatus',
        oldValue: app.applicationStatus,
        newValue: canonicalStatus,
        reason: 'Aligned application status'
      });
    }

    // Apply updates to Instructor record if any
    if (Object.keys(instUpdates).length > 0) {
      console.log(`  [*] Updating instructor ${inst.email} with:`, Object.keys(instUpdates));
      await instructorsColl.updateOne(
        { _id: inst._id },
        {
          $set: instUpdates,
          ...(conflictNotes.length > 0 ? { $push: { migrationAudit: { $each: conflictNotes } } } : {})
        }
      );
    }
  }

  // 8. Clean up redundant fields from InstructorApplication collection
  console.log('\nCleaning up redundant fields from instructorApplications collection...');
  const unsetResult = await applicationsColl.updateMany(
    {},
    {
      $unset: {
        'personalInfo.fullName': '',
        'personalInfo.email': '',
        'personalInfo.photoUrl': '',
        'personalInfo.bio': '',
        'professionalInfo.keySkills': ''
      }
    }
  );
  console.log(`Unset redundant fields in ${unsetResult.modifiedCount} application documents.`);

  console.log('\n====================================================');
  console.log('   MIGRATION COMPLETED SUCCESSFULLY');
  console.log('====================================================');
  console.log('Audit Summary:');
  console.log(JSON.stringify(auditLogs, null, 2));

  await mongoose.disconnect();
}

if (require.main === module) {
  runMigration().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = { runMigration };
