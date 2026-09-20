const Course = require('../model/Course');
const mongoose = require('mongoose');

// Helper to generate fractional / lexicographical sort key
const generateSortKey = (prevKey, nextKey) => {
  if (!prevKey && !nextKey) return 'a0';
  if (!prevKey) {
    // Generate key before nextKey
    const firstChar = nextKey.charCodeAt(0);
    const char = firstChar > 97 ? String.fromCharCode(firstChar - 1) : 'a';
    return char + '0';
  }
  if (!nextKey) {
    // Generate key after prevKey
    const lastChar = prevKey.slice(-1);
    if (lastChar >= '0' && lastChar < '9') {
      return prevKey.slice(0, -1) + String.fromCharCode(lastChar.charCodeAt(0) + 1);
    }
    return prevKey + '0';
  }
  // Midpoint between prevKey and nextKey
  return prevKey + '5';
};

// Helper to verify course ownership
const verifyCourse = async (courseId, userId) => {
  const course = await Course.findById(courseId);
  if (!course) {
    const err = new Error('Course not found');
    err.status = 404;
    throw err;
  }
  const uId = userId._id ? userId._id.toString() : (userId.id ? userId.id.toString() : userId.toString());
  const instId = (course.instructorId || course.instructor)?.toString();
  if (instId !== uId) {
    const err = new Error('Access denied: You are not the instructor for this course');
    err.status = 403;
    throw err;
  }
  return course;
};

// Auto-Draft Qualification Check
const canPublishModule = (mod) => {
  return Array.isArray(mod.lessons) && mod.lessons.length > 0;
};

const canPublishLesson = (lesson) => {
  return Array.isArray(lesson.items) && lesson.items.length > 0;
};

const canPublishItem = (item) => {
  if (item.type === 'quiz') {
    return Array.isArray(item.quiz?.questions) && item.quiz.questions.length > 0;
  }
  if (item.type === 'video') {
    return Boolean(item.video?.muxPlaybackId || item.video?.muxAssetId);
  }
  return true;
};

const canPublishAssessment = (assessment) => {
  return Array.isArray(assessment.questions) && assessment.questions.length > 0;
};

/**
 * GET /api/courses/:courseId/curriculum
 * Returns full tree with auto-draft markers and fractional sorting
 */
exports.getCurriculumTree = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await verifyCourse(courseId, req.user);

    // Sort modules by sortKey
    const sortedModules = (course.modules || [])
      .slice()
      .sort((a, b) => (a.sortKey || 'a0').localeCompare(b.sortKey || 'a0'))
      .map(mod => {
        const modObj = mod.toObject ? mod.toObject() : mod;
        const modCanPub = canPublishModule(modObj);

        // Sort lessons by sortKey
        const sortedLessons = (modObj.lessons || [])
          .slice()
          .sort((a, b) => (a.sortKey || 'a0').localeCompare(b.sortKey || 'a0'))
          .map(lesson => {
            const lessonCanPub = canPublishLesson(lesson);
            // Sort items by sortKey
            const sortedItems = (lesson.items || [])
              .slice()
              .sort((a, b) => (a.sortKey || 'a0').localeCompare(b.sortKey || 'a0'))
              .map(item => {
                const itemCanPub = canPublishItem(item);
                return {
                  ...item,
                  canPublish: itemCanPub,
                  autoDraft: item.state === 'draft' && !itemCanPub
                };
              });

            return {
              ...lesson,
              items: sortedItems,
              canPublish: lessonCanPub,
              autoDraft: lesson.state === 'draft' && !lessonCanPub
            };
          });

        return {
          ...modObj,
          lessons: sortedLessons,
          canPublish: modCanPub,
          autoDraft: modObj.state === 'draft' && !modCanPub
        };
      });

    // Notes attached to course
    const notes = (course.notes || []).slice().sort((a, b) => (a.sortKey || 'a0').localeCompare(b.sortKey || 'a0'));

    // Course assessments
    const courseAssessments = (course.courseAssessments || [])
      .slice()
      .sort((a, b) => (a.sortKey || 'a0').localeCompare(b.sortKey || 'a0'))
      .map(ca => {
        const caObj = ca.toObject ? ca.toObject() : ca;
        const caCanPub = canPublishAssessment(caObj);
        return {
          ...caObj,
          canPublish: caCanPub,
          autoDraft: caObj.state === 'draft' && !caCanPub
        };
      });

    res.json({
      success: true,
      courseId: course._id,
      courseTitle: course.title,
      courseState: course.state || 'draft',
      modules: sortedModules,
      notes,
      courseAssessments
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/**
 * MODULE CRUD
 */
exports.createModule = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Module title is required' });
    }
    const course = await verifyCourse(courseId, req.user);

    // Calculate sortKey
    const existing = (course.modules || []).slice().sort((a, b) => (a.sortKey || 'a0').localeCompare(b.sortKey || 'a0'));
    const prevKey = existing.length > 0 ? existing[existing.length - 1].sortKey : null;
    const sortKey = generateSortKey(prevKey, null);

    course.modules.push({
      title: title.trim(),
      description: description ? description.trim() : '',
      state: 'draft',
      sortKey,
      lessons: []
    });

    await course.save();
    const createdModule = course.modules[course.modules.length - 1];
    res.status(201).json({ success: true, module: createdModule });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.updateModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { title, description } = req.body;
    const course = await verifyCourse(courseId, req.user);

    const mod = course.modules.id(moduleId);
    if (!mod) return res.status(404).json({ success: false, message: 'Module not found' });

    if (title && title.trim()) mod.title = title.trim();
    if (description !== undefined) mod.description = description.trim();

    await course.save();
    res.json({ success: true, module: mod });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.toggleModuleState = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const course = await verifyCourse(courseId, req.user);

    const mod = course.modules.id(moduleId);
    if (!mod) return res.status(404).json({ success: false, message: 'Module not found' });

    const nextState = mod.state === 'published' ? 'draft' : 'published';

    // Auto-draft constraint: cannot publish empty module
    if (nextState === 'published' && !canPublishModule(mod)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish an empty module. Add at least one lesson first.'
      });
    }

    mod.state = nextState;
    await course.save();
    res.json({ success: true, state: mod.state, module: mod });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.reorderModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { sortKey, prevKey, nextKey } = req.body;
    const course = await verifyCourse(courseId, req.user);

    const mod = course.modules.id(moduleId);
    if (!mod) return res.status(404).json({ success: false, message: 'Module not found' });

    mod.sortKey = sortKey || generateSortKey(prevKey, nextKey);
    await course.save();
    res.json({ success: true, module: mod });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/**
 * LESSON CRUD
 */
exports.createLesson = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { title, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Lesson title is required' });
    }
    const course = await verifyCourse(courseId, req.user);

    const mod = course.modules.id(moduleId);
    if (!mod) return res.status(404).json({ success: false, message: 'Module not found' });

    const existingLessons = (mod.lessons || []).slice().sort((a, b) => (a.sortKey || 'a0').localeCompare(b.sortKey || 'a0'));
    const prevKey = existingLessons.length > 0 ? existingLessons[existingLessons.length - 1].sortKey : null;
    const sortKey = generateSortKey(prevKey, null);

    mod.lessons.push({
      title: title.trim(),
      description: description ? description.trim() : '',
      state: 'draft',
      sortKey,
      items: []
    });

    await course.save();
    const createdLesson = mod.lessons[mod.lessons.length - 1];
    res.status(201).json({ success: true, lesson: createdLesson });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.updateLesson = async (req, res) => {
  try {
    const { courseId, moduleId, lessonId } = req.params;
    const { title, description } = req.body;
    const course = await verifyCourse(courseId, req.user);

    const mod = course.modules.id(moduleId);
    if (!mod) return res.status(404).json({ success: false, message: 'Module not found' });

    const lesson = mod.lessons.id(lessonId);
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });

    if (title && title.trim()) lesson.title = title.trim();
    if (description !== undefined) lesson.description = description.trim();

    await course.save();
    res.json({ success: true, lesson });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.toggleLessonState = async (req, res) => {
  try {
    const { courseId, moduleId, lessonId } = req.params;
    const course = await verifyCourse(courseId, req.user);

    const mod = course.modules.id(moduleId);
    if (!mod) return res.status(404).json({ success: false, message: 'Module not found' });

    const lesson = mod.lessons.id(lessonId);
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });

    const nextState = lesson.state === 'published' ? 'draft' : 'published';

    // Auto-draft constraint: cannot publish empty lesson
    if (nextState === 'published' && !canPublishLesson(lesson)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish an empty lesson. Add at least one item (video or quiz) first.'
      });
    }

    lesson.state = nextState;
    await course.save();
    res.json({ success: true, state: lesson.state, lesson });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.reorderLesson = async (req, res) => {
  try {
    const { courseId, moduleId, lessonId } = req.params;
    const { sortKey, prevKey, nextKey } = req.body;
    const course = await verifyCourse(courseId, req.user);

    const mod = course.modules.id(moduleId);
    if (!mod) return res.status(404).json({ success: false, message: 'Module not found' });

    const lesson = mod.lessons.id(lessonId);
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });

    lesson.sortKey = sortKey || generateSortKey(prevKey, nextKey);
    await course.save();
    res.json({ success: true, lesson });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/**
 * CONTENT ITEM CRUD (Video & Quiz with immutable version increment on edit)
 */
exports.createContentItem = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { type, title, video, quiz } = req.body;

    if (!['video', 'quiz'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be "video" or "quiz"' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Item title is required' });
    }

    const course = await verifyCourse(courseId, req.user);

    // Find module and lesson
    let targetLesson = null;
    for (const m of course.modules) {
      const l = m.lessons.id(lessonId);
      if (l) {
        targetLesson = l;
        break;
      }
    }
    if (!targetLesson) return res.status(404).json({ success: false, message: 'Lesson not found' });

    const existingItems = (targetLesson.items || []).slice().sort((a, b) => (a.sortKey || 'a0').localeCompare(b.sortKey || 'a0'));
    const prevKey = existingItems.length > 0 ? existingItems[existingItems.length - 1].sortKey : null;
    const sortKey = generateSortKey(prevKey, null);

    const newItem = {
      type,
      title: title.trim(),
      state: 'draft',
      sortKey,
      version: 1
    };

    if (type === 'video') {
      newItem.video = {
        muxAssetId: video?.muxAssetId || '',
        muxPlaybackId: video?.muxPlaybackId || '',
        duration: video?.duration || 0,
        watchedThresholdPercent: Number(video?.watchedThresholdPercent) || 90,
        status: video?.status || 'ready'
      };
    } else if (type === 'quiz') {
      newItem.quiz = {
        passThresholdPercent: Number(quiz?.passThresholdPercent) || 70,
        maxAttempts: Number(quiz?.maxAttempts) || 3,
        cooldownHours: Number(quiz?.cooldownHours) || 6,
        questions: Array.isArray(quiz?.questions) ? quiz.questions : []
      };
    }

    targetLesson.items.push(newItem);
    await course.save();

    const createdItem = targetLesson.items[targetLesson.items.length - 1];
    res.status(201).json({ success: true, item: createdItem });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.updateContentItem = async (req, res) => {
  try {
    const { courseId, lessonId, itemId } = req.params;
    const { title, video, quiz } = req.body;
    const course = await verifyCourse(courseId, req.user);

    let targetItem = null;
    for (const m of course.modules) {
      const l = m.lessons.id(lessonId);
      if (l) {
        const it = l.items.id(itemId);
        if (it) {
          targetItem = it;
          break;
        }
      }
    }
    if (!targetItem) return res.status(404).json({ success: false, message: 'Content item not found' });

    // Immutable version increment if item is published and content is being modified
    if (targetItem.state === 'published') {
      targetItem.version = (targetItem.version || 1) + 1;
    }

    if (title && title.trim()) targetItem.title = title.trim();

    if (targetItem.type === 'video' && video) {
      if (video.muxAssetId !== undefined) targetItem.video.muxAssetId = video.muxAssetId;
      if (video.muxPlaybackId !== undefined) targetItem.video.muxPlaybackId = video.muxPlaybackId;
      if (video.duration !== undefined) targetItem.video.duration = video.duration;
      if (video.watchedThresholdPercent !== undefined) targetItem.video.watchedThresholdPercent = Number(video.watchedThresholdPercent);
      if (video.status !== undefined) targetItem.video.status = video.status;
    } else if (targetItem.type === 'quiz' && quiz) {
      if (quiz.passThresholdPercent !== undefined) targetItem.quiz.passThresholdPercent = Number(quiz.passThresholdPercent);
      if (quiz.maxAttempts !== undefined) targetItem.quiz.maxAttempts = Number(quiz.maxAttempts);
      if (quiz.cooldownHours !== undefined) targetItem.quiz.cooldownHours = Number(quiz.cooldownHours);
      if (Array.isArray(quiz.questions)) targetItem.quiz.questions = quiz.questions;
    }

    await course.save();
    res.json({ success: true, item: targetItem });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.toggleContentItemState = async (req, res) => {
  try {
    const { courseId, lessonId, itemId } = req.params;
    const course = await verifyCourse(courseId, req.user);

    let targetItem = null;
    for (const m of course.modules) {
      const l = m.lessons.id(lessonId);
      if (l) {
        const it = l.items.id(itemId);
        if (it) {
          targetItem = it;
          break;
        }
      }
    }
    if (!targetItem) return res.status(404).json({ success: false, message: 'Content item not found' });

    const nextState = targetItem.state === 'published' ? 'draft' : 'published';

    // Auto-draft constraint
    if (nextState === 'published' && !canPublishItem(targetItem)) {
      const msg = targetItem.type === 'quiz'
        ? 'Cannot publish empty quiz. Add at least one question first.'
        : 'Cannot publish video without a valid playback asset.';
      return res.status(400).json({ success: false, message: msg });
    }

    targetItem.state = nextState;
    await course.save();
    res.json({ success: true, state: targetItem.state, item: targetItem });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.reorderContentItem = async (req, res) => {
  try {
    const { courseId, lessonId, itemId } = req.params;
    const { sortKey, prevKey, nextKey } = req.body;
    const course = await verifyCourse(courseId, req.user);

    let targetItem = null;
    for (const m of course.modules) {
      const l = m.lessons.id(lessonId);
      if (l) {
        const it = l.items.id(itemId);
        if (it) {
          targetItem = it;
          break;
        }
      }
    }
    if (!targetItem) return res.status(404).json({ success: false, message: 'Content item not found' });

    targetItem.sortKey = sortKey || generateSortKey(prevKey, nextKey);
    await course.save();
    res.json({ success: true, item: targetItem });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/**
 * NOTES (Non-gating attachments, Article MD / PDF / Image)
 */
exports.attachNote = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { scope, moduleId, lessonId, type, title, content, mediaUrl, cloudinaryPublicId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Note title is required' });
    }
    if (!['article', 'pdf', 'image'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be "article", "pdf", or "image"' });
    }

    const course = await verifyCourse(courseId, req.user);

    const existingNotes = (course.notes || []).slice().sort((a, b) => (a.sortKey || 'a0').localeCompare(b.sortKey || 'a0'));
    const prevKey = existingNotes.length > 0 ? existingNotes[existingNotes.length - 1].sortKey : null;
    const sortKey = generateSortKey(prevKey, null);

    const newNote = {
      scope: scope || 'course',
      moduleId: moduleId || null,
      lessonId: lessonId || null,
      type,
      title: title.trim(),
      content: content ? content.trim() : '',
      mediaUrl: mediaUrl || '',
      cloudinaryPublicId: cloudinaryPublicId || '',
      state: 'published', // Non-gating notes default published, toggleable
      sortKey
    };

    course.notes.push(newNote);
    await course.save();

    const createdNote = course.notes[course.notes.length - 1];
    res.status(201).json({ success: true, note: createdNote });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { courseId, noteId } = req.params;
    const { title, content, mediaUrl, cloudinaryPublicId } = req.body;
    const course = await verifyCourse(courseId, req.user);

    const note = course.notes.id(noteId);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    if (title && title.trim()) note.title = title.trim();
    if (content !== undefined) note.content = content.trim();
    if (mediaUrl !== undefined) note.mediaUrl = mediaUrl;
    if (cloudinaryPublicId !== undefined) note.cloudinaryPublicId = cloudinaryPublicId;

    await course.save();
    res.json({ success: true, note });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.toggleNoteState = async (req, res) => {
  try {
    const { courseId, noteId } = req.params;
    const course = await verifyCourse(courseId, req.user);

    const note = course.notes.id(noteId);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    note.state = note.state === 'published' ? 'draft' : 'published';
    await course.save();
    res.json({ success: true, state: note.state, note });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/**
 * COURSE-LEVEL ASSESSMENTS
 */
exports.createAssessment = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      title,
      description,
      requiredModuleIds,
      passThresholdPercent,
      maxAttempts,
      cooldownHours,
      questions
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Assessment title is required' });
    }

    const course = await verifyCourse(courseId, req.user);

    const existingAss = (course.courseAssessments || []).slice().sort((a, b) => (a.sortKey || 'a0').localeCompare(b.sortKey || 'a0'));
    const prevKey = existingAss.length > 0 ? existingAss[existingAss.length - 1].sortKey : null;
    const sortKey = generateSortKey(prevKey, null);

    const newAssessment = {
      title: title.trim(),
      description: description ? description.trim() : '',
      requiredModuleIds: Array.isArray(requiredModuleIds) ? requiredModuleIds : [],
      passThresholdPercent: Number(passThresholdPercent) || 70,
      maxAttempts: Number(maxAttempts) || 3,
      cooldownHours: Number(cooldownHours) || 6,
      questions: Array.isArray(questions) ? questions : [],
      state: 'draft',
      sortKey,
      version: 1
    };

    course.courseAssessments.push(newAssessment);
    await course.save();

    const createdAssessment = course.courseAssessments[course.courseAssessments.length - 1];
    res.status(201).json({ success: true, assessment: createdAssessment });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.updateAssessment = async (req, res) => {
  try {
    const { courseId, assessmentId } = req.params;
    const {
      title,
      description,
      requiredModuleIds,
      passThresholdPercent,
      maxAttempts,
      cooldownHours,
      questions
    } = req.body;
    const course = await verifyCourse(courseId, req.user);

    const assessment = course.courseAssessments.id(assessmentId);
    if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found' });

    if (assessment.state === 'published') {
      assessment.version = (assessment.version || 1) + 1;
    }

    if (title && title.trim()) assessment.title = title.trim();
    if (description !== undefined) assessment.description = description.trim();
    if (Array.isArray(requiredModuleIds)) assessment.requiredModuleIds = requiredModuleIds;
    if (passThresholdPercent !== undefined) assessment.passThresholdPercent = Number(passThresholdPercent);
    if (maxAttempts !== undefined) assessment.maxAttempts = Number(maxAttempts);
    if (cooldownHours !== undefined) assessment.cooldownHours = Number(cooldownHours);
    if (Array.isArray(questions)) assessment.questions = questions;

    await course.save();
    res.json({ success: true, assessment });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.toggleAssessmentState = async (req, res) => {
  try {
    const { courseId, assessmentId } = req.params;
    const course = await verifyCourse(courseId, req.user);

    const assessment = course.courseAssessments.id(assessmentId);
    if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found' });

    const nextState = assessment.state === 'published' ? 'draft' : 'published';

    // Auto-draft constraint: cannot publish empty questions
    if (nextState === 'published' && !canPublishAssessment(assessment)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish assessment without questions. Add at least one question first.'
      });
    }

    assessment.state = nextState;
    await course.save();
    res.json({ success: true, state: assessment.state, assessment });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/**
 * Direct file uploads from instructor device
 */
exports.uploadVideoFromDevice = async (req, res) => {
  try {
    const { courseId } = req.params;
    await verifyCourse(courseId, req.user);

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file uploaded' });
    }

    const publicUrl = `/uploads/videos/${req.file.filename}`;
    res.json({
      success: true,
      url: publicUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.uploadResourceFromDevice = async (req, res) => {
  try {
    const { courseId } = req.params;
    await verifyCourse(courseId, req.user);

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const publicUrl = `/uploads/resources/${req.file.filename}`;
    res.json({
      success: true,
      url: publicUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

