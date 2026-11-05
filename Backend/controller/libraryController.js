const mongoose = require('mongoose');
const Bookmark = require('../model/Bookmark');
const BookmarkFolder = require('../model/BookmarkFolder');
const PersonalNote = require('../model/PersonalNote');
const Course = require('../model/Course');
const Enrolment = require('../model/Enrolment');

// ═════════════════════════════════════════════════════════════════════════════
// 1. FOLDER MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

exports.getFolders = async (req, res) => {
  try {
    const learnerId = req.user.id;

    const folders = await BookmarkFolder.find({ learnerId }).sort({ createdAt: -1 }).lean();

    // Compute item counts for each folder
    const enrichedFolders = await Promise.all(
      folders.map(async (folder) => {
        const bookmarksCount = await Bookmark.countDocuments({ learnerId, folderId: folder._id });
        const notesCount = await PersonalNote.countDocuments({ learnerId, folderId: folder._id });
        return {
          ...folder,
          bookmarksCount,
          notesCount,
          totalCount: bookmarksCount + notesCount
        };
      })
    );

    // Also count unorganized items (folderId = null)
    const unorganizedBookmarksCount = await Bookmark.countDocuments({ learnerId, folderId: null });
    const unorganizedNotesCount = await PersonalNote.countDocuments({ learnerId, folderId: null });

    return res.status(200).json({
      success: true,
      count: enrichedFolders.length,
      folders: enrichedFolders,
      unorganized: {
        bookmarksCount: unorganizedBookmarksCount,
        notesCount: unorganizedNotesCount,
        totalCount: unorganizedBookmarksCount + unorganizedNotesCount
      }
    });
  } catch (err) {
    console.error('getFolders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve folders.' });
  }
};

exports.createFolder = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { name, description = '', color = '#10b981' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Folder name is required.' });
    }

    const trimmedName = name.trim();

    // Check duplicate folder name for this learner
    const existing = await BookmarkFolder.findOne({
      learnerId,
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'A folder with this name already exists.' });
    }

    const folder = await BookmarkFolder.create({
      learnerId,
      name: trimmedName,
      description: description ? description.trim() : '',
      color: color || '#10b981'
    });

    return res.status(201).json({
      success: true,
      folder: {
        ...folder.toObject(),
        bookmarksCount: 0,
        notesCount: 0,
        totalCount: 0
      },
      message: 'Folder created successfully.'
    });
  } catch (err) {
    console.error('createFolder error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create folder.' });
  }
};

exports.updateFolder = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { id } = req.params;
    const { name, description, color } = req.body;

    const folder = await BookmarkFolder.findOne({ _id: id, learnerId });
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found.' });
    }

    if (name && name.trim()) {
      const trimmedName = name.trim();
      const duplicate = await BookmarkFolder.findOne({
        learnerId,
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Another folder with this name already exists.' });
      }
      folder.name = trimmedName;
    }

    if (description !== undefined) {
      folder.description = description.trim();
    }

    if (color) {
      folder.color = color;
    }

    folder.updatedAt = Date.now();
    await folder.save();

    const bookmarksCount = await Bookmark.countDocuments({ learnerId, folderId: folder._id });
    const notesCount = await PersonalNote.countDocuments({ learnerId, folderId: folder._id });

    return res.status(200).json({
      success: true,
      folder: {
        ...folder.toObject(),
        bookmarksCount,
        notesCount,
        totalCount: bookmarksCount + notesCount
      },
      message: 'Folder updated successfully.'
    });
  } catch (err) {
    console.error('updateFolder error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update folder.' });
  }
};

exports.deleteFolder = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { id } = req.params;

    const folder = await BookmarkFolder.findOne({ _id: id, learnerId });
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found.' });
    }

    // Move all items inside this folder to unorganized (folderId = null)
    await Bookmark.updateMany({ learnerId, folderId: id }, { $set: { folderId: null } });
    await PersonalNote.updateMany({ learnerId, folderId: id }, { $set: { folderId: null } });

    await BookmarkFolder.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Folder deleted and all saved items moved to Unorganized.'
    });
  } catch (err) {
    console.error('deleteFolder error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete folder.' });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. BOOKMARKS CRUD & WORKSPACE INTEGRATION
// ═════════════════════════════════════════════════════════════════════════════

exports.getBookmarks = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { courseId, resourceType, folderId, search } = req.query;

    const query = { learnerId };

    if (courseId && courseId !== 'all') {
      query.courseId = courseId;
    }

    if (resourceType && resourceType !== 'all') {
      if (resourceType === 'notes' || resourceType === 'note') {
        query.resourceType = { $in: ['note', 'article', 'lesson'] };
      } else if (resourceType === 'videos' || resourceType === 'video') {
        query.resourceType = 'video';
      } else if (resourceType === 'quizzes' || resourceType === 'quiz') {
        query.resourceType = 'quiz';
      } else {
        query.resourceType = resourceType;
      }
    }

    if (folderId) {
      if (folderId === 'unorganized') {
        query.folderId = null;
      } else if (mongoose.Types.ObjectId.isValid(folderId)) {
        query.folderId = folderId;
      }
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { courseTitle: searchRegex },
        { moduleTitle: searchRegex },
        { lessonTitle: searchRegex },
        { contentPreview: searchRegex }
      ];
    }

    const bookmarks = await Bookmark.find(query)
      .populate('folderId', '_id name color description')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: bookmarks.length,
      bookmarks
    });
  } catch (err) {
    console.error('getBookmarks error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve bookmarks.' });
  }
};

exports.checkBookmarkStatus = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { courseId, resourceId, resourceType } = req.query;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required.' });
    }

    const query = { learnerId, courseId };
    if (resourceId) query.resourceId = resourceId;
    if (resourceType) query.resourceType = resourceType;

    const existing = await Bookmark.findOne(query).select('_id folderId').lean();

    return res.status(200).json({
      success: true,
      isBookmarked: Boolean(existing),
      bookmarkId: existing?._id || null,
      folderId: existing?.folderId || null
    });
  } catch (err) {
    console.error('checkBookmarkStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify bookmark status.' });
  }
};

exports.addOrToggleBookmark = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const {
      courseId,
      resourceId = null,
      resourceType = 'lesson',
      title,
      courseTitle,
      courseThumbnail,
      category,
      moduleId = null,
      moduleTitle = '',
      lessonId = null,
      lessonTitle = '',
      contentPreview = '',
      duration = '',
      totalMarks = null,
      totalQuestions = null,
      folderId = null,
      url,
      action // Optional: explicit 'add' or 'remove'
    } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required.' });
    }

    const normType = (resourceType || 'lesson').toLowerCase();

    // Query to find existing bookmark for this resource
    const query = {
      learnerId,
      courseId,
      resourceType: normType,
      resourceId: resourceId || null
    };

    const existing = await Bookmark.findOne(query);

    // If explicit action is 'remove', or if toggling and already exists without explicit 'add'
    if (existing && action !== 'add') {
      await Bookmark.findByIdAndDelete(existing._id);
      return res.status(200).json({
        success: true,
        action: 'removed',
        isBookmarked: false,
        message: 'Removed from bookmarks.'
      });
    }

    // Resolve course information if missing
    let resolvedTitle = title;
    let resolvedCourseTitle = courseTitle;
    let resolvedThumb = courseThumbnail;
    let resolvedCategory = category;

    if (!resolvedCourseTitle || !resolvedThumb) {
      const course = await Course.findById(courseId);
      if (course) {
        resolvedCourseTitle = resolvedCourseTitle || course.title;
        resolvedTitle = resolvedTitle || course.title;
        resolvedThumb = resolvedThumb || course.thumbnail;
        resolvedCategory = resolvedCategory || course.category;
      }
    }

    // Validate folderId if provided
    let validFolderId = null;
    if (folderId && mongoose.Types.ObjectId.isValid(folderId)) {
      const folder = await BookmarkFolder.findOne({ _id: folderId, learnerId });
      if (folder) validFolderId = folder._id;
    }

    // If existing and action === 'add' (updating folder or details)
    if (existing && action === 'add') {
      existing.folderId = validFolderId;
      if (resolvedTitle) existing.title = resolvedTitle;
      if (contentPreview) existing.contentPreview = contentPreview;
      existing.updatedAt = Date.now();
      await existing.save();

      return res.status(200).json({
        success: true,
        action: 'updated',
        isBookmarked: true,
        bookmark: existing,
        message: 'Bookmark updated.'
      });
    }

    // Construct target workspace navigation URL
    const resolvedUrl = url || `/learn/${courseId}`;

    const bookmark = await Bookmark.create({
      learnerId,
      courseId,
      resourceId: resourceId || null,
      resourceType: normType,
      title: resolvedTitle || lessonTitle || 'Bookmarked Resource',
      courseTitle: resolvedCourseTitle || 'Course',
      courseThumbnail: resolvedThumb || '',
      category: resolvedCategory || 'General',
      moduleId,
      moduleTitle,
      lessonId,
      lessonTitle,
      contentPreview: contentPreview ? contentPreview.slice(0, 300) : '',
      duration,
      totalMarks,
      totalQuestions,
      folderId: validFolderId,
      url: resolvedUrl
    });

    const populated = await Bookmark.findById(bookmark._id).populate('folderId', '_id name color');

    return res.status(201).json({
      success: true,
      action: 'added',
      isBookmarked: true,
      bookmark: populated,
      message: 'Saved to My Learning Library.'
    });
  } catch (err) {
    console.error('addOrToggleBookmark error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save bookmark.' });
  }
};

exports.moveBookmarkToFolder = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { id } = req.params;
    const { folderId } = req.body;

    const bookmark = await Bookmark.findOne({ _id: id, learnerId });
    if (!bookmark) {
      return res.status(404).json({ success: false, message: 'Bookmark not found.' });
    }

    let validFolderId = null;
    if (folderId && folderId !== 'unorganized') {
      if (!mongoose.Types.ObjectId.isValid(folderId)) {
        return res.status(400).json({ success: false, message: 'Invalid folder ID.' });
      }
      const folder = await BookmarkFolder.findOne({ _id: folderId, learnerId });
      if (!folder) {
        return res.status(404).json({ success: false, message: 'Folder not found.' });
      }
      validFolderId = folder._id;
    }

    bookmark.folderId = validFolderId;
    bookmark.updatedAt = Date.now();
    await bookmark.save();

    const populated = await Bookmark.findById(bookmark._id).populate('folderId', '_id name color');

    return res.status(200).json({
      success: true,
      bookmark: populated,
      message: validFolderId ? 'Bookmark moved to folder.' : 'Bookmark moved to Unorganized.'
    });
  } catch (err) {
    console.error('moveBookmarkToFolder error:', err);
    return res.status(500).json({ success: false, message: 'Failed to move bookmark.' });
  }
};

exports.deleteBookmark = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { id } = req.params;
    const { courseId, resourceId, resourceType } = req.query;

    if (id) {
      await Bookmark.findOneAndDelete({ _id: id, learnerId });
    } else if (courseId) {
      const q = { learnerId, courseId };
      if (resourceType) q.resourceType = resourceType;
      if (resourceId) q.resourceId = resourceId;
      await Bookmark.findOneAndDelete(q);
    } else {
      return res.status(400).json({ success: false, message: 'Bookmark ID or resource parameters required.' });
    }

    return res.status(200).json({ success: true, message: 'Bookmark removed successfully.' });
  } catch (err) {
    console.error('deleteBookmark error:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove bookmark.' });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. PERSONAL NOTES CRUD
// ═════════════════════════════════════════════════════════════════════════════

exports.getNotes = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { courseId, folderId, search } = req.query;

    const query = { learnerId };

    if (courseId && courseId !== 'all') {
      query.courseId = courseId;
    }

    if (folderId) {
      if (folderId === 'unorganized') {
        query.folderId = null;
      } else if (mongoose.Types.ObjectId.isValid(folderId)) {
        query.folderId = folderId;
      }
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { content: searchRegex },
        { courseTitle: searchRegex },
        { moduleTitle: searchRegex },
        { lessonTitle: searchRegex }
      ];
    }

    const notes = await PersonalNote.find(query)
      .populate('folderId', '_id name color')
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: notes.length,
      notes
    });
  } catch (err) {
    console.error('getNotes error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve personal notes.' });
  }
};

exports.getNoteById = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { id } = req.params;

    const note = await PersonalNote.findOne({ _id: id, learnerId })
      .populate('folderId', '_id name color')
      .lean();

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    return res.status(200).json({ success: true, note });
  } catch (err) {
    console.error('getNoteById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve note.' });
  }
};

exports.createNote = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const {
      title,
      content,
      courseId = null,
      courseTitle = '',
      moduleId = null,
      moduleTitle = '',
      lessonId = null,
      lessonTitle = '',
      folderId = null,
      url = ''
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Note title is required.' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Note content is required.' });
    }

    let resolvedCourseTitle = courseTitle;
    let validCourseId = null;

    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      validCourseId = courseId;
      if (!resolvedCourseTitle) {
        const c = await Course.findById(courseId).select('title');
        if (c) resolvedCourseTitle = c.title;
      }
    }

    let validFolderId = null;
    if (folderId && mongoose.Types.ObjectId.isValid(folderId)) {
      const folder = await BookmarkFolder.findOne({ _id: folderId, learnerId });
      if (folder) validFolderId = folder._id;
    }

    const note = await PersonalNote.create({
      learnerId,
      title: title.trim(),
      content: content.trim(),
      courseId: validCourseId,
      courseTitle: resolvedCourseTitle ? resolvedCourseTitle.trim() : '',
      moduleId,
      moduleTitle: moduleTitle ? moduleTitle.trim() : '',
      lessonId,
      lessonTitle: lessonTitle ? lessonTitle.trim() : '',
      folderId: validFolderId,
      url: url || (validCourseId ? `/learn/${validCourseId}` : '')
    });

    const populated = await PersonalNote.findById(note._id).populate('folderId', '_id name color');

    return res.status(201).json({
      success: true,
      note: populated,
      message: 'Personal note saved.'
    });
  } catch (err) {
    console.error('createNote error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save personal note.' });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { id } = req.params;
    const {
      title,
      content,
      courseId,
      courseTitle,
      moduleId,
      moduleTitle,
      lessonId,
      lessonTitle,
      folderId,
      url
    } = req.body;

    const note = await PersonalNote.findOne({ _id: id, learnerId });
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    if (title !== undefined) note.title = title.trim();
    if (content !== undefined) note.content = content.trim();

    if (courseId !== undefined) {
      if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
        note.courseId = courseId;
        if (!courseTitle) {
          const c = await Course.findById(courseId).select('title');
          if (c) note.courseTitle = c.title;
        } else {
          note.courseTitle = courseTitle.trim();
        }
      } else {
        note.courseId = null;
        note.courseTitle = '';
      }
    }

    if (moduleId !== undefined) note.moduleId = moduleId;
    if (moduleTitle !== undefined) note.moduleTitle = moduleTitle.trim();
    if (lessonId !== undefined) note.lessonId = lessonId;
    if (lessonTitle !== undefined) note.lessonTitle = lessonTitle.trim();
    if (url !== undefined) note.url = url;

    if (folderId !== undefined) {
      if (folderId && folderId !== 'unorganized' && mongoose.Types.ObjectId.isValid(folderId)) {
        const folder = await BookmarkFolder.findOne({ _id: folderId, learnerId });
        note.folderId = folder ? folder._id : null;
      } else {
        note.folderId = null;
      }
    }

    note.updatedAt = Date.now();
    await note.save();

    const populated = await PersonalNote.findById(note._id).populate('folderId', '_id name color');

    return res.status(200).json({
      success: true,
      note: populated,
      message: 'Note updated successfully.'
    });
  } catch (err) {
    console.error('updateNote error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update note.' });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const learnerId = req.user.id;
    const { id } = req.params;

    const note = await PersonalNote.findOneAndDelete({ _id: id, learnerId });
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Personal note deleted successfully.'
    });
  } catch (err) {
    console.error('deleteNote error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete note.' });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. ENROLLED COURSES FOR LIBRARY FILTER
// ═════════════════════════════════════════════════════════════════════════════

exports.getLibraryCourses = async (req, res) => {
  try {
    const learnerId = req.user.id;

    const enrolments = await Enrolment.find({ learnerId })
      .populate('courseId', '_id title thumbnail category')
      .lean();

    const coursesMap = new Map();

    for (const e of enrolments) {
      if (e.courseId && e.courseId._id) {
        const c = e.courseId;
        coursesMap.set(String(c._id), {
          _id: c._id,
          title: c.title,
          thumbnail: c.thumbnail,
          category: c.category || 'General'
        });
      } else if (e.courseId) {
        coursesMap.set(String(e.courseId), {
          _id: e.courseId,
          title: e.courseTitle || 'Course',
          thumbnail: '',
          category: 'General'
        });
      }
    }

    // Also include any courses that appear in bookmarks or notes but learner might not have an enrolment record for
    const bookmarkedCourseIds = await Bookmark.distinct('courseId', { learnerId });
    for (const cId of bookmarkedCourseIds) {
      if (cId && !coursesMap.has(String(cId))) {
        const c = await Course.findById(cId).select('_id title thumbnail category').lean();
        if (c) {
          coursesMap.set(String(c._id), {
            _id: c._id,
            title: c.title,
            thumbnail: c.thumbnail,
            category: c.category || 'General'
          });
        }
      }
    }

    const coursesList = Array.from(coursesMap.values());

    return res.status(200).json({
      success: true,
      count: coursesList.length,
      courses: coursesList
    });
  } catch (err) {
    console.error('getLibraryCourses error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load enrolled courses.' });
  }
};
