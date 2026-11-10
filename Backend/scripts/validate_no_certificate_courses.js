const path = require('path');
const { pathToFileURL } = require('url');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const { Learner, Instructor } = require('../model/User');
const Course = require('../model/Course');
const CourseOverview = require('../model/CourseOverview');
const Enrolment = require('../model/Enrolment');
const Certificate = require('../model/Certificate');
const courseController = require('../controller/courseController');
const certificateController = require('../controller/certificateController');
const learnerController = require('../controller/learnerController');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(p) {
      this.body = p;
      return this;
    }
  };
}

async function run() {
  console.log('==================================================================');
  console.log('🧪 UpSkillR — Courses Without Certificates E2E Validation');
  console.log('==================================================================\n');

  let passed = 0;
  let total = 0;
  const assert = (cond, label, detail = '') => {
    total++;
    if (cond) {
      console.log(`✅ [PASS] ${label}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${label}${detail ? ' -> ' + detail : ''}`);
    }
  };

  const mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI;
  await mongoose.connect(mongoUrl, { dbName: 'UpSkillr' });

  const suffix = Date.now();
  const instructorId = new mongoose.Types.ObjectId();
  const learnerId = new mongoose.Types.ObjectId();
  const noCertCourseId = new mongoose.Types.ObjectId();
  const withCertCourseId = new mongoose.Types.ObjectId();
  const modId1 = new mongoose.Types.ObjectId();
  const lesId1 = new mongoose.Types.ObjectId();
  const itemId1 = new mongoose.Types.ObjectId();
  const modId2 = new mongoose.Types.ObjectId();
  const lesId2 = new mongoose.Types.ObjectId();
  const itemId2 = new mongoose.Types.ObjectId();

  try {
    await Instructor.create({
      _id: instructorId,
      fullName: 'Prof. Nikhil Sen',
      email: `inst_nocert_${suffix}@example.com`,
      password: 'Password123!'
    });

    await Learner.create({
      _id: learnerId,
      fullName: 'Meera Nair',
      username: `meera_${suffix}`,
      email: `meera_${suffix}@example.com`,
      password: 'Password123!'
    });

    // Course A: Certificates DISABLED
    await Course.create({
      _id: noCertCourseId,
      title: `No-Cert Course ${suffix}`,
      category: 'Data Science',
      description: 'Course without certificate offering.',
      status: 'published',
      state: 'published',
      isDeleted: false,
      certificate: false,
      certificateSettings: { enabled: false },
      instructorId,
      instructorName: 'Prof. Nikhil Sen',
      modules: [
        {
          _id: modId1,
          title: 'Module 1',
          state: 'published',
          lessons: [
            {
              _id: lesId1,
              title: 'Lesson 1',
              state: 'published',
              items: [{ _id: itemId1, title: 'Article 1', type: 'article', state: 'published' }]
            }
          ]
        }
      ]
    });

    await CourseOverview.create({
      courseId: noCertCourseId,
      fullDescription: 'Course without certificate overview.',
      certificate: false
    });

    // Course B: Certificates ENABLED (also test legacy mismatch certificateSettings.enabled=false while certificate=true)
    await Course.create({
      _id: withCertCourseId,
      title: `With-Cert Course ${suffix}`,
      category: 'Web Development',
      description: 'Course with certificate enabled.',
      status: 'published',
      state: 'published',
      isDeleted: false,
      certificate: true,
      certificateSettings: { enabled: false },
      instructorId,
      instructorName: 'Prof. Nikhil Sen',
      modules: [
        {
          _id: modId2,
          title: 'Module 1',
          state: 'published',
          lessons: [
            {
              _id: lesId2,
              title: 'Lesson 1',
              state: 'published',
              items: [{ _id: itemId2, title: 'Article 1', type: 'article', state: 'published' }]
            }
          ]
        }
      ]
    });

    await CourseOverview.create({
      courseId: withCertCourseId,
      fullDescription: 'Course with certificate overview.',
      certificate: true
    });

    // Enrol learner at 100% completion in Course A (No Cert) and 0% in Course B (With Cert)
    await Enrolment.create([
      {
        learnerId,
        learnerName: 'Meera Nair',
        learnerEmail: `meera_${suffix}@example.com`,
        courseId: noCertCourseId,
        courseTitle: `No-Cert Course ${suffix}`,
        status: 'completed',
        progressPercentage: 100,
        completedAt: new Date(),
        completedLessons: [String(itemId1)]
      },
      {
        learnerId,
        learnerName: 'Meera Nair',
        learnerEmail: `meera_${suffix}@example.com`,
        courseId: withCertCourseId,
        courseTitle: `With-Cert Course ${suffix}`,
        status: 'active',
        progressPercentage: 0,
        completedLessons: []
      }
    ]);

    // 1. Check Public Course, Public Overview, Progress, and Published Catalog for No-Cert Course
    const rPubNo = createMockRes();
    await courseController.getPublicCourseById({ params: { id: String(noCertCourseId) } }, rPubNo);
    const rOvNo = createMockRes();
    await courseController.getPublicCourseOverview({ params: { id: String(noCertCourseId) }, headers: {}, socket: {} }, rOvNo);
    const rProgNo = createMockRes();
    await courseController.getCourseProgress({ params: { courseId: String(noCertCourseId) }, user: { id: String(learnerId) } }, rProgNo);
    const rCatalog = createMockRes();
    await courseController.getPublishedCourses({ query: {} }, rCatalog);

    const catNo = (rCatalog.body?.courses || []).find((c) => String(c._id) === String(noCertCourseId));
    const catYes = (rCatalog.body?.courses || []).find((c) => String(c._id) === String(withCertCourseId));

    assert(
      rPubNo.statusCode === 200 &&
        rPubNo.body.course?.certificate === false &&
        rPubNo.body.course?.certificateSettings?.enabled === false &&
        rOvNo.body.course?.certificate === false &&
        rOvNo.body.overview?.certificate === false &&
        catNo?.certificate === false &&
        catYes?.certificate === true,
      '1. Course endpoints (public course, overview, catalog) read exact DB certificate configuration without defaulting false to true'
    );

    // 2. Verify completion does NOT infer certificate availability
    assert(
      rProgNo.statusCode === 200 &&
        rProgNo.body.isCompleted === true &&
        rProgNo.body.progressPercentage === 100 &&
        rProgNo.body.certificate === false &&
        rProgNo.body.certificateEnabled === false,
      '2. Completed 100% course without certificate preserves completion while reporting certificateEnabled: false'
    );

    // 3. My Learning (getLearnerEnrolments) consistently reports certificate per course
    const rEnrols = createMockRes();
    await courseController.getLearnerEnrolments({ user: { id: String(learnerId) } }, rEnrols);
    const eNoCert = (rEnrols.body?.enrolments || []).find((e) => String(e.courseId?._id) === String(noCertCourseId));
    const eWithCert = (rEnrols.body?.enrolments || []).find((e) => String(e.courseId?._id) === String(withCertCourseId));

    assert(
      rEnrols.statusCode === 200 &&
        eNoCert?.courseId?.certificate === false &&
        eNoCert?.certificateEnabled === false &&
        eNoCert?.isCompleted === true &&
        eWithCert?.courseId?.certificate === true &&
        eWithCert?.certificateEnabled === true &&
        eWithCert?.isCompleted === false,
      '3. My Learning enrolments endpoint preserves consistent certificate setting per course'
    );

    // 4. Achievements / Certificate claim & listing do not grant certificate for disabled course
    const rClaimNo = createMockRes();
    await certificateController.claimCertificate(
      { user: { id: String(learnerId), fullName: 'Meera Nair', role: 'learner' }, params: { courseId: String(noCertCourseId) } },
      rClaimNo
    );
    const rMyCerts1 = createMockRes();
    await certificateController.getMyCertificates({ user: { id: String(learnerId) } }, rMyCerts1);
    const rLearnerCerts1 = createMockRes();
    await learnerController.getLearnerCertificates({ user: { id: String(learnerId) } }, rLearnerCerts1);

    assert(
      rClaimNo.statusCode === 400 &&
        rMyCerts1.statusCode === 200 &&
        rMyCerts1.body.count === 0 &&
        rLearnerCerts1.statusCode === 200 &&
        rLearnerCerts1.body.count === 0,
      '4. Claim & Achievements certificates endpoints refuse/omit certificates when course certificate is disabled'
    );

    // 5. Simulate pre-existing Certificate record on With-Cert course, then instructor toggles certificate OFF via updateCourse & updateCourseOverview
    await Certificate.create({
      certificateId: `UPSK-TEST-${suffix}`,
      learnerId,
      courseId: withCertCourseId,
      instructorId,
      studentNameSnapshot: 'Meera Nair',
      courseNameSnapshot: `With-Cert Course ${suffix}`,
      instructorNameSnapshot: 'Prof. Nikhil Sen',
      certificateImageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.png',
      completionDate: new Date(),
      verificationStatus: 'valid'
    });
    await Enrolment.updateOne(
      { learnerId, courseId: withCertCourseId },
      { $set: { status: 'completed', progressPercentage: 100, completedLessons: [String(itemId2)] } }
    );

    const rMyCertsBeforeToggle = createMockRes();
    await certificateController.getMyCertificates({ user: { id: String(learnerId) } }, rMyCertsBeforeToggle);
    assert(
      rMyCertsBeforeToggle.statusCode === 200 && rMyCertsBeforeToggle.body.count === 1,
      '5a. Earned certificate is visible when course certificate setting is enabled'
    );

    // Instructor disables certificate via updateCourseOverview -> must reflect immediately without logout
    const rDisableOv = createMockRes();
    await courseController.updateCourseOverview(
      { params: { id: String(withCertCourseId) }, body: { certificate: false } },
      rDisableOv
    );

    const [rPubAfterOff, rOvAfterOff, rProgAfterOff, rEnrolsAfterOff, rCertsAfterOff, rClaimAfterOff] = [
      createMockRes(),
      createMockRes(),
      createMockRes(),
      createMockRes(),
      createMockRes(),
      createMockRes()
    ];
    await courseController.getPublicCourseById({ params: { id: String(withCertCourseId) } }, rPubAfterOff);
    await courseController.getPublicCourseOverview({ params: { id: String(withCertCourseId) }, headers: {}, socket: {} }, rOvAfterOff);
    await courseController.getCourseProgress({ params: { courseId: String(withCertCourseId) }, user: { id: String(learnerId) } }, rProgAfterOff);
    await courseController.getLearnerEnrolments({ user: { id: String(learnerId) } }, rEnrolsAfterOff);
    await certificateController.getMyCertificates({ user: { id: String(learnerId) } }, rCertsAfterOff);
    await certificateController.claimCertificate({ user: { id: String(learnerId) }, params: { courseId: String(withCertCourseId) } }, rClaimAfterOff);

    const eWithCertAfterOff = (rEnrolsAfterOff.body?.enrolments || []).find((e) => String(e.courseId?._id) === String(withCertCourseId));
    assert(
      rDisableOv.statusCode === 200 &&
        rPubAfterOff.body.course?.certificate === false &&
        rOvAfterOff.body.course?.certificate === false &&
        rOvAfterOff.body.overview?.certificate === false &&
        rProgAfterOff.body.certificateEnabled === false &&
        eWithCertAfterOff?.courseId?.certificate === false &&
        eWithCertAfterOff?.certificateEnabled === false &&
        rCertsAfterOff.body.count === 0 &&
        rClaimAfterOff.statusCode === 400,
      '5b. Disabling certificate via instructor endpoint immediately propagates across overview, progress, My Learning & Achievements'
    );

    // Instructor re-enables certificate via updateCourse -> must invalidate cache and re-enable immediately
    const withCertCourseDoc = await Course.findById(withCertCourseId);
    const rReenable = createMockRes();
    await courseController.updateCourse(
      { course: withCertCourseDoc, body: { certificate: true } },
      rReenable
    );
    const rOvAfterOn = createMockRes();
    await courseController.getPublicCourseOverview({ params: { id: String(withCertCourseId) }, headers: {}, socket: {} }, rOvAfterOn);
    const rCertsAfterOn = createMockRes();
    await certificateController.getMyCertificates({ user: { id: String(learnerId) } }, rCertsAfterOn);

    assert(
      rReenable.statusCode === 200 &&
        rOvAfterOn.body.course?.certificate === true &&
        rOvAfterOn.body.overview?.certificate === true &&
        rCertsAfterOn.body.count === 1,
      '5c. Re-enabling certificate via updateCourse invalidates cache and immediately syncs overview & Achievements'
    );

    // 6. Frontend helper test
    const feHelperUrl = pathToFileURL(path.join(__dirname, '../../Frontend/src/utils/courseCertificate.js')).href;
    const { isCourseCertificateEnabled } = await import(feHelperUrl);
    assert(
      isCourseCertificateEnabled({ certificate: false, certificateSettings: { enabled: false }, progressPercentage: 100, isCompleted: true }) === false &&
        isCourseCertificateEnabled({ certificate: false }, { certificate: true }) === false &&
        isCourseCertificateEnabled({ certificate: true, certificateSettings: { enabled: false } }) === true &&
        isCourseCertificateEnabled({ certificateSettings: { enabled: true } }) === true &&
        isCourseCertificateEnabled({}, { certificate: true }) === true &&
        isCourseCertificateEnabled({}, { certificate: false }) === false &&
        isCourseCertificateEnabled(null) === false,
      '6. Frontend isCourseCertificateEnabled strictly obeys backend config and never infers from completion'
    );
  } finally {
    await Promise.all([
      Certificate.deleteMany({ learnerId }),
      Enrolment.deleteMany({ learnerId }),
      CourseOverview.deleteMany({ courseId: { $in: [noCertCourseId, withCertCourseId] } }),
      Course.deleteMany({ _id: { $in: [noCertCourseId, withCertCourseId] } }),
      Learner.deleteOne({ _id: learnerId }),
      Instructor.deleteOne({ _id: instructorId })
    ]);
    await mongoose.disconnect();
  }

  console.log(`\nSummary: ${passed}/${total} checks passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal validation error:', err);
  process.exit(1);
});
