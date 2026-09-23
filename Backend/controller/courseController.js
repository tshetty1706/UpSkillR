const Course = require('../model/Course');
const CourseOverview = require('../model/CourseOverview');
const CourseQuestion = require('../model/CourseQuestion');
const CourseView = require('../model/CourseView');
const Enrolment = require('../model/Enrolment');
const AssessmentSubmission = require('../model/AssessmentSubmission');
const Announcement = require('../model/Announcement');
const { Instructor, Learner } = require('../model/User');
const mongoose = require('mongoose');
const { uploadBufferToCloudinary } = require('./mediaController');

// 2. Get All Courses owned by Instructor + Stats
exports.getInstructorCourses = async (req, res) => {
  try {
    const instructorId = req.user.id;
    let instructorQuery = { instructorId };
    if (mongoose.Types.ObjectId.isValid(instructorId)) {
      instructorQuery = {
        $or: [
          { instructorId },
          { instructorId: new mongoose.Types.ObjectId(instructorId) }
        ]
      };
    }

    const courses = await Course.find(instructorQuery).sort({ updatedAt: -1 });

    const courseIds = courses.map((c) => c._id);
    const totalEnrolments = await Enrolment.countDocuments({ courseId: { $in: courseIds } });

    const totalCourses = courses.length;
    const publishedCourses = courses.filter((c) => (c.status || c.state) === 'published').length;
    const draftCourses = courses.filter((c) => (c.status || c.state || 'draft') === 'draft').length;

    const ratedCourses = courses.filter((c) => c.rating !== null && c.rating !== undefined);
    const averageRating = ratedCourses.length > 0
      ? ratedCourses.reduce((sum, c) => sum + c.rating, 0) / ratedCourses.length
      : null;

    const courseStatsList = await Promise.all(
      courses.map(async (c) => {
        const enrolCount = await Enrolment.countDocuments({ courseId: c._id });
        const cObj = c.toObject();
        cObj.learnersCount = enrolCount;
        cObj.status = cObj.status || cObj.state || 'draft';
        cObj.moduleCount = (cObj.modules || []).length;
        cObj.modulesCount = (cObj.modules || []).length;
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
    const course = req.course || await Course.findOne({ _id: req.params.id, instructorId: req.user.id });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const enrolCount = await Enrolment.countDocuments({ courseId: course._id });
    const courseObj = course.toObject();
    courseObj.learnersCount = enrolCount;
    courseObj.moduleCount = (courseObj.modules || []).length;
    courseObj.modulesCount = (courseObj.modules || []).length;

    return res.status(200).json({ success: true, course: courseObj });
  } catch (error) {
    console.error('Get Course By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching course details.' });
  }
};

// 3b. Get Public Course by ID
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

    // Filter modules to ONLY published modules for public/learner
    const publishedModules = (courseObj.modules || []).filter(m => m.state === 'published' || m.status === 'published');
    courseObj.modules = publishedModules;
    courseObj.moduleCount = publishedModules.length;
    courseObj.modulesCount = publishedModules.length;

    return res.status(200).json({ success: true, course: courseObj });
  } catch (error) {
    console.error('Get Public Course By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching public course details.' });
  }
};

// 4. Update Course Information
exports.updateCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      shortDescription,
      fullDescription,
      category,
      skillLevel,
      thumbnail,
      thumbnailPublicId,
      thumbnail_public_id,
      price,
      skills,
      tags,
      prerequisites,
      certificate,
      whatYouWillLearn,
      techStack,
      modules,
      lessons,
      lastUpdatedAt
    } = req.body;
    const course = req.course;

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (lastUpdatedAt && course.updatedAt) {
      const clientTime = new Date(lastUpdatedAt).getTime();
      const dbTime = new Date(course.updatedAt).getTime();
      if (dbTime - clientTime > 2000) {
        return res.status(409).json({
          success: false,
          conflict: true,
          message: 'This course was updated elsewhere. Another session has saved newer changes.'
        });
      }
    }

    if (title) course.title = title.trim();
    if (description !== undefined) course.description = description.trim();
    if (shortDescription !== undefined) course.shortDescription = shortDescription.trim();
    if (fullDescription !== undefined) course.fullDescription = fullDescription.trim();
    if (category) course.category = category.trim();
    if (skillLevel) course.skillLevel = skillLevel;
    if (thumbnail !== undefined) course.thumbnail = thumbnail;
    if (thumbnailPublicId !== undefined) course.thumbnail_public_id = thumbnailPublicId;
    if (thumbnail_public_id !== undefined) course.thumbnail_public_id = thumbnail_public_id;
    if (price !== undefined) course.price = Number(price);
    if (prerequisites !== undefined) course.prerequisites = prerequisites;
    if (certificate !== undefined) course.certificate = Boolean(certificate);

    if (skills !== undefined) {
      course.skills = Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : []);
    }
    if (tags !== undefined) {
      course.tags = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []);
    }
    if (whatYouWillLearn !== undefined) {
      course.whatYouWillLearn = Array.isArray(whatYouWillLearn) ? whatYouWillLearn : (whatYouWillLearn ? whatYouWillLearn.split('\n').map(l => l.trim()).filter(Boolean) : []);
    }
    if (techStack !== undefined) {
      course.techStack = Array.isArray(techStack) ? techStack : (techStack ? techStack.split(',').map(s => s.trim()).filter(Boolean) : []);
    }
    if (modules !== undefined) {
      course.modules = modules;
    }
    if (lessons !== undefined) {
      course.lessons = lessons;
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

// 5. Delete Course (with full cascading deletion across all related collections)
exports.deleteCourse = async (req, res) => {
  try {
    const courseId = req.course._id;
    await Course.findOneAndDelete({ _id: courseId, instructorId: req.user.id });
    await Enrolment.deleteMany({ courseId });
    await AssessmentSubmission.deleteMany({ courseId });
    await CourseOverview.deleteMany({ courseId });
    await CourseQuestion.deleteMany({ courseId });
    await CourseView.deleteMany({ courseId });
    await Announcement.deleteMany({ courseId });

    return res.status(200).json({ success: true, message: 'Course and associated records deleted successfully.' });
  } catch (error) {
    console.error('Delete Course Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting course.' });
  }
};

// 6. Toggle / Set Publish Status
exports.publishCourse = async (req, res) => {
  try {
    const course = req.course;
    const targetStatus = req.body.status || (course.status === 'published' ? 'draft' : 'published');

    const totalLessons = (course.lessons?.length || 0) + (course.modules || []).reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

    if (targetStatus === 'published' && totalLessons === 0) {
      return res.status(400).json({
        success: false,
        message: 'Add at least one lesson before publishing this course.'
      });
    }

    course.status = targetStatus;
    course.state = targetStatus;
    course.effective_visible = (targetStatus === 'published');
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

// ─── MODULES MANAGEMENT ───
exports.addModule = async (req, res) => {
  try {
    const { title, description } = req.body;
    const course = req.course;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Module title is required.' });
    }

    const newModule = {
      title: title.trim(),
      description: description || '',
      order: (course.modules?.length || 0) + 1,
      lessons: []
    };

    course.modules.push(newModule);
    await course.save();

    return res.status(201).json({ success: true, message: 'Module created successfully!', course });
  } catch (error) {
    console.error('Add Module Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while adding module.' });
  }
};

exports.updateModule = async (req, res) => {
  try {
    const { moduleIndex } = req.params;
    const { title, description } = req.body;
    const course = req.course;

    const idx = parseInt(moduleIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= course.modules.length) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    if (title) course.modules[idx].title = title.trim();
    if (description !== undefined) course.modules[idx].description = description.trim();

    await course.save();
    return res.status(200).json({ success: true, message: 'Module updated successfully!', course });
  } catch (error) {
    console.error('Update Module Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating module.' });
  }
};

exports.deleteModule = async (req, res) => {
  try {
    const { moduleIndex } = req.params;
    const course = req.course;

    const idx = parseInt(moduleIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= course.modules.length) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    course.modules.splice(idx, 1);
    await course.save();
    return res.status(200).json({ success: true, message: 'Module deleted successfully!', course });
  } catch (error) {
    console.error('Delete Module Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting module.' });
  }
};

exports.reorderModules = async (req, res) => {
  try {
    const { modules } = req.body;
    const course = req.course;

    if (Array.isArray(modules)) {
      course.modules = modules;
      await course.save();
    }

    return res.status(200).json({ success: true, message: 'Modules reordered successfully!', course });
  } catch (error) {
    console.error('Reorder Modules Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while reordering modules.' });
  }
};

// ─── LESSONS MANAGEMENT ───
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

exports.addLesson = async (req, res) => {
  try {
    const { title, description, videoUrl, duration, content, moduleIndex } = req.body;
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
      content: content || '',
      resources: [],
      assessments: []
    };

    if (moduleIndex !== undefined && moduleIndex !== null && course.modules[moduleIndex]) {
      course.modules[moduleIndex].lessons.push(newLesson);
    } else {
      course.lessons.push(newLesson);
    }

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

exports.getLesson = async (req, res) => {
  try {
    return res.status(200).json({ success: true, lesson: req.lesson });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error while fetching lesson.' });
  }
};

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

// ─── LESSON RESOURCES ───
exports.getCourseResources = async (req, res) => {
  try {
    return res.status(200).json({ success: true, resources: req.course.resources || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.addResource = async (req, res) => {
  try {
    const { title, fileUrl, fileType, fileSize, description } = req.body;
    const course = req.course;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Resource title is required.' });
    }

    course.resources.push({
      title: title.trim(),
      description: description || '',
      fileUrl: fileUrl || '#',
      fileType: fileType || 'PDF',
      fileSize: fileSize || '1.0 MB'
    });

    await course.save();

    return res.status(200).json({ success: true, message: 'Resource added successfully!', course });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.uploadLessonResource = async (req, res) => {
  try {
    const { lessonIndex } = req.params;
    const { title, description } = req.body;
    const course = req.course;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a resource file to upload.' });
    }

    const idx = parseInt(lessonIndex, 10);
    let targetLesson = null;
    if (!isNaN(idx) && idx >= 0 && idx < course.lessons.length) {
      targetLesson = course.lessons[idx];
    } else {
      // Find across modules if nested
      for (const mod of course.modules) {
        if (mod.lessons[idx]) {
          targetLesson = mod.lessons[idx];
          break;
        }
      }
    }

    if (!targetLesson) {
      targetLesson = course.lessons[0]; // Fallback to first lesson
    }

    const fileExt = (req.file.originalname || '').split('.').pop().toUpperCase() || 'FILE';
    const fileSizeMb = (req.file.size / (1024 * 1024)).toFixed(1) + ' MB';

    // Direct Cloudinary upload (Zero Local Disk Writes)
    const uploadResult = await uploadBufferToCloudinary(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      'upskillr_course_resources'
    );
    const fileUrl = uploadResult.secure_url;

    const newResource = {
      title: title ? title.trim() : req.file.originalname,
      description: description || '',
      fileUrl,
      fileType: fileExt,
      fileSize: fileSizeMb,
      originalName: req.file.originalname,
      uploadedAt: new Date()
    };

    if (targetLesson) {
      targetLesson.resources.push(newResource);
    }
    course.resources.push(newResource);

    await course.save();

    return res.status(201).json({
      success: true,
      message: 'Resource uploaded successfully to lesson!',
      course,
      resource: newResource
    });
  } catch (error) {
    console.error('Upload Lesson Resource Error:', error);
    return res.status(500).json({ success: false, message: 'Server error uploading resource.' });
  }
};

exports.deleteLessonResource = async (req, res) => {
  try {
    const { lessonIndex, resourceId } = req.params;
    const course = req.course;

    const idx = parseInt(lessonIndex, 10);
    let lesson = course.lessons[idx];
    if (lesson) {
      lesson.resources = lesson.resources.filter(r => r._id.toString() !== resourceId);
    }

    course.resources = course.resources.filter(r => r._id.toString() !== resourceId);

    await course.save();
    return res.status(200).json({ success: true, message: 'Resource deleted successfully!', course });
  } catch (error) {
    console.error('Delete Lesson Resource Error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting resource.' });
  }
};

exports.getResource = async (req, res) => {
  try {
    return res.status(200).json({ success: true, resource: req.resource });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

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
    return res.status(200).json({ success: true, message: 'Resource updated!', course, resource });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const course = req.course;
    const idx = req.resourceIndex;
    course.resources.splice(idx, 1);
    await course.save();
    return res.status(200).json({ success: true, message: 'Resource deleted!', course });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── LESSON ASSESSMENTS & QUESTIONS ───
exports.getCourseAssessments = async (req, res) => {
  try {
    return res.status(200).json({ success: true, assessments: req.course.assessments || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

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
    return res.status(200).json({ success: true, message: 'Assessment added!', course });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.createLessonAssessment = async (req, res) => {
  try {
    const { lessonIndex } = req.params;
    const {
      title,
      description,
      instructions,
      type,
      totalMarks,
      passingMarks,
      timeLimit,
      attemptsAllowed,
      dueDate,
      status
    } = req.body;

    const course = req.course;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Assessment title is required.' });
    }

    const newAssessment = {
      title: title.trim(),
      description: description || '',
      instructions: instructions || '',
      type: type || 'Quiz',
      totalMarks: totalMarks !== undefined ? Number(totalMarks) : 10,
      passingMarks: passingMarks !== undefined ? Number(passingMarks) : 5,
      timeLimit: timeLimit !== undefined ? Number(timeLimit) : 30,
      attemptsAllowed: attemptsAllowed !== undefined ? Number(attemptsAllowed) : 1,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: status === 'published' ? 'published' : 'draft',
      questions: [],
      createdAt: new Date()
    };

    const idx = parseInt(lessonIndex, 10);
    let targetLesson = course.lessons[idx];
    if (targetLesson) {
      targetLesson.assessments.push(newAssessment);
    }
    course.assessments.push(newAssessment);

    await course.save();

    const created = course.assessments[course.assessments.length - 1];

    return res.status(201).json({
      success: true,
      message: `Assessment "${newAssessment.title}" created successfully as ${newAssessment.status.toUpperCase()}!`,
      course,
      assessment: created
    });
  } catch (error) {
    console.error('Create Lesson Assessment Error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating assessment.' });
  }
};

exports.updateLessonAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const {
      title,
      description,
      instructions,
      type,
      totalMarks,
      passingMarks,
      timeLimit,
      attemptsAllowed,
      dueDate,
      status
    } = req.body;

    const course = req.course;
    const assessment = course.assessments.id(assessmentId);

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    if (title) assessment.title = title.trim();
    if (description !== undefined) assessment.description = description;
    if (instructions !== undefined) assessment.instructions = instructions;
    if (type !== undefined) assessment.type = type;
    if (totalMarks !== undefined) assessment.totalMarks = Number(totalMarks);
    if (passingMarks !== undefined) assessment.passingMarks = Number(passingMarks);
    if (timeLimit !== undefined) assessment.timeLimit = Number(timeLimit);
    if (attemptsAllowed !== undefined) assessment.attemptsAllowed = Number(attemptsAllowed);
    if (dueDate !== undefined) assessment.dueDate = dueDate ? new Date(dueDate) : null;
    if (status) assessment.status = status;

    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Assessment details updated successfully!',
      course,
      assessment
    });
  } catch (error) {
    console.error('Update Lesson Assessment Error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating assessment.' });
  }
};

exports.deleteLessonAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const course = req.course;

    course.assessments = course.assessments.filter(a => a._id.toString() !== assessmentId);
    course.lessons.forEach(l => {
      l.assessments = l.assessments.filter(a => a._id.toString() !== assessmentId);
    });

    await course.save();

    return res.status(200).json({ success: true, message: 'Assessment deleted successfully!', course });
  } catch (error) {
    console.error('Delete Lesson Assessment Error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting assessment.' });
  }
};

exports.publishLessonAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { status } = req.body;
    const course = req.course;

    const assessment = course.assessments.id(assessmentId);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const targetStatus = status || (assessment.status === 'published' ? 'draft' : 'published');
    assessment.status = targetStatus;

    await course.save();

    return res.status(200).json({
      success: true,
      message: `Assessment is now ${targetStatus.toUpperCase()}!`,
      course,
      assessment
    });
  } catch (error) {
    console.error('Publish Lesson Assessment Error:', error);
    return res.status(500).json({ success: false, message: 'Server error changing assessment publish state.' });
  }
};

// ─── QUESTION AUTHORING ───
exports.addQuestion = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const {
      questionText,
      type,
      options,
      correctAnswer,
      correctAnswerIndex,
      marks,
      evaluationInstructions
    } = req.body;

    const course = req.course;
    const assessment = course.assessments.id(assessmentId);

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    if (!questionText || !questionText.trim()) {
      return res.status(400).json({ success: false, message: 'Question text is required.' });
    }

    const newQuestion = {
      questionText: questionText.trim(),
      type: type || 'mcq',
      options: Array.isArray(options) ? options : [],
      correctAnswer: correctAnswer !== undefined ? correctAnswer : '',
      correctAnswerIndex: correctAnswerIndex || 0,
      marks: marks !== undefined ? Number(marks) : 1,
      evaluationInstructions: evaluationInstructions || '',
      order: (assessment.questions?.length || 0) + 1
    };

    assessment.questions.push(newQuestion);
    // Auto-update assessment totalMarks
    assessment.totalMarks = assessment.questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    await course.save();

    return res.status(201).json({
      success: true,
      message: 'Question added successfully!',
      course,
      assessment
    });
  } catch (error) {
    console.error('Add Question Error:', error);
    return res.status(500).json({ success: false, message: 'Server error adding question.' });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const { assessmentId, questionId } = req.params;
    const {
      questionText,
      type,
      options,
      correctAnswer,
      correctAnswerIndex,
      marks,
      evaluationInstructions
    } = req.body;

    const course = req.course;
    const assessment = course.assessments.id(assessmentId);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const question = assessment.questions.id(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    if (questionText) question.questionText = questionText.trim();
    if (type) question.type = type;
    if (options !== undefined) question.options = options;
    if (correctAnswer !== undefined) question.correctAnswer = correctAnswer;
    if (correctAnswerIndex !== undefined) question.correctAnswerIndex = Number(correctAnswerIndex);
    if (marks !== undefined) question.marks = Number(marks);
    if (evaluationInstructions !== undefined) question.evaluationInstructions = evaluationInstructions;

    assessment.totalMarks = assessment.questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Question updated successfully!',
      course,
      assessment
    });
  } catch (error) {
    console.error('Update Question Error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating question.' });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const { assessmentId, questionId } = req.params;
    const course = req.course;
    const assessment = course.assessments.id(assessmentId);

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    assessment.questions = assessment.questions.filter(q => q._id.toString() !== questionId);
    assessment.totalMarks = assessment.questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Question removed successfully!',
      course,
      assessment
    });
  } catch (error) {
    console.error('Delete Question Error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting question.' });
  }
};

exports.reorderQuestions = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { questions } = req.body;
    const course = req.course;
    const assessment = course.assessments.id(assessmentId);

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    if (Array.isArray(questions)) {
      assessment.questions = questions;
      await course.save();
    }

    return res.status(200).json({ success: true, message: 'Questions reordered!', course, assessment });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getAssessment = async (req, res) => {
  try {
    return res.status(200).json({ success: true, assessment: req.assessment });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

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
    return res.status(200).json({ success: true, message: 'Assessment updated!', course, assessment });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.deleteAssessment = async (req, res) => {
  try {
    const course = req.course;
    const idx = req.assessmentIndex;
    course.assessments.splice(idx, 1);
    await course.save();
    return res.status(200).json({ success: true, message: 'Assessment deleted!', course });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── INSTRUCTOR SUBMISSIONS & AUDITABLE GRADING ───
exports.getAssessmentSubmissions = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const submissions = await AssessmentSubmission.find({ assessmentId }).sort({ submittedAt: -1 });

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions
    });
  } catch (error) {
    console.error('Get Assessment Submissions Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching submissions.' });
  }
};

exports.getSubmissionDetails = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await AssessmentSubmission.findById(submissionId);

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission record not found.' });
    }

    return res.status(200).json({ success: true, submission });
  } catch (error) {
    console.error('Get Submission Details Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching submission details.' });
  }
};

// Grade Submission with Append-Only Audit History
exports.gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { answers, generalFeedback, reason } = req.body;

    const submission = await AssessmentSubmission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission record not found.' });
    }

    if (Array.isArray(answers)) {
      answers.forEach((gradedAns) => {
        const targetAns = submission.answers.id(gradedAns._id) || submission.answers.find(a => a.questionId.toString() === gradedAns.questionId);
        if (targetAns) {
          if (gradedAns.marksAwarded !== undefined) {
            targetAns.marksAwarded = Number(gradedAns.marksAwarded);
          }
          if (gradedAns.feedback !== undefined) {
            targetAns.feedback = gradedAns.feedback;
          }
          if (gradedAns.isCorrect !== undefined) {
            targetAns.isCorrect = Boolean(gradedAns.isCorrect);
          }
        }
      });
    }

    if (generalFeedback !== undefined) {
      submission.generalFeedback = generalFeedback;
    }

    // Recalculate Total Score
    const totalScore = submission.answers.reduce((sum, a) => sum + (a.marksAwarded || 0), 0);
    const maxScore = submission.answers.reduce((sum, a) => sum + (a.maxMarks || 1), 0);
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    const course = await Course.findById(submission.courseId);
    const assessment = course ? course.assessments.id(submission.assessmentId) : null;
    const passingMarks = assessment ? assessment.passingMarks : Math.round(maxScore * 0.5);

    const gradeResult = totalScore >= passingMarks ? 'passed' : 'failed';

    submission.totalScore = totalScore;
    submission.maxScore = maxScore;
    submission.percentage = percentage;
    submission.gradeResult = gradeResult;
    submission.status = 'graded';

    // REQUIREMENT 27: APPEND-ONLY AUDIT RECORDING
    const newGradeRecord = {
      score: totalScore,
      maxScore: maxScore,
      gradeResult: gradeResult,
      recordedBy: req.user.fullName || 'Instructor',
      recordedByRole: 'instructor',
      timestamp: new Date(),
      reason: reason || 'Instructor evaluated submission',
      feedback: generalFeedback || ''
    };

    submission.gradeRecords.push(newGradeRecord);

    await submission.save();

    return res.status(200).json({
      success: true,
      message: 'Submission graded successfully! Grade audit record logged.',
      submission,
      auditRecord: newGradeRecord
    });
  } catch (error) {
    console.error('Grade Submission Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while grading submission.' });
  }
};

// ─── LEARNER COURSES & RATINGS ───
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
        const cObj = c.toObject();
        cObj.learnersCount = count;
        if (c.instructorId) {
          cObj.instructorAvatar = c.instructorId.avatar;
          cObj.instructorName = c.instructorId.fullName || c.instructorName;
        }

        // Filter modules to ONLY published modules for public/learner exploration
        const publishedModules = (cObj.modules || []).filter(m => m.state === 'published' || m.status === 'published');
        cObj.modules = publishedModules;
        cObj.moduleCount = publishedModules.length;
        cObj.modulesCount = publishedModules.length;

        return cObj;
      })
    );

    return res.status(200).json({ success: true, courses: courseList });
  } catch (error) {
    console.error('Get Published Courses Error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

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
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getLearnerEnrolments = async (req, res) => {
  try {
    const enrolments = await Enrolment.find({ learnerId: req.user.id }).populate('courseId');
    const sanitisedEnrolments = enrolments.map(enrolment => {
      const eObj = enrolment.toObject();
      if (eObj.courseId && eObj.courseId.modules) {
        const publishedModules = (eObj.courseId.modules || []).filter(m => m.state === 'published' || m.status === 'published');
        eObj.courseId.modules = publishedModules;
        eObj.courseId.moduleCount = publishedModules.length;
        eObj.courseId.modulesCount = publishedModules.length;
      }
      return eObj;
    });
    return res.status(200).json({ success: true, enrolments: sanitisedEnrolments });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

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
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.submitCourseRating = async (req, res) => {
  try {
    const { courseId, rating, feedback, tags } = req.body;

    if (!courseId || !rating) {
      return res.status(400).json({ success: false, message: 'Course ID and rating are required.' });
    }

    const enrolment = await Enrolment.findOne({
      courseId,
      learnerId: req.user.id
    });

    if (!enrolment) {
      return res.status(403).json({ success: false, message: 'Must be enrolled to rate.' });
    }

    enrolment.rating = Number(rating);
    enrolment.feedback = feedback || '';
    enrolment.feedbackTags = Array.isArray(tags) ? tags : [];
    enrolment.ratedAt = Date.now();

    await enrolment.save();

    return res.status(200).json({ success: true, message: 'Rating submitted!', enrolment });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Course Creation Meta Options ───
exports.getCourseMetaOptions = async (req, res) => {
  try {
    const categories = [
      'Web Development',
      'Data Science',
      'Design',
      'Business',
      'Marketing',
      'Artificial Intelligence',
      'Cybersecurity',
      'Cloud Computing',
      'Mobile Development',
      'DevOps'
    ];
    const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];
    const languages = [
      'English',
      'Spanish',
      'French',
      'German',
      'Hindi',
      'Japanese',
      'Chinese',
      'Portuguese'
    ];

    return res.status(200).json({
      success: true,
      categories,
      skillLevels,
      languages
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch course options.' });
  }
};

// ─── Atomic Course Creation ───
exports.createCourse = async (req, res) => {
  try {
    const instructorId = req.user.id;
    const {
      title,
      category,
      skillLevel = 'Beginner',
      language = 'English',
      shortDescription = '',
      description = '',
      fullDescription = '',
      tags = [],
      price = 0,
      prerequisites = [],
      certificate = true,
      whatYouWillLearn = [],
      skills = [],
      techStack = [],
      thumbnail = '',
      thumbnailPublicId = ''
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Course title is required.' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Category is required.' });
    }

    let resolvedThumbnail = thumbnail || '';
    let resolvedThumbnailPublicId = thumbnailPublicId || '';

    // If file was uploaded via multipart in this request
    if (req.file && req.file.buffer) {
      try {
        const uploadRes = await uploadBufferToCloudinary(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname,
          'course_thumbnails'
        );
        resolvedThumbnail = uploadRes.secure_url;
        resolvedThumbnailPublicId = uploadRes.public_id;
      } catch (cloudErr) {
        console.warn('Cloudinary upload warning during course creation (falling back to default thumbnail):', cloudErr.message);
        // Fallback: keep resolvedThumbnail as empty string/default so course creation is never blocked
      }
    }

    const newCourse = new Course({
      title: title.trim(),
      category: category.trim(),
      skillLevel,
      language: language.trim(),
      shortDescription: (shortDescription || description || '').trim(),
      description: (description || shortDescription || '').trim(),
      fullDescription: (fullDescription || description || shortDescription || '').trim(),
      tags: Array.isArray(tags) ? tags : [],
      price: Number(price) || 0,
      prerequisites: Array.isArray(prerequisites) ? prerequisites : (prerequisites ? [prerequisites] : []),
      certificate: Boolean(certificate),
      whatYouWillLearn: Array.isArray(whatYouWillLearn) ? whatYouWillLearn : [],
      skills: Array.isArray(skills) ? skills : [],
      techStack: Array.isArray(techStack) ? techStack : [],
      thumbnail: resolvedThumbnail,
      thumbnail_public_id: resolvedThumbnailPublicId,
      instructorId,
      instructorName: req.user.fullName || 'UpSkillr Instructor',
      state: 'draft',
      status: 'draft',
      effective_visible: false,
      modules: [],
      lessons: [],
      courseAssessments: [],
      notes: [],
      resources: [],
      assessments: []
    });

    await newCourse.save();

    // Create companion CourseOverview
    const newOverview = new CourseOverview({
      courseId: newCourse._id,
      fullDescription: newCourse.fullDescription,
      prerequisites: Array.isArray(prerequisites) ? prerequisites : (prerequisites ? [prerequisites] : []),
      learningOutcomes: newCourse.whatYouWillLearn,
      skills: newCourse.skills,
      techStack: newCourse.techStack,
      certificate: newCourse.certificate,
      targetAudience: [],
      benefits: [],
      instructorMessage: '',
      optionalLinks: [],
      faqs: []
    });
    await newOverview.save();

    return res.status(201).json({
      success: true,
      message: 'Course created successfully as draft!',
      course: newCourse
    });
  } catch (error) {
    console.error('Create Course Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error creating course.' });
  }
};


// ─── Public Course Overview (with real views, real reviews, answered Q&A) ───
exports.getPublicCourseOverview = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    let overview = await CourseOverview.findOne({ courseId: id });
    if (!overview) {
      overview = {
        courseId: course._id,
        fullDescription: course.fullDescription || course.description || '',
        prerequisites: Array.isArray(course.prerequisites)
          ? course.prerequisites
          : course.prerequisites
          ? [course.prerequisites]
          : [],
        learningOutcomes: course.whatYouWillLearn || [],
        skills: course.skills || [],
        techStack: course.techStack || [],
        targetAudience: [],
        benefits: [],
        certificate: course.certificate !== undefined ? course.certificate : true,
        instructorMessage: '',
        optionalLinks: [],
        faqs: []
      };
    }

    let instructorProfile = null;
    try {
      const instructorUser = await Instructor.findById(course.instructorId).select(
        'fullName profilePhoto bio headline email'
      );
      if (instructorUser) {
        instructorProfile = {
          name: instructorUser.fullName,
          profilePhoto: instructorUser.profilePhoto || '',
          bio: instructorUser.bio || '',
          headline: instructorUser.headline || 'UpSkillr Instructor',
          email: instructorUser.email
        };
      }
    } catch (e) {}

    const enrolments = await Enrolment.find({ courseId: id });
    const totalEnrolments = enrolments.length;

    const ratedEnrolments = enrolments.filter((e) => e.rating !== null && e.rating !== undefined);
    const averageRating =
      ratedEnrolments.length > 0
        ? ratedEnrolments.reduce((sum, e) => sum + e.rating, 0) / ratedEnrolments.length
        : null;

    const reviews = ratedEnrolments
      .filter((e) => e.feedback && e.feedback.trim().length > 0)
      .map((e) => ({
        rating: e.rating,
        feedback: e.feedback,
        tags: e.feedbackTags || [],
        ratedAt: e.ratedAt,
        learnerName: e.learnerName || 'Learner'
      }));

    const questions = await CourseQuestion.find({ courseId: id, status: 'answered' })
      .sort({ replyTimestamp: -1 })
      .select('userName userAvatar question status instructorReply replyTimestamp createdAt');

    // 24h Deduplicated View Tracking
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || '';
      const viewerHash = crypto
        .createHash('sha256')
        .update(`${clientIp}-${userAgent}-${req.user ? req.user.id : ''}`)
        .digest('hex');

      const existingView = await CourseView.findOne({ courseId: id, viewerHash });
      if (!existingView) {
        await CourseView.create({ courseId: id, viewerHash });
        await Course.findByIdAndUpdate(id, { $inc: { overviewViews: 1 } });
        course.overviewViews = (course.overviewViews || 0) + 1;
      }
    } catch (viewErr) {}

    const courseObj = course.toObject ? course.toObject() : { ...course };
    const publishedModules = (courseObj.modules || []).filter(m => m.state === 'published' || m.status === 'published');
    courseObj.modules = publishedModules;
    courseObj.moduleCount = publishedModules.length;
    courseObj.modulesCount = publishedModules.length;

    return res.status(200).json({
      success: true,
      course: courseObj,
      overview,
      instructor: instructorProfile,
      stats: {
        totalEnrolments,
        averageRating: averageRating !== null ? Math.round(averageRating * 10) / 10 : null,
        reviewCount: ratedEnrolments.length,
        overviewViews: course.overviewViews || 0
      },
      reviews,
      questions
    });
  } catch (error) {
    console.error('Get Public Course Overview Error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving course overview.' });
  }
};

// ─── Instructor-Scoped Course Overview Fetch ───
exports.getCourseOverview = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    let overview = await CourseOverview.findOne({ courseId: id });
    if (!overview) {
      overview = {
        courseId: course._id,
        fullDescription: course.fullDescription || course.description || '',
        prerequisites: Array.isArray(course.prerequisites) ? course.prerequisites : [],
        learningOutcomes: course.whatYouWillLearn || [],
        skills: course.skills || [],
        techStack: course.techStack || [],
        targetAudience: [],
        benefits: [],
        certificate: course.certificate !== undefined ? course.certificate : true,
        instructorMessage: '',
        optionalLinks: [],
        faqs: []
      };
    }

    return res.status(200).json({ success: true, course, overview });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching overview.' });
  }
};

// ─── Independent Edit: Basic Information ───
exports.updateCourseBasicInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, skillLevel, language, shortDescription, tags, price } = req.body;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (title && title.trim()) course.title = title.trim();
    if (category && category.trim()) course.category = category.trim();
    if (skillLevel) course.skillLevel = skillLevel;
    if (language) course.language = language.trim();
    if (shortDescription && shortDescription.trim()) {
      course.shortDescription = shortDescription.trim();
      course.description = shortDescription.trim();
    }
    if (tags !== undefined) course.tags = Array.isArray(tags) ? tags : [];
    if (price !== undefined) course.price = Number(price) || 0;

    await course.save();
    return res.status(200).json({ success: true, message: 'Course basic info updated!', course });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error updating basic info.' });
  }
};

// ─── Independent Edit: Thumbnail ───
exports.updateCourseThumbnail = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    let thumbnailUrl = course.thumbnail;
    let thumbnailPublicId = course.thumbnail_public_id || '';

    if (req.file && req.file.buffer) {
      try {
        const uploadRes = await uploadBufferToCloudinary(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname,
          'course_thumbnails'
        );
        thumbnailUrl = uploadRes.secure_url;
        thumbnailPublicId = uploadRes.public_id;
      } catch (cloudErr) {
        console.warn('Cloudinary upload error in updateCourseThumbnail:', cloudErr.message);
        return res.status(400).json({
          success: false,
          message: 'Thumbnail upload failed due to Cloudinary permission limits. You can still proceed with default course thumbnails.'
        });
      }
    } else if (req.body.thumbnailUrl && req.body.thumbnailUrl.trim()) {
      thumbnailUrl = req.body.thumbnailUrl.trim();
      thumbnailPublicId = req.body.thumbnailPublicId || '';
    } else if (req.body.thumbnail && req.body.thumbnail.trim()) {
      thumbnailUrl = req.body.thumbnail.trim();
      thumbnailPublicId = req.body.thumbnailPublicId || '';
    }

    course.thumbnail = thumbnailUrl;
    course.thumbnail_public_id = thumbnailPublicId;
    await course.save();
    return res.status(200).json({
      success: true,
      message: 'Thumbnail updated successfully!',
      thumbnail: thumbnailUrl,
      thumbnailPublicId,
      course
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error updating thumbnail.' });
  }
};

// ─── Independent Edit: Overview ───
exports.updateCourseOverview = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const {
      fullDescription,
      prerequisites,
      learningOutcomes,
      skills,
      techStack,
      targetAudience,
      benefits,
      certificate,
      instructorMessage,
      optionalLinks,
      faqs
    } = req.body;

    let overview = await CourseOverview.findOne({ courseId: id });
    if (!overview) {
      overview = new CourseOverview({
        courseId: id,
        fullDescription: fullDescription || course.description || ''
      });
    }

    if (fullDescription !== undefined) {
      overview.fullDescription = fullDescription.trim();
      course.fullDescription = fullDescription.trim();
    }
    if (prerequisites !== undefined) {
      overview.prerequisites = Array.isArray(prerequisites) ? prerequisites : [];
      course.prerequisites = overview.prerequisites;
    }
    if (learningOutcomes !== undefined) {
      overview.learningOutcomes = Array.isArray(learningOutcomes) ? learningOutcomes : [];
      course.whatYouWillLearn = overview.learningOutcomes;
    }
    if (skills !== undefined) {
      overview.skills = Array.isArray(skills) ? skills : [];
      course.skills = overview.skills;
    }
    if (techStack !== undefined) {
      overview.techStack = Array.isArray(techStack) ? techStack : [];
      course.techStack = overview.techStack;
    }
    if (targetAudience !== undefined) overview.targetAudience = Array.isArray(targetAudience) ? targetAudience : [];
    if (benefits !== undefined) overview.benefits = Array.isArray(benefits) ? benefits : [];
    if (certificate !== undefined) {
      overview.certificate = Boolean(certificate);
      course.certificate = Boolean(certificate);
    }
    if (instructorMessage !== undefined) overview.instructorMessage = (instructorMessage || '').trim();
    if (optionalLinks !== undefined) overview.optionalLinks = Array.isArray(optionalLinks) ? optionalLinks : [];
    if (faqs !== undefined) overview.faqs = Array.isArray(faqs) ? faqs : [];

    await overview.save();
    await course.save();

    return res.status(200).json({ success: true, message: 'Course overview updated!', overview, course });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error updating overview.' });
  }
};

// ─── Learner Pre-Enrollment Doubt / Question ───
exports.askCourseQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Question content is required.' });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const newQuestion = new CourseQuestion({
      courseId: id,
      userId: req.user.id,
      userName: req.user.fullName || 'Learner',
      userAvatar: req.user.profilePhoto || '',
      question: question.trim(),
      status: 'pending'
    });

    await newQuestion.save();

    return res.status(201).json({
      success: true,
      message: 'Your question has been submitted to the instructor!',
      question: newQuestion
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error submitting question.' });
  }
};

// ─── Public Course Questions ───
exports.getCourseQuestions = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID format.' });
    }
    const questions = await CourseQuestion.find({ courseId: id, status: 'answered' }).sort({
      replyTimestamp: -1
    });

    return res.status(200).json({ success: true, questions });
  } catch (error) {
    console.error('getCourseQuestions error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching questions.' });
  }
};

// ─── Instructor All Inquiries / Questions ───
exports.getInstructorQuestions = async (req, res) => {
  try {
    const instructorId = req.user.id;
    const courses = await Course.find({ instructorId }).select('_id title thumbnail');
    const courseMap = {};
    const courseIds = courses.map((c) => {
      courseMap[c._id.toString()] = { title: c.title, thumbnail: c.thumbnail };
      return c._id;
    });

    const questions = await CourseQuestion.find({ courseId: { $in: courseIds } })
      .sort({ createdAt: -1 })
      .lean();

    const questionsWithCourse = questions.map((q) => ({
      ...q,
      courseTitle: courseMap[q.courseId.toString()]?.title || 'Unknown Course',
      courseThumbnail: courseMap[q.courseId.toString()]?.thumbnail || ''
    }));

    return res.status(200).json({ success: true, questions: questionsWithCourse });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching instructor questions.' });
  }
};

// ─── Instructor Reply to Learner Question ───
exports.replyCourseQuestion = async (req, res) => {
  try {
    const { id, questionId } = req.params;
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return res.status(400).json({ success: false, message: 'Reply content is required.' });
    }

    const question = await CourseQuestion.findOne({ _id: questionId, courseId: id });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    question.instructorReply = reply.trim();
    question.status = 'answered';
    question.replyTimestamp = new Date();
    await question.save();

    return res.status(200).json({
      success: true,
      message: 'Reply published successfully!',
      question
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error replying to question.' });
  }
};

