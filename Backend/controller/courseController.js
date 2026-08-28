const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');
const { Instructor, Learner } = require('../model/User');

// 1. Create a new Course Draft (Instructor Only)
exports.createCourse = async (req, res) => {
  try {
    const { title, description, category, skillLevel, thumbnail, price } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ success: false, message: 'Please provide course title, description, and category.' });
    }

    // Soft duplicate-title check (case-insensitive, same instructor)
    const escapedTitle = title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const duplicate = await Course.findOne({
      instructorId: req.user.id,
      title: { $regex: new RegExp(`^${escapedTitle}$`, 'i') }
    });

    const course = new Course({
      title,
      description,
      category,
      skillLevel: skillLevel || 'Beginner',
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
      price: price || 0,
      instructorId: req.user.id,
      instructorName: req.user.fullName || 'UpSkillr Instructor',
      status: 'draft'
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

// 3. Get Course Details by ID
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
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

// 4. Update Course Info (Instructor Only)
exports.updateCourse = async (req, res) => {
  try {
    const { title, description, category, skillLevel, thumbnail, price, lastUpdatedAt } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (course.instructorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this course.' });
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

    if (title) course.title = title;
    if (description) course.description = description;
    if (category) course.category = category;
    if (skillLevel) course.skillLevel = skillLevel;
    if (thumbnail) course.thumbnail = thumbnail;
    if (price !== undefined) course.price = price;

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

// 5. Add / Update / Delete Lesson in Course
exports.addLesson = async (req, res) => {
  try {
    const { title, description, videoUrl, duration, content } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (course.instructorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this course.' });
    }

    const newLesson = {
      title,
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

exports.deleteLesson = async (req, res) => {
  try {
    const { lessonIndex } = req.params;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (course.instructorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this course.' });
    }

    const idx = parseInt(lessonIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= course.lessons.length) {
      return res.status(400).json({ success: false, message: 'Invalid lesson index.' });
    }

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

// 6. Add / Delete Resource in Course
exports.addResource = async (req, res) => {
  try {
    const { title, fileUrl, fileType, fileSize } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (course.instructorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this course.' });
    }

    course.resources.push({
      title,
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

exports.deleteResource = async (req, res) => {
  try {
    const { resourceIndex } = req.params;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (course.instructorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this course.' });
    }

    const idx = parseInt(resourceIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= course.resources.length) {
      return res.status(400).json({ success: false, message: 'Invalid resource index.' });
    }

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

// 7. Add / Delete Assessment in Course
exports.addAssessment = async (req, res) => {
  try {
    const { title, instructions, passingScore, questions } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (course.instructorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this course.' });
    }

    course.assessments.push({
      title,
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

exports.deleteAssessment = async (req, res) => {
  try {
    const { assessmentIndex } = req.params;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (course.instructorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this course.' });
    }

    const idx = parseInt(assessmentIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= course.assessments.length) {
      return res.status(400).json({ success: false, message: 'Invalid assessment index.' });
    }

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

// 8. Toggle / Set Publish Status (Instructor Only)
exports.publishCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (course.instructorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this course.' });
    }

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

// 9. Delete Course
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (course.instructorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this course.' });
    }

    await Course.findByIdAndDelete(req.params.id);
    await Enrolment.deleteMany({ courseId: req.params.id });

    return res.status(200).json({ success: true, message: 'Course deleted successfully.' });
  } catch (error) {
    console.error('Delete Course Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting course.' });
  }
};

// 10. Get All Published Courses (Public / Learner Browsing)
exports.getPublishedCourses = async (req, res) => {
  try {
    const courses = await Course.find({ status: 'published' }).sort({ createdAt: -1 });

    const courseList = await Promise.all(
      courses.map(async (c) => {
        const count = await Enrolment.countDocuments({ courseId: c._id });
        const cObj = c.toObject();
        cObj.learnersCount = count;
        return cObj;
      })
    );

    return res.status(200).json({ success: true, courses: courseList });
  } catch (error) {
    console.error('Get Published Courses Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching published courses.' });
  }
};

// 11. Enrol in Course (Learner Only)
exports.enrolInCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
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

    const enrolment = new Enrolment({
      learnerId: req.user.id,
      learnerName: req.user.fullName || 'Learner',
      learnerEmail: req.user.email,
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

// 12. Get Learner Enrolments
exports.getLearnerEnrolments = async (req, res) => {
  try {
    const enrolments = await Enrolment.find({ learnerId: req.user.id }).populate('courseId');
    return res.status(200).json({ success: true, enrolments });
  } catch (error) {
    console.error('Get Learner Enrolments Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching enrolments.' });
  }
};

// 13. Update Lesson Completion & Progress
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
    if (!enrolment.completedLessons.includes(idx)) {
      enrolment.completedLessons.push(idx);
    }

    const totalLessons = Math.max(course.lessons.length, 1);
    enrolment.progressPercentage = Math.round((enrolment.completedLessons.length / totalLessons) * 100);
    enrolment.lastAccessedAt = Date.now();

    await enrolment.save();

    return res.status(200).json({
      success: true,
      message: 'Progress updated!',
      enrolment
    });
  } catch (error) {
    console.error('Update Progress Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating progress.' });
  }
};
