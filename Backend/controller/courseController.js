const Course = require('../model/Course');
const CourseOverview = require('../model/CourseOverview');
const CourseQuestion = require('../model/CourseQuestion');
const CourseView = require('../model/CourseView');
const Enrolment = require('../model/Enrolment');
const AssessmentSubmission = require('../model/AssessmentSubmission');
const Announcement = require('../model/Announcement');
const { Instructor, Learner } = require('../model/User');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { uploadBufferToCloudinary, deleteCloudinaryAsset, deleteMuxAsset } = require('./mediaController');
const { notifyStudentsOnNewContent } = require('./notificationController');
const JWT_SECRET = process.env.JWT_SECRET || 'upskillr_jwt_secret_key_2026_super_secure';

// Fast In-Memory Cache for Course Catalog & Overview (TTL: 15s)
const courseCache = {
  published: null,
  publishedExpiry: 0,
  overviews: new Map(),
  invalidateAll() {
    this.published = null;
    this.publishedExpiry = 0;
    this.overviews.clear();
  },
  invalidateCourse(courseId) {
    this.published = null;
    this.publishedExpiry = 0;
  }
};
exports.courseCache = courseCache;

// Helper to sanitize and map published course content (modules, lessons, items, notes) for learner/public retrieval
const sanitizeCourseForLearner = (course) => {
  if (!course) return null;
  const courseObj = course.toObject ? course.toObject() : { ...course };

  // 1. Gather all published notes from course.notes, and any mod/lesson notes
  const rawCourseNotes = Array.isArray(courseObj.notes) ? courseObj.notes : [];
  const publishedCourseNotes = rawCourseNotes.filter(
    n => (n.state === 'published' || n.status === 'published')
  );

  // 2. Filter modules to only published modules
  const rawModules = Array.isArray(courseObj.modules) ? courseObj.modules : [];
  const publishedModules = rawModules
    .filter(m => (m.state === 'published' || m.status === 'published'))
    .map(mod => {
      const modObj = { ...mod };

      // Map published module-level notes
      const modDirectNotes = (modObj.notes || []).filter(n => n.state === 'published' || n.status === 'published');
      const modAttachedNotes = publishedCourseNotes.filter(
        n => (n.scope === 'module' || n.attachableType === 'module') &&
             String(n.moduleId || n.attachableId) === String(modObj._id)
      );
      const modNotesMap = new Map();
      [...modDirectNotes, ...modAttachedNotes].forEach(n => modNotesMap.set(String(n._id || n.title), n));
      modObj.notes = Array.from(modNotesMap.values());

      // Filter lessons to only published lessons
      const rawLessons = Array.isArray(modObj.lessons) ? modObj.lessons : [];
      modObj.lessons = rawLessons.filter(l => (l.state === 'published' || l.status === 'published' || !l.state || (Array.isArray(l.items) && l.items.some(i => i.state === 'published' || i.status === 'published'))))
        .map(les => {
          const lesObj = { ...les };

          // Filter items to only published items (videos, quizzes, etc.)
          const rawItems = Array.isArray(lesObj.items) ? lesObj.items : (Array.isArray(lesObj.contentItems) ? lesObj.contentItems : []);
          lesObj.items = rawItems.filter(i => (i.state === 'published' || i.status === 'published'));
          lesObj.contentItems = lesObj.items;

          // Map published lesson-level notes (articles, pdfs, images)
          const lesDirectNotes = (lesObj.notes || []).filter(n => n.state === 'published' || n.status === 'published');
          const lesAttachedNotes = publishedCourseNotes.filter(
            n => (n.scope === 'lesson' || n.attachableType === 'lesson') &&
                 String(n.lessonId || n.attachableId) === String(lesObj._id)
          );
          const lesNotesMap = new Map();
          [...lesDirectNotes, ...lesAttachedNotes].forEach(n => lesNotesMap.set(String(n._id || n.title), n));
          lesObj.notes = Array.from(lesNotesMap.values());

          return lesObj;
        });

      return modObj;
    });

  courseObj.modules = publishedModules;
  courseObj.moduleCount = publishedModules.length;
  courseObj.modulesCount = publishedModules.length;
  courseObj.notes = publishedCourseNotes;

  return courseObj;
};
exports.sanitizeCourseForLearner = sanitizeCourseForLearner;

/**
 * Sanitizes course structure strictly for public/prospective learners on Course Overview.
 * Returns only published module and lesson structural hierarchy (titles, durations, descriptions, order).
 * Strictly removes all private learning materials: quiz items, video URLs/mux IDs, PDF/article notes,
 * and assessment questions.
 */
const sanitizeCourseForPublicOverview = (course) => {
  if (!course) return null;
  const courseObj = course.toObject ? course.toObject() : { ...course };

  const rawModules = Array.isArray(courseObj.modules) ? courseObj.modules : [];
  const publishedModules = rawModules
    .filter((m) => m.state === 'published' || m.status === 'published')
    .map((mod) => {
      const rawLessons = Array.isArray(mod.lessons) ? mod.lessons : [];
      const publishedLessons = rawLessons
        .filter((l) => l.state === 'published' || l.status === 'published')
        .map((les) => ({
          _id: les._id,
          title: les.title,
          description: les.description || '',
          duration: les.duration || '',
          order: les.order || 1
        }));

      return {
        _id: mod._id,
        title: mod.title,
        description: mod.description || '',
        order: mod.order || 1,
        lessons: publishedLessons
      };
    });

  courseObj.modules = publishedModules;
  courseObj.moduleCount = publishedModules.length;
  courseObj.modulesCount = publishedModules.length;

  // Strict security: ensure no raw notes, items, or assessments leak in public overview
  delete courseObj.notes;
  delete courseObj.courseAssessments;

  return courseObj;
};
exports.sanitizeCourseForPublicOverview = sanitizeCourseForPublicOverview;

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
    const courseObj = sanitizeCourseForLearner(course);
    courseObj.learnersCount = enrolCount;

    return res.status(200).json({ success: true, course: courseObj });
  } catch (error) {
    console.error('Get Public Course By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching public course details.' });
  }
};

// 3c. Universal Course By ID (Instructor full view if owner, else published view for learners & public)
exports.getCourseUniversal = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.params.id;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID format.' });
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token && token !== 'null' && token !== 'undefined') {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          if (decoded && (decoded.role === 'instructor' || decoded.role === 'admin')) {
            const course = await Course.findById(courseId);
            if (course) {
              if (course.instructorId.toString() === decoded.id.toString()) {
                req.user = decoded;
                req.course = course;
                return exports.getCourseById(req, res);
              }
              if (!course.isPublished) {
                return res.status(403).json({
                  success: false,
                  message: 'Forbidden. You do not have permission to view another instructor’s unpublished course.'
                });
              }
            }
          }
        } catch (e) {
          // Token invalid or expired - fallback to public
        }
      }
    }

    req.params.id = courseId;
    return exports.getPublicCourseById(req, res);
  } catch (error) {
    console.error('getCourseUniversal error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching course details.' });
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

// 5. Delete Course (with full cascading deletion across all related collections and cloud media)
exports.deleteCourse = async (req, res) => {
  try {
    const courseId = req.course._id;
    const course = await Course.findOne({ _id: courseId, instructorId: req.user.id });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or access denied.' });
    }

    // 1. Clean up Course Thumbnail
    if (course.thumbnail_public_id || (course.thumbnail && course.thumbnail.includes('cloudinary.com'))) {
      deleteCloudinaryAsset(course.thumbnail_public_id || course.thumbnail, 'image')
        .catch(e => console.warn('Cloudinary course thumbnail delete error:', e.message));
    } else if (course.thumbnail && course.thumbnail.includes('/uploads/thumbnails/')) {
      try {
        const thumbName = path.basename(course.thumbnail);
        const thumbPath = path.join(__dirname, '../uploads/thumbnails', thumbName);
        if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
      } catch (fErr) {}
    }

    // 2. Clean up Course / Module / Lesson Notes & Attached Resources
    const allNotes = [
      ...(course.notes || []),
      ...(course.modules || []).flatMap(m => m.notes || []),
      ...(course.modules || []).flatMap(m => (m.lessons || []).flatMap(l => l.notes || []))
    ];

    for (const note of allNotes) {
      if (note.cloudinaryPublicId || (note.fileUrl && note.fileUrl.includes('cloudinary.com'))) {
        const resType = (note.fileType === 'pdf' || (note.fileName && note.fileName.endsWith('.pdf'))) ? 'raw' : 'image';
        deleteCloudinaryAsset(note.cloudinaryPublicId || note.fileUrl, resType).catch(() => {});
      } else if (note.fileUrl && note.fileUrl.includes('/uploads/resources/')) {
        try {
          const resPath = path.join(__dirname, '../uploads/resources', path.basename(note.fileUrl));
          if (fs.existsSync(resPath)) fs.unlinkSync(resPath);
        } catch (fErr) {}
      }
    }

    // 3. Clean up Lesson Videos (Mux Assets and Local Videos)
    for (const mod of course.modules || []) {
      for (const lesson of mod.lessons || []) {
        for (const item of lesson.items || []) {
          if (item.video?.muxAssetId) {
            deleteMuxAsset(item.video.muxAssetId).catch(() => {});
          } else if (item.video?.videoUrl && item.video.videoUrl.includes('/uploads/videos/')) {
            try {
              const vidPath = path.join(__dirname, '../uploads/videos', path.basename(item.video.videoUrl));
              if (fs.existsSync(vidPath)) fs.unlinkSync(vidPath);
            } catch (fErr) {}
          }
        }
      }
    }

    await Course.deleteOne({ _id: courseId });
    await Enrolment.deleteMany({ courseId });
    await AssessmentSubmission.deleteMany({ courseId });
    await CourseOverview.deleteMany({ courseId });
    await CourseQuestion.deleteMany({ courseId });
    await CourseView.deleteMany({ courseId });
    await Announcement.deleteMany({ courseId });
    if (courseCache && courseCache.invalidateCourse) courseCache.invalidateCourse(courseId);

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

    // Notify students of the new module upload
    notifyStudentsOnNewContent({
      courseId: course._id,
      courseTitle: course.title,
      type: 'NEW_MODULE',
      moduleTitle: title.trim()
    });

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

    // Notify students of the new lesson upload
    notifyStudentsOnNewContent({
      courseId: course._id,
      courseTitle: course.title,
      type: 'NEW_LESSON',
      lessonTitle: title.trim(),
      moduleTitle: (moduleIndex !== undefined && moduleIndex !== null && course.modules[moduleIndex]) ? course.modules[moduleIndex].title : ''
    });

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

    let fileUrl = '';
    const isDoc = req.file.mimetype.includes('pdf') || (req.file.originalname && req.file.originalname.toLowerCase().endsWith('.pdf'));

    if (isDoc) {
      const uploadsDir = path.join(__dirname, '../uploads/resources');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const safeBase = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `res_${Date.now()}_${safeBase}`;
      const filePath = path.join(uploadsDir, filename);
      await fs.promises.writeFile(filePath, req.file.buffer);

      const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5000';
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      fileUrl = `${protocol}://${host}/uploads/resources/${filename}`;
    } else {
      const uploadResult = await uploadBufferToCloudinary(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        'upskillr_course_resources'
      );
      fileUrl = uploadResult.secure_url;
    }

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
    const { search, category, level, instructorId, instructor } = req.query;
    const isDefaultCatalog = !search && (!category || category === 'All') && (!level || level === 'All') && !instructorId && !instructor;

    if (isDefaultCatalog && courseCache.published && Date.now() < courseCache.publishedExpiry) {
      return res.status(200).json({ success: true, courses: courseCache.published });
    }

    const filter = { status: 'published' };

    const targetInstructorId = instructorId || instructor;
    if (targetInstructorId && mongoose.Types.ObjectId.isValid(targetInstructorId)) {
      filter.$or = [
        { instructorId: targetInstructorId },
        { instructorId: new mongoose.Types.ObjectId(targetInstructorId) }
      ];
    }

    if (category && category !== 'All' && category !== 'all') {
      filter.category = category;
    }
    if (level && level !== 'All' && level !== 'All Skill Levels') {
      filter.skillLevel = level;
    }
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const searchConditions = [
        { title: searchRegex },
        { description: searchRegex },
        { instructorName: searchRegex },
        { tags: searchRegex },
        { skills: searchRegex }
      ];
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: searchConditions }
        ];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    // 1. Fetch courses using .lean() with field projection for fast JSON serialization
    const courses = await Course.find(filter)
      .select('title category skillLevel language price description shortDescription fullDescription certificate thumbnail instructorId instructorName rating reviewCount overviewViews courseAssessments modules createdAt updatedAt')
      .populate('instructorId', 'fullName avatar')
      .sort({ createdAt: -1 })
      .lean();

    // 2. Single aggregation to count all enrollments at once (avoids N+1 queries)
    const enrolmentsGrouped = await Enrolment.aggregate([
      { $group: { _id: '$courseId', count: { $sum: 1 } } }
    ]);
    const enrolmentsCountMap = {};
    enrolmentsGrouped.forEach(item => {
      if (item._id) enrolmentsCountMap[item._id.toString()] = item.count;
    });

    const courseList = courses.map((c) => {
      c.learnersCount = enrolmentsCountMap[c._id.toString()] || 0;
      if (c.instructorId) {
        c.instructorAvatar = c.instructorId.avatar;
        c.instructorName = c.instructorId.fullName || c.instructorName;
      }

      // Ensure normalized description
      c.description = c.description || c.shortDescription || c.fullDescription || '';

      // Explicit certificate boolean
      c.certificate = c.certificate !== false;

      // Published modules count
      const publishedModules = (c.modules || []).filter(m => m.state === 'published' || m.status === 'published');
      c.modules = publishedModules;
      c.moduleCount = publishedModules.length;
      c.modulesCount = publishedModules.length;

      // Assessment count
      c.assessmentCount = (c.courseAssessments || []).length;

      // Total completion time calculation from lessons, videos, and assessments
      let totalDurationSeconds = 0;
      let hasDuration = false;

      for (const mod of publishedModules) {
        for (const les of (mod.lessons || [])) {
          if (les.duration) {
            if (typeof les.duration === 'number' && les.duration > 0) {
              totalDurationSeconds += les.duration;
              hasDuration = true;
            } else if (typeof les.duration === 'string') {
              const mMatch = les.duration.match(/(\d+)\s*m/i);
              const sMatch = les.duration.match(/(\d+)\s*s/i);
              const hMatch = les.duration.match(/(\d+)\s*h/i);
              if (mMatch || sMatch || hMatch) {
                hasDuration = true;
                if (hMatch) totalDurationSeconds += parseInt(hMatch[1], 10) * 3600;
                if (mMatch) totalDurationSeconds += parseInt(mMatch[1], 10) * 60;
                if (sMatch) totalDurationSeconds += parseInt(sMatch[1], 10);
              }
            }
          }
          for (const item of (les.items || [])) {
            const vidDur = item.video?.duration || item.duration || 0;
            if (vidDur > 0) {
              totalDurationSeconds += Math.round(vidDur);
              hasDuration = true;
            }
          }
        }
      }

      for (const ca of (c.courseAssessments || [])) {
        if (ca.durationMinutes && ca.durationMinutes > 0 && ca.durationMinutes < 1000) {
          totalDurationSeconds += ca.durationMinutes * 60;
          hasDuration = true;
        }
      }

      if (hasDuration && totalDurationSeconds > 0) {
        const hours = Math.floor(totalDurationSeconds / 3600);
        const minutes = Math.floor((totalDurationSeconds % 3600) / 60);
        if (hours > 0 && minutes > 0) {
          c.formattedDuration = `Up to ${hours}h ${minutes}m`;
        } else if (hours > 0) {
          c.formattedDuration = `Up to ${hours}h`;
        } else if (minutes > 0) {
          c.formattedDuration = `Up to ${minutes}m`;
        } else {
          c.formattedDuration = `Up to 1m`;
        }
      } else {
        c.formattedDuration = 'Duration unavailable';
      }

      delete c.courseAssessments;

      return c;
    });

    if (isDefaultCatalog) {
      courseCache.published = courseList;
      courseCache.publishedExpiry = Date.now() + 15000;
    }

    return res.status(200).json({ success: true, courses: courseList });
  } catch (error) {
    console.error('Get Published Courses Error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.enrolInCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID is required.' });
    }

    const course = await Course.findById(courseId);
    if (!course || (course.status !== 'published' && course.state !== 'published')) {
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
      progressPercentage: 0,
      status: 'active'
    });

    await enrolment.save();

    return res.status(201).json({
      success: true,
      message: `Enrolled successfully in ${course.title}!`,
      enrolment
    });
  } catch (error) {
    console.error('Enrol Error:', error);
    return res.status(500).json({ success: false, message: 'Server error enrolling in course.' });
  }
};

/**
 * Accurately compute progress percentage and status for an enrolment given a course.
 * Ensures a course is NEVER marked 100% or completed if any visible lesson remains unfinished.
 */
const calculateEnrolmentProgress = (course, enrolment) => {
  if (!course || !enrolment) {
    return {
      progressPercentage: 0,
      status: 'active',
      completedLessonsCount: 0,
      totalLessonsCount: 1,
      pubItemIds: new Set(),
      lessonToItemsMap: new Map()
    };
  }

  const sanitized = sanitizeCourseForLearner(course);
  const pubModules = (sanitized?.modules || []).filter(m => m.state === 'published' || m.status === 'published');
  const allVisibleLessons = [];
  const pubItemIds = new Set();
  const lessonToItemsMap = new Map();

  pubModules.forEach(m => {
    (m.lessons || []).forEach(l => {
      allVisibleLessons.push(l);
      const lItems = (l.items || l.contentItems || []).filter(i => i.state === 'published' || i.status === 'published');
      const itemIds = lItems.map(i => String(i._id));
      lessonToItemsMap.set(String(l._id), itemIds);
      itemIds.forEach(id => pubItemIds.add(id));
    });
  });

  const completedList = (enrolment.completedLessons || []).map(k => String(k));
  let completedLessonsCount = 0;

  allVisibleLessons.forEach((l, idx) => {
    const lIdStr = String(l._id);
    const lItems = lessonToItemsMap.get(lIdStr) || [];
    const isIdDone = completedList.includes(lIdStr);
    const isIdxDone = completedList.includes(String(idx));
    const areItemsDone = lItems.length > 0 && lItems.every(id => completedList.includes(id));
    const anyItemDone = lItems.length > 0 && lItems.some(id => completedList.includes(id));

    if (isIdDone || isIdxDone || areItemsDone || anyItemDone) {
      completedLessonsCount += 1;
    }
  });

  const totalLessonsCount = allVisibleLessons.length > 0
    ? allVisibleLessons.length
    : ((sanitized?.lessons && sanitized.lessons.length > 0) ? sanitized.lessons.length : (pubModules.length || 1));

  let progressPercentage = 0;
  let status = 'active';

  if (completedLessonsCount >= totalLessonsCount && totalLessonsCount > 0) {
    progressPercentage = 100;
    status = 'completed';
  } else if (completedLessonsCount > 0) {
    progressPercentage = Math.min(Math.round((completedLessonsCount / totalLessonsCount) * 100), 99);
    status = 'in_progress';
  } else {
    progressPercentage = 0;
    status = 'active';
  }

  return {
    progressPercentage,
    status,
    completedLessonsCount,
    totalLessonsCount,
    pubItemIds,
    lessonToItemsMap,
    allVisibleLessons
  };
};
exports.calculateEnrolmentProgress = calculateEnrolmentProgress;

exports.getCourseProgress = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.params.id;
    const enrolment = await Enrolment.findOne({ learnerId: req.user.id, courseId });
    if (!enrolment) {
      return res.status(404).json({ success: false, message: 'Enrolment record not found.' });
    }
    const course = await Course.findById(courseId);
    const { progressPercentage, status, completedLessonsCount, totalLessonsCount } = calculateEnrolmentProgress(course, enrolment);

    // Auto heal enrolment in database if out of sync
    if (enrolment.progressPercentage !== progressPercentage || enrolment.status !== status) {
      enrolment.progressPercentage = progressPercentage;
      enrolment.status = status;
      if (status !== 'completed') enrolment.completedAt = null;
      await Enrolment.updateOne(
        { _id: enrolment._id },
        { $set: { progressPercentage, status, completedAt: enrolment.completedAt } }
      );
    }

    return res.status(200).json({
      success: true,
      enrolment,
      totalModules: totalLessonsCount,
      completedModules: completedLessonsCount,
      progressPercentage,
      status,
      completedAt: enrolment.completedAt
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching progress.' });
  }
};

exports.getLearnerEnrolments = async (req, res) => {
  try {
    const enrolments = await Enrolment.find({ learnerId: req.user.id })
      .populate('courseId', 'title category skillLevel language thumbnail price modules status state notes')
      .lean();
    const sanitisedEnrolments = enrolments.map(enrolment => {
      const eObj = enrolment;
      if (eObj.courseId) {
        const { progressPercentage, status } = calculateEnrolmentProgress(eObj.courseId, eObj);
        eObj.courseId = sanitizeCourseForLearner(eObj.courseId);
        eObj.progressPercentage = progressPercentage;
        eObj.status = status;

        if (enrolment.status !== status || enrolment.progressPercentage !== progressPercentage) {
          Enrolment.updateOne(
            { _id: enrolment._id },
            { $set: { status, progressPercentage } }
          ).catch(err => console.error('Enrolment sync error:', err));
        }
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
    const courseId = req.params.courseId || req.body.courseId;
    const lessonIndex = req.body.lessonIndex !== undefined ? req.body.lessonIndex : req.params.moduleId;

    if (!courseId || lessonIndex === undefined) {
      return res.status(400).json({ success: false, message: 'Course ID and lesson/module identifier are required.' });
    }

    const enrolment = await Enrolment.findOne({ learnerId: req.user.id, courseId });
    if (!enrolment) {
      return res.status(404).json({ success: false, message: 'Enrolment record not found.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Determine published items and lessons across published modules
    const pubModules = (course.modules || []).filter(m => m.state === 'published' || m.status === 'published');
    const pubItemIds = new Set();
    const lessonToItemsMap = new Map();
    let publishedLessonsCount = 0;

    pubModules.forEach((m, mIdx) => {
      (m.lessons || []).filter(l => l.state === 'published' || l.status === 'published').forEach((l, lIdx) => {
        publishedLessonsCount++;
        const lIdStr = String(l._id);
        const lItems = (l.items || l.contentItems || []).filter(i => i.state === 'published' || i.status === 'published');
        const itemIds = lItems.map(i => String(i._id));
        lessonToItemsMap.set(lIdStr, itemIds);
        lessonToItemsMap.set(String(mIdx), itemIds); // Also support numeric module index
        itemIds.forEach(id => pubItemIds.add(id));
      });
    });

    const totalLessons = Math.max(
      pubItemIds.size > 0
        ? pubItemIds.size
        : (publishedLessonsCount > 0 ? publishedLessonsCount : (course.modules?.length || course.lessons?.length || 1)),
      1
    );

    const idx = typeof lessonIndex === 'number' ? lessonIndex : parseInt(lessonIndex, 10);
    const isNum = !isNaN(idx) && String(idx) === String(lessonIndex).trim();
    const lessonKey = isNum ? idx : String(lessonIndex);

    // Verify identifier belongs to course
    let moduleBelongs = false;
    if (isNum && idx >= 0) {
      if (idx < (course.modules?.length || 1) || idx < (course.lessons?.length || 1)) {
        moduleBelongs = true;
      }
    } else {
      const targetStr = String(lessonIndex);
      if (pubItemIds.has(targetStr)) {
        moduleBelongs = true;
      } else {
        const inModules = (course.modules || []).some(m =>
          m._id?.toString() === targetStr ||
          (m.lessons || []).some(l => l._id?.toString() === targetStr) ||
          (m.lessons || []).some(l => (l.items || l.contentItems || []).some(i => i._id?.toString() === targetStr))
        );
        const inLessons = (course.lessons || []).some(l => l._id?.toString() === targetStr);
        if (inModules || inLessons) {
          moduleBelongs = true;
        }
      }
    }

    if (!moduleBelongs && totalLessons > 1) {
      return res.status(400).json({ success: false, message: 'Module/Item does not belong to this course.' });
    }

    // Check if already completed
    const isAlreadyCompleted = (enrolment.completedLessons || []).some(i => String(i) === String(lessonKey));
    let newlyCompleted = false;

    // Idempotent check for /complete endpoint
    const isCompleteEndpoint = req.originalUrl?.includes('/complete');

    if (isAlreadyCompleted) {
      if (isCompleteEndpoint) {
        return res.status(200).json({
          success: true,
          message: 'Item/Module is already completed.',
          enrolment,
          pointsAwarded: 0,
          isCompleted: true
        });
      } else {
        // Toggle off for toggle /progress endpoint
        enrolment.completedLessons = enrolment.completedLessons.filter(i => String(i) !== String(lessonKey));
      }
    } else {
      // If a lesson ID was passed and has items, also mark its items
      if (lessonToItemsMap.has(String(lessonKey))) {
        const relatedItems = lessonToItemsMap.get(String(lessonKey)) || [];
        relatedItems.forEach(itemId => {
          if (!enrolment.completedLessons.some(i => String(i) === String(itemId))) {
            enrolment.completedLessons.push(itemId);
          }
        });
      }
      enrolment.completedLessons.push(lessonKey);
      newlyCompleted = true;
    }

    // Sanitize and deduplicate completedLessons
    const uniqueValid = new Set();
    (enrolment.completedLessons || []).forEach(i => {
      const strVal = String(i);
      if (pubItemIds.has(strVal)) {
        uniqueValid.add(strVal);
      } else {
        const n = Number(i);
        if (!isNaN(n) && n >= 0 && n < (course.modules?.length || totalLessons)) {
          uniqueValid.add(n);
        } else if (lessonToItemsMap.has(strVal)) {
          uniqueValid.add(strVal);
        }
      }
    });
    enrolment.completedLessons = Array.from(uniqueValid);

    // Recalculate course progress using single-source-of-truth calculation
    const progressResult = calculateEnrolmentProgress(course, enrolment);
    const newPercentage = progressResult.progressPercentage;
    const newStatus = progressResult.status;

    enrolment.progressPercentage = newPercentage;
    enrolment.status = newStatus;
    enrolment.lastAccessedAt = Date.now();

    if (newPercentage === 100) {
      if (!enrolment.completedAt) enrolment.completedAt = Date.now();
    } else {
      enrolment.completedAt = null;
    }

    await enrolment.save();

    let pointsAwarded = 0;
    if (newlyCompleted && req.user && req.user.role === 'learner') {
      const PointTransaction = require('../model/PointTransaction');
      const isQuiz = Boolean(req.body.quizId);
      const referenceId = isQuiz
        ? `${courseId}_quiz_${req.body.quizId}`
        : `${courseId}_mod_${lessonKey}`;
      const txType = isQuiz ? 'QUIZ_COMPLETION' : 'MODULE_COMPLETION';

      const existingTx = await PointTransaction.findOne({
        learnerId: req.user.id,
        type: txType,
        referenceId
      });

      if (!existingTx) {
        const learner = await Learner.findById(req.user.id);
        if (learner && learner.role === 'learner') {
          const modulePts = 5;
          learner.points = (learner.points || 0) + modulePts;
          pointsAwarded += modulePts;

          // Maintain daily learning streak since valid learning activity occurred
          const { isSameDay, isConsecutiveDay } = require('./learnerController');
          if (typeof isSameDay === 'function' && !isSameDay(learner.lastCheckInDate)) {
            const isConsecutive = typeof isConsecutiveDay === 'function' && isConsecutiveDay(learner.lastCheckInDate);
            learner.currentStreak = isConsecutive ? (learner.currentStreak || 0) + 1 : 1;
            learner.longestStreak = Math.max(learner.longestStreak || 0, learner.currentStreak);
            learner.lastCheckInDate = new Date();
          }

          await learner.save();

          try {
            const desc = isQuiz
              ? `Passed quiz: "${req.body.quizTitle || 'Quiz'}" in ${course.title} (+${modulePts} points)`
              : `Completed module in ${course.title} (+${modulePts} points)`;

            await PointTransaction.create({
              learnerId: req.user.id,
              points: modulePts,
              type: txType,
              referenceId,
              description: desc
            });
          } catch (txErr) {
            console.error('PointTransaction creation error:', txErr);
          }
        }
      }

      // Check if course is 100% completed and award COURSE_COMPLETION points (+20)
      if (newPercentage === 100) {
        const courseCompletionRef = `${courseId}_completed`;
        const existingCourseTx = await PointTransaction.findOne({
          learnerId: req.user.id,
          type: 'COURSE_COMPLETION',
          referenceId: courseCompletionRef
        });

        if (!existingCourseTx) {
          const learner = await Learner.findById(req.user.id);
          if (learner && learner.role === 'learner') {
            const completionPts = 20;
            learner.points = (learner.points || 0) + completionPts;
            await learner.save();
            pointsAwarded += completionPts;

            try {
              await PointTransaction.create({
                learnerId: req.user.id,
                points: completionPts,
                type: 'COURSE_COMPLETION',
                referenceId: courseCompletionRef,
                description: `Completed 100% of course: "${course.title}" (+${completionPts} points)`
              });
            } catch (courseTxErr) {
              console.error('Course completion PointTransaction error:', courseTxErr);
            }
          }
        }
      }
    }

    courseCache.invalidateCourse(courseId);

    return res.status(200).json({
      success: true,
      message: newlyCompleted
        ? `Module completed! ${pointsAwarded > 0 ? `+${pointsAwarded} points awarded 🎉` : ''}`
        : 'Module marked as incomplete.',
      enrolment,
      pointsAwarded,
      isCompleted: newlyCompleted
    });
  } catch (error) {
    console.error('Update progress error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating lesson progress.' });
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
        console.warn('Cloudinary upload warning during course creation (falling back to base64 Data URL):', cloudErr.message);
        resolvedThumbnail = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
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

    const cached = courseCache.overviews.get(String(id));
    if (cached && Date.now() < cached.expiry) {
      return res.status(200).json(cached.data);
    }

    const course = await Course.findById(id).lean();
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Parallel fetch for overview components
    const [overviewDoc, instructorUser, enrolments, questions] = await Promise.all([
      CourseOverview.findOne({ courseId: id }).lean(),
      course.instructorId ? Instructor.findById(course.instructorId).select('fullName avatar profilePhoto bio headline email').lean() : null,
      Enrolment.find({ courseId: id }, { rating: 1, feedback: 1, feedbackTags: 1, ratedAt: 1, learnerName: 1, learnerId: 1 }).populate('learnerId', 'avatar').lean(),
      CourseQuestion.find({ courseId: id, status: 'answered' })
        .sort({ replyTimestamp: -1 })
        .select('userName userAvatar question status instructorReply replyTimestamp createdAt')
        .lean()
    ]);

    let overview = overviewDoc;
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
    if (instructorUser) {
      instructorProfile = {
        name: instructorUser.fullName,
        profilePhoto: instructorUser.avatar || instructorUser.profilePhoto || '',
        avatar: instructorUser.avatar || instructorUser.profilePhoto || '',
        bio: instructorUser.bio || '',
        headline: instructorUser.headline || 'UpSkillr Instructor',
        email: instructorUser.email
      };
    }

    const totalEnrolments = enrolments.length;
    const ratedEnrolments = enrolments.filter((e) => e.rating !== null && e.rating !== undefined);
    const averageRating =
      ratedEnrolments.length > 0
        ? Math.round((ratedEnrolments.reduce((sum, e) => sum + e.rating, 0) / ratedEnrolments.length) * 10) / 10
        : null;

    const reviews = ratedEnrolments
      .filter((e) => e.feedback && e.feedback.trim().length > 0)
      .map((e) => ({
        rating: e.rating,
        feedback: e.feedback,
        tags: e.feedbackTags || [],
        ratedAt: e.ratedAt,
        learnerName: e.learnerName || 'Learner',
        learnerAvatar: e.learnerId?.avatar || ''
      }));

    // Non-blocking view tracking in background
    setImmediate(async () => {
      try {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || '';
        const crypto = require('crypto');
        const viewerHash = crypto
          .createHash('sha256')
          .update(`${clientIp}-${userAgent}-${req.user ? req.user.id : ''}`)
          .digest('hex');

        const existingView = await CourseView.findOne({ courseId: id, viewerHash });
        if (!existingView) {
          await CourseView.create({ courseId: id, viewerHash });
          await Course.findByIdAndUpdate(id, { $inc: { overviewViews: 1 } });
        }
      } catch (e) {}
    });

    const courseObj = sanitizeCourseForPublicOverview(course);

    const responsePayload = {
      success: true,
      course: courseObj,
      overview,
      instructor: instructorProfile,
      stats: {
        totalEnrolments,
        overviewViews: course.overviewViews || 0,
        averageRating,
        reviewCount: ratedEnrolments.length
      },
      reviews,
      questions
    };

    courseCache.overviews.set(String(id), { data: responsePayload, expiry: Date.now() + 15000 });

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Get Public Course Overview Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching course overview.' });
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
        console.warn('Cloudinary upload fallback to local static file:', cloudErr.message);
        const outDir = path.join(__dirname, '../uploads/thumbnails');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        let ext = (req.file.mimetype || '').split('/')[1] || 'png';
        if (ext === 'jpeg') ext = 'jpg';
        const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5000';
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const filename = `thumb_${id}_${Date.now()}.${ext}`;
        fs.writeFileSync(path.join(outDir, filename), req.file.buffer);
        thumbnailUrl = `${protocol}://${host}/uploads/thumbnails/${filename}`;
      }
    } else if (req.body.thumbnailUrl && req.body.thumbnailUrl.trim()) {
      thumbnailUrl = req.body.thumbnailUrl.trim();
      thumbnailPublicId = req.body.thumbnailPublicId || '';
    } else if (req.body.thumbnail && req.body.thumbnail.trim()) {
      thumbnailUrl = req.body.thumbnail.trim();
      thumbnailPublicId = req.body.thumbnailPublicId || '';
    }

    // Clean up previous thumbnail asset if replaced
    if (course.thumbnail && course.thumbnail !== thumbnailUrl) {
      if (course.thumbnail_public_id || course.thumbnail.includes('cloudinary.com')) {
        deleteCloudinaryAsset(course.thumbnail_public_id || course.thumbnail, 'image').catch(() => {});
      } else if (course.thumbnail.includes('/uploads/thumbnails/')) {
        try {
          const oldFile = path.basename(course.thumbnail);
          const oldPath = path.join(__dirname, '../uploads/thumbnails', oldFile);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (fErr) {}
      }
    }

    course.thumbnail = thumbnailUrl;
    course.thumbnail_public_id = thumbnailPublicId;
    await course.save();
    courseCache.invalidateCourse(id);
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

    if (courseCache && courseCache.invalidateCourse) {
      courseCache.invalidateCourse(id);
    }

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
      userAvatar: req.user.avatar || req.user.profilePhoto || '',
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

