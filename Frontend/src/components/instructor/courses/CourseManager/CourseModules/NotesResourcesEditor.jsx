import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Image as ImageIcon,
  Plus,
  Eye,
  CheckCircle2,
  EyeOff,
  Layers,
  RefreshCw,
  Search,
  Edit2,
  X,
  ExternalLink,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { MarkdownEditor, renderMarkdownToHTML } from './Common/MarkdownEditor';
import { DeviceFileUploader } from './Common/DeviceFileUploader';
import { PdfViewer } from './Common/PdfViewer';
import { ImageViewer } from './Common/ImageViewer';
import './CourseModules.css';

export const NotesResourcesEditor = ({
  courseId,
  modules = [],
  notes = [],
  onBack,
  onCurriculumUpdated,
  apiBase = 'http://localhost:5000/api',
  getAuthHeader,
  toast
}) => {
  // Selected note ID for editing (null means currently creating a new note)
  const [selectedNoteId, setSelectedNoteId] = useState(() => {
    return notes.length > 0 ? String(notes[0]._id) : null;
  });
  const [isCreatingNew, setIsCreatingNew] = useState(() => notes.length === 0);

  // Active resource format: 'article' | 'pdf' | 'image'
  const [activeTab, setActiveTab] = useState('article');

  // Form State
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('course'); // 'course' | 'module' | 'lesson'
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaName, setMediaName] = useState('');
  const [mediaPublicId, setMediaPublicId] = useState('');
  const [resourceState, setResourceState] = useState('draft'); // 'draft' | 'published'
  const [saving, setSaving] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // In-app Viewer Modal State
  const [viewerModal, setViewerModal] = useState({
    isOpen: false,
    title: '',
    url: '',
    type: 'pdf', // 'pdf' | 'image' | 'article'
    content: '',
    scopeLabel: ''
  });

  // Synchronize selection when notes change or on initial load
  useEffect(() => {
    if (notes.length > 0) {
      if (selectedNoteId) {
        const found = notes.find(n => String(n._id) === String(selectedNoteId));
        if (found) {
          if (!isCreatingNew) {
            // Keep state synchronized
            setResourceState(found.state || 'draft');
          }
        } else if (!isCreatingNew) {
          loadNoteIntoEditor(notes[0]);
        }
      } else if (!isCreatingNew) {
        loadNoteIntoEditor(notes[0]);
      }
    } else {
      if (!isCreatingNew) {
        handleSelectCreateNew('article');
      }
    }
  }, [notes]);

  // Handle ESC key to close viewer modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && viewerModal.isOpen) {
        closeViewerModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerModal.isOpen]);

  // Load a note into the editor
  const loadNoteIntoEditor = (note) => {
    if (!note) return;
    const noteIdStr = String(note._id);
    setSelectedNoteId(noteIdStr);
    setIsCreatingNew(false);

    const format = (note.type === 'article' || note.type === 'article_md') ? 'article' : (note.type || 'article');
    setActiveTab(format);
    setTitle(note.title || '');

    const scopeVal = note.scope || note.attachableType || 'course';
    setScope(scopeVal);

    const modId = note.moduleId || (note.attachableType === 'module' ? note.attachableId : '') || '';
    const lesId = note.lessonId || (note.attachableType === 'lesson' ? note.attachableId : '') || '';
    setSelectedModuleId(modId ? String(modId) : '');
    setSelectedLessonId(lesId ? String(lesId) : '');

    setMarkdownContent(note.markdownContent || note.content || note.bodyMarkdown || '');
    setMediaUrl(note.fileUrl || note.mediaUrl || note.cloudinaryUrl || '');
    setMediaName(note.fileName || note.title || '');
    setMediaPublicId(note.cloudinaryPublicId || '');
    setResourceState(note.state || 'draft');
  };

  // Switch to creating a new resource of specified format
  const handleSelectCreateNew = (formatType) => {
    setSelectedNoteId(null);
    setIsCreatingNew(true);
    setActiveTab(formatType);
    setTitle('');
    setScope('course');
    setSelectedModuleId('');
    setSelectedLessonId('');
    setMarkdownContent('');
    setMediaUrl('');
    setMediaName('');
    setMediaPublicId('');
    setResourceState('draft');
  };

  // Open viewer modal for a resource
  const openViewerModal = (item) => {
    const itemType = item.type === 'article_md' || item.type === 'article' ? 'article' : (item.type || 'pdf');
    const itemUrl = item.fileUrl || item.mediaUrl || item.cloudinaryUrl || item.url || '';
    const itemContent = item.markdownContent || item.content || item.bodyMarkdown || '';

    setViewerModal({
      isOpen: true,
      title: item.title || 'Resource Preview',
      url: itemUrl,
      type: itemType,
      content: itemContent,
      scopeLabel: getScopeLabel(item)
    });
  };

  const closeViewerModal = () => {
    setViewerModal(prev => ({ ...prev, isOpen: false }));
  };

  // Find lessons for selected module
  const currentModule = modules.find(m => m._id === selectedModuleId);
  const availableLessons = currentModule ? currentModule.lessons || [] : [];

  // Helper for scope label display in sidebar items
  const getScopeLabel = (note) => {
    if (!note) return 'Course Level';
    const scopeVal = note.attachableType || note.scope || 'course';
    const modId = note.moduleId || (note.attachableType === 'module' ? note.attachableId : null);
    const lesId = note.lessonId || (note.attachableType === 'lesson' ? note.attachableId : null);

    if (scopeVal === 'course') return 'Course Level';
    if (scopeVal === 'module') {
      const mod = modules.find(m => m._id === modId);
      return mod?.title ? `Module: ${mod.title}` : 'Module Level';
    }
    if (scopeVal === 'lesson') {
      let lessonTitle = 'Lesson Level';
      modules.forEach(m => {
        const found = (m.lessons || []).find(l => l._id === lesId);
        if (found) lessonTitle = `Lesson: ${found.title}`;
      });
      return lessonTitle;
    }
    return 'Course Level';
  };

  // Helper for format display name
  const getFormatLabel = (type) => {
    if (type === 'article' || type === 'article_md') return 'Article (Markdown)';
    if (type === 'pdf') return 'PDF Document';
    if (type === 'image') return 'Image / Diagram';
    return 'Resource';
  };

  // Filter notes by search query
  const filteredNotes = notes.filter((note) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (note.title || '').toLowerCase().includes(q);
    const scopeMatch = getScopeLabel(note).toLowerCase().includes(q);
    const typeMatch = (note.type || '').toLowerCase().includes(q);
    return titleMatch || scopeMatch || typeMatch;
  });

  // Toggle Publish / Draft State for the currently loaded/created resource
  const handleTogglePublishState = async () => {
    if (selectedNoteId && !isCreatingNew) {
      try {
        const authHeaders = typeof getAuthHeader === 'function' ? getAuthHeader() : {};
        const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/notes/${selectedNoteId}/toggle-state`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          }
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          setResourceState(data.state);
          toast.success(`Resource is now ${data.state === 'published' ? 'Published' : 'in Draft'}`);
          if (onCurriculumUpdated) onCurriculumUpdated();
        } else {
          toast.error(data?.message || 'Failed to update resource state');
        }
      } catch (err) {
        console.error('Error updating resource state:', err);
        toast.error('Network error updating resource state');
      }
    } else {
      // Local state toggle for new note being authored
      setResourceState(prev => (prev === 'published' ? 'draft' : 'published'));
    }
  };

  // Save / Update Resource Handler
  const handleSaveResource = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a resource title');
      return;
    }
    if (activeTab === 'article' && !markdownContent.trim()) {
      toast.error('Please enter markdown content');
      return;
    }
    if ((activeTab === 'pdf' || activeTab === 'image') && !mediaUrl) {
      toast.error(`Please upload a ${activeTab.toUpperCase()} file from your computer`);
      return;
    }

    setSaving(true);
    try {
      const attachableId = scope === 'course' ? courseId : scope === 'module' ? selectedModuleId : selectedLessonId;
      if (scope !== 'course' && !attachableId) {
        toast.error('Please select the target module or lesson');
        setSaving(false);
        return;
      }

      const payload = {
        title: title.trim(),
        scope,
        attachableType: scope,
        attachableId: attachableId || courseId,
        moduleId: scope === 'module' || scope === 'lesson' ? selectedModuleId : null,
        lessonId: scope === 'lesson' ? selectedLessonId : null,
        type: activeTab === 'article' ? 'article_md' : activeTab,
        markdownContent: activeTab === 'article' ? markdownContent : '',
        bodyMarkdown: activeTab === 'article' ? markdownContent : '',
        content: activeTab === 'article' ? markdownContent : '',
        fileUrl: mediaUrl || '',
        mediaUrl: mediaUrl || '',
        cloudinaryUrl: mediaUrl || '',
        cloudinaryPublicId: mediaPublicId || '',
        fileName: mediaName || title.trim(),
        state: resourceState
      };

      const authHeaders = typeof getAuthHeader === 'function' ? getAuthHeader() : {};
      const requestHeaders = {
        'Content-Type': 'application/json',
        ...authHeaders
      };

      if (selectedNoteId && !isCreatingNew) {
        // UPDATE EXISTING RESOURCE
        const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/notes/${selectedNoteId}`, {
          method: 'PATCH',
          headers: requestHeaders,
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          toast.success('Resource updated successfully');
          if (data.note) {
            loadNoteIntoEditor(data.note);
          }
          if (onCurriculumUpdated) onCurriculumUpdated();
        } else {
          toast.error(data?.message || 'Failed to update resource');
        }
      } else {
        // CREATE NEW RESOURCE
        const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/notes`, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && data.note) {
          toast.success('Resource attached successfully');
          const newId = String(data.note._id);
          setSelectedNoteId(newId);
          setIsCreatingNew(false);
          loadNoteIntoEditor(data.note);
          if (onCurriculumUpdated) onCurriculumUpdated();
        } else {
          toast.error(data?.message || 'Failed to attach resource');
        }
      }
    } catch (err) {
      console.error('Error saving resource:', err);
      toast.error('Network error saving resource');
    } finally {
      setSaving(false);
    }
  };

  // Delete Resource Handler
  const handleDeleteResource = async (noteId, e) => {
    if (e) e.stopPropagation();
    if (!noteId) return;

    if (!window.confirm('Are you sure you want to delete this attached resource?')) {
      return;
    }

    try {
      const authHeaders = typeof getAuthHeader === 'function' ? getAuthHeader() : {};
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/notes/${noteId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        toast.success('Resource deleted successfully');
        if (String(selectedNoteId) === String(noteId)) {
          const remaining = notes.filter(n => String(n._id) !== String(noteId));
          if (remaining.length > 0) {
            loadNoteIntoEditor(remaining[0]);
          } else {
            handleSelectCreateNew('article');
          }
        }
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast.error(data?.message || 'Failed to delete resource');
      }
    } catch (err) {
      console.error('Error deleting resource:', err);
      toast.error('Network error deleting resource');
    }
  };

  return (
    <div className="notes-resources-page-container">
      {/* ══════════════════════════════════════════════════════════
          TOP BAR: Back navigation, title & description
          ══════════════════════════════════════════════════════════ */}
      <header className="notes-page-topbar">
        <button
          type="button"
          className="notes-back-btn"
          onClick={onBack}
          aria-label="Back to Course Content"
        >
          <ArrowLeft size={16} />
          <span>Back to Course Content</span>
        </button>

        <div className="notes-header-text-block">
          <h1 className="notes-main-title">Notes & Supplementary Resources</h1>
          <p className="notes-sub-description">
            Provide supplementary articles, cheatsheets, slides, and diagrams for your learners.
          </p>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          MAIN TWO-PANEL LAYOUT
          ══════════════════════════════════════════════════════════ */}
      <div className="notes-main-grid-layout">
        {/* ══════════════════════════════════════════════════════════
            LEFT PANEL: Attached Resources List & Create New Selectors
            ══════════════════════════════════════════════════════════ */}
        <aside className="notes-left-sidebar">
          <div className="notes-sidebar-card">
            {/* Header: Attached Resources & Count */}
            <div className="notes-sidebar-header">
              <h4 className="sidebar-section-title">Attached Resources</h4>
              <span className="sidebar-count-text">Total Attached: {notes.length}</span>
            </div>

            {/* Search Input */}
            <div className="notes-search-wrap">
              <Search size={14} className="notes-search-icon" />
              <input
                type="text"
                className="notes-search-input"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Vertical Scrollable Attached Resources List */}
            <div className="notes-attached-list">
              {filteredNotes.length === 0 ? (
                <div className="notes-list-empty">
                  <p>{notes.length === 0 ? 'No resources attached yet.' : 'No matching resources found.'}</p>
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const isSelected = String(selectedNoteId) === String(note._id) && !isCreatingNew;
                  const noteType = note.type === 'article_md' ? 'article' : (note.type || 'article');
                  const hasViewableUrl = !!(note.fileUrl || note.mediaUrl || note.cloudinaryUrl || note.content);

                  return (
                    <div
                      key={note._id}
                      className={`notes-list-item ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => loadNoteIntoEditor(note)}
                    >
                      {/* Left: Type Icon Box */}
                      <div className={`item-icon-box type-${noteType}`}>
                        {(noteType === 'article' || noteType === 'article_md') && <FileText size={16} />}
                        {noteType === 'pdf' && <BookOpen size={16} />}
                        {noteType === 'image' && <ImageIcon size={16} />}
                      </div>

                      {/* Middle: Info */}
                      <div className="item-info-col">
                        <span className="item-format-name">{getFormatLabel(note.type)}</span>
                        <h5 className="item-title" title={note.title}>{note.title}</h5>
                        <span className="item-scope-label">{getScopeLabel(note)}</span>
                      </div>

                      {/* Right: Actions */}
                      <div className="item-actions-col">
                        {hasViewableUrl && (
                          <button
                            type="button"
                            className="btn-item-view"
                            onClick={(e) => {
                              e.stopPropagation();
                              openViewerModal(note);
                            }}
                            title={`View ${getFormatLabel(note.type)}`}
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-item-edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadNoteIntoEditor(note);
                          }}
                          title="Edit Resource"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="btn-item-delete"
                          onClick={(e) => handleDeleteResource(note._id, e)}
                          title="Delete Resource"
                          aria-label="Delete Resource"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom: Create New Section */}
            <div className="notes-create-new-section">
              <h4 className="sidebar-section-title">Create New</h4>
              <div className="create-new-buttons-stack">
                <button
                  type="button"
                  className={`create-type-btn ${isCreatingNew && activeTab === 'article' ? 'is-active' : ''}`}
                  onClick={() => handleSelectCreateNew('article')}
                >
                  <FileText size={16} className="create-btn-icon" />
                  <span className="create-btn-label">Article (Markdown)</span>
                </button>

                <button
                  type="button"
                  className={`create-type-btn ${isCreatingNew && activeTab === 'pdf' ? 'is-active' : ''}`}
                  onClick={() => handleSelectCreateNew('pdf')}
                >
                  <BookOpen size={16} className="create-btn-icon" />
                  <span className="create-btn-label">Upload PDF</span>
                </button>

                <button
                  type="button"
                  className={`create-type-btn ${isCreatingNew && activeTab === 'image' ? 'is-active' : ''}`}
                  onClick={() => handleSelectCreateNew('image')}
                >
                  <ImageIcon size={16} className="create-btn-icon" />
                  <span className="create-btn-label">Upload Image</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ══════════════════════════════════════════════════════════
            RIGHT PANEL: Full Resource Editor
            ══════════════════════════════════════════════════════════ */}
        <main className="notes-right-editor-pane">
          <div className="notes-editor-card">
            {/* Top Action Header */}
            <div className="notes-editor-header-bar">
              <div className="editor-mode-indicator">
                <span className="mode-badge">
                  {isCreatingNew ? 'NEW RESOURCE' : 'EDITING RESOURCE'}
                </span>
                <span className="mode-type-tag">
                  {getFormatLabel(activeTab)}
                </span>
              </div>

              <div className="editor-header-actions">
                {/* View Current Resource Button (if persisted / uploaded) */}
                {((activeTab === 'pdf' || activeTab === 'image') && mediaUrl) && (
                  <button
                    type="button"
                    className="btn-header-view-action"
                    onClick={() => openViewerModal({ title, url: mediaUrl, type: activeTab, scope })}
                    title={`Preview this ${activeTab.toUpperCase()}`}
                  >
                    <Eye size={14} />
                    <span>View {activeTab === 'pdf' ? 'PDF' : 'Image'}</span>
                  </button>
                )}

                {/* Delete Resource Button (when editing existing) */}
                {selectedNoteId && !isCreatingNew && (
                  <button
                    type="button"
                    className="btn-header-delete-action"
                    onClick={(e) => handleDeleteResource(selectedNoteId, e)}
                    title="Delete this attached resource"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                )}

                {/* Publish / Unpublish Switch */}
                <button
                  type="button"
                  className={`btn-node-state-toggle state-${resourceState}`}
                  onClick={handleTogglePublishState}
                  title="Toggle between Draft and Published state"
                >
                  {resourceState === 'draft' ? <EyeOff size={14} /> : <CheckCircle2 size={14} />}
                  <span>{resourceState === 'draft' ? 'Draft' : 'Published'}</span>
                </button>

                {/* Save Changes / Create Button */}
                <button
                  type="button"
                  className="btn-brand-save"
                  disabled={saving}
                  onClick={handleSaveResource}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={15} className="spinner-rotate" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{isCreatingNew ? 'Attach Resource' : 'Save Changes'}</span>
                  )}
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSaveResource} className="notes-editor-form-body">
              {/* Target Scope Card */}
              <div className="scope-selection-box">
                <h4 className="scope-box-heading">
                  <Layers size={15} />
                  <span>Target Scope</span>
                </h4>
                <p className="scope-box-caption">
                  Attach this at the Course, Module, or Lesson level — wherever it's most relevant.
                </p>
                <div className="form-grid-3">
                  <div className="form-field-group">
                    <label className="field-label">Scope Level</label>
                    <select
                      className="field-select"
                      value={scope}
                      onChange={(e) => {
                        setScope(e.target.value);
                        if (e.target.value === 'course') {
                          setSelectedModuleId('');
                          setSelectedLessonId('');
                        }
                      }}
                    >
                      <option value="course">Course Level (Global to Course)</option>
                      <option value="module">Module Level</option>
                      <option value="lesson">Lesson Level</option>
                    </select>
                  </div>

                  {(scope === 'module' || scope === 'lesson') && (
                    <div className="form-field-group">
                      <label className="field-label">
                        Target Module <span className="text-danger">*</span>
                      </label>
                      <select
                        className="field-select"
                        required
                        value={selectedModuleId}
                        onChange={(e) => {
                          setSelectedModuleId(e.target.value);
                          setSelectedLessonId('');
                        }}
                      >
                        <option value="">Select a Module...</option>
                        {modules.map((m, idx) => (
                          <option key={m._id} value={m._id}>
                            Module {idx + 1}: {m.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {scope === 'lesson' && (
                    <div className="form-field-group">
                      <label className="field-label">
                        Target Lesson <span className="text-danger">*</span>
                      </label>
                      <select
                        className="field-select"
                        required
                        disabled={!selectedModuleId}
                        value={selectedLessonId}
                        onChange={(e) => setSelectedLessonId(e.target.value)}
                      >
                        <option value="">Select a Lesson...</option>
                        {availableLessons.map((l, idx) => (
                          <option key={l._id} value={l._id}>
                            Lesson {idx + 1}: {l.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Resource Title Field */}
              <div className="form-field-group">
                <label className="field-label">
                  Resource Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="field-input"
                  required
                  placeholder={
                    activeTab === 'article'
                      ? 'e.g., Guide to REST API Architectural Constraints'
                      : activeTab === 'pdf'
                        ? 'e.g., Complete Docker & Kubernetes Cheatsheet'
                        : 'e.g., Microservices Architecture & Event Pipeline Diagram'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* ── FORMAT 1: Article (Markdown) ── */}
              {activeTab === 'article' && (
                <div className="tab-content-panel">
                  <label className="field-label">
                    Article Markdown Content <span className="text-danger">*</span>
                  </label>
                  <MarkdownEditor
                    value={markdownContent}
                    onChange={setMarkdownContent}
                    placeholder="Write your study notes, tutorial steps, or reference guide using rich Markdown..."
                    minHeight="360px"
                  />
                </div>
              )}

              {/* ── FORMAT 2: Upload PDF ── */}
              {activeTab === 'pdf' && (
                <div className="tab-content-panel">
                  <label className="field-label">
                    Select PDF Document from Computer <span className="text-danger">*</span>
                  </label>
                  <DeviceFileUploader
                    fileType="pdf"
                    accept="application/pdf,.pdf"
                    maxSizeMB={25}
                    uploadEndpoint={`${apiBase}/courses/${courseId}/curriculum/upload/resource`}
                    getAuthHeader={getAuthHeader}
                    currentUrl={mediaUrl}
                    currentName={mediaName}
                    onUploadSuccess={({ url, publicId, fileName }) => {
                      setMediaUrl(url);
                      setMediaPublicId(publicId || '');
                      setMediaName(fileName);
                      if (!title) {
                        setTitle(fileName.replace(/\.[^/.]+$/, ''));
                      }
                    }}
                    helpText="Upload PDF documentation, slides, or cheatsheets directly from your device (Up to 25MB)."
                  />

                  {/* Attached PDF Preview / Actions Card */}
                  {mediaUrl && (
                    <div className="attached-resource-action-card">
                      <div className="attached-resource-info">
                        <div className="attached-resource-icon type-pdf">
                          <BookOpen size={20} />
                        </div>
                        <div className="attached-resource-details">
                          <span className="attached-resource-label">Uploaded PDF File</span>
                          <span className="attached-resource-name">{mediaName || title || 'document.pdf'}</span>
                        </div>
                      </div>

                      <div className="attached-resource-actions">
                        <button
                          type="button"
                          className="btn-view-resource-card"
                          onClick={() => openViewerModal({ title, url: mediaUrl, type: 'pdf', scope })}
                        >
                          <Eye size={15} />
                          <span>View PDF</span>
                        </button>

                        <a
                          href={mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-external-link-card"
                          title="Open PDF in new browser tab"
                        >
                          <ExternalLink size={15} />
                          <span>Open in Tab</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── FORMAT 3: Upload Image ── */}
              {activeTab === 'image' && (
                <div className="tab-content-panel">
                  <label className="field-label">
                    Select Image / Diagram from Computer <span className="text-danger">*</span>
                  </label>
                  <DeviceFileUploader
                    fileType="image"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    maxSizeMB={15}
                    uploadEndpoint={`${apiBase}/courses/${courseId}/curriculum/upload/resource`}
                    getAuthHeader={getAuthHeader}
                    currentUrl={mediaUrl}
                    currentName={mediaName}
                    onUploadSuccess={({ url, publicId, fileName }) => {
                      setMediaUrl(url);
                      setMediaPublicId(publicId || '');
                      setMediaName(fileName);
                      if (!title) {
                        setTitle(fileName.replace(/\.[^/.]+$/, ''));
                      }
                    }}
                    helpText="Upload PNG, JPG, WebP, or GIF diagrams and illustrations from your device (Up to 15MB)."
                  />

                  {/* Attached Image Preview / Actions Card */}
                  {mediaUrl && (
                    <div className="attached-resource-action-card image-mode">
                      <div className="attached-resource-info">
                        <div className="attached-image-thumb-wrap" onClick={() => openViewerModal({ title, url: mediaUrl, type: 'image', scope })}>
                          <img src={mediaUrl} alt={mediaName || 'Uploaded Diagram'} className="attached-image-thumb" />
                        </div>
                        <div className="attached-resource-details">
                          <span className="attached-resource-label">Uploaded Image / Diagram</span>
                          <span className="attached-resource-name">{mediaName || title || 'image.png'}</span>
                        </div>
                      </div>

                      <div className="attached-resource-actions">
                        <button
                          type="button"
                          className="btn-view-resource-card"
                          onClick={() => openViewerModal({ title, url: mediaUrl, type: 'image', scope })}
                        >
                          <Eye size={15} />
                          <span>View Image</span>
                        </button>

                        <a
                          href={mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-external-link-card"
                          title="Open Image in new browser tab"
                        >
                          <ExternalLink size={15} />
                          <span>Open in Tab</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════
          IN-APP RESOURCE VIEWER MODAL
          ══════════════════════════════════════════════════════════ */}
      {viewerModal.isOpen && (
        <div className="resource-viewer-modal-backdrop" onClick={closeViewerModal}>
          <div
            className={`resource-viewer-modal-dialog ${viewerModal.type === 'image' ? 'is-image-modal' : 'is-pdf-modal'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Bar */}
            <div className="resource-viewer-modal-header">
              <div className="viewer-header-info">
                <div className={`viewer-header-icon-badge type-${viewerModal.type}`}>
                  {viewerModal.type === 'pdf' && <BookOpen size={16} />}
                  {viewerModal.type === 'image' && <ImageIcon size={16} />}
                  {viewerModal.type === 'article' && <FileText size={16} />}
                </div>
                <div>
                  <h3 className="viewer-header-title">{viewerModal.title || 'Resource Viewer'}</h3>
                  <div className="viewer-header-meta">
                    <span className="viewer-meta-pill">{getFormatLabel(viewerModal.type)}</span>
                    {viewerModal.scopeLabel && <span className="viewer-meta-pill">{viewerModal.scopeLabel}</span>}
                  </div>
                </div>
              </div>

              <div className="viewer-header-actions">
                {viewerModal.url && (
                  <a
                    href={viewerModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="viewer-btn-action"
                    title="Open in new window"
                  >
                    <ExternalLink size={15} />
                    <span>Open in Tab</span>
                  </a>
                )}

                <button
                  type="button"
                  className="viewer-btn-close"
                  onClick={closeViewerModal}
                  aria-label="Close viewer"
                  title="Close viewer (ESC)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: PDF / Image / Article Viewer */}
            <div className="resource-viewer-modal-body">
              {viewerModal.type === 'pdf' && (
                <PdfViewer
                  url={viewerModal.url}
                  title={viewerModal.title}
                  onClose={closeViewerModal}
                />
              )}

              {viewerModal.type === 'image' && (
                <ImageViewer
                  url={viewerModal.url}
                  title={viewerModal.title}
                  onClose={closeViewerModal}
                />
              )}

              {viewerModal.type === 'article' && (
                <div className="article-viewer-content-container">
                  <div
                    className="article-markdown-rendered-view"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownToHTML(viewerModal.content || '*No content available.*')
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
