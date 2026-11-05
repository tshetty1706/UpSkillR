import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bookmark,
  ExternalLink,
  Trash2,
  Sparkles,
  Video,
  FileText,
  BookOpen,
  HelpCircle,
  Folder,
  FolderPlus,
  FolderOpen,
  Search,
  Plus,
  Edit3,
  MoreVertical,
  X,
  Check,
  Filter,
  Clock,
  Award,
  PenLine,
  MoveRight,
  Layers,
  ChevronDown
} from 'lucide-react';
import { CourseThumbnail } from '../../common/CourseThumbnail';
import { useToast } from '../../../context/ToastContext';
import { API_BASE } from '../../../config/api';
import './LearnerBookmarksView.css';

// ─── Modal 1: Create or Edit Personal Note Modal ───
const NoteModal = ({ isOpen, onClose, onSave, editingNote, enrolledCourses, folders }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [courseId, setCourseId] = useState('');
  const [folderId, setFolderId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title || '');
      setContent(editingNote.content || '');
      setCourseId(
        editingNote.courseId?._id || editingNote.courseId || ''
      );
      setFolderId(
        editingNote.folderId?._id || editingNote.folderId || ''
      );
    } else {
      setTitle('');
      setContent('');
      setCourseId('');
      setFolderId('');
    }
  }, [editingNote, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const selectedCourse = enrolledCourses.find(
        (c) => String(c._id) === String(courseId)
      );
      await onSave({
        title: title.trim(),
        content: content.trim(),
        courseId: courseId || null,
        courseTitle: selectedCourse ? selectedCourse.title : '',
        folderId: folderId || null
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="library-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="note-modal-title">
      <div className="library-modal-container note-modal-size">
        <div className="library-modal-header">
          <div className="modal-title-row">
            <PenLine size={20} className="modal-title-icon" />
            <h2 id="note-modal-title" className="library-modal-title">
              {editingNote ? 'Edit Personal Note' : 'Add Personal Quick Note'}
            </h2>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="library-modal-body">
          <div className="library-form-group">
            <label htmlFor="note-title-input" className="library-form-label">
              Note Title <span className="required-star">*</span>
            </label>
            <input
              id="note-title-input"
              type="text"
              className="library-form-input"
              placeholder="e.g., Important React Concepts or DSA Revision"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="library-form-row">
            <div className="library-form-group flex-1">
              <label htmlFor="note-course-select" className="library-form-label">
                Associated Course <span className="optional-tag">(Optional)</span>
              </label>
              <select
                id="note-course-select"
                className="library-form-select"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                <option value="">General (No Course Association)</option>
                {enrolledCourses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="library-form-group flex-1">
              <label htmlFor="note-folder-select" className="library-form-label">
                Folder <span className="optional-tag">(Optional)</span>
              </label>
              <select
                id="note-folder-select"
                className="library-form-select"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
              >
                <option value="">Unorganized (No Folder)</option>
                {folders.map((f) => (
                  <option key={f._id} value={f._id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="library-form-group">
            <label htmlFor="note-content-input" className="library-form-label">
              Note Content <span className="required-star">*</span>
            </label>
            <textarea
              id="note-content-input"
              className="library-form-textarea"
              placeholder="Capture key concepts, code snippets, reminders, or revision pointers..."
              rows={7}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <div className="library-modal-footer">
            <button type="button" className="btn-modal-cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-modal-save" disabled={saving || !title.trim() || !content.trim()}>
              {saving ? 'Saving...' : editingNote ? 'Update Note' : 'Save Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal 2: Create or Rename Folder Modal ───
const FolderModal = ({ isOpen, onClose, onSave, editingFolder }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#10b981');
  const [saving, setSaving] = useState(false);

  const colorPresets = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

  useEffect(() => {
    if (editingFolder) {
      setName(editingFolder.name || '');
      setDescription(editingFolder.description || '');
      setColor(editingFolder.color || '#10b981');
    } else {
      setName('');
      setDescription('');
      setColor('#10b981');
    }
  }, [editingFolder, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        color
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="library-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="folder-modal-title">
      <div className="library-modal-container folder-modal-size">
        <div className="library-modal-header">
          <div className="modal-title-row">
            <FolderPlus size={20} className="modal-title-icon" />
            <h2 id="folder-modal-title" className="library-modal-title">
              {editingFolder ? 'Rename / Edit Folder' : 'Create New Folder'}
            </h2>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="library-modal-body">
          <div className="library-form-group">
            <label htmlFor="folder-name-input" className="library-form-label">
              Folder Name <span className="required-star">*</span>
            </label>
            <input
              id="folder-name-input"
              type="text"
              className="library-form-input"
              placeholder="e.g., React Revision, DSA Prep, Interview Questions..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="library-form-group">
            <label htmlFor="folder-desc-input" className="library-form-label">
              Description <span className="optional-tag">(Optional)</span>
            </label>
            <textarea
              id="folder-desc-input"
              className="library-form-textarea"
              placeholder="What will you organize in this folder?"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="library-form-group">
            <label className="library-form-label">Folder Color</label>
            <div className="color-swatches-row">
              {colorPresets.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch-btn ${color === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Select color ${c}`}
                >
                  {color === c && <Check size={14} color="#ffffff" />}
                </button>
              ))}
            </div>
          </div>

          <div className="library-modal-footer">
            <button type="button" className="btn-modal-cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-modal-save" disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : editingFolder ? 'Save Changes' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal 3: Move Item to Folder Modal ───
const MoveToFolderModal = ({ isOpen, onClose, onMove, movingItem, folders }) => {
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (movingItem) {
      const curFolderId =
        movingItem.item.folderId?._id || movingItem.item.folderId || '';
      setSelectedFolderId(curFolderId);
    }
  }, [movingItem, isOpen]);

  if (!isOpen || !movingItem) return null;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onMove(movingItem, selectedFolderId || null);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="library-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="move-modal-title">
      <div className="library-modal-container move-modal-size">
        <div className="library-modal-header">
          <div className="modal-title-row">
            <MoveRight size={20} className="modal-title-icon" />
            <h2 id="move-modal-title" className="library-modal-title">
              Move to Folder
            </h2>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="library-modal-body">
          <p className="move-item-info">
            Select a destination folder for: <strong>{movingItem.item.title}</strong>
          </p>

          <div className="folder-selection-list">
            <label
              className={`folder-select-item ${!selectedFolderId ? 'active' : ''}`}
              onClick={() => setSelectedFolderId('')}
            >
              <input
                type="radio"
                name="targetFolder"
                checked={!selectedFolderId}
                onChange={() => setSelectedFolderId('')}
              />
              <div className="folder-select-icon unorganized-icon">
                <Layers size={16} />
              </div>
              <div className="folder-select-details">
                <span className="folder-select-name">Unorganized</span>
                <span className="folder-select-sub">No assigned folder</span>
              </div>
            </label>

            {folders.map((f) => (
              <label
                key={f._id}
                className={`folder-select-item ${String(selectedFolderId) === String(f._id) ? 'active' : ''}`}
                onClick={() => setSelectedFolderId(f._id)}
              >
                <input
                  type="radio"
                  name="targetFolder"
                  checked={String(selectedFolderId) === String(f._id)}
                  onChange={() => setSelectedFolderId(f._id)}
                />
                <div className="folder-select-icon" style={{ backgroundColor: `${f.color || '#10b981'}25`, color: f.color || '#10b981' }}>
                  <Folder size={16} />
                </div>
                <div className="folder-select-details">
                  <span className="folder-select-name">{f.name}</span>
                  <span className="folder-select-sub">{f.totalCount || 0} items</span>
                </div>
              </label>
            ))}
          </div>

          <div className="library-modal-footer">
            <button type="button" className="btn-modal-cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn-modal-save" onClick={handleConfirm} disabled={saving}>
              {saving ? 'Moving...' : 'Move Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Modal 4: Delete Confirmation Modal ───
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, deletingItem }) => {
  if (!isOpen || !deletingItem) return null;

  const isFolder = deletingItem.type === 'folder';

  return (
    <div className="library-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
      <div className="library-modal-container delete-modal-size">
        <div className="library-modal-header delete-header">
          <div className="modal-title-row">
            <Trash2 size={20} className="modal-title-icon text-danger" />
            <h2 id="delete-modal-title" className="library-modal-title">
              {isFolder ? 'Delete Folder?' : 'Remove from Library?'}
            </h2>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="library-modal-body">
          <p className="delete-confirm-text">
            Are you sure you want to delete <strong>"{deletingItem.item.title || deletingItem.item.name}"</strong>?
          </p>

          {isFolder && (
            <div className="delete-folder-safe-notice">
              <Check size={16} className="safe-notice-icon" />
              <span>
                <strong>Bookmarks and notes inside this folder will NOT be deleted.</strong> They will safely move back to your Unorganized section.
              </span>
            </div>
          )}

          <div className="library-modal-footer">
            <button type="button" className="btn-modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-modal-delete-confirm"
              onClick={() => {
                onConfirm(deletingItem);
                onClose();
              }}
            >
              {isFolder ? 'Delete Folder' : 'Remove'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: LearnerBookmarksView (My Learning Library)
// ═════════════════════════════════════════════════════════════════════════════

export const LearnerBookmarksView = ({ onNavigate, onExploreCourses }) => {
  const { toast } = useToast();

  // ─── Data States ───
  const [bookmarks, setBookmarks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Filters & Search States ───
  // Tabs: 'all' | 'videos' | 'notes' | 'quizzes' | 'folders'
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notesSubFilter, setNotesSubFilter] = useState('all'); // 'all' | 'personal' | 'lessons'

  // ─── Modal States ───
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [movingItem, setMovingItem] = useState(null);

  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);

  // ─── Fetch All Library Resources ───
  const fetchLibraryData = useCallback(async () => {
    setLoading(true);
    const token = sessionStorage.getItem('upskillr_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const [bmRes, notesRes, foldersRes, coursesRes] = await Promise.all([
        fetch(`${API_BASE}/learners/me/bookmarks`, { headers, credentials: 'include' }),
        fetch(`${API_BASE}/learners/me/notes`, { headers, credentials: 'include' }),
        fetch(`${API_BASE}/learners/me/folders`, { headers, credentials: 'include' }),
        fetch(`${API_BASE}/learners/me/library/courses`, { headers, credentials: 'include' })
      ]);

      const [bmData, notesData, foldersData, coursesData] = await Promise.all([
        bmRes.json(),
        notesRes.json(),
        foldersRes.json(),
        coursesRes.json()
      ]);

      if (bmData.success && Array.isArray(bmData.bookmarks)) {
        setBookmarks(bmData.bookmarks);
      }
      if (notesData.success && Array.isArray(notesData.notes)) {
        setNotes(notesData.notes);
      }
      if (foldersData.success && Array.isArray(foldersData.folders)) {
        setFolders(foldersData.folders);
      }
      if (coursesData.success && Array.isArray(coursesData.courses)) {
        setEnrolledCourses(coursesData.courses);
      }
    } catch (err) {
      console.error('Failed to load library resources:', err);
      toast.error('Unable to fetch your learning library.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLibraryData();
  }, [fetchLibraryData]);

  // ─── Navigation Helper ───
  const handleOpenResource = (item) => {
    let targetUrl = item.url;
    if (!targetUrl) {
      const cId = item.courseId?._id || item.courseId;
      targetUrl = cId ? `/learn/${cId}` : '/courses';
    }
    if (!targetUrl.startsWith('/')) {
      targetUrl = `/${targetUrl}`;
    }

    if (onNavigate) {
      onNavigate(targetUrl);
    } else {
      window.history.pushState({}, '', targetUrl);
      window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: targetUrl } }));
    }
  };

  // ─── Handlers: Notes ───
  const handleSaveNote = async (noteData) => {
    const token = sessionStorage.getItem('upskillr_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      if (editingNote) {
        const res = await fetch(`${API_BASE}/learners/me/notes/${editingNote._id}`, {
          method: 'PATCH',
          headers,
          credentials: 'include',
          body: JSON.stringify(noteData)
        });
        const resData = await res.json();
        if (resData.success) {
          toast.success('Note updated.');
          setNotes((prev) =>
            prev.map((n) => (n._id === editingNote._id ? resData.note : n))
          );
        } else {
          toast.error(resData.message || 'Failed to update note.');
        }
      } else {
        const res = await fetch(`${API_BASE}/learners/me/notes`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(noteData)
        });
        const resData = await res.json();
        if (resData.success) {
          toast.success('Personal note created.');
          setNotes((prev) => [resData.note, ...prev]);
        } else {
          toast.error(resData.message || 'Failed to save note.');
        }
      }
      fetchLibraryData();
    } catch (err) {
      console.error('Error saving note:', err);
      toast.error('Error saving personal note.');
    }
  };

  const handleDeleteNote = async (note) => {
    setNotes((prev) => prev.filter((n) => n._id !== note._id));
    toast.info(`Deleted note "${note.title}".`);

    const token = sessionStorage.getItem('upskillr_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      await fetch(`${API_BASE}/learners/me/notes/${note._id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      fetchLibraryData();
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  // ─── Handlers: Folders ───
  const handleSaveFolder = async (folderData) => {
    const token = sessionStorage.getItem('upskillr_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      if (editingFolder) {
        const res = await fetch(`${API_BASE}/learners/me/folders/${editingFolder._id}`, {
          method: 'PATCH',
          headers,
          credentials: 'include',
          body: JSON.stringify(folderData)
        });
        const resData = await res.json();
        if (resData.success) {
          toast.success('Folder updated.');
          setFolders((prev) =>
            prev.map((f) => (f._id === editingFolder._id ? resData.folder : f))
          );
        } else {
          toast.error(resData.message || 'Failed to update folder.');
        }
      } else {
        const res = await fetch(`${API_BASE}/learners/me/folders`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(folderData)
        });
        const resData = await res.json();
        if (resData.success) {
          toast.success('New folder created.');
          setFolders((prev) => [resData.folder, ...prev]);
        } else {
          toast.error(resData.message || 'Failed to create folder.');
        }
      }
      fetchLibraryData();
    } catch (err) {
      console.error('Error saving folder:', err);
      toast.error('Error saving folder.');
    }
  };

  const handleDeleteFolder = async (folder) => {
    setFolders((prev) => prev.filter((f) => f._id !== folder._id));
    if (String(selectedFolderId) === String(folder._id)) {
      setSelectedFolderId(null);
    }
    toast.info(`Deleted folder "${folder.name}". Items moved to Unorganized.`);

    const token = sessionStorage.getItem('upskillr_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      await fetch(`${API_BASE}/learners/me/folders/${folder._id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      fetchLibraryData();
    } catch (err) {
      console.error('Error deleting folder:', err);
    }
  };

  // ─── Handlers: Bookmarks ───
  const handleRemoveBookmark = async (bookmark) => {
    setBookmarks((prev) => prev.filter((b) => b._id !== bookmark._id));
    toast.info(`Removed "${bookmark.title}" from library.`);

    const token = sessionStorage.getItem('upskillr_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      await fetch(`${API_BASE}/learners/me/bookmarks/${bookmark._id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      fetchLibraryData();
    } catch (err) {
      console.error('Error removing bookmark:', err);
    }
  };

  // ─── Handlers: Move to Folder ───
  const handleMoveItemToFolder = async (moving, targetFolderId) => {
    const token = sessionStorage.getItem('upskillr_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      if (moving.type === 'bookmark') {
        const res = await fetch(`${API_BASE}/learners/me/bookmarks/${moving.item._id}/folder`, {
          method: 'PATCH',
          headers,
          credentials: 'include',
          body: JSON.stringify({ folderId: targetFolderId })
        });
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || 'Bookmark moved.');
          setBookmarks((prev) =>
            prev.map((b) => (b._id === moving.item._id ? data.bookmark : b))
          );
        }
      } else if (moving.type === 'note') {
        const res = await fetch(`${API_BASE}/learners/me/notes/${moving.item._id}`, {
          method: 'PATCH',
          headers,
          credentials: 'include',
          body: JSON.stringify({ folderId: targetFolderId })
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Note moved to folder.');
          setNotes((prev) =>
            prev.map((n) => (n._id === moving.item._id ? data.note : n))
          );
        }
      }
      fetchLibraryData();
    } catch (err) {
      console.error('Error moving item:', err);
      toast.error('Failed to move item.');
    }
  };

  // ─── Open Quick Note from Bookmark ───
  const handleAddNoteFromBookmark = (bookmark) => {
    const courseId = bookmark.courseId?._id || bookmark.courseId;
    setEditingNote({
      title: `Note on: ${bookmark.title}`,
      content: '',
      courseId,
      courseTitle: bookmark.courseTitle,
      folderId: bookmark.folderId?._id || bookmark.folderId || ''
    });
    setIsNoteModalOpen(true);
  };

  // ─── Filtering & Search Aggregation ───
  const normalizedVideos = useMemo(() => {
    return bookmarks.filter((b) => (b.resourceType || '').toLowerCase() === 'video');
  }, [bookmarks]);

  const normalizedLessonNotes = useMemo(() => {
    return bookmarks.filter((b) => {
      const t = (b.resourceType || '').toLowerCase();
      return t === 'article' || t === 'note' || t === 'lesson';
    });
  }, [bookmarks]);

  const normalizedQuizzes = useMemo(() => {
    return bookmarks.filter((b) => (b.resourceType || '').toLowerCase() === 'quiz');
  }, [bookmarks]);

  // Combined Items for 'all' or filtered searches
  const filteredList = useMemo(() => {
    let rawItems = [];

    if (activeTab === 'all') {
      // Merge all bookmarks + personal notes
      const taggedBookmarks = bookmarks.map((b) => ({ ...b, itemKind: 'bookmark' }));
      const taggedNotes = notes.map((n) => ({ ...n, itemKind: 'personal_note' }));
      rawItems = [...taggedBookmarks, ...taggedNotes];
    } else if (activeTab === 'videos') {
      rawItems = normalizedVideos.map((b) => ({ ...b, itemKind: 'bookmark' }));
    } else if (activeTab === 'notes') {
      const taggedLessonNotes = normalizedLessonNotes.map((b) => ({ ...b, itemKind: 'bookmark' }));
      const taggedPersonalNotes = notes.map((n) => ({ ...n, itemKind: 'personal_note' }));

      if (notesSubFilter === 'personal') {
        rawItems = taggedPersonalNotes;
      } else if (notesSubFilter === 'lessons') {
        rawItems = taggedLessonNotes;
      } else {
        rawItems = [...taggedPersonalNotes, ...taggedLessonNotes];
      }
    } else if (activeTab === 'quizzes') {
      rawItems = normalizedQuizzes.map((b) => ({ ...b, itemKind: 'bookmark' }));
    }

    // 1. Filter by Course
    if (selectedCourseId !== 'all') {
      rawItems = rawItems.filter((it) => {
        const cId = String(it.courseId?._id || it.courseId || '');
        // For personal notes without course, prompt specifies:
        // "Personal notes without a course association should still appear under All Courses."
        return cId === String(selectedCourseId);
      });
    }

    // 2. Filter by Folder
    if (selectedFolderId) {
      if (selectedFolderId === 'unorganized') {
        rawItems = rawItems.filter((it) => !it.folderId);
      } else {
        rawItems = rawItems.filter((it) => {
          const fId = String(it.folderId?._id || it.folderId || '');
          return fId === String(selectedFolderId);
        });
      }
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      rawItems = rawItems.filter((it) => {
        const titleMatch = (it.title || '').toLowerCase().includes(query);
        const courseMatch = (it.courseTitle || '').toLowerCase().includes(query);
        const moduleMatch = (it.moduleTitle || '').toLowerCase().includes(query);
        const lessonMatch = (it.lessonTitle || '').toLowerCase().includes(query);
        const contentMatch = (it.content || it.contentPreview || '').toLowerCase().includes(query);
        const folderNameMatch = (it.folderId?.name || '').toLowerCase().includes(query);
        return titleMatch || courseMatch || moduleMatch || lessonMatch || contentMatch || folderNameMatch;
      });
    }

    // Sort by latest date
    return rawItems.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [
    activeTab,
    bookmarks,
    notes,
    normalizedVideos,
    normalizedLessonNotes,
    normalizedQuizzes,
    notesSubFilter,
    selectedCourseId,
    selectedFolderId,
    searchQuery
  ]);

  // Active Folder Object (if any)
  const activeFolderObj = useMemo(() => {
    if (!selectedFolderId) return null;
    if (selectedFolderId === 'unorganized') return { name: 'Unorganized', color: '#64748b' };
    return folders.find((f) => String(f._id) === String(selectedFolderId));
  }, [selectedFolderId, folders]);

  // Counts for Top Filters
  const totalAllCount = bookmarks.length + notes.length;
  const totalVideosCount = normalizedVideos.length;
  const totalNotesCount = notes.length + normalizedLessonNotes.length;
  const totalQuizzesCount = normalizedQuizzes.length;
  const totalFoldersCount = folders.length;

  return (
    <div className="learner-library-page" role="region" aria-label="My Learning Library">
      {/* ─── 1. TOP HEADER SECTION ─── */}
      <header className="library-header-card">
        <div className="library-title-row">
          <div>
            <h1 className="library-main-title">My Learning Library</h1>
            <p className="library-main-subtitle">
              Your personal space to save, organize and revisit everything you're learning.
            </p>
          </div>

          {/* Action Buttons: Add Note & New Folder */}
          <div className="library-top-actions">
            <button
              type="button"
              className="btn-library-action btn-add-note"
              onClick={() => {
                setEditingNote(null);
                setIsNoteModalOpen(true);
              }}
              aria-label="Add Personal Note"
            >
              <Plus size={16} />
              <span>Add Note</span>
            </button>

            <button
              type="button"
              className="btn-library-action btn-new-folder"
              onClick={() => {
                setEditingFolder(null);
                setIsFolderModalOpen(true);
              }}
              aria-label="Create New Folder"
            >
              <FolderPlus size={16} />
              <span>New Folder</span>
            </button>
          </div>
        </div>

        {/* ─── 2. SEARCH & COURSE FILTER BAR ─── */}
        <div className="library-controls-bar">
          {/* Functional Search Bar */}
          <div className="library-search-wrapper">
            <Search size={18} className="library-search-icon" aria-hidden="true" />
            <input
              type="search"
              className="library-search-input"
              placeholder="Search resources, lessons, notes, or folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search learning library"
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Course Filter Dropdown */}
          <div className="library-course-filter-wrapper">
            <label htmlFor="library-course-dropdown" className="visually-hidden">
              Filter by Course
            </label>
            <div className="course-dropdown-box">
              <BookOpen size={16} className="dropdown-prefix-icon" aria-hidden="true" />
              <select
                id="library-course-dropdown"
                className="library-course-select"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                aria-label="Filter by course"
              >
                <option value="all">All Enrolled Courses</option>
                {enrolledCourses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="dropdown-chevron-icon" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* ─── 3. TOP NAVIGATION / CATEGORY FILTERS ─── */}
        <nav className="library-nav-filters-row" aria-label="Library Resource Types">
          <div className="library-category-chips" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'all'}
              className={`lib-tab-chip ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <Sparkles size={15} />
              <span>All</span>
              <span className="lib-chip-count">{totalAllCount}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'videos'}
              className={`lib-tab-chip ${activeTab === 'videos' ? 'active' : ''}`}
              onClick={() => setActiveTab('videos')}
            >
              <Video size={15} />
              <span>Videos</span>
              <span className="lib-chip-count">{totalVideosCount}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'notes'}
              className={`lib-tab-chip ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              <FileText size={15} />
              <span>Notes</span>
              <span className="lib-chip-count">{totalNotesCount}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'quizzes'}
              className={`lib-tab-chip ${activeTab === 'quizzes' ? 'active' : ''}`}
              onClick={() => setActiveTab('quizzes')}
            >
              <HelpCircle size={15} />
              <span>Quizzes</span>
              <span className="lib-chip-count">{totalQuizzesCount}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'folders'}
              className={`lib-tab-chip ${activeTab === 'folders' ? 'active' : ''}`}
              onClick={() => setActiveTab('folders')}
            >
              <Folder size={15} />
              <span>Folders</span>
              <span className="lib-chip-count">{totalFoldersCount}</span>
            </button>
          </div>

          {/* Active Folder Filter Indicator (if a folder is chosen) */}
          {activeFolderObj && activeTab !== 'folders' && (
            <div className="active-folder-banner">
              <span className="active-folder-tag" style={{ borderLeftColor: activeFolderObj.color || '#10b981' }}>
                <FolderOpen size={14} style={{ color: activeFolderObj.color || '#10b981' }} />
                <span>Folder: <strong>{activeFolderObj.name}</strong></span>
                <button
                  type="button"
                  className="btn-clear-active-folder"
                  onClick={() => setSelectedFolderId(null)}
                  title="Show all items outside this folder"
                  aria-label="Clear folder filter"
                >
                  <X size={13} />
                </button>
              </span>
            </div>
          )}
        </nav>

        {/* Sub-Filters inside Notes tab */}
        {activeTab === 'notes' && (
          <div className="notes-sub-filter-row">
            <span className="notes-sub-label">Show:</span>
            <button
              type="button"
              className={`notes-sub-btn ${notesSubFilter === 'all' ? 'active' : ''}`}
              onClick={() => setNotesSubFilter('all')}
            >
              All Notes ({totalNotesCount})
            </button>
            <button
              type="button"
              className={`notes-sub-btn ${notesSubFilter === 'personal' ? 'active' : ''}`}
              onClick={() => setNotesSubFilter('personal')}
            >
              ✏️ Personal Quick Notes ({notes.length})
            </button>
            <button
              type="button"
              className={`notes-sub-btn ${notesSubFilter === 'lessons' ? 'active' : ''}`}
              onClick={() => setNotesSubFilter('lessons')}
            >
              📖 Saved Lesson Notes ({normalizedLessonNotes.length})
            </button>
          </div>
        )}
      </header>

      {/* ─── 4. MAIN CONTENT AREA ─── */}
      <main className="library-main-content">
        {loading ? (
          <div className="library-loading-state">
            <div className="loading-orbit-spinner" />
            <p>Loading your knowledge library...</p>
          </div>
        ) : activeTab === 'folders' ? (
          /* ─── FOLDERS TAB ─── */
          folders.length === 0 ? (
            <div className="library-empty-card">
              <div className="empty-circle-badge">
                <FolderPlus size={36} />
              </div>
              <h2 className="empty-title">No Custom Folders Yet</h2>
              <p className="empty-desc">
                Create your first folder to organize bookmarks, video clips, lesson notes and revision checklists.
              </p>
              <button
                type="button"
                className="btn-empty-primary"
                onClick={() => {
                  setEditingFolder(null);
                  setIsFolderModalOpen(true);
                }}
              >
                <FolderPlus size={16} />
                <span>Create First Folder</span>
              </button>
            </div>
          ) : (
            <div className="folders-grid">
              {folders.map((folder) => (
                <div key={folder._id} className="folder-card-item">
                  <div className="folder-card-top">
                    <div
                      className="folder-icon-box"
                      style={{
                        backgroundColor: `${folder.color || '#10b981'}20`,
                        color: folder.color || '#10b981'
                      }}
                    >
                      <Folder size={24} />
                    </div>

                    <div className="folder-actions-dropdown">
                      <button
                        type="button"
                        className="btn-folder-action"
                        onClick={() => {
                          setEditingFolder(folder);
                          setIsFolderModalOpen(true);
                        }}
                        title="Edit Folder"
                        aria-label={`Edit folder ${folder.name}`}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn-folder-action text-danger"
                        onClick={() =>
                          setDeleteConfirmModal({
                            type: 'folder',
                            item: folder
                          })
                        }
                        title="Delete Folder"
                        aria-label={`Delete folder ${folder.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <h3 className="folder-card-name" title={folder.name}>
                    {folder.name}
                  </h3>
                  <p className="folder-card-desc">
                    {folder.description || 'Custom revision folder'}
                  </p>

                  <div className="folder-card-meta">
                    <span className="folder-item-pill">
                      {folder.totalCount || 0} {folder.totalCount === 1 ? 'item' : 'items'}
                    </span>
                    <span className="folder-date">
                      {new Date(folder.updatedAt || folder.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn-open-folder-contents"
                    onClick={() => {
                      setSelectedFolderId(folder._id);
                      setActiveTab('all');
                    }}
                  >
                    <FolderOpen size={15} />
                    <span>Open Folder</span>
                  </button>
                </div>
              ))}
            </div>
          )
        ) : filteredList.length === 0 ? (
          /* ─── DEDICATED EMPTY STATES PER TAB & SEARCH ─── */
          searchQuery.trim() ? (
            <div className="library-empty-card">
              <div className="empty-circle-badge">
                <Search size={36} />
              </div>
              <h2 className="empty-title">No Resources Match Your Search</h2>
              <p className="empty-desc">
                No bookmarks, notes, or lessons matched "<strong>{searchQuery}</strong>". Try another keyword or clear your query.
              </p>
              <button
                type="button"
                className="btn-empty-outline"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </button>
            </div>
          ) : activeTab === 'videos' ? (
            <div className="library-empty-card">
              <div className="empty-circle-badge">
                <Video size={36} />
              </div>
              <h2 className="empty-title">No Bookmarked Video Lessons</h2>
              <p className="empty-desc">
                Save video tutorials while studying in the Course Learning Workspace to quickly rewatch key lectures.
              </p>
              {onExploreCourses && (
                <button
                  type="button"
                  className="btn-empty-primary"
                  onClick={onExploreCourses}
                >
                  <Sparkles size={16} />
                  <span>Explore Courses</span>
                </button>
              )}
            </div>
          ) : activeTab === 'notes' ? (
            <div className="library-empty-card">
              <div className="empty-circle-badge">
                <FileText size={36} />
              </div>
              <h2 className="empty-title">No Notes in Your Library</h2>
              <p className="empty-desc">
                Capture your thoughts, code snippets and important concepts using Quick Notes, or bookmark articles from your lessons.
              </p>
              <button
                type="button"
                className="btn-empty-primary"
                onClick={() => {
                  setEditingNote(null);
                  setIsNoteModalOpen(true);
                }}
              >
                <Plus size={16} />
                <span>Add Your First Note</span>
              </button>
            </div>
          ) : activeTab === 'quizzes' ? (
            <div className="library-empty-card">
              <div className="empty-circle-badge">
                <HelpCircle size={36} />
              </div>
              <h2 className="empty-title">No Bookmarked Quizzes</h2>
              <p className="empty-desc">
                Save quizzes and mock tests to prepare for exams and sharpen your technical problem solving.
              </p>
              {onExploreCourses && (
                <button
                  type="button"
                  className="btn-empty-primary"
                  onClick={onExploreCourses}
                >
                  <Sparkles size={16} />
                  <span>Explore Courses</span>
                </button>
              )}
            </div>
          ) : (
            <div className="library-empty-card">
              <div className="empty-circle-badge">
                <Bookmark size={36} />
              </div>
              <h2 className="empty-title">Your Learning Library is Empty</h2>
              <p className="empty-desc">
                Save videos, articles and quizzes while learning, or create personal quick revision notes.
              </p>
              <div className="empty-actions-row">
                <button
                  type="button"
                  className="btn-empty-primary"
                  onClick={() => {
                    setEditingNote(null);
                    setIsNoteModalOpen(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Add Note</span>
                </button>
                {onExploreCourses && (
                  <button
                    type="button"
                    className="btn-empty-outline"
                    onClick={onExploreCourses}
                  >
                    <Sparkles size={16} />
                    <span>Explore Courses</span>
                  </button>
                )}
              </div>
            </div>
          )
        ) : (
          /* ─── RESOURCE CARDS GRID ─── */
          <div className="library-items-grid">
            {filteredList.map((item) => {
              const isPersonalNote = item.itemKind === 'personal_note';
              const resType = (item.resourceType || 'lesson').toLowerCase();
              const courseTitle =
                item.courseTitle || (typeof item.courseId === 'object' ? item.courseId?.title : 'General');
              const folderName = item.folderId?.name;
              const folderColor = item.folderId?.color || '#10b981';

              // ─── CARD TYPE A: PERSONAL NOTE ───
              if (isPersonalNote) {
                return (
                  <div key={item._id} className="library-card note-card-item">
                    <div className="card-top-bar">
                      <span className="card-type-chip personal-note-chip">
                        <PenLine size={13} />
                        <span>Personal Note</span>
                      </span>

                      {folderName && (
                        <span className="card-folder-badge" style={{ color: folderColor }}>
                          <Folder size={12} />
                          <span>{folderName}</span>
                        </span>
                      )}
                    </div>

                    <div className="note-card-body">
                      {courseTitle && courseTitle !== 'General' && (
                        <span className="card-course-label" title={courseTitle}>
                          {courseTitle}
                        </span>
                      )}
                      <h3 className="card-title" title={item.title}>
                        {item.title}
                      </h3>
                      <p className="note-content-preview">{item.content}</p>
                    </div>

                    <div className="card-footer-bar">
                      <span className="card-date-meta">
                        Updated {new Date(item.updatedAt || item.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>

                      <div className="card-action-buttons">
                        <button
                          type="button"
                          className="btn-card-icon"
                          onClick={() => {
                            setEditingNote(item);
                            setIsNoteModalOpen(true);
                          }}
                          title="Edit Note"
                          aria-label={`Edit note ${item.title}`}
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          type="button"
                          className="btn-card-icon"
                          onClick={() =>
                            setMovingItem({
                              type: 'note',
                              item
                            })
                          }
                          title="Move to Folder"
                          aria-label={`Move note ${item.title} to folder`}
                        >
                          <FolderPlus size={15} />
                        </button>

                        <button
                          type="button"
                          className="btn-card-icon text-danger"
                          onClick={() =>
                            setDeleteConfirmModal({
                              type: 'note',
                              item
                            })
                          }
                          title="Delete Note"
                          aria-label={`Delete note ${item.title}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // ─── CARD TYPE B: VIDEO LESSON ───
              if (resType === 'video') {
                return (
                  <div key={item._id} className="library-card video-card-item">
                    <div
                      className="card-media-banner"
                      onClick={() => handleOpenResource(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleOpenResource(item);
                      }}
                      aria-label={`Open video ${item.title}`}
                    >
                      <CourseThumbnail
                        src={item.courseThumbnail}
                        alt={item.title}
                        className="card-thumb-image"
                      />
                      <div className="media-overlay-play">
                        <Video size={22} className="play-icon-symbol" />
                      </div>
                      <span className="card-type-chip video-chip">
                        <Video size={12} />
                        <span>Video Lesson</span>
                      </span>
                      {item.duration && (
                        <span className="video-duration-tag">
                          <Clock size={11} />
                          <span>{item.duration}</span>
                        </span>
                      )}
                    </div>

                    <div className="card-text-body">
                      <span className="card-course-label" title={courseTitle}>
                        {courseTitle}
                      </span>
                      {item.moduleTitle && (
                        <span className="card-module-label" title={item.moduleTitle}>
                          {item.moduleTitle}
                        </span>
                      )}
                      <h3
                        className="card-title clickable-title"
                        title={item.title}
                        onClick={() => handleOpenResource(item)}
                      >
                        {item.title}
                      </h3>
                      {folderName && (
                        <span className="card-folder-badge" style={{ color: folderColor }}>
                          <Folder size={12} />
                          <span>{folderName}</span>
                        </span>
                      )}
                    </div>

                    <div className="card-footer-bar">
                      <button
                        type="button"
                        className="btn-primary-open"
                        onClick={() => handleOpenResource(item)}
                        aria-label={`Open video ${item.title}`}
                      >
                        <span>Open Video</span>
                        <ExternalLink size={13} />
                      </button>

                      <div className="card-action-buttons">
                        <button
                          type="button"
                          className="btn-card-icon"
                          onClick={() => handleAddNoteFromBookmark(item)}
                          title="Add Note on this Lesson"
                          aria-label={`Add note on ${item.title}`}
                        >
                          <PenLine size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-card-icon"
                          onClick={() =>
                            setMovingItem({
                              type: 'bookmark',
                              item
                            })
                          }
                          title="Move to Folder"
                          aria-label={`Move ${item.title} to folder`}
                        >
                          <FolderPlus size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-card-icon text-danger"
                          onClick={() => handleRemoveBookmark(item)}
                          title="Remove Bookmark"
                          aria-label={`Remove bookmark ${item.title}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // ─── CARD TYPE C: SAVED LESSON NOTE / ARTICLE ───
              if (resType === 'article' || resType === 'note' || resType === 'lesson') {
                return (
                  <div key={item._id} className="library-card lesson-note-card-item">
                    <div className="card-top-bar">
                      <span className="card-type-chip article-chip">
                        <BookOpen size={13} />
                        <span>Lesson Note</span>
                      </span>
                      {folderName && (
                        <span className="card-folder-badge" style={{ color: folderColor }}>
                          <Folder size={12} />
                          <span>{folderName}</span>
                        </span>
                      )}
                    </div>

                    <div className="card-text-body">
                      <span className="card-course-label" title={courseTitle}>
                        {courseTitle}
                      </span>
                      {item.moduleTitle && (
                        <span className="card-module-label" title={item.moduleTitle}>
                          {item.moduleTitle}
                        </span>
                      )}
                      <h3
                        className="card-title clickable-title"
                        title={item.title}
                        onClick={() => handleOpenResource(item)}
                      >
                        {item.title}
                      </h3>
                      {item.contentPreview && (
                        <p className="note-content-preview">{item.contentPreview}</p>
                      )}
                    </div>

                    <div className="card-footer-bar">
                      <button
                        type="button"
                        className="btn-primary-open"
                        onClick={() => handleOpenResource(item)}
                        aria-label={`Open lesson ${item.title}`}
                      >
                        <span>Open Lesson</span>
                        <ExternalLink size={13} />
                      </button>

                      <div className="card-action-buttons">
                        <button
                          type="button"
                          className="btn-card-icon"
                          onClick={() => handleAddNoteFromBookmark(item)}
                          title="Add Note on this Lesson"
                          aria-label={`Add note on ${item.title}`}
                        >
                          <PenLine size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-card-icon"
                          onClick={() =>
                            setMovingItem({
                              type: 'bookmark',
                              item
                            })
                          }
                          title="Move to Folder"
                          aria-label={`Move ${item.title} to folder`}
                        >
                          <FolderPlus size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-card-icon text-danger"
                          onClick={() => handleRemoveBookmark(item)}
                          title="Remove Bookmark"
                          aria-label={`Remove bookmark ${item.title}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // ─── CARD TYPE D: QUIZ ───
              return (
                <div key={item._id} className="library-card quiz-card-item">
                  <div className="card-top-bar">
                    <span className="card-type-chip quiz-chip">
                      <HelpCircle size={13} />
                      <span>Quiz</span>
                    </span>
                    {folderName && (
                      <span className="card-folder-badge" style={{ color: folderColor }}>
                        <Folder size={12} />
                        <span>{folderName}</span>
                      </span>
                    )}
                  </div>

                  <div className="card-text-body">
                    <span className="card-course-label" title={courseTitle}>
                      {courseTitle}
                    </span>
                    {item.moduleTitle && (
                      <span className="card-module-label" title={item.moduleTitle}>
                        {item.moduleTitle}
                      </span>
                    )}
                    <h3
                      className="card-title clickable-title"
                      title={item.title}
                      onClick={() => handleOpenResource(item)}
                    >
                      {item.title}
                    </h3>

                    {/* Quiz Metrics */}
                    <div className="quiz-meta-row">
                      {item.totalQuestions && (
                        <span className="quiz-metric-pill">
                          📝 {item.totalQuestions} Questions
                        </span>
                      )}
                      {item.totalMarks && (
                        <span className="quiz-metric-pill">
                          🎯 {item.totalMarks} Marks
                        </span>
                      )}
                      {item.duration && (
                        <span className="quiz-metric-pill">
                          ⏱ {item.duration}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="card-footer-bar">
                    <button
                      type="button"
                      className="btn-primary-open"
                      onClick={() => handleOpenResource(item)}
                      aria-label={`Open quiz ${item.title}`}
                    >
                      <span>Open Quiz</span>
                      <ExternalLink size={13} />
                    </button>

                    <div className="card-action-buttons">
                      <button
                        type="button"
                        className="btn-card-icon"
                        onClick={() => handleAddNoteFromBookmark(item)}
                        title="Add Note on this Quiz"
                        aria-label={`Add note on ${item.title}`}
                      >
                        <PenLine size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn-card-icon"
                        onClick={() =>
                          setMovingItem({
                            type: 'bookmark',
                            item
                          })
                        }
                        title="Move to Folder"
                        aria-label={`Move ${item.title} to folder`}
                      >
                        <FolderPlus size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn-card-icon text-danger"
                        onClick={() => handleRemoveBookmark(item)}
                        title="Remove Bookmark"
                        aria-label={`Remove bookmark ${item.title}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── 5. MODALS CONTAINER ─── */}
      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setEditingNote(null);
        }}
        onSave={handleSaveNote}
        editingNote={editingNote}
        enrolledCourses={enrolledCourses}
        folders={folders}
      />

      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false);
          setEditingFolder(null);
        }}
        onSave={handleSaveFolder}
        editingFolder={editingFolder}
      />

      <MoveToFolderModal
        isOpen={isMoveModalOpen}
        onClose={() => {
          setIsMoveModalOpen(false);
          setMovingItem(null);
        }}
        onMove={handleMoveItemToFolder}
        movingItem={movingItem}
        folders={folders}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deleteConfirmModal)}
        onClose={() => setDeleteConfirmModal(null)}
        onConfirm={(itemToDelete) => {
          if (itemToDelete.type === 'folder') {
            handleDeleteFolder(itemToDelete.item);
          } else if (itemToDelete.type === 'note') {
            handleDeleteNote(itemToDelete.item);
          } else if (itemToDelete.type === 'bookmark') {
            handleRemoveBookmark(itemToDelete.item);
          }
        }}
        deletingItem={deleteConfirmModal}
      />
    </div>
  );
};

export default LearnerBookmarksView;
