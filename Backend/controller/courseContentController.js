const fs = require('fs');
const path = require('path');
const Course = require('../model/Course');
const mongoose = require('mongoose');
const { notifyStudentsOnNewContent } = require('./notificationController');
const { courseCache } = require('./courseController');

// Helper to generate fractional / lexicographical sort key (LexoRank style)
const generateSortKey = (prevKey, nextKey) => {
  if (!prevKey && !nextKey) return 'a0';
  if (!prevKey) {
    const firstChar = nextKey.charCodeAt(0);
    const char = firstChar > 97 ? String.fromCharCode(firstChar - 1) : 'a';
    return char + '0';
  }
  if (!nextKey) {
    const lastChar = prevKey.slice(-1);
    if (lastChar >= '0' && lastChar < '9') {
      return prevKey.slice(0, -1) + String.fromCharCode(lastChar.charCodeAt(0) + 1);
    }
    return prevKey + '0';
  }
  // Midpoint between prevKey and nextKey
  return prevKey + '5';
};

// Rebalance sibling keys evenly
const rebalanceSiblingKeys = (items) => {
  if (!Array.isArray(items)) return;
  items.forEach((item, index) => {
    item.sortKey = `a${index.toString().padStart(3, '0')}`;
  });
};

// Helper to verify course ownership & IDOR protection (Rule E.1)
const verifyCourse = async (courseId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    const err = new Error('Invalid Course ID format');
    err.status = 400;
    throw err;
  }
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

// Auto-Draft Qualification Checks (Rule A.2.4)
const canPublishModule = (mod) => {
  return Array.isArray(mod.lessons) && mod.lessons.length > 0;
};

const canPublishLesson = (lesson) => {
  const items = lesson.items || [];
  return Array.isArray(items) && items.length > 0;
};

const canPublishItem = (item) => {
  const itemType = (item.type || '').toLowerCase();
  if (itemType === 'quiz') {
    const questions = item.quiz?.questions || [];
    return Array.isArray(questions) && questions.length > 0;
  }
  if (itemType === 'video') {
    return Boolean(
      item.video?.muxPlaybackId ||
      item.video?.muxAssetId ||
      item.video?.videoUrl ||
      item.video?.url ||
      item.video?.fileUrl ||
      item.videoUrl ||
      item.url ||
      item.fileUrl
    );
  }
  if (['article', 'article_md', 'note'].includes(itemType)) {
    return Boolean((item.markdownContent || item.content || item.bodyMarkdown || '').trim());
  }
  if (['pdf', 'document', 'image', 'resource'].includes(itemType)) {
    return Boolean(item.fileUrl || item.mediaUrl || item.cloudinaryUrl);
  }
  return true;
};

const canPublishAssessment = (assessment) => {
  const hasQuestions = Array.isArray(assessment.questions) && assessment.questions.length > 0;
  return hasQuestions;
};

// Write-Time Visibility Recompute (Rule A.2.2 & A.2.3)
const recomputeEffectiveVisibility = (course) => {
  const coursePublished = course.state === 'published' || course.status === 'published';
  course.effective_visible = coursePublished;

  for (const mod of course.modules || []) {
    const modQualifies = canPublishModule(mod);
    const modPublished = mod.state === 'published' || mod.status === 'published';
    mod.effective_visible = coursePublished && modPublished && modQualifies;

    for (const lesson of mod.lessons || []) {
      const lessonQualifies = canPublishLesson(lesson);
      const lessonPublished = lesson.state === 'published' || lesson.status === 'published';
      lesson.effective_visible = mod.effective_visible && lessonPublished && lessonQualifies;

      const items = lesson.items || lesson.contentItems || [];
      for (const item of items) {
        const itemQualifies = canPublishItem(item);
        const itemPublished = item.state === 'published' || item.status === 'published';
        item.effective_visible = lesson.effective_visible && itemPublished && itemQualifies;
      }
    }
  }

  for (const note of course.notes || []) {
    let parentVisible = coursePublished;
    if (note.scope === 'module' && note.moduleId) {
      const parentMod = (course.modules || []).find(m => String(m._id) === String(note.moduleId));
      parentVisible = parentMod ? (parentMod.state === 'published' || parentMod.status === 'published') : coursePublished;
    } else if (note.scope === 'lesson' && note.lessonId) {
      let parentLes = null;
      for (const m of course.modules || []) {
        const found = (m.lessons || []).find(l => String(l._id) === String(note.lessonId));
        if (found) {
          parentLes = found;
          break;
        }
      }
      parentVisible = parentLes ? (parentLes.state === 'published' || parentLes.status === 'published') : coursePublished;
    }
    const notePublished = note.state === 'published' || note.status === 'published';
    note.effective_visible = coursePublished && parentVisible && notePublished;
  }

  for (const ca of course.courseAssessments || []) {
    const caQualifies = canPublishAssessment(ca);
    ca.effective_visible = coursePublished && (ca.state === 'published' || ca.status === 'published') && caQualifies;
  }
};

/**
 * GET /api/courses/:courseId/curriculum
 * Returns full tree with auto-draft markers, fractional sorting, and cached effective_visible
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
            const items = lesson.items || lesson.contentItems || [];

            // Sort items by sortKey
            const sortedItems = (items || [])
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
              contentItems: sortedItems,
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
      courseState: course.state || course.status || 'draft',
      effective_visible: course.effective_visible || false,
      modules: sortedModules,
      notes,
      courseAssessments,
      updatedAt: course.updatedAt
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/**
 * MODULE MUTATIONS
 */
exports.createModule = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, state = 'draft', release_at = null } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Module title is required.' });
    }

    const course = await verifyCourse(courseId, req.user);
    const modules = course.modules || [];

    // Fractional sort key
    const lastMod = modules[modules.length - 1];
    const sortKey = generateSortKey(lastMod ? lastMod.sortKey : null, null);

    // Modules are always created in 'draft' state by default
    const finalState = 'draft';

    const newModule = {
      _id: new mongoose.Types.ObjectId(),
      title: title.trim(),
      description: description ? description.trim() : '',
      state: finalState,
      effective_visible: false,
      release_at: release_at ? new Date(release_at) : null,
      sortKey,
      lessons: [],
      notes: []
    };

    course.modules.push(newModule);
    recomputeEffectiveVisibility(course);
    await course.save();

    // Notify students of the new module upload
    notifyStudentsOnNewContent({
      courseId: course._id,
      courseTitle: course.title,
      type: 'NEW_MODULE',
      moduleTitle: title.trim()
    });

    res.status(201).json({
      success: true,
      message: `Module created successfully in ${finalState} state.`,
      module: newModule,
      courseId: course._id
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.updateModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { title, description, state, release_at, lastUpdatedAt } = req.body;

    const course = await verifyCourse(courseId, req.user);

    // Save-time conflict detection (Rule D.9)
    if (lastUpdatedAt && course.updatedAt) {
      const clientTime = new Date(lastUpdatedAt).getTime();
      const serverTime = new Date(course.updatedAt).getTime();
      if (Math.abs(clientTime - serverTime) > 1000) {
        return res.status(409).json({
          success: false,
          conflict: true,
          message: 'This course was updated elsewhere. Another session has saved newer changes.'
        });
      }
    }

    const mod = course.modules.id(moduleId);
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    if (title && title.trim()) mod.title = title.trim();
    if (description !== undefined) mod.description = description.trim();
    if (release_at !== undefined) mod.release_at = release_at ? new Date(release_at) : null;
    if (state !== undefined) {
      if (state === 'published') {
        if (!canPublishModule(mod)) {
          return res.status(400).json({
            success: false,
            message: 'Cannot publish module: A module requires at least one lesson before it can be published.'
          });
        }
        mod.state = 'published';
      } else if (state === 'draft') {
        mod.state = 'draft';
      }
    }

    recomputeEffectiveVisibility(course);
    await course.save();

    res.json({
      success: true,
      message: 'Module updated successfully.',
      module: mod
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.toggleModuleState = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const course = await verifyCourse(courseId, req.user);

    const mod = course.modules.id(moduleId);
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    if (mod.state === 'draft') {
      // Auto-Draft Rule A.2.4: Module requires >= 1 Lesson
      if (!canPublishModule(mod)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot publish module: A module requires at least one lesson before it can be published.'
        });
      }
      mod.state = 'published';
    } else {
      mod.state = 'draft';
    }

    recomputeEffectiveVisibility(course);
    await course.save();

    res.json({
      success: true,
      message: `Module state updated to ${mod.state}.`,
      state: mod.state,
      effective_visible: mod.effective_visible,
      module: mod
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.reorderModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { prevKey, nextKey } = req.body;

    const course = await verifyCourse(courseId, req.user);
    const mod = course.modules.id(moduleId);
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    mod.sortKey = generateSortKey(prevKey, nextKey);
    // If precision exhausted, rebalance
    if (mod.sortKey.length > 25) {
      course.modules.sort((a, b) => (a.sortKey || 'a0').localeCompare(b.sortKey || 'a0'));
      rebalanceSiblingKeys(course.modules);
    }

    await course.save();
    res.json({ success: true, message: 'Module reordered.', sortKey: mod.sortKey });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.deleteModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const course = await verifyCourse(courseId, req.user);

    const mod = course.modules.id(moduleId);
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    course.modules.pull(moduleId);

    // Also remove from any courseAssessment requiredModuleIds
    if (Array.isArray(course.courseAssessments)) {
      course.courseAssessments.forEach(ca => {
        if (Array.isArray(ca.requiredModuleIds)) {
          ca.requiredModuleIds = ca.requiredModuleIds.filter(id => id.toString() !== moduleId.toString());
        }
      });
    }

    recomputeEffectiveVisibility(course);
    await course.save();
    if (courseCache && courseCache.invalidateCourse) courseCache.invalidateCourse(courseId);

    res.json({
      success: true,
      message: 'Module deleted successfully.',
      courseId: course._id
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/**
 * LESSON MUTATIONS
 */
exports.createLesson = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { title, description, require_all_items = true } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Lesson title is required.' });
    }

    const course = await verifyCourse(courseId, req.user);
    const mod = course.modules.id(moduleId);
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    const lessons = mod.lessons || [];
    const lastLesson = lessons[lessons.length - 1];
    const sortKey = generateSortKey(lastLesson ? lastLesson.sortKey : null, null);

    const newLesson = {
      _id: new mongoose.Types.ObjectId(),
      title: title.trim(),
      description: description ? description.trim() : '',
      state: 'draft', // Rule A.2.4: 0 qualifying content items -> auto-draft
      effective_visible: false,
      sortKey,
      require_all_items: require_all_items !== false,
      items: [],
      contentItems: [],
      notes: []
    };

    mod.lessons.push(newLesson);
    recomputeEffectiveVisibility(course);
    await course.save();

    // Notify students of the new lesson upload
    notifyStudentsOnNewContent({
      courseId: course._id,
      courseTitle: course.title,
      type: 'NEW_LESSON',
      lessonTitle: title.trim(),
      moduleTitle: mod.title
    });

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully in draft state.',
      lesson: newLesson
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.updateLesson = async (req, res) => {
  try {
    const { courseId, moduleId, lessonId } = req.params;
    const { title, description, state, require_all_items } = req.body;

    const course = await verifyCourse(courseId, req.user);
    const mod = course.modules.id(moduleId);
    if (!mod) return res.status(404).json({ success: false, message: 'Module not found.' });

    const lesson = mod.lessons.id(lessonId);
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found.' });

    if (title && title.trim()) lesson.title = title.trim();
    if (description !== undefined) lesson.description = description.trim();
    if (require_all_items !== undefined) lesson.require_all_items = Boolean(require_all_items);
    if (state !== undefined) {
      if (state === 'published') {
        if (!canPublishLesson(lesson)) {
          return res.status(400).json({
            success: false,
            message: 'Cannot publish lesson: A lesson requires at least on item before it can be published.'
          });
        }
        lesson.state = 'published';
      } else if (state === 'draft') {
        lesson.state = 'draft';
      }
    }

    recomputeEffectiveVisibility(course);
    await course.save();

    res.json({ success: true, message: 'Lesson updated successfully.', lesson });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.toggleLessonState = async (req, res) => {
  try {
    const { courseId, moduleId, lessonId } = req.params;
    const course = await verifyCourse(courseId, req.user);

    const mod = course.modules.id(moduleId);
    if (!mod) return res.status(404).json({ success: false, message: 'Module not found.' });

    const lesson = mod.lessons.id(lessonId);
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found.' });

    if (lesson.state === 'draft') {
      // Auto-Draft Rule A.2.4: Lesson requires >= 1 Video or Quiz
      if (!canPublishLesson(lesson)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot publish lesson: A lesson requires at least one item before it can be published.'
        });
      }
      lesson.state = 'published';
    } else {
      lesson.state = 'draft';
    }

    recomputeEffectiveVisibility(course);
    await course.save();

    res.json({
      success: true,
      message: `Lesson state updated to ${lesson.state}.`,
      state: lesson.state,
      effective_visible: lesson.effective_visible,
      lesson
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.reorderLesson = async (req, res) => {
  try {
    const { courseId, moduleId, lessonId } = req.params;
    const { prevKey, nextKey } = req.body;

    const course = await verifyCourse(courseId, req.user);
    const mod = course.modules.id(moduleId);
    if (!mod) return res.status(404).json({ success: false, message: 'Module not found.' });

    const lesson = mod.lessons.id(lessonId);
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found.' });

    lesson.sortKey = generateSortKey(prevKey, nextKey);
    if (lesson.sortKey.length > 25) {
      mod.lessons.sort((a, b) => (a.sortKey || 'a0').localeCompare(b.sortKey || 'a0'));
      rebalanceSiblingKeys(mod.lessons);
    }

    await course.save();
    res.json({ success: true, message: 'Lesson reordered.', sortKey: lesson.sortKey });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.deleteLesson = async (req, res) => {
  try {
    const { courseId, moduleId, lessonId } = req.params;
    const course = await verifyCourse(courseId, req.user);

    const mod = course.modules.id(moduleId);
    if (!mod) return res.status(404).json({ success: false, message: 'Module not found.' });

    const lesson = mod.lessons.id(lessonId);
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found.' });

    mod.lessons.pull(lessonId);
    if (!canPublishModule(mod)) {
      mod.state = 'draft';
    }

    recomputeEffectiveVisibility(course);
    await course.save();
    if (courseCache && courseCache.invalidateCourse) courseCache.invalidateCourse(courseId);

    res.json({ success: true, message: 'Lesson deleted successfully.' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

const sanitizeAndValidateQuizQuestions = (rawQuestions) => {
  if (!Array.isArray(rawQuestions)) return [];
  return rawQuestions.map((q, idx) => {
    let cleanType = (q.type || 'mcq').toLowerCase();
    if (cleanType === 'multiple_choice') cleanType = 'mcq';
    if (!['mcq', 'multiple_response', 'true_false'].includes(cleanType)) {
      cleanType = 'mcq';
    }

    let options = [];
    let optionImages = [];

    if (Array.isArray(q.options)) {
      q.options.forEach((opt, oIdx) => {
        if (typeof opt === 'object' && opt !== null) {
          options.push(String(opt.text || '').trim());
          optionImages.push(String(opt.image || opt.imageUrl || '').trim());
        } else {
          options.push(String(opt || '').trim());
          const img = Array.isArray(q.optionImages) ? String(q.optionImages[oIdx] || '').trim() : '';
          optionImages.push(img);
        }
      });
    }

    if (cleanType === 'true_false') {
      options = ['True', 'False'];
      optionImages = ['', ''];
    } else if (options.length < 2) {
      options = options.concat(['Option A', 'Option B']).slice(0, Math.max(2, options.length));
      while (optionImages.length < options.length) {
        optionImages.push('');
      }
    }

    let correctAnswerIndex = Number(q.correctAnswerIndex);
    if (isNaN(correctAnswerIndex) || correctAnswerIndex < 0 || correctAnswerIndex >= options.length) {
      correctAnswerIndex = 0;
    }

    let correctOptionIndexes = [];
    if (cleanType === 'multiple_response') {
      if (Array.isArray(q.correctOptionIndexes)) {
        correctOptionIndexes = q.correctOptionIndexes
          .map(Number)
          .filter(n => !isNaN(n) && n >= 0 && n < options.length);
      }
      if (correctOptionIndexes.length === 0) {
        correctOptionIndexes = [correctAnswerIndex];
      }
    }

    const marks = Math.max(1, Math.round(Number(q.marks) || 1));
    const explanation = (q.explanation || q.evaluationInstructions || '').trim();

    return {
      _id: q._id || new mongoose.Types.ObjectId(),
      questionText: (q.questionText || `Question ${idx + 1}`).trim(),
      type: cleanType,
      options,
      optionImages,
      correctAnswerIndex,
      correctOptionIndexes,
      correctAnswer: cleanType === 'multiple_response' ? correctOptionIndexes : (options[correctAnswerIndex] || ''),
      marks,
      explanation,
      evaluationInstructions: explanation,
      order: q.order || idx + 1
    };
  });
};

/**
 * CONTENT ITEM MUTATIONS (VIDEO & QUIZ)
 */
exports.createContentItem = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const {
      title,
      type, // 'video' | 'quiz'
      video = {},
      quiz = {},
      role = 'lesson_check'
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Content item title is required.' });
    }
    const cleanType = (type || '').toLowerCase();
    const allowedTypes = ['video', 'quiz', 'article', 'article_md', 'note', 'pdf', 'document', 'image', 'resource'];
    if (!allowedTypes.includes(cleanType)) {
      return res.status(400).json({ success: false, message: `Invalid content type. Allowed: ${allowedTypes.join(', ')}.` });
    }

    const course = await verifyCourse(courseId, req.user);
    let targetLesson = null;
    for (const mod of course.modules || []) {
      const les = mod.lessons.id(lessonId);
      if (les) {
        targetLesson = les;
        break;
      }
    }
    if (!targetLesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    const items = targetLesson.items || targetLesson.contentItems || [];
    const lastItem = items[items.length - 1];
    const sortKey = generateSortKey(lastItem ? lastItem.sortKey : null, null);

    const sanitizedQuestions = cleanType === 'quiz' ? sanitizeAndValidateQuizQuestions(quiz.questions) : [];
    const totalQuestions = sanitizedQuestions.length;
    const totalMarks = sanitizedQuestions.reduce((sum, q) => sum + q.marks, 0);
    const hasTimeLimit = Boolean(quiz.hasTimeLimit && Number(quiz.timeLimit) > 0);
    const timeLimitVal = hasTimeLimit ? Number(quiz.timeLimit) : null;

    const newItem = {
      _id: new mongoose.Types.ObjectId(),
      title: title.trim(),
      description: (req.body.description !== undefined ? req.body.description : (video.description || quiz.instructions || '')).trim(),
      type: cleanType,
      state: req.body.state === 'published' ? 'published' : 'draft',
      effective_visible: false,
      sortKey,
      version: 1, // Rule A.6.1: Only Content Items are versioned
      role: role === 'practice' ? 'practice' : 'lesson_check',
      markdownContent: req.body.markdownContent || req.body.content || req.body.bodyMarkdown || '',
      content: req.body.content || req.body.markdownContent || req.body.bodyMarkdown || '',
      bodyMarkdown: req.body.bodyMarkdown || req.body.markdownContent || req.body.content || '',
      fileUrl: req.body.fileUrl || req.body.mediaUrl || '',
      mediaUrl: req.body.mediaUrl || req.body.fileUrl || '',
      fileName: req.body.fileName || '',
      fileSize: Number(req.body.fileSize) || 0,
      video: {
        muxAssetId: video.muxAssetId || '',
        muxPlaybackId: video.muxPlaybackId || '',
        videoUrl: video.videoUrl || video.url || video.fileUrl || '',
        url: video.url || video.videoUrl || video.fileUrl || '',
        fileUrl: video.fileUrl || video.videoUrl || video.url || '',
        duration: Number(video.duration) || 0,
        watchedThresholdPercent: Number(video.watchedThresholdPercent) || 90,
        allowScrubAhead: video.allowScrubAhead !== false,
        status: (video.muxPlaybackId || video.videoUrl || video.url || video.fileUrl) ? 'ready' : (video.status || 'processing'),
        allowFreePreview: Boolean(video.allowFreePreview),
        addToLessonNotes: Boolean(video.addToLessonNotes),
        thumbnailUrl: video.thumbnailUrl || '',
        fileName: video.fileName || ''
      },
      videoDetails: {
        muxAssetId: video.muxAssetId || '',
        muxPlaybackId: video.muxPlaybackId || '',
        videoUrl: video.videoUrl || video.url || video.fileUrl || '',
        url: video.url || video.videoUrl || video.fileUrl || '',
        fileUrl: video.fileUrl || video.videoUrl || video.url || '',
        duration: video.duration ? `${video.duration} min` : '10 min',
        durationSeconds: Number(video.duration) || 0,
        watchedPctThreshold: Number(video.watchedThresholdPercent) || 90,
        allowScrubAhead: video.allowScrubAhead !== false,
        allowFreePreview: Boolean(video.allowFreePreview),
        addToLessonNotes: Boolean(video.addToLessonNotes),
        thumbnailUrl: video.thumbnailUrl || '',
        fileName: video.fileName || ''
      },
      quiz: {
        instructions: quiz.instructions || '',
        passThresholdPercent: Number(quiz.passThresholdPercent) || 70,
        maxAttempts: Number(quiz.maxAttempts) || 3,
        cooldownHours: Number(quiz.cooldownHours) || 6,
        timeLimit: timeLimitVal,
        durationMinutes: timeLimitVal,
        hasTimeLimit,
        totalQuestions,
        totalMarks,
        role: role === 'practice' ? 'practice' : 'lesson_check',
        questions: sanitizedQuestions
      },
      quizDetails: {
        instructions: quiz.instructions || '',
        passThreshold: Number(quiz.passThresholdPercent) || 70,
        maxAttempts: Number(quiz.maxAttempts) || 3,
        cooldownHours: Number(quiz.cooldownHours) || 6,
        timeLimit: timeLimitVal,
        durationMinutes: timeLimitVal,
        hasTimeLimit,
        totalQuestions,
        totalMarks,
        role: role === 'practice' ? 'practice' : 'lesson_check',
        questions: sanitizedQuestions
      }
    };

    targetLesson.items.push(newItem);
    if (targetLesson.contentItems) targetLesson.contentItems.push(newItem);

    recomputeEffectiveVisibility(course);
    await course.save();
    if (courseCache && courseCache.invalidateCourse) courseCache.invalidateCourse(courseId);

    const typeLabel = cleanType === 'video'
      ? 'Video'
      : cleanType === 'quiz'
        ? 'Quiz'
        : ['article', 'article_md', 'note'].includes(cleanType)
          ? 'Note'
          : 'Document';

    res.status(201).json({
      success: true,
      message: `${typeLabel} item created in draft state.`,
      item: newItem
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.updateContentItem = async (req, res) => {
  try {
    const { courseId, lessonId, itemId } = req.params;
    const { title, description, state, video, quiz, role } = req.body;

    const course = await verifyCourse(courseId, req.user);
    let targetLesson = null;
    let targetItem = null;

    for (const mod of course.modules || []) {
      const les = mod.lessons.id(lessonId);
      if (les) {
        targetLesson = les;
        targetItem = les.items.id(itemId);
        break;
      }
    }

    if (!targetLesson || !targetItem) {
      return res.status(404).json({ success: false, message: 'Content item not found.' });
    }

    if (title && title.trim()) targetItem.title = title.trim();
    if (description !== undefined) targetItem.description = description.trim();
    if (state !== undefined) {
      targetItem.state = state === 'published' ? 'published' : 'draft';
    }
    if (role !== undefined) targetItem.role = role === 'practice' ? 'practice' : 'lesson_check';

    let versionBumped = false;

    // Rule A.6.1 & A.6.2: Versioning logic
    if (targetItem.type === 'video' && video) {
      // If video media file was replaced, increment version
      if (video.muxAssetId && video.muxAssetId !== targetItem.video?.muxAssetId) {
        targetItem.version = (targetItem.version || 1) + 1;
        versionBumped = true;
      }
      targetItem.video = {
        muxAssetId: video.muxAssetId || targetItem.video?.muxAssetId || '',
        muxPlaybackId: video.muxPlaybackId || targetItem.video?.muxPlaybackId || '',
        videoUrl: video.videoUrl || video.url || video.fileUrl || targetItem.video?.videoUrl || targetItem.video?.url || '',
        url: video.url || video.videoUrl || video.fileUrl || targetItem.video?.url || targetItem.video?.videoUrl || '',
        fileUrl: video.fileUrl || video.videoUrl || video.url || targetItem.video?.fileUrl || '',
        duration: Number(video.duration) || targetItem.video?.duration || 0,
        watchedThresholdPercent: Number(video.watchedThresholdPercent) || targetItem.video?.watchedThresholdPercent || 90,
        allowScrubAhead: video.allowScrubAhead !== undefined ? video.allowScrubAhead : true,
        status: (video.muxPlaybackId || video.videoUrl || video.url || targetItem.video?.muxPlaybackId || targetItem.video?.videoUrl) ? 'ready' : (targetItem.video?.status || 'ready'),
        allowFreePreview: video.allowFreePreview !== undefined ? Boolean(video.allowFreePreview) : Boolean(targetItem.video?.allowFreePreview),
        addToLessonNotes: video.addToLessonNotes !== undefined ? Boolean(video.addToLessonNotes) : Boolean(targetItem.video?.addToLessonNotes),
        thumbnailUrl: video.thumbnailUrl !== undefined ? video.thumbnailUrl : (targetItem.video?.thumbnailUrl || ''),
        fileName: video.fileName !== undefined ? video.fileName : (targetItem.video?.fileName || '')
      };
      targetItem.videoDetails = {
        ...targetItem.video,
        watchedPctThreshold: targetItem.video.watchedThresholdPercent
      };
    } else if (targetItem.type === 'quiz' && quiz) {
      const sanitizedQuestions = sanitizeAndValidateQuizQuestions(quiz.questions || targetItem.quiz?.questions || []);
      const totalQuestions = sanitizedQuestions.length;
      const totalMarks = sanitizedQuestions.reduce((sum, q) => sum + q.marks, 0);

      const hasTimeLimit = quiz.hasTimeLimit !== undefined
        ? Boolean(quiz.hasTimeLimit && Number(quiz.timeLimit) > 0)
        : Boolean(targetItem.quiz?.hasTimeLimit);
      const timeLimitVal = hasTimeLimit
        ? (Number(quiz.timeLimit) || targetItem.quiz?.timeLimit || 20)
        : null;

      // If quiz questions were modified, increment version
      const oldQuestionsStr = JSON.stringify(targetItem.quiz?.questions || []);
      const newQuestionsStr = JSON.stringify(sanitizedQuestions);
      if (oldQuestionsStr !== newQuestionsStr) {
        targetItem.version = (targetItem.version || 1) + 1;
        versionBumped = true;
      }
      // Config changes DO NOT increment version
      targetItem.quiz = {
        instructions: quiz.instructions !== undefined ? quiz.instructions : (targetItem.quiz?.instructions || ''),
        passThresholdPercent: targetItem.quiz?.passThresholdPercent || 70,
        maxAttempts: targetItem.quiz?.maxAttempts || 3,
        cooldownHours: targetItem.quiz?.cooldownHours || 6,
        timeLimit: timeLimitVal,
        durationMinutes: timeLimitVal,
        hasTimeLimit,
        totalQuestions,
        totalMarks,
        role: targetItem.role,
        questions: sanitizedQuestions
      };
      targetItem.quizDetails = {
        ...targetItem.quiz,
        passThreshold: targetItem.quiz.passThresholdPercent
      };
    } else if (['article', 'article_md', 'note'].includes(targetItem.type)) {
      const newMarkdown = req.body.markdownContent !== undefined
        ? req.body.markdownContent
        : (req.body.content !== undefined ? req.body.content : req.body.bodyMarkdown);
      if (newMarkdown !== undefined) {
        if ((targetItem.markdownContent || '') !== newMarkdown) {
          targetItem.version = (targetItem.version || 1) + 1;
          versionBumped = true;
        }
        targetItem.markdownContent = newMarkdown;
        targetItem.content = newMarkdown;
        targetItem.bodyMarkdown = newMarkdown;
      }
      if (req.body.fileUrl !== undefined) targetItem.fileUrl = req.body.fileUrl;
      if (req.body.mediaUrl !== undefined) targetItem.mediaUrl = req.body.mediaUrl;
      if (req.body.fileName !== undefined) targetItem.fileName = req.body.fileName;
      if (req.body.fileSize !== undefined) targetItem.fileSize = Number(req.body.fileSize) || 0;
    } else if (['pdf', 'document', 'image', 'resource'].includes(targetItem.type)) {
      const newFileUrl = req.body.fileUrl !== undefined ? req.body.fileUrl : req.body.mediaUrl;
      if (newFileUrl !== undefined) {
        if ((targetItem.fileUrl || '') !== newFileUrl) {
          targetItem.version = (targetItem.version || 1) + 1;
          versionBumped = true;
        }
        targetItem.fileUrl = newFileUrl;
        targetItem.mediaUrl = newFileUrl;
      }
      if (req.body.fileName !== undefined) targetItem.fileName = req.body.fileName;
      if (req.body.fileSize !== undefined) targetItem.fileSize = Number(req.body.fileSize) || 0;
    }

    recomputeEffectiveVisibility(course);
    await course.save();
    if (courseCache && courseCache.invalidateCourse) courseCache.invalidateCourse(courseId);

    res.json({
      success: true,
      message: `Content item updated.${versionBumped ? ' Version incremented.' : ''}`,
      item: targetItem,
      versionBumped
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.toggleContentItemState = async (req, res) => {
  try {
    const { courseId, lessonId, itemId } = req.params;
    const course = await verifyCourse(courseId, req.user);

    let targetItem = null;
    for (const mod of course.modules || []) {
      const les = mod.lessons.id(lessonId);
      if (les) {
        targetItem = les.items.id(itemId);
        break;
      }
    }

    if (!targetItem) {
      return res.status(404).json({ success: false, message: 'Content item not found.' });
    }

    if (targetItem.state === 'draft') {
      // Auto-Draft Rule A.2.4 Check
      if (!canPublishItem(targetItem)) {
        if (targetItem.type === 'quiz') {
          return res.status(400).json({
            success: false,
            message: 'Cannot publish quiz: A quiz requires at least one question before it can be published.'
          });
        }
        if (targetItem.type === 'video') {
          return res.status(400).json({
            success: false,
            message: 'Cannot publish video: Please upload a valid video before publishing.'
          });
        }
        if (['article', 'article_md', 'note'].includes(targetItem.type)) {
          return res.status(400).json({
            success: false,
            message: 'Cannot publish note: Please provide markdown content before publishing.'
          });
        }
        if (['pdf', 'document', 'image', 'resource'].includes(targetItem.type)) {
          return res.status(400).json({
            success: false,
            message: 'Cannot publish document: Please upload a document file before publishing.'
          });
        }
      }
      targetItem.state = 'published';
    } else {
      targetItem.state = 'draft';
    }

    recomputeEffectiveVisibility(course);
    await course.save();
    if (courseCache && courseCache.invalidateCourse) courseCache.invalidateCourse(courseId);

    res.json({
      success: true,
      message: `Item state updated to ${targetItem.state}.`,
      state: targetItem.state,
      effective_visible: targetItem.effective_visible,
      item: targetItem
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.reorderContentItem = async (req, res) => {
  try {
    const { courseId, lessonId, itemId } = req.params;
    const { prevKey, nextKey } = req.body;

    const course = await verifyCourse(courseId, req.user);
    let targetLesson = null;
    let targetItem = null;

    for (const mod of course.modules || []) {
      const les = mod.lessons.id(lessonId);
      if (les) {
        targetLesson = les;
        targetItem = les.items.id(itemId);
        break;
      }
    }

    if (!targetLesson || !targetItem) {
      return res.status(404).json({ success: false, message: 'Content item not found.' });
    }

    targetItem.sortKey = generateSortKey(prevKey, nextKey);
    if (targetItem.sortKey.length > 25) {
      targetLesson.items.sort((a, b) => (a.sortKey || 'a0').localeCompare(b.sortKey || 'a0'));
      rebalanceSiblingKeys(targetLesson.items);
    }

    await course.save();
    res.json({ success: true, message: 'Content item reordered.', sortKey: targetItem.sortKey });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.deleteContentItem = async (req, res) => {
  try {
    const { courseId, lessonId, itemId } = req.params;
    const course = await verifyCourse(courseId, req.user);

    let targetLesson = null;
    let targetItem = null;

    for (const mod of course.modules || []) {
      const les = mod.lessons.id(lessonId);
      if (les) {
        targetLesson = les;
        targetItem = les.items.id(itemId);
        break;
      }
    }

    if (!targetLesson || !targetItem) {
      return res.status(404).json({ success: false, message: 'Content item not found.' });
    }

    targetLesson.items.pull(itemId);
    if (targetLesson.contentItems) {
      targetLesson.contentItems.pull(itemId);
    }

    if (!canPublishLesson(targetLesson)) {
      targetLesson.state = 'draft';
    }

    recomputeEffectiveVisibility(course);
    await course.save();
    if (courseCache && courseCache.invalidateCourse) courseCache.invalidateCourse(courseId);

    res.json({ success: true, message: 'Content item deleted successfully.' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/**
 * NOTES MUTATIONS (NON-GATING, SUPPLEMENTARY - RULE A.1.1)
 */
exports.attachNote = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      title,
      scope = 'course', // 'course' | 'module' | 'lesson'
      attachableType,
      attachableId,
      moduleId = null,
      lessonId = null,
      type = 'article_md', // 'article_md' | 'pdf' | 'image'
      markdownContent = '',
      bodyMarkdown = '',
      content = '',
      fileUrl = '',
      mediaUrl = '',
      cloudinaryUrl = '',
      cloudinaryPublicId = '',
      fileSize = '',
      state = 'draft'
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Note title is required.' });
    }

    const course = await verifyCourse(courseId, req.user);
    const notes = course.notes || [];
    const lastNote = notes[notes.length - 1];
    const sortKey = generateSortKey(lastNote ? lastNote.sortKey : null, null);

    const finalScope = scope || attachableType || 'course';
    const finalMd = markdownContent || bodyMarkdown || content || '';
    const finalFileUrl = fileUrl || mediaUrl || cloudinaryUrl || '';
    const cleanType = type === 'article' ? 'article_md' : type;

    const newNote = {
      _id: new mongoose.Types.ObjectId(),
      title: title.trim(),
      scope: finalScope,
      attachableType: finalScope,
      attachableId: attachableId || null,
      moduleId: moduleId && mongoose.Types.ObjectId.isValid(moduleId) ? moduleId : null,
      lessonId: lessonId && mongoose.Types.ObjectId.isValid(lessonId) ? lessonId : null,
      type: cleanType,
      noteType: cleanType,
      markdownContent: finalMd,
      content: finalMd,
      bodyMarkdown: finalMd,
      fileUrl: finalFileUrl,
      mediaUrl: finalFileUrl,
      cloudinaryUrl: finalFileUrl,
      cloudinaryPublicId: cloudinaryPublicId || '',
      fileType: cleanType === 'pdf' ? 'pdf' : (cleanType === 'image' ? 'image' : 'md'),
      fileSize: fileSize || '',
      state: state === 'published' ? 'published' : 'draft',
      effective_visible: false,
      sortKey,
      uploadedAt: new Date()
    };

    course.notes.push(newNote);
    recomputeEffectiveVisibility(course);
    await course.save();
    if (courseCache && courseCache.invalidateCourse) courseCache.invalidateCourse(courseId);

    res.status(201).json({
      success: true,
      message: 'Note created successfully.',
      note: newNote
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { courseId, noteId } = req.params;
    const {
      title,
      markdownContent,
      bodyMarkdown,
      content,
      fileUrl,
      mediaUrl,
      cloudinaryUrl,
      cloudinaryPublicId,
      scope,
      attachableType,
      attachableId,
      moduleId,
      lessonId,
      type,
      state
    } = req.body;

    const course = await verifyCourse(courseId, req.user);
    const note = course.notes.id(noteId);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });

    if (title && title.trim()) note.title = title.trim();
    const md = markdownContent !== undefined ? markdownContent : (bodyMarkdown !== undefined ? bodyMarkdown : content);
    if (md !== undefined) {
      note.markdownContent = md;
      note.content = md;
      note.bodyMarkdown = md;
    }
    const fUrl = fileUrl !== undefined ? fileUrl : (mediaUrl !== undefined ? mediaUrl : cloudinaryUrl);
    if (fUrl !== undefined) {
      note.fileUrl = fUrl;
      note.mediaUrl = fUrl;
      note.cloudinaryUrl = fUrl;
    }
    if (cloudinaryPublicId !== undefined) note.cloudinaryPublicId = cloudinaryPublicId;
    if (scope || attachableType) {
      const finalScope = scope || attachableType;
      note.scope = finalScope;
      note.attachableType = finalScope;
    }
    if (moduleId !== undefined) note.moduleId = moduleId && mongoose.Types.ObjectId.isValid(moduleId) ? moduleId : null;
    if (lessonId !== undefined) note.lessonId = lessonId && mongoose.Types.ObjectId.isValid(lessonId) ? lessonId : null;
    if (attachableId !== undefined) note.attachableId = attachableId;
    if (req.body.fileName !== undefined) note.fileName = req.body.fileName;
    if (type !== undefined) {
      note.type = type === 'article' ? 'article_md' : type;
      note.noteType = note.type;
      note.fileType = note.type === 'pdf' ? 'pdf' : (note.type === 'image' ? 'image' : 'md');
    }
    if (state !== undefined) {
      note.state = state === 'published' ? 'published' : 'draft';
    }

    recomputeEffectiveVisibility(course);
    await course.save();
    if (courseCache && courseCache.invalidateCourse) courseCache.invalidateCourse(courseId);

    res.json({ success: true, message: 'Note updated.', note });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.toggleNoteState = async (req, res) => {
  try {
    const { courseId, noteId } = req.params;
    const course = await verifyCourse(courseId, req.user);

    const note = course.notes.id(noteId);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });

    note.state = note.state === 'published' ? 'draft' : 'published';
    recomputeEffectiveVisibility(course);
    await course.save();
    if (courseCache && courseCache.invalidateCourse) courseCache.invalidateCourse(courseId);

    res.json({
      success: true,
      message: `Note state updated to ${note.state}.`,
      state: note.state,
      note
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const { courseId, noteId } = req.params;
    const course = await verifyCourse(courseId, req.user);

    const note = course.notes.id(noteId);
    if (!note) return res.status(404).json({ success: false, message: 'Resource note not found.' });

    // Clean up Cloudinary asset if stored in cloud
    if (note.cloudinaryPublicId || (note.fileUrl && note.fileUrl.includes('cloudinary.com'))) {
      const targetId = note.cloudinaryPublicId || note.fileUrl;
      const resType = (note.fileType === 'pdf' || (note.fileName && note.fileName.endsWith('.pdf'))) ? 'raw' : 'image';
      deleteCloudinaryAsset(targetId, resType).catch(e => console.warn('Could not clean up Cloudinary note:', e.message));
    }

    // Clean up local disk resource if stored locally
    if (note.fileUrl && note.fileUrl.includes('/uploads/resources/')) {
      try {
        const filename = path.basename(note.fileUrl);
        const filePath = path.join(__dirname, '..', 'uploads', 'resources', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fErr) {
        console.warn('Could not remove local resource file:', fErr.message);
      }
    }

    note.deleteOne();
    recomputeEffectiveVisibility(course);
    await course.save();
    if (courseCache && courseCache.invalidateCourse) courseCache.invalidateCourse(courseId);

    res.json({
      success: true,
      message: 'Resource note deleted successfully.'
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/**
 * ASSESSMENT MUTATIONS (COURSE-LEVEL, MODULE PREREQUISITES - RULE A.1.1 & A.4)
 */
exports.createAssessment = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      title,
      description = '',
      instructions = '',
      assessmentType = 'graded',
      timeLimit = 30,
      durationMinutes = 30,
      requiredModuleIds = [],
      passThresholdPercent = 70,
      maxAttempts = 3,
      cooldownHours = 6,
      countsTowardCertificate = true,
      questions = [],
      shuffleQuestions = false,
      shuffleOptions = false,
      resultVisibility = 'immediate'
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Assessment title is required.' });
    }

    const course = await verifyCourse(courseId, req.user);

    const assessments = course.courseAssessments || [];
    const lastAssessment = assessments[assessments.length - 1];
    const sortKey = generateSortKey(lastAssessment ? lastAssessment.sortKey : null, null);

    const newAssessment = {
      _id: new mongoose.Types.ObjectId(),
      title: title.trim(),
      description: description ? description.trim() : '',
      instructions: instructions ? instructions.trim() : '',
      assessmentType: assessmentType || 'graded',
      timeLimit: Number(timeLimit) || Number(durationMinutes) || 45,
      durationMinutes: Number(durationMinutes) || Number(timeLimit) || 45,
      state: 'draft',
      effective_visible: false,
      sortKey,
      version: 1,
      requiredModuleIds: Array.isArray(requiredModuleIds) ? requiredModuleIds : [],
      requiresModules: Array.isArray(requiredModuleIds) ? requiredModuleIds : [],
      passThresholdPercent: Number(passThresholdPercent) || 70,
      passThreshold: Number(passThresholdPercent) || 70,
      maxAttempts: Number(maxAttempts) || 3,
      cooldownHours: Number(cooldownHours) || 6,
      countsTowardCertificate: countsTowardCertificate !== false,
      shuffleQuestions: Boolean(shuffleQuestions),
      shuffleOptions: Boolean(shuffleOptions),
      resultVisibility: resultVisibility === 'after_review' ? 'after_review' : 'immediate',
      questions: Array.isArray(questions) ? questions : [],
      totalMarks: Array.isArray(questions) ? questions.reduce((sum, q) => sum + (Number(q.marks) || Number(q.points) || 1), 0) : 10
    };

    course.courseAssessments.push(newAssessment);
    recomputeEffectiveVisibility(course);
    await course.save();

    res.status(201).json({
      success: true,
      message: 'Assessment created successfully in draft state.',
      assessment: newAssessment
    });
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
      instructions,
      assessmentType,
      timeLimit,
      durationMinutes,
      requiredModuleIds,
      passThresholdPercent,
      maxAttempts,
      cooldownHours,
      countsTowardCertificate,
      shuffleQuestions,
      shuffleOptions,
      resultVisibility,
      questions
    } = req.body;

    const course = await verifyCourse(courseId, req.user);
    const assessment = course.courseAssessments.id(assessmentId);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    if (title && title.trim()) assessment.title = title.trim();
    if (description !== undefined) assessment.description = description.trim();
    if (instructions !== undefined) assessment.instructions = instructions.trim();
    if (assessmentType !== undefined) assessment.assessmentType = assessmentType;
    if (timeLimit !== undefined) assessment.timeLimit = Number(timeLimit);
    if (durationMinutes !== undefined) assessment.durationMinutes = Number(durationMinutes);
    if (requiredModuleIds !== undefined) {
      assessment.requiredModuleIds = Array.isArray(requiredModuleIds) ? requiredModuleIds : [];
      assessment.requiresModules = assessment.requiredModuleIds;
    }
    if (countsTowardCertificate !== undefined) {
      assessment.countsTowardCertificate = Boolean(countsTowardCertificate);
    }
    if (shuffleQuestions !== undefined) {
      assessment.shuffleQuestions = Boolean(shuffleQuestions);
    }
    if (shuffleOptions !== undefined) {
      assessment.shuffleOptions = Boolean(shuffleOptions);
    }
    if (resultVisibility !== undefined) {
      assessment.resultVisibility = resultVisibility === 'after_review' ? 'after_review' : 'immediate';
    }

    // Versioning: question edits increment version; config tweaks do NOT (Rule A.6.2)
    let versionBumped = false;
    if (questions) {
      const oldQuestionsStr = JSON.stringify(assessment.questions || []);
      const newQuestionsStr = JSON.stringify(questions);
      if (oldQuestionsStr !== newQuestionsStr) {
        assessment.version = (assessment.version || 1) + 1;
        versionBumped = true;
      }
      assessment.questions = questions;
      assessment.totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || Number(q.points) || 1), 0);
    }

    if (passThresholdPercent !== undefined) {
      assessment.passThresholdPercent = Number(passThresholdPercent);
      assessment.passThreshold = Number(passThresholdPercent);
    }
    if (maxAttempts !== undefined) assessment.maxAttempts = Number(maxAttempts);
    if (cooldownHours !== undefined) assessment.cooldownHours = Number(cooldownHours);

    recomputeEffectiveVisibility(course);
    await course.save();

    res.json({
      success: true,
      message: `Assessment updated.${versionBumped ? ' Version incremented.' : ''}`,
      assessment,
      versionBumped
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/courses/:courseId/curriculum/assessments/:assessmentId/view
 * Backend Enforced Learner Gating for Milestone Assessments
 */
exports.getAssessmentForLearner = async (req, res) => {
  try {
    const { courseId, assessmentId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const assessment = (course.courseAssessments || []).find(a => String(a._id) === String(assessmentId));
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const isInstructorOwner = req.user && (
      String(course.instructorId) === String(req.user.id) ||
      (course.instructor && String(course.instructor) === String(req.user.id)) ||
      req.user.role === 'admin'
    );

    // If not instructor, check publication and gating
    if (!isInstructorOwner) {
      if (assessment.state !== 'published') {
        return res.status(403).json({
          success: false,
          code: 'ASSESSMENT_DRAFT',
          message: 'This assessment is currently in draft mode and not available.'
        });
      }

      // Check course enrolment
      const Enrolment = require('../model/Enrolment');
      const enrolment = await Enrolment.findOne({ courseId, learnerId: req.user.id });
      if (!enrolment) {
        return res.status(403).json({
          success: false,
          code: 'NOT_ENROLLED',
          message: 'You must be enrolled in this course to access assessments.'
        });
      }

      // Check module prerequisites
      const requiredIds = Array.isArray(assessment.requiredModuleIds)
        ? assessment.requiredModuleIds.map(String)
        : [];

      if (requiredIds.length > 0) {
        const completedLessons = new Set((enrolment.completedLessons || []).map(String));
        const incompleteModules = [];

        for (const reqModId of requiredIds) {
          const mod = (course.modules || []).find(m => String(m._id) === reqModId);
          if (!mod || mod.state !== 'published') continue;

          // Gather all published items in this module
          const pubItems = [];
          for (const les of mod.lessons || []) {
            if (les.state !== 'published') continue;
            for (const item of (les.items || les.contentItems || [])) {
              if (item.state === 'published') {
                pubItems.push(String(item._id));
              }
            }
          }

          // If module has published items, verify all are completed
          if (pubItems.length > 0) {
            const allItemsDone = pubItems.every(id => completedLessons.has(id));
            if (!allItemsDone) {
              incompleteModules.push({
                _id: mod._id,
                title: mod.title
              });
            }
          }
        }

        if (incompleteModules.length > 0) {
          return res.status(403).json({
            success: false,
            code: 'PREREQUISITES_INCOMPLETE',
            message: 'You must complete all prerequisite modules before unlocking this assessment.',
            incompleteModules
          });
        }
      }
    }

    // Assessment is unlocked. Return sanitized questions (exclude answers for active attempt)
    const sanitizedQuestions = (assessment.questions || []).map((q, qIdx) => {
      let options = Array.isArray(q.options) ? [...q.options] : [];
      let optionImages = Array.isArray(q.optionImages) ? [...q.optionImages] : [];

      if (assessment.shuffleOptions && !isInstructorOwner) {
        // Deterministic shuffle or preserve
      }

      return {
        _id: q._id || `q_${qIdx + 1}`,
        questionText: q.questionText,
        type: q.type || 'mcq',
        options,
        optionImages,
        marks: q.marks || 1,
        // Exclude correctAnswerIndex and correctOptionIndexes for learners
        ...(isInstructorOwner ? {
          correctAnswerIndex: q.correctAnswerIndex,
          correctOptionIndexes: q.correctOptionIndexes,
          explanation: q.explanation
        } : {})
      };
    });

    const sanitizedAssessment = {
      _id: assessment._id,
      title: assessment.title,
      description: assessment.description,
      instructions: assessment.instructions,
      assessmentType: assessment.assessmentType,
      timeLimit: assessment.timeLimit || assessment.durationMinutes || 45,
      durationMinutes: assessment.durationMinutes || assessment.timeLimit || 45,
      totalMarks: assessment.totalMarks || sanitizedQuestions.reduce((s, q) => s + (q.marks || 1), 0),
      questionCount: sanitizedQuestions.length,
      requiredModuleIds: assessment.requiredModuleIds || [],
      shuffleQuestions: assessment.shuffleQuestions,
      shuffleOptions: assessment.shuffleOptions,
      resultVisibility: assessment.resultVisibility,
      questions: sanitizedQuestions
    };

    return res.json({
      success: true,
      assessment: sanitizedAssessment,
      isInstructor: isInstructorOwner
    });
  } catch (err) {
    console.error('getAssessmentForLearner error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error loading assessment.' });
  }
};

exports.toggleAssessmentState = async (req, res) => {
  try {
    const { courseId, assessmentId } = req.params;
    const course = await verifyCourse(courseId, req.user);

    const assessment = course.courseAssessments.id(assessmentId);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    if (assessment.state === 'draft') {
      // Must have >= 1 question to publish
      if (!assessment.questions || assessment.questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot publish assessment: An assessment must have at least one question.'
        });
      }
      assessment.state = 'published';
    } else {
      assessment.state = 'draft';
    }

    recomputeEffectiveVisibility(course);
    await course.save();

    res.json({
      success: true,
      message: `Assessment state updated to ${assessment.state}.`,
      state: assessment.state,
      effective_visible: assessment.effective_visible,
      assessment
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.deleteAssessment = async (req, res) => {
  try {
    const { courseId, assessmentId } = req.params;
    const course = await verifyCourse(courseId, req.user);

    const assessment = course.courseAssessments.id(assessmentId);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    course.courseAssessments.pull(assessmentId);
    recomputeEffectiveVisibility(course);
    await course.save();

    res.json({
      success: true,
      message: 'Assessment deleted successfully.'
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/**
 * Direct Upload Handlers for Curriculum
 */
const { uploadBufferToCloudinary, getUploadCredentials, deleteCloudinaryAsset, deleteMuxAsset } = require('./mediaController');

exports.uploadVideoFromDevice = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    if (courseId) {
      await verifyCourse(courseId, req.user);
    }

    // If client is requesting Mux credentials
    if (!req.file) {
      return getUploadCredentials(req, res);
    }

    // If client uploaded a memory buffer
    let uploadRes = null;
    try {
      uploadRes = await uploadBufferToCloudinary(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        'upskillr_course_videos'
      );
    } catch (cloudErr) {
      console.warn('Cloudinary video upload warning (falling back to persistent local storage):', cloudErr.message);
    }

    let finalUrl = uploadRes?.secure_url;
    let publicId = uploadRes?.public_id;

    if (!finalUrl || finalUrl.startsWith('data:') || !publicId) {
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'videos');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const ext = path.extname(req.file.originalname) || '.mp4';
      const safeBase = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `vid_${Date.now()}_${safeBase.endsWith(ext) ? safeBase : safeBase + ext}`;
      const filePath = path.join(uploadsDir, filename);
      await fs.promises.writeFile(filePath, req.file.buffer);

      const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5000';
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      finalUrl = `${protocol}://${host}/uploads/videos/${filename}`;
      publicId = `local_vid_${Date.now()}`;
    }

    res.json({
      success: true,
      url: finalUrl,
      playbackId: publicId,
      assetId: publicId,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (err) {
    console.error('uploadVideoFromDevice error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to upload video.' });
  }
};

exports.uploadResourceFromDevice = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    if (courseId) {
      await verifyCourse(courseId, req.user);
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a file to upload.' });
    }

    const ext = path.extname(req.file.originalname) || (req.file.mimetype.includes('pdf') ? '.pdf' : '');
    const isDoc = req.file.mimetype.includes('pdf') || ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt'].includes(ext.toLowerCase());

    let finalUrl = '';
    let publicId = '';
    let format = ext.replace('.', '') || req.file.mimetype.split('/')[1] || '';

    // For document files (PDFs, PPT, DOC, XLS), store directly in dedicated static uploads.
    // This avoids Cloudinary timeout delays (which cause progress to hang at 45%) and
    // prevents Cloudinary 401 Unauthorized delivery restrictions on PDFs.
    if (isDoc) {
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'resources');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const safeBase = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `res_${Date.now()}_${safeBase.endsWith(ext) ? safeBase : safeBase + ext}`;
      const filePath = path.join(uploadsDir, filename);
      await fs.promises.writeFile(filePath, req.file.buffer);

      const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5000';
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      finalUrl = `${protocol}://${host}/uploads/resources/${filename}`;
      publicId = `local_res_${Date.now()}`;
    } else {
      // For images, attempt Cloudinary first with fallback to local storage
      let uploadRes = null;
      try {
        uploadRes = await uploadBufferToCloudinary(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname,
          'upskillr_course_materials'
        );
      } catch (cloudErr) {
        console.warn('Cloudinary resource upload warning:', cloudErr.message);
      }

      finalUrl = uploadRes?.secure_url;
      publicId = uploadRes?.public_id;
      if (uploadRes?.format) format = uploadRes.format;

      if (!finalUrl || finalUrl.startsWith('data:') || !publicId) {
        const uploadsDir = path.join(__dirname, '..', 'uploads', 'resources');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const safeBase = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `res_${Date.now()}_${safeBase.endsWith(ext) ? safeBase : safeBase + ext}`;
        const filePath = path.join(uploadsDir, filename);
        await fs.promises.writeFile(filePath, req.file.buffer);

        const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5000';
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        finalUrl = `${protocol}://${host}/uploads/resources/${filename}`;
        publicId = `local_res_${Date.now()}`;
      }
    }

    const fileSizeMb = (req.file.size / (1024 * 1024)).toFixed(1) + ' MB';

    res.json({
      success: true,
      url: finalUrl,
      fileUrl: finalUrl,
      secure_url: finalUrl,
      publicId: publicId,
      fileName: req.file.originalname,
      fileSize: fileSizeMb,
      format: format
    });
  } catch (err) {
    console.error('uploadResourceFromDevice error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to upload resource.' });
  }
};

