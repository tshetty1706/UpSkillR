const fs = require('fs');
const path = require('path');
const Course = require('../model/Course');
const mongoose = require('mongoose');

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
  return Array.isArray(items) && items.some(i => i.type?.toLowerCase() === 'video' || i.type?.toLowerCase() === 'quiz');
};

const canPublishItem = (item) => {
  const itemType = (item.type || '').toLowerCase();
  if (itemType === 'quiz') {
    const questions = item.quiz?.questions || [];
    return Array.isArray(questions) && questions.length > 0;
  }
  if (itemType === 'video') {
    return Boolean(item.video?.muxPlaybackId || item.video?.muxAssetId);
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
    const modPublished = mod.state === 'published';
    mod.effective_visible = coursePublished && modPublished && modQualifies;

    for (const lesson of mod.lessons || []) {
      const lessonQualifies = canPublishLesson(lesson);
      const lessonPublished = lesson.state === 'published';
      lesson.effective_visible = mod.effective_visible && lessonPublished && lessonQualifies;

      const items = lesson.items || lesson.contentItems || [];
      for (const item of items) {
        const itemQualifies = canPublishItem(item);
        const itemPublished = item.state === 'published';
        item.effective_visible = lesson.effective_visible && itemPublished && itemQualifies;
      }
    }
  }

  for (const note of course.notes || []) {
    note.effective_visible = coursePublished && note.state === 'published';
  }

  for (const ca of course.courseAssessments || []) {
    const caQualifies = canPublishAssessment(ca);
    ca.effective_visible = coursePublished && ca.state === 'published' && caQualifies;
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

    // Rule A.2.4: 0 lessons -> cannot be published immediately upon creation
    const finalState = state === 'published' && canPublishModule({ lessons: [] }) ? 'published' : 'draft';

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
            message: 'Cannot publish lesson: A lesson requires at least one Video or Quiz item before it can be published.'
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
          message: 'Cannot publish lesson: A lesson requires at least one Video or Quiz item before it can be published.'
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
    if (!['video', 'quiz'].includes(cleanType)) {
      return res.status(400).json({ success: false, message: 'Invalid content type. Allowed: video, quiz.' });
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

    const newItem = {
      _id: new mongoose.Types.ObjectId(),
      title: title.trim(),
      type: cleanType,
      state: 'draft',
      effective_visible: false,
      sortKey,
      version: 1, // Rule A.6.1: Only Content Items are versioned
      role: role === 'practice' ? 'practice' : 'lesson_check',
      video: {
        muxAssetId: video.muxAssetId || '',
        muxPlaybackId: video.muxPlaybackId || '',
        duration: Number(video.duration) || 0,
        watchedThresholdPercent: Number(video.watchedThresholdPercent) || 90,
        allowScrubAhead: video.allowScrubAhead !== false,
        status: video.muxPlaybackId ? 'ready' : 'processing'
      },
      videoDetails: {
        muxAssetId: video.muxAssetId || '',
        muxPlaybackId: video.muxPlaybackId || '',
        duration: video.duration ? `${video.duration} min` : '10 min',
        durationSeconds: Number(video.duration) || 0,
        watchedPctThreshold: Number(video.watchedThresholdPercent) || 90,
        allowScrubAhead: video.allowScrubAhead !== false
      },
      quiz: {
        instructions: quiz.instructions || '',
        passThresholdPercent: Number(quiz.passThresholdPercent) || 70,
        maxAttempts: Number(quiz.maxAttempts) || 3,
        cooldownHours: Number(quiz.cooldownHours) || 6,
        role: role === 'practice' ? 'practice' : 'lesson_check',
        questions: Array.isArray(quiz.questions) ? quiz.questions : []
      },
      quizDetails: {
        instructions: quiz.instructions || '',
        passThreshold: Number(quiz.passThresholdPercent) || 70,
        maxAttempts: Number(quiz.maxAttempts) || 3,
        cooldownHours: Number(quiz.cooldownHours) || 6,
        role: role === 'practice' ? 'practice' : 'lesson_check',
        questions: Array.isArray(quiz.questions) ? quiz.questions : []
      }
    };

    targetLesson.items.push(newItem);
    if (targetLesson.contentItems) targetLesson.contentItems.push(newItem);

    recomputeEffectiveVisibility(course);
    await course.save();

    res.status(201).json({
      success: true,
      message: `${cleanType === 'video' ? 'Video' : 'Quiz'} item created in draft state.`,
      item: newItem
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.updateContentItem = async (req, res) => {
  try {
    const { courseId, lessonId, itemId } = req.params;
    const { title, video, quiz, role } = req.body;

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
        duration: Number(video.duration) || targetItem.video?.duration || 0,
        watchedThresholdPercent: Number(video.watchedThresholdPercent) || targetItem.video?.watchedThresholdPercent || 90,
        allowScrubAhead: video.allowScrubAhead !== undefined ? video.allowScrubAhead : true,
        status: video.muxPlaybackId ? 'ready' : (targetItem.video?.status || 'ready')
      };
      targetItem.videoDetails = {
        ...targetItem.video,
        watchedPctThreshold: targetItem.video.watchedThresholdPercent
      };
    } else if (targetItem.type === 'quiz' && quiz) {
      // If quiz questions were modified, increment version
      const oldQuestionsStr = JSON.stringify(targetItem.quiz?.questions || []);
      const newQuestionsStr = JSON.stringify(quiz.questions || []);
      if (quiz.questions && oldQuestionsStr !== newQuestionsStr) {
        targetItem.version = (targetItem.version || 1) + 1;
        versionBumped = true;
      }
      // Config changes (threshold, attempts, cooldown) DO NOT increment version
      targetItem.quiz = {
        instructions: quiz.instructions !== undefined ? quiz.instructions : (targetItem.quiz?.instructions || ''),
        passThresholdPercent: Number(quiz.passThresholdPercent) || targetItem.quiz?.passThresholdPercent || 70,
        maxAttempts: Number(quiz.maxAttempts) || targetItem.quiz?.maxAttempts || 3,
        cooldownHours: Number(quiz.cooldownHours) || targetItem.quiz?.cooldownHours || 6,
        role: targetItem.role,
        questions: Array.isArray(quiz.questions) ? quiz.questions : (targetItem.quiz?.questions || [])
      };
      targetItem.quizDetails = {
        ...targetItem.quiz,
        passThreshold: targetItem.quiz.passThresholdPercent
      };
    }

    recomputeEffectiveVisibility(course);
    await course.save();

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
      }
      targetItem.state = 'published';
    } else {
      targetItem.state = 'draft';
    }

    recomputeEffectiveVisibility(course);
    await course.save();

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
    if (type !== undefined) {
      note.type = type === 'article' ? 'article_md' : type;
      note.noteType = note.type;
    }
    if (state !== undefined) {
      note.state = state === 'published' ? 'published' : 'draft';
    }

    recomputeEffectiveVisibility(course);
    await course.save();

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

    note.deleteOne();
    recomputeEffectiveVisibility(course);
    await course.save();

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
      questions = []
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
      timeLimit: Number(timeLimit) || Number(durationMinutes) || 30,
      durationMinutes: Number(durationMinutes) || Number(timeLimit) || 30,
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
const { uploadBufferToCloudinary, getUploadCredentials } = require('./mediaController');

exports.uploadVideoFromDevice = async (req, res) => {
  try {
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

    if (!finalUrl) {
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'videos');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const ext = path.extname(req.file.originalname) || '.mp4';
      const safeBase = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `vid_${Date.now()}_${safeBase.endsWith(ext) ? safeBase : safeBase + ext}`;
      const filePath = path.join(uploadsDir, filename);
      await fs.promises.writeFile(filePath, req.file.buffer);

      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'http';
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
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a file to upload.' });
    }

    let uploadRes = null;
    try {
      uploadRes = await uploadBufferToCloudinary(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        'upskillr_course_materials'
      );
    } catch (cloudErr) {
      console.warn('Cloudinary resource upload warning (falling back to persistent local storage):', cloudErr.message);
    }

    let finalUrl = uploadRes?.secure_url;
    let publicId = uploadRes?.public_id;

    if (!finalUrl) {
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'resources');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const ext = path.extname(req.file.originalname) || (req.file.mimetype.includes('pdf') ? '.pdf' : req.file.mimetype.includes('png') ? '.png' : req.file.mimetype.includes('jpg') || req.file.mimetype.includes('jpeg') ? '.jpg' : '');
      const safeBase = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `res_${Date.now()}_${safeBase.endsWith(ext) ? safeBase : safeBase + ext}`;
      const filePath = path.join(uploadsDir, filename);
      await fs.promises.writeFile(filePath, req.file.buffer);

      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'http';
      finalUrl = `${protocol}://${host}/uploads/resources/${filename}`;
      publicId = `local_res_${Date.now()}`;
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
      format: uploadRes?.format || req.file.mimetype.split('/')[1] || ''
    });
  } catch (err) {
    console.error('uploadResourceFromDevice error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to upload resource.' });
  }
};

