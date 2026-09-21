const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('./model/Course');
const AssessmentSubmission = require('./model/AssessmentSubmission');
const { Instructor, Learner } = require('./model/User');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { dbName: 'UpSkillr' });
    console.log('Connected to MongoDB Atlas for seeding');

    // 1. Find or create instructor
    let instructor = await Instructor.findOne({ email: 'instructor@upskillr.com' });
    if (!instructor) {
      instructor = await Instructor.findOne({});
    }
    if (!instructor) {
      console.log('No instructor found in database.');
      process.exit(1);
    }
    console.log('Using instructor:', instructor.fullName, instructor._id);

    // 2. Find or create learner
    let learner = await Learner.findOne({});
    if (!learner) {
      learner = await Learner.create({
        fullName: 'Devon Vance',
        email: 'devon.vance@example.com',
        authProvider: 'local'
      });
    }
    console.log('Using learner:', learner.fullName, learner._id);

    // 3. Find or update course
    let course = await Course.findOne({ instructorId: instructor._id });
    if (!course) {
      course = await Course.findOne({});
      if (course) {
        course.instructorId = instructor._id;
      }
    }

    if (!course) {
      course = new Course({
        title: 'Full-Stack React & Node Architecture',
        shortDescription: 'Master modern full-stack web development with React 19, Node.js, and Cloud Infrastructure.',
        category: 'Web Development',
        skillLevel: 'Intermediate',
        instructorId: instructor._id,
        instructorName: instructor.fullName || 'Alex Morgan',
        status: 'published',
        state: 'published'
      });
    }

    // Set modules and curriculum structure
    const mod1Id = new mongoose.Types.ObjectId();
    const mod2Id = new mongoose.Types.ObjectId();
    const less1Id = new mongoose.Types.ObjectId();
    const less2Id = new mongoose.Types.ObjectId();
    const less3Id = new mongoose.Types.ObjectId();
    const item1Id = new mongoose.Types.ObjectId();
    const item2Id = new mongoose.Types.ObjectId();
    const item3Id = new mongoose.Types.ObjectId();
    const assId = new mongoose.Types.ObjectId();

    course.modules = [
      {
        _id: mod1Id,
        title: 'Module 1: Foundations of Enterprise React Architecture',
        description: 'Component lifecycles, custom hooks, and state orchestration patterns.',
        state: 'published',
        sortKey: 'a0',
        lessons: [
          {
            _id: less1Id,
            title: 'Lesson 1.1: Component Design Patterns & Inversion of Control',
            description: 'Building flexible and decoupled UI primitives.',
            state: 'published',
            sortKey: 'a0',
            items: [
              {
                _id: item1Id,
                type: 'video',
                title: 'Architecture Breakdown: Compound Components',
                state: 'published',
                sortKey: 'a0',
                version: 1,
                video: {
                  muxAssetId: 'mux_mock_asset_101',
                  muxPlaybackId: 'mock_playback_101',
                  duration: 420,
                  watchedThresholdPercent: 90,
                  status: 'ready'
                }
              },
              {
                _id: item2Id,
                type: 'quiz',
                title: 'Knowledge Check: React Primitives',
                state: 'published',
                sortKey: 'a1',
                version: 1,
                quiz: {
                  passThresholdPercent: 70,
                  maxAttempts: 3,
                  cooldownHours: 6,
                  questions: [
                    {
                      questionText: 'Which React hook should be used for mutable values that do not trigger re-renders?',
                      questionType: 'mcq',
                      options: ['useState', 'useRef', 'useEffect', 'useMemo'],
                      correctAnswer: 'useRef',
                      marksAwarded: 1
                    },
                    {
                      questionText: 'What is the primary benefit of compound components pattern?',
                      questionType: 'mcq',
                      options: ['Implicit state sharing between related components', 'Faster CSS compilation', 'Automatic server-side caching', 'Eliminating all prop drilling permanently'],
                      correctAnswer: 'Implicit state sharing between related components',
                      marksAwarded: 1
                    }
                  ]
                }
              }
            ]
          },
          {
            _id: less2Id,
            title: 'Lesson 1.2: State Management at Scale',
            description: 'Context slicing and atomic state.',
            state: 'published',
            sortKey: 'a1',
            items: [
              {
                _id: item3Id,
                type: 'video',
                title: 'Deep Dive: Minimizing Render Cascades',
                state: 'published',
                sortKey: 'a0',
                version: 1,
                video: {
                  muxAssetId: 'mux_mock_asset_102',
                  muxPlaybackId: 'mock_playback_102',
                  duration: 600,
                  watchedThresholdPercent: 90,
                  status: 'ready'
                }
              }
            ]
          }
        ]
      },
      {
        _id: mod2Id,
        title: 'Module 2: High-Performance Backend & Database Systems',
        description: 'Distributed Node.js microservices, indexing strategies, and caching.',
        state: 'published',
        sortKey: 'a1',
        lessons: [
          {
            _id: less3Id,
            title: 'Lesson 2.1: Mongoose Aggregations & Query Optimization',
            description: 'Analyzing explain plans and avoiding memory bottlenecks.',
            state: 'published',
            sortKey: 'a0',
            items: [
              {
                type: 'video',
                title: 'Query Optimization in Practice',
                state: 'published',
                sortKey: 'a0',
                version: 1,
                video: {
                  muxAssetId: 'mux_mock_asset_201',
                  muxPlaybackId: 'mock_playback_201',
                  duration: 540,
                  watchedThresholdPercent: 90,
                  status: 'ready'
                }
              }
            ]
          }
        ]
      },
      {
        title: 'Module 3: Production Deployment & CI/CD (Draft)',
        description: 'Setting up automated testing and blue-green deployments.',
        state: 'draft',
        sortKey: 'a2',
        lessons: [] // Empty -> will trigger autoDraft badge!
      }
    ];

    // Non-gating notes
    course.notes = [
      {
        scope: 'course',
        type: 'article',
        title: 'Full-Stack Architecture Best Practices Guide',
        content: '# Architecture Guide\n\n- Use single source of truth for design tokens.\n- Maintain immutable database audit trails.\n- Avoid hard deletes on content nodes.',
        state: 'published',
        sortKey: 'a0'
      },
      {
        scope: 'course',
        type: 'pdf',
        title: 'React 19 Cheat Sheet (PDF)',
        mediaUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
        state: 'published',
        sortKey: 'a1'
      }
    ];

    // Course Assessment
    course.courseAssessments = [
      {
        _id: assId,
        title: 'Full-Stack Capstone Certification Assessment',
        description: 'Comprehensive evaluation covering React architecture, microservices, and database indexing.',
        requiredModuleIds: [mod1Id, mod2Id],
        passThresholdPercent: 75,
        maxAttempts: 3,
        cooldownHours: 6,
        state: 'published',
        sortKey: 'a0',
        version: 1,
        questions: [
          {
            questionText: 'What is the time complexity of an indexed B-Tree search in MongoDB?',
            questionType: 'mcq',
            options: ['O(1)', 'O(log N)', 'O(N)', 'O(N^2)'],
            correctAnswer: 'O(log N)',
            marksAwarded: 2
          },
          {
            questionText: 'When implementing sequential progression, how should subsequent modules behave before prerequisites are met?',
            questionType: 'mcq',
            options: ['They must remain locked with an explicit visual lock indicator', 'They can be accessed in random order', 'They are deleted from the database', 'They require payment'],
            correctAnswer: 'They must remain locked with an explicit visual lock indicator',
            marksAwarded: 2
          }
        ]
      }
    ];

    await course.save();
    console.log('Course curriculum seeded successfully:', course.title, course._id);

    // 4. Seed Assessment Submissions for Instructor Review Surface
    await AssessmentSubmission.deleteMany({ courseId: course._id });

    // Submission 1: Passed
    await AssessmentSubmission.create({
      courseId: course._id,
      assessmentId: assId,
      assessmentTitle: 'Full-Stack Capstone Certification Assessment',
      learnerId: learner._id,
      learnerName: learner.fullName || 'Devon Vance',
      learnerEmail: learner.email,
      attemptNumber: 1,
      maxAttempts: 3,
      totalScore: 4,
      maxScore: 4,
      percentage: 100,
      gradeResult: 'passed',
      status: 'graded',
      submittedAt: new Date(Date.now() - 3600000 * 24),
      cooldownUntil: null,
      appealStatus: 'none',
      auditLog: [
        {
          action: 'automated_evaluation',
          performedBy: 'System Auto-Grader',
          performedByRole: 'system',
          reason: 'Passed threshold of 75% on first attempt',
          timestamp: new Date(Date.now() - 3600000 * 24)
        }
      ]
    });

    // Submission 2: Failed with Active Cooldown
    await AssessmentSubmission.create({
      courseId: course._id,
      assessmentId: assId,
      assessmentTitle: 'Full-Stack Capstone Certification Assessment',
      learnerId: learner._id,
      learnerName: 'Jordan Reed',
      learnerEmail: 'jordan.reed@example.com',
      attemptNumber: 3,
      maxAttempts: 3,
      totalScore: 2,
      maxScore: 4,
      percentage: 50,
      gradeResult: 'failed',
      status: 'graded',
      submittedAt: new Date(Date.now() - 3600000 * 2),
      cooldownUntil: new Date(Date.now() + 3600000 * 4), // 4 hours left
      appealStatus: 'none',
      auditLog: []
    });

    // Submission 3: Appeal Pending
    await AssessmentSubmission.create({
      courseId: course._id,
      assessmentId: assId,
      assessmentTitle: 'Full-Stack Capstone Certification Assessment',
      learnerId: learner._id,
      learnerName: 'Maya Patel',
      learnerEmail: 'maya.patel@example.com',
      attemptNumber: 3,
      maxAttempts: 3,
      totalScore: 2,
      maxScore: 4,
      percentage: 50,
      gradeResult: 'failed',
      status: 'pending_review',
      submittedAt: new Date(Date.now() - 3600000 * 5),
      cooldownUntil: new Date(Date.now() + 3600000 * 1),
      appealStatus: 'pending',
      appealMessage: 'I experienced a brief connection drop on question 2 right as I clicked submit. I would really appreciate an extra attempt to demonstrate mastery.',
      appealedAt: new Date(Date.now() - 3600000 * 3),
      auditLog: []
    });

    console.log('Seeded 3 assessment submissions with review scenarios successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seed();
