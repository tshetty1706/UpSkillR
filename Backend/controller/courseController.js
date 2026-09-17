const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');
const { Instructor, Learner } = require('../model/User');
const mongoose = require('mongoose');

// 1. Create a new Course Draft (Instructor Only)
exports.createCourse = async (req, res) => {
  try {
    const { title, description, category, skillLevel, thumbnail, price, skills } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ success: false, message: 'Please provide course title, description, and category.' });
    }

    // Soft duplicate-title check (case-insensitive, same instructor)
    const escapedTitle = title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const duplicate = await Course.findOne({
      instructorId: req.user.id,
      title: { $regex: new RegExp(`^${escapedTitle}$`, 'i') }
    });

    // Never trust req.body.instructorId; always enforce req.user.id from validated JWT
    const course = new Course({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      skillLevel: skillLevel || 'Beginner',
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
      price: price !== undefined ? Number(price) : 0,
      instructorId: req.user.id,
      instructorName: req.user.fullName || 'UpSkillr Instructor',
      status: 'draft',
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [])
    });

    await course.save();

    return res.status(201).json({
      success: true,
      message: 'Course created successfully as Draft!',
      course,
      duplicateWarning: duplicate
        ? `You already have a course with a similar title: "${duplicate.title}". You can still continue if this is intentional.`
        : null
    });
  } catch (error) {
    console.error('Create Course Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while creating course.' });
  }
};

// 2. Get All Courses owned by Instructor + Computed Dashboard Stats
exports.getInstructorCourses = async (req, res) => {
  try {
    const instructorId = req.user.id;
    const courses = await Course.find({ instructorId }).sort({ updatedAt: -1 });

    const courseIds = courses.map((c) => c._id);
    const totalEnrolments = await Enrolment.countDocuments({ courseId: { $in: courseIds } });

    const totalCourses = courses.length;
    const publishedCourses = courses.filter((c) => c.status === 'published').length;
    const draftCourses = courses.filter((c) => c.status === 'draft').length;

    // Compute average rating from courses that have a rating set
    const ratedCourses = courses.filter((c) => c.rating !== null && c.rating !== undefined);
    const averageRating = ratedCourses.length > 0
      ? ratedCourses.reduce((sum, c) => sum + c.rating, 0) / ratedCourses.length
      : null;

    // Attach enrolments count per course
    const courseStatsList = await Promise.all(
      courses.map(async (c) => {
        const enrolCount = await Enrolment.countDocuments({ courseId: c._id });
        const cObj = c.toObject();
        cObj.learnersCount = enrolCount;
        return cObj;
      })
    );

    return res.status(200).json({
      success: true,
      stats: {
        totalCourses,
        publishedCourses,
        draftCourses,
        totalLearners: totalEnrolments,
        averageRating: averageRating !== null ? Math.round(averageRating * 10) / 10 : null
      },
      courses: courseStatsList
    });
  } catch (error) {
    console.error('Get Instructor Courses Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching instructor courses.' });
  }
};

// 3. Get Course Details by ID (Instructor Course Management)
// Protected by AuthN + RoleCheck + OwnershipCheck (req.course already verified)
exports.getCourseById = async (req, res) => {
  try {
    const course = req.course || await Course.findOne({ _id: req.params.id, instructorId: req.user.id });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const enrolCount = await Enrolment.countDocuments({ courseId: course._id });
    const courseObj = course.toObject();
    courseObj.learnersCount = enrolCount;

    return res.status(200).json({ success: true, course: courseObj });
  } catch (error) {
    console.error('Get Course By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching course details.' });
  }
};

// 3b. Get Public Course by ID (Published Courses Only for Public / Learner Preview)
exports.getPublicCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID format.' });
    }

    const course = await Course.findOne({ _id: id, status: 'published' })
      .populate('instructorId', 'fullName avatar designation bio');

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or not published.' });
    }

    const enrolCount = await Enrolment.countDocuments({ courseId: course._id });
    const courseObj = course.toObject();
    courseObj.learnersCount = enrolCount;

    return res.status(200).json({ success: true, course: courseObj });
  } catch (error) {
    console.error('Get Public Course By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching public course details.' });
  }
};

// 4. Update Course Info (Instructor Only)
// Protected by AuthN + RoleCheck + OwnershipCheck
exports.updateCourse = async (req, res) => {
  try {
    const { title, description, category, skillLevel, thumbnail, price, skills, lastUpdatedAt } = req.body;
    const course = req.course;

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Optimistic Concurrency Check using updatedAt
    if (lastUpdatedAt && course.updatedAt) {
      const clientTime = new Date(lastUpdatedAt).getTime();
      const serverTime = new Date(course.updatedAt).getTime();
      if (Math.abs(clientTime - serverTime) > 1000) {
        return res.status(409).json({
          success: false,
          conflict: true,
          message: 'This course was updated elsewhere. Another session has saved newer changes. Please review the latest version before saving again.'
        });
      }
    }

    if (title) course.title = title.trim();
    if (description) course.description = description.trim();
    if (category) course.category = category.trim();
    if (skillLevel) course.skillLevel = skillLevel;
    if (thumbnail) course.thumbnail = thumbnail;
    if (price !== undefined) course.price = Number(price);
    if (skills !== undefined) {
      course.skills = Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : []);
    }

    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Course information updated successfully!',
      course
    });
  } catch (error) {
    console.error('Update Course Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating course.' });
  }
};

// 5. Delete Course
// Protected by AuthN + RoleCheck + OwnershipCheck
exports.deleteCourse = async (req, res) => {
  try {
    const courseId = req.course._id;

    // Constrain deletion with instructorId for defense-in-depth
    await Course.findOneAndDelete({ _id: courseId, instructorId: req.user.id });
    await Enrolment.deleteMany({ courseId });

    return res.status(200).json({ success: true, message: 'Course deleted successfully.' });
  } catch (error) {
    console.error('Delete Course Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting course.' });
  }
};

// 6. Toggle / Set Publish Status (Instructor Only)
// Protected by AuthN + RoleCheck + OwnershipCheck
exports.publishCourse = async (req, res) => {
  try {
    const course = req.course;

    const targetStatus = req.body.status || (course.status === 'published' ? 'draft' : 'published');

    // Validate: cannot publish a course with zero lessons
    if (targetStatus === 'published' && course.lessons.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Add at least one lesson before publishing this course.'
      });
    }

    course.status = targetStatus;
    await course.save();

    return res.status(200).json({
      success: true,
      message: `Course ${targetStatus === 'published' ? 'published and made live to learners' : 'moved back to draft'}!`,
      course
    });
  } catch (error) {
    console.error('Publish Course Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while publishing course.' });
  }
};

// ─── Lessons (Instructor Scoped & Ownership Verified) ───

// 7. Get All Lessons in Course
exports.getCourseLessons = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      lessons: req.course.lessons || []
    });
  } catch (error) {
    console.error('Get Course Lessons Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching lessons.' });
  }
};

// 8. Add Lesson to Course
exports.addLesson = async (req, res) => {
  try {
    const { title, description, videoUrl, duration, content } = req.body;
    const course = req.course;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Lesson title is required.' });
    }

    const newLesson = {
      title: title.trim(),
      description: description || '',
      videoUrl: videoUrl || '',
      duration: duration || '10 min',
      order: course.lessons.length + 1,
      content: content || ''
    };

    course.lessons.push(newLesson);
    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Lesson added successfully!',
      course
    });
  } catch (error) {
    console.error('Add Lesson Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while adding lesson.' });
  }
};

// 9. Get Single Lesson in Course
exports.getLesson = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      lesson: req.lesson
    });
  } catch (error) {
    console.error('Get Lesson Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching lesson.' });
  }
};

// 10. Update Lesson in Course
exports.updateLesson = async (req, res) => {
  try {
    const { title, description, videoUrl, duration, content } = req.body;
    const course = req.course;
    const lesson = req.lesson;

    if (title) lesson.title = title.trim();
    if (description !== undefined) lesson.description = description;
    if (videoUrl !== undefined) lesson.videoUrl = videoUrl;
    if (duration !== undefined) lesson.duration = duration;
    if (content !== undefined) lesson.content = content;

    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Lesson updated successfully!',
      course,
      lesson
    });
  } catch (error) {
    console.error('Update Lesson Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating lesson.' });
  }
};

// 11. Delete Lesson from Course
exports.deleteLesson = async (req, res) => {
  try {
    const course = req.course;
    const idx = req.lessonIndex;

    course.lessons.splice(idx, 1);
    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Lesson deleted successfully!',
      course
    });
  } catch (error) {
    console.error('Delete Lesson Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting lesson.' });
  }
};

// ─── Resources (Instructor Scoped & Ownership Verified) ───

// 12. Get All Resources in Course
exports.getCourseResources = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      resources: req.course.resources || []
    });
  } catch (error) {
    console.error('Get Course Resources Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching resources.' });
  }
};

// 13. Add Resource to Course
exports.addResource = async (req, res) => {
  try {
    const { title, fileUrl, fileType, fileSize } = req.body;
    const course = req.course;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Resource title is required.' });
    }

    course.resources.push({
      title: title.trim(),
      fileUrl: fileUrl || '#',
      fileType: fileType || 'PDF',
      fileSize: fileSize || '1.5 MB'
    });

    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Resource added successfully!',
      course
    });
  } catch (error) {
    console.error('Add Resource Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while adding resource.' });
  }
};

// 14. Get Single Resource in Course
exports.getResource = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      resource: req.resource
    });
  } catch (error) {
    console.error('Get Resource Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching resource.' });
  }
};

// 15. Update Resource in Course
exports.updateResource = async (req, res) => {
  try {
    const { title, fileUrl, fileType, fileSize } = req.body;
    const course = req.course;
    const resource = req.resource;

    if (title) resource.title = title.trim();
    if (fileUrl !== undefined) resource.fileUrl = fileUrl;
    if (fileType !== undefined) resource.fileType = fileType;
    if (fileSize !== undefined) resource.fileSize = fileSize;

    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Resource updated successfully!',
      course,
      resource
    });
  } catch (error) {
    console.error('Update Resource Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating resource.' });
  }
};

// 16. Delete Resource from Course
exports.deleteResource = async (req, res) => {
  try {
    const course = req.course;
    const idx = req.resourceIndex;

    course.resources.splice(idx, 1);
    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Resource deleted successfully!',
      course
    });
  } catch (error) {
    console.error('Delete Resource Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting resource.' });
  }
};

// ─── Assessments (Instructor Scoped & Ownership Verified) ───

// 17. Get All Assessments in Course
exports.getCourseAssessments = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      assessments: req.course.assessments || []
    });
  } catch (error) {
    console.error('Get Course Assessments Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching assessments.' });
  }
};

// 18. Add Assessment to Course
exports.addAssessment = async (req, res) => {
  try {
    const { title, instructions, passingScore, questions } = req.body;
    const course = req.course;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Assessment title is required.' });
    }

    course.assessments.push({
      title: title.trim(),
      instructions: instructions || '',
      passingScore: passingScore || 70,
      questions: questions || []
    });

    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Assessment added successfully!',
      course
    });
  } catch (error) {
    console.error('Add Assessment Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while adding assessment.' });
  }
};

// 19. Get Single Assessment in Course
exports.getAssessment = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      assessment: req.assessment
    });
  } catch (error) {
    console.error('Get Assessment Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching assessment.' });
  }
};

// 20. Update Assessment in Course
exports.updateAssessment = async (req, res) => {
  try {
    const { title, instructions, passingScore, questions } = req.body;
    const course = req.course;
    const assessment = req.assessment;

    if (title) assessment.title = title.trim();
    if (instructions !== undefined) assessment.instructions = instructions;
    if (passingScore !== undefined) assessment.passingScore = Number(passingScore);
    if (questions !== undefined) assessment.questions = questions;

    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Assessment updated successfully!',
      course,
      assessment
    });
  } catch (error) {
    console.error('Update Assessment Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating assessment.' });
  }
};

// 21. Delete Assessment from Course
exports.deleteAssessment = async (req, res) => {
  try {
    const course = req.course;
    const idx = req.assessmentIndex;

    course.assessments.splice(idx, 1);
    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Assessment deleted successfully!',
      course
    });
  } catch (error) {
    console.error('Delete Assessment Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting assessment.' });
  }
};

// ─── Public / Learner Course Browsing & Enrollment ───

// 22. Get All Published Courses (Public / Learner Browsing)
exports.getPublishedCourses = async (req, res) => {
  try {
    const { search, category, level } = req.query;
    const filter = { status: 'published' };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (level && level !== 'All' && level !== 'All Skill Levels') {
      filter.skillLevel = level;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { instructorName: searchRegex }
      ];
    }

    const courses = await Course.find(filter)
      .populate('instructorId', 'fullName avatar')
      .sort({ createdAt: -1 });

    const courseList = await Promise.all(
      courses.map(async (c) => {
        const count = await Enrolment.countDocuments({ courseId: c._id });
        const ratedEnrolments = await Enrolment.find({ courseId: c._id, rating: { $exists: true, $ne: null, $gt: 0 } });

        let avgRating = c.rating;
        if (ratedEnrolments.length > 0) {
          const sum = ratedEnrolments.reduce((acc, e) => acc + Number(e.rating), 0);
          avgRating = Math.round((sum / ratedEnrolments.length) * 10) / 10;
        }

        const cObj = c.toObject();
        cObj.learnersCount = count;
        cObj.rating = avgRating;
        if (c.instructorId) {
          cObj.instructorAvatar = c.instructorId.avatar;
          cObj.instructorName = c.instructorId.fullName || c.instructorName;
        }
        return cObj;
      })
    );

    return res.status(200).json({ success: true, courses: courseList });
  } catch (error) {
    console.error('Get Published Courses Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching published courses.' });
  }
};

// 23. Enrol in Course (Learner Only)
exports.enrolInCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID is required.' });
    }

    const course = await Course.findById(courseId);

    if (!course || course.status !== 'published') {
      return res.status(404).json({ success: false, message: 'Course not available for enrolment.' });
    }

    const existingEnrolment = await Enrolment.findOne({ learnerId: req.user.id, courseId });
    if (existingEnrolment) {
      return res.status(200).json({
        success: true,
        message: 'Already enrolled in this course!',
        enrolment: existingEnrolment
      });
    }

    let learnerName = req.user.fullName;
    let learnerEmail = req.user.email;
    if (!learnerName || !learnerEmail) {
      const learner = await Learner.findById(req.user.id);
      if (learner) {
        learnerName = learnerName || learner.fullName;
        learnerEmail = learnerEmail || learner.email;
      }
    }

    const enrolment = new Enrolment({
      learnerId: req.user.id,
      learnerName: learnerName || 'Learner',
      learnerEmail: learnerEmail || 'learner@upskillr.com',
      courseId: course._id,
      courseTitle: course.title,
      completedLessons: [],
      progressPercentage: 0
    });

    await enrolment.save();

    return res.status(201).json({
      success: true,
      message: `Enrolled successfully in ${course.title}!`,
      enrolment
    });
  } catch (error) {
    console.error('Enrol Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during enrolment.' });
  }
};

// 24. Get Learner Enrolments
exports.getLearnerEnrolments = async (req, res) => {
  try {
    const enrolments = await Enrolment.find({ learnerId: req.user.id }).populate('courseId');
    return res.status(200).json({ success: true, enrolments });
  } catch (error) {
    console.error('Get Learner Enrolments Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching enrolments.' });
  }
};

// 25. Update Lesson Completion & Progress
exports.updateLessonProgress = async (req, res) => {
  try {
    const { courseId, lessonIndex } = req.body;
    const enrolment = await Enrolment.findOne({ learnerId: req.user.id, courseId });

    if (!enrolment) {
      return res.status(404).json({ success: false, message: 'Enrolment record not found.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const idx = parseInt(lessonIndex, 10);
    if (enrolment.completedLessons.includes(idx)) {
      enrolment.completedLessons = enrolment.completedLessons.filter(i => i !== idx);
    } else {
      enrolment.completedLessons.push(idx);
    }

    const totalLessons = Math.max(course.lessons.length, 1);
    enrolment.progressPercentage = Math.round((enrolment.completedLessons.length / totalLessons) * 100);
    enrolment.lastAccessedAt = Date.now();

    await enrolment.save();

    return res.status(200).json({
      success: true,
      message: enrolment.completedLessons.includes(idx) ? 'Lesson marked as completed!' : 'Lesson marked as incomplete.',
      enrolment
    });
  } catch (error) {
    console.error('Update Progress Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating progress.' });
  }
};

// 26. Submit Course Rating & Review Feedback
// STRICT SECURITY AUDIT FIX: Enforce that learnerId strictly matches req.user.id.
// Eliminated previous IDOR flaw where un-enrolled learners hijacked other learners' records.
exports.submitCourseRating = async (req, res) => {
  try {
    const { courseId, rating, feedback, tags } = req.body;

    if (!courseId || !rating) {
      return res.status(400).json({ success: false, message: 'Course ID and rating (1-5) are required.' });
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be a number between 1 and 5.' });
    }

    // Must be enrolled to rate: match strictly against req.user.id
    const enrolment = await Enrolment.findOne({
      courseId,
      learnerId: req.user.id
    });

    if (!enrolment) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You must be enrolled in this course to submit a rating.'
      });
    }

    // Save rating and review feedback on Enrolment
    enrolment.rating = numericRating;
    enrolment.feedback = feedback || '';
    enrolment.feedbackTags = Array.isArray(tags) ? tags : [];
    enrolment.ratedAt = Date.now();

    if (req.user && req.user.fullName && !enrolment.learnerName) {
      enrolment.learnerName = req.user.fullName;
    }

    await enrolment.save();

    // Recalculate average rating across all rated enrolments for this course
    const targetCourseId = enrolment.courseId || courseId;
    const ratedEnrolments = await Enrolment.find({
      courseId: targetCourseId,
      rating: { $exists: true, $ne: null, $gt: 0 }
    });

    if (ratedEnrolments.length > 0) {
      const sum = ratedEnrolments.reduce((acc, e) => acc + Number(e.rating), 0);
      const avgRating = Math.round((sum / ratedEnrolments.length) * 10) / 10;
      await Course.findByIdAndUpdate(targetCourseId, {
        rating: avgRating,
        reviewCount: ratedEnrolments.length
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Thank you for your rating and feedback!',
      enrolment
    });
  } catch (error) {
    console.error('Submit Course Rating Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while submitting rating.' });
  }
};
