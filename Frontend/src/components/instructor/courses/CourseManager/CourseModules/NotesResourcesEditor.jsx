import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Image as ImageIcon,
  Plus,
  Eye,
  CheckCircle2,
  EyeOff,
  Filter,
  Layers,
  Sparkles,
  ExternalLink,
  X,
  RefreshCw,
  Clock
} from 'lucide-react';
import { InstructorTip } from './Common/InstructorTip';
import { MarkdownEditor, renderMarkdownToHTML } from './Common/MarkdownEditor';
import { DeviceFileUploader } from './Common/DeviceFileUploader';

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
  // Active creation tab: 'article' | 'pdf' | 'image'
  const [activeTab, setActiveTab] = useState('article');

  // Form State
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('course'); // 'course' | 'module' | 'lesson'
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaName, setMediaName] = useState('');
  const [saving, setSaving] = useState(false);

  // List filter state
  const [filterType, setFilterType] = useState('all'); // 'all' | 'article' | 'pdf' | 'image'
  const [filterScope, setFilterScope] = useState('all');

  // Resource viewer modal state
  const [viewingNote, setViewingNote] = useState(null);

  // Find lessons for selected module
  const currentModule = modules.find(m => m._id === selectedModuleId);
  const availableLessons = currentModule ? currentModule.lessons || [] : [];

  /* ─────────────────────────────────────────────────────────────
     STATE TOGGLE (Draft <-> Published)
     ───────────────────────────────────────────────────────────── */
  const handleToggleNoteState = async (noteId) => {
    try {
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/notes/${noteId}/toggle-state`, {
        method: 'PATCH',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Resource set to ${data.state}`);
        onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Could not toggle resource state');
      }
    } catch (err) {
      toast.error('Network error toggling state');
    }
  };

  /* ─────────────────────────────────────────────────────────────
     SAVE NEW RESOURCE
     ───────────────────────────────────────────────────────────── */
  const handleCreateResource = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a resource title');
      return;
    }

    if (activeTab === 'article' && !markdownContent.trim()) {
      toast.error('Please write some content for the article');
      return;
    }

    if ((activeTab === 'pdf' || activeTab === 'image') && !mediaUrl) {
      toast.error(`Please upload a ${activeTab.toUpperCase()} file from your device first`);
      return;
    }

    if (scope === 'module' && !selectedModuleId) {
      toast.error('Please select a target module');
      return;
    }

    if (scope === 'lesson' && (!selectedModuleId || !selectedLessonId)) {
      toast.error('Please select both a target module and lesson');
      return;
    }

    setSaving(true);
    try {
      const body = {
        scope,
        moduleId: scope !== 'course' ? selectedModuleId : null,
        lessonId: scope === 'lesson' ? selectedLessonId : null,
        type: activeTab,
        title: title.trim(),
        content: activeTab === 'article' ? markdownContent : '',
        mediaUrl: activeTab !== 'article' ? mediaUrl : ''
      };

      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/notes`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Resource "${title}" created successfully`);
        // Reset form
        setTitle('');
        setMarkdownContent('');
        setMediaUrl('');
        setMediaName('');
        onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Failed to save resource');
      }
    } catch (err) {
      console.error('Save resource error:', err);
      toast.error('Network error while saving resource');
    } finally {
      setSaving(false);
    }
  };

  // Filtered notes
  const filteredNotes = notes.filter(n => {
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (filterScope !== 'all' && n.scope !== filterScope) return false;
    return true;
  });

  const getScopeLabel = (note) => {
    if (note.scope === 'course') return 'Course Wide';
    if (note.scope === 'module') {
      const mod = modules.find(m => m._id === note.moduleId);
      return `Module: ${mod?.title || 'Unknown Module'}`;
    }
    if (note.scope === 'lesson') {
      const mod = modules.find(m => m._id === note.moduleId);
      const les = mod?.lessons?.find(l => l._id === note.lessonId);
      return `Lesson: ${les?.title || 'Unknown Lesson'}`;
    }
    return 'Course';
  };

  return (
    <div className="notes-resources-editor-subpage">
      {/* ── Subpage Header ── */}
      <div className="subpage-header-row">
        <div className="subpage-title-group">
          <button
            type="button"
            className="btn-back-nav"
            onClick={onBack}
            title="Return to Course Content hub"
          >
            <ArrowLeft size={18} />
            <span>Back to Course Content</span>
          </button>
          <div className="subpage-heading-block">
            <h2 className="subpage-title">Notes & Supplementary Resources</h2>
            <p className="subpage-subtitle">
              Publish rich Markdown articles, downloadable PDF reference sheets, and architectural diagrams.
            </p>
          </div>
        </div>

        <div className="subpage-header-actions">
          <span className="resources-count-badge">
            {notes.length} Total Attached
          </span>
        </div>
      </div>

      {/* ── Non-gating Guidance Tip ── */}
      <InstructorTip
        type="info"
        title="Supplementary Non-Gating Material"
        message="Notes and resources are non-gating. Learners can access them at any time to supplement their learning without blocking module or lesson progression. Zero items are ever permanently erased; use draft state to unpublish."
      />

      {/* ── Resource Creator Section ── */}
      <div className="resource-creator-card">
        <div className="creator-card-header">
          <h3 className="creator-card-title">Add New Resource</h3>
          <p className="creator-card-subtitle">
            Choose the resource format and target scope below.
          </p>
        </div>

        {/* Format Selector Tabs */}
        <div className="resource-type-tabs">
          <button
            type="button"
            className={`type-tab-btn ${activeTab === 'article' ? 'active' : ''}`}
            onClick={() => setActiveTab('article')}
          >
            <FileText size={17} />
            <div className="tab-text">
              <span className="tab-name">Article (Markdown)</span>
              <span className="tab-desc">Formatted text, code, tables & guides</span>
            </div>
          </button>

          <button
            type="button"
            className={`type-tab-btn ${activeTab === 'pdf' ? 'active' : ''}`}
            onClick={() => setActiveTab('pdf')}
          >
            <BookOpen size={17} />
            <div className="tab-text">
              <span className="tab-name">Upload PDF</span>
              <span className="tab-desc">Cheatsheets, slides & reference docs</span>
            </div>
          </button>

          <button
            type="button"
            className={`type-tab-btn ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveTab('image')}
          >
            <ImageIcon size={17} />
            <div className="tab-text">
              <span className="tab-name">Upload Image</span>
              <span className="tab-desc">System diagrams, flowcharts & schematics</span>
            </div>
          </button>
        </div>

        {/* Resource Creation Form */}
        <form onSubmit={handleCreateResource} className="resource-form-body">
          {/* Scope Selection Row */}
          <div className="scope-selection-box">
            <h4 className="scope-box-heading">
              <Layers size={15} />
              <span>Target Scope</span>
            </h4>
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
                  <option value="course">Course Level (General Reference)</option>
                  <option value="module">Module Level</option>
                  <option value="lesson">Lesson Level</option>
                </select>
              </div>

              {scope !== 'course' && (
                <div className="form-field-group">
                  <label className="field-label">Target Module <span className="text-danger">*</span></label>
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
                  <label className="field-label">Target Lesson <span className="text-danger">*</span></label>
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

          {/* Title Field */}
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

          {/* TAB 1: Markdown Article Editor */}
          {activeTab === 'article' && (
            <div className="tab-content-panel">
              <label className="field-label">
                Article Markdown Content <span className="text-danger">*</span>
              </label>
              <MarkdownEditor
                value={markdownContent}
                onChange={setMarkdownContent}
                placeholder="Write your study notes, tutorial steps, or reference guide using rich Markdown..."
                minHeight="340px"
              />
            </div>
          )}

          {/* TAB 2: Upload PDF */}
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
                onUploadSuccess={({ url, fileName }) => {
                  setMediaUrl(url);
                  setMediaName(fileName);
                  if (!title) {
                    setTitle(fileName.replace(/\.[^/.]+$/, ''));
                  }
                }}
                helpText="Upload PDF documentation, slides, or cheatsheets directly from your device (Up to 25MB)."
              />
            </div>
          )}

          {/* TAB 3: Upload Image */}
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
                onUploadSuccess={({ url, fileName }) => {
                  setMediaUrl(url);
                  setMediaName(fileName);
                  if (!title) {
                    setTitle(fileName.replace(/\.[^/.]+$/, ''));
                  }
                }}
                helpText="Upload PNG, JPG, WebP, or GIF diagrams and illustrations from your device (Up to 15MB)."
              />
            </div>
          )}

          {/* Submit Button */}
          <div className="form-submit-row">
            <button
              type="submit"
              className="btn-primary-action"
              disabled={saving}
            >
              {saving ? (
                <>
                  <RefreshCw size={15} className="spinner-rotate" />
                  <span>Attaching Resource...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Attach Resource to Course</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Attached Resources Repository ── */}
      <div className="resources-repository-section">
        <div className="repository-header-row">
          <div className="repo-title-group">
            <h3 className="repo-title">Attached Resources ({filteredNotes.length})</h3>
            <p className="repo-subtitle">Manage visibility and preview attached materials.</p>
          </div>

          {/* Filter Controls */}
          <div className="repo-filters-group">
            <div className="filter-pill-group">
              <button
                type="button"
                className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                All Formats
              </button>
              <button
                type="button"
                className={`filter-btn ${filterType === 'article' ? 'active' : ''}`}
                onClick={() => setFilterType('article')}
              >
                Articles
              </button>
              <button
                type="button"
                className={`filter-btn ${filterType === 'pdf' ? 'active' : ''}`}
                onClick={() => setFilterType('pdf')}
              >
                PDFs
              </button>
              <button
                type="button"
                className={`filter-btn ${filterType === 'image' ? 'active' : ''}`}
                onClick={() => setFilterType('image')}
              >
                Images
              </button>
            </div>
          </div>
        </div>

        {/* Resources Cards List */}
        {filteredNotes.length === 0 ? (
          <div className="resources-empty-state">
            <BookOpen size={36} />
            <h4>No Resources Found</h4>
            <p>No supplementary resources match the current filter. Use the form above to add one.</p>
          </div>
        ) : (
          <div className="resources-cards-grid">
            {filteredNotes.map((note) => {
              const isDraft = note.state === 'draft';

              return (
                <div key={note._id} className={`resource-card item-type-${note.type} ${isDraft ? 'is-draft' : ''}`}>
                  <div className="card-top-header">
                    <div className="card-type-icon-box">
                      {note.type === 'article' && <FileText size={20} />}
                      {note.type === 'pdf' && <BookOpen size={20} />}
                      {note.type === 'image' && <ImageIcon size={20} />}
                    </div>

                    <div className="card-state-actions">
                      <button
                        type="button"
                        className={`btn-state-badge state-${note.state}`}
                        onClick={() => handleToggleNoteState(note._id)}
                        title={`Click to set to ${isDraft ? 'Published' : 'Draft'}`}
                      >
                        {isDraft ? <EyeOff size={13} /> : <CheckCircle2 size={13} />}
                        <span>{isDraft ? 'Draft' : 'Published'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="card-body-content">
                    <h4 className="resource-card-title">{note.title}</h4>
                    <div className="resource-meta-chips">
                      <span className="meta-chip chip-scope">{getScopeLabel(note)}</span>
                      <span className="meta-chip chip-format">{note.type.toUpperCase()}</span>
                    </div>

                    {note.type === 'article' && note.content && (
                      <p className="article-preview-snip">
                        {note.content.substring(0, 120)}...
                      </p>
                    )}

                    {note.type === 'image' && note.mediaUrl && (
                      <div className="resource-thumb-preview">
                        <img src={note.mediaUrl} alt={note.title} />
                      </div>
                    )}
                  </div>

                  <div className="card-footer-toolbar">
                    <button
                      type="button"
                      className="btn-view-resource"
                      onClick={() => setViewingNote(note)}
                    >
                      <Eye size={14} />
                      <span>Preview Resource</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Resource Preview Modal / Drawer ── */}
      {viewingNote && (
        <div className="resource-preview-modal-overlay" onClick={() => setViewingNote(null)}>
          <div className="resource-preview-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <div className="preview-header-info">
                <h3>{viewingNote.title}</h3>
                <span className="modal-scope-tag">{getScopeLabel(viewingNote)}</span>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setViewingNote(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="preview-modal-body">
              {viewingNote.type === 'article' && (
                <div
                  className="article-modal-rendered md-rendered-content"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdownToHTML(viewingNote.content)
                  }}
                />
              )}

              {viewingNote.type === 'pdf' && (
                <div className="pdf-modal-preview">
                  <BookOpen size={48} className="pdf-large-icon" />
                  <h4>{viewingNote.title}</h4>
                  <p>PDF Document is attached to this course.</p>
                  {viewingNote.mediaUrl && (
                    <a
                      href={viewingNote.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary-action"
                    >
                      <ExternalLink size={15} />
                      <span>Open PDF Document</span>
                    </a>
                  )}
                </div>
              )}

              {viewingNote.type === 'image' && (
                <div className="image-modal-preview">
                  <img src={viewingNote.mediaUrl} alt={viewingNote.title} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
