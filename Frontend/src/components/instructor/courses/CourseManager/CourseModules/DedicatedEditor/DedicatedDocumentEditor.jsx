import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  BookOpen,
  FileText,
  UploadCloud,
  File,
  X,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Download,
  Trash2
} from 'lucide-react';
import { API_BASE } from '../../../../../../config/api';
import './DedicatedDocumentEditor.css';

export const DedicatedDocumentEditor = ({
  courseId,
  course = {},
  activeModule = {},
  activeLesson = {},
  initialItem = null,
  onBack,
  onSaveSuccess,
  onToggleSidebar,
  apiBase = API_BASE,
  getAuthHeader = () => ({}),
  toast
}) => {
  // Existing Item Tracking
  const [currentId, setCurrentId] = useState(() => initialItem?._id || initialItem?.itemId || null);
  const isEditingExisting = Boolean(currentId);

  // Document Details
  const [title, setTitle] = useState(() => initialItem?.title || `${activeLesson?.title || 'Lesson'} Reference Document`);
  const [description, setDescription] = useState(() => initialItem?.description || '');
  const [publicationStatus, setPublicationStatus] = useState(() => initialItem?.state || 'draft');

  // File Upload State
  const [fileUrl, setFileUrl] = useState(() => initialItem?.fileUrl || initialItem?.mediaUrl || '');
  const [fileName, setFileName] = useState(() => initialItem?.fileName || '');
  const [fileSize, setFileSize] = useState(() => initialItem?.fileSize || '');
  const [fileType, setFileType] = useState(() => initialItem?.type || 'pdf');

  // Upload progress & UI states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Save & Dirty Tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const fileInputRef = useRef(null);

  const markDirty = () => setHasUnsavedChanges(true);

  // Browser beforeunload protection
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Determine if file is a previewable PDF
  const isPdf = Boolean(
    (fileUrl && fileUrl.toLowerCase().includes('.pdf')) ||
    (fileName && fileName.toLowerCase().endsWith('.pdf')) ||
    fileType === 'pdf'
  );

  // File Upload Handler (Reusing existing curriculum upload service)
  const handleFileSelection = async (file) => {
    if (!file) return;

    setUploadError('');

    // Allowed extensions & mime types
    const validExts = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt'];
    const lowerName = file.name.toLowerCase();
    const isValidExt = validExts.some(ext => lowerName.endsWith(ext));

    if (!isValidExt && !file.type.includes('pdf') && !file.type.includes('document')) {
      setUploadError('Unsupported document format. Please upload PDF, Word, PowerPoint, Excel, or Text document.');
      return;
    }

    // Size limit: 50MB
    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError('File exceeds the 50MB size limit. Please choose a smaller document.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpointHeaders = getAuthHeader ? getAuthHeader() : {};
      const cleanHeaders = { ...endpointHeaders };
      delete cleanHeaders['Content-Type'];

      setUploadProgress(45);

      const uploadUrl = `${apiBase}/courses/${courseId}/curriculum/upload/resource`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: cleanHeaders,
        body: formData
      });

      setUploadProgress(80);
      const data = await res.json();

      if (data.success && (data.url || data.fileUrl || data.secure_url)) {
        const finalUrl = data.url || data.fileUrl || data.secure_url;
        const finalName = data.fileName || file.name;
        const finalSize = data.fileSize || `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

        setFileUrl(finalUrl);
        setFileName(finalName);
        setFileSize(finalSize);
        setFileType(lowerName.endsWith('.pdf') ? 'pdf' : 'document');
        setUploadProgress(100);

        // Auto-populate Title if default or empty
        if (!title || title.includes('Reference Document') || title.includes('Lesson')) {
          const cleanName = finalName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          if (cleanName.trim()) {
            setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
          }
        }

        markDirty();
        toast?.success?.(`Uploaded "${finalName}" successfully!`);
      } else {
        throw new Error(data.message || 'Server rejected file upload');
      }
    } catch (err) {
      console.error('Document upload error:', err);
      setUploadError(err.message || 'Network error uploading document. Please try again.');
      toast?.error?.(err.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove Document
  const handleRemoveDocument = () => {
    if (window.confirm('Remove attached document from this lesson item?')) {
      setFileUrl('');
      setFileName('');
      setFileSize('');
      markDirty();
      toast?.info?.('Attached document removed.');
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  // Save Document to Backend
  const handleSaveDocument = async () => {
    if (!title.trim()) {
      toast?.error?.('Please enter a Document Title.');
      return false;
    }

    if (!fileUrl && publicationStatus === 'published') {
      toast?.error?.('Please upload a document file before publishing.');
      return false;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        type: fileType || (fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'document'),
        state: fileUrl ? publicationStatus : 'draft',
        role: 'lesson_check',
        fileUrl: fileUrl,
        mediaUrl: fileUrl,
        fileName: fileName || title,
        fileSize: fileSize || 0
      };

      let url;
      let method;

      if (currentId) {
        url = `${apiBase}/courses/${courseId}/curriculum/lessons/${activeLesson._id}/items/${currentId}`;
        method = 'PATCH';
      } else {
        url = `${apiBase}/courses/${courseId}/curriculum/lessons/${activeLesson._id}/items`;
        method = 'POST';
      }

      const res = await fetch(url, {
        method,
        headers: getAuthHeader(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        toast?.success?.('Document resource saved successfully!');
        const savedItem = data.item || data.contentItem || payload;
        if (savedItem._id && !currentId) {
          setCurrentId(savedItem._id);
        }
        setHasUnsavedChanges(false);

        if (onSaveSuccess) {
          onSaveSuccess(savedItem);
        }
        return true;
      } else {
        toast?.error?.(data.message || 'Failed to save document.');
        return false;
      }
    } catch (err) {
      console.error('Save document network error:', err);
      toast?.error?.('Network error saving document.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Back Navigation with Dirty Check Confirmation Modal
  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
      return;
    }
    if (onBack) onBack();
  };

  return (
    <div className="dedicated-document-editor-container">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelection(file);
        }}
      />

      {/* ── Top Unified Header (Consistent with Quiz & Video Editor) ── */}
      <header className="dde-unified-header">
        <div className="dde-header-left">
          <button
            type="button"
            className="dde-btn-back-circle"
            onClick={handleBack}
            title="Back to Lesson Workspace"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="dde-header-title-cluster">
            <div className="dde-heading-badge-row">
              <h1 className="dde-main-title">PDF / Document Editor</h1>
              {activeLesson?.title && (
                <span className="dde-lesson-badge" title={activeLesson.title}>
                  Lesson: {activeLesson.title}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="dde-header-right">
          <div
            className={`dde-status-pill ${publicationStatus}`}
            onClick={() => {
              const nextStatus = publicationStatus === 'published' ? 'draft' : 'published';
              setPublicationStatus(nextStatus);
              markDirty();
              toast?.info?.(`Document marked as ${nextStatus}. Remember to save.`);
            }}
            title="Click to toggle publication status"
          >
            <span className="dde-status-dot" />
            <span className="dde-status-label">
              {publicationStatus === 'published' ? 'Published' : 'Draft'}
            </span>
          </div>

          <button
            type="button"
            className="dde-btn-save-document"
            onClick={handleSaveDocument}
            disabled={isSaving}
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check size={15} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Workspace ── */}
      <div className="dde-workspace-layout">
        {/* Card 1: Document Details */}
        <div className="dde-card dde-details-card">
          <div className="dde-card-header-bar">
            <div className="dde-card-header-left">
              <div className="dde-icon-badge">
                <BookOpen size={16} />
              </div>
              <h2 className="dde-card-title">Document Details</h2>
            </div>
            {fileName && (
              <div className="dde-stats-pill">
                <span>{fileSize || 'Attached'}</span>
              </div>
            )}
          </div>

          <div className="dde-form-grid">
            <div className="dde-form-group">
              <label className="dde-form-label">
                Document Title <span className="dde-req">*</span>
              </label>
              <input
                type="text"
                className="dde-form-input"
                placeholder="e.g. Chapter 1: Course Handout & Study Slides"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
              />
            </div>

            <div className="dde-form-group">
              <label className="dde-form-label">
                Description (Optional)
              </label>
              <input
                type="text"
                className="dde-form-input"
                placeholder="Brief summary of document contents for learners..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  markDirty();
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Upload Area or Attached Document Card */}
        <div className="dde-card dde-upload-card">
          <div className="dde-card-header-bar">
            <div className="dde-card-header-left">
              <div className="dde-icon-badge">
                <UploadCloud size={16} />
              </div>
              <h2 className="dde-card-title">
                {fileUrl ? 'Attached Learning Document' : 'Upload Learning Document'}
              </h2>
            </div>
          </div>

          {/* Upload Dropzone (When No File Attached or during Upload) */}
          {!fileUrl && !isUploading && (
            <div
              className={`dde-dropzone ${isDragOver ? 'is-dragover' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="dde-dropzone-icon-circle">
                <UploadCloud size={28} />
              </div>
              <h3 className="dde-dropzone-heading">
                Choose a PDF or Document from your device
              </h3>
              <p className="dde-dropzone-subtext">
                Drag and drop files here, or <span className="dde-link-highlight">browse files</span>
              </p>
              <div className="dde-dropzone-formats-badge">
                Supported: PDF, DOC, DOCX, PPT, PPTX, TXT (up to 50MB)
              </div>
            </div>
          )}

          {/* Uploading Progress Screen */}
          {isUploading && (
            <div className="dde-uploading-box">
              <RefreshCw size={28} className="dde-spinner-rotate text-brand" />
              <h4 className="dde-uploading-title">Uploading document to secure storage...</h4>
              <div className="dde-progress-bar-track">
                <div
                  className="dde-progress-bar-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="dde-uploading-percent">{uploadProgress}% complete</span>
            </div>
          )}

          {/* Upload Error Banner */}
          {uploadError && (
            <div className="dde-upload-error-banner">
              <AlertCircle size={15} />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Attached Document File Card */}
          {fileUrl && !isUploading && (
            <div className="dde-attached-card">
              <div className="dde-attached-left">
                <div className="dde-attached-icon-box">
                  <FileText size={24} />
                </div>
                <div className="dde-attached-info">
                  <span className="dde-attached-filename" title={fileName}>
                    {fileName || 'Uploaded Document'}
                  </span>
                  <div className="dde-attached-meta-row">
                    <span className="dde-badge-type">{isPdf ? 'PDF Document' : 'Document File'}</span>
                    <span className="dde-meta-sep">•</span>
                    <span className="dde-meta-size">{fileSize || 'Standard'}</span>
                    <span className="dde-meta-sep">•</span>
                    <span className="dde-badge-ready">Ready for Learners</span>
                  </div>
                </div>
              </div>

              <div className="dde-attached-actions">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dde-btn-action-open"
                  title="Open or download document in a new tab"
                >
                  <ExternalLink size={13} />
                  <span>Open in Tab</span>
                </a>
                <button
                  type="button"
                  className="dde-btn-action-replace"
                  onClick={() => fileInputRef.current?.click()}
                  title="Replace with a new document"
                >
                  <RefreshCw size={13} />
                  <span>Replace</span>
                </button>
                <button
                  type="button"
                  className="dde-btn-action-remove"
                  onClick={handleRemoveDocument}
                  title="Remove document"
                >
                  <Trash2 size={13} />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Document Preview Section */}
        {fileUrl && (
          <div className="dde-card dde-preview-card">
            <div className="dde-card-header-bar">
              <div className="dde-card-header-left">
                <div className="dde-icon-badge">
                  <BookOpen size={16} />
                </div>
                <h2 className="dde-card-title">Document Preview</h2>
              </div>
              <a
                href={fileUrl}
                download={fileName || 'document'}
                className="dde-btn-download-link"
              >
                <Download size={13} />
                <span>Download Document</span>
              </a>
            </div>

            <div className="dde-preview-body">
              {isPdf ? (
                <div className="dde-pdf-viewer-wrap">
                  <iframe
                    src={fileUrl}
                    className="dde-pdf-frame"
                    title="PDF Document Preview"
                  />
                </div>
              ) : (
                <div className="dde-non-pdf-info-card">
                  <File size={36} className="dde-doc-type-icon" />
                  <h4>{fileName}</h4>
                  <p>
                    Inline browser preview is enabled for PDF documents. Non-PDF files ({fileName.split('.').pop()?.toUpperCase() || 'files'}) are distributed as direct, secure learning downloads for your students.
                  </p>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dde-btn-primary-download"
                  >
                    <Download size={14} />
                    <span>Download / Open Document</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Unsaved Changes Confirmation Modal ── */}
      {showUnsavedModal && (
        <div className="dde-modal-backdrop">
          <div className="dde-modal-box">
            <div className="dde-modal-icon-wrap">
              <ArrowLeft size={22} />
            </div>
            <h3 className="dde-modal-title">Unsaved Changes</h3>
            <p className="dde-modal-message">
              You have unsaved changes in this document. Leaving without saving will discard your modifications.
            </p>
            <div className="dde-modal-actions">
              <button
                type="button"
                className="dde-btn-modal-cancel"
                onClick={() => setShowUnsavedModal(false)}
              >
                Continue Editing
              </button>
              <button
                type="button"
                className="dde-btn-modal-discard"
                onClick={() => {
                  setShowUnsavedModal(false);
                  setHasUnsavedChanges(false);
                  if (onBack) onBack();
                }}
              >
                Discard Changes
              </button>
              <button
                type="button"
                className="dde-btn-modal-save"
                onClick={async () => {
                  const ok = await handleSaveDocument();
                  if (ok) {
                    setShowUnsavedModal(false);
                    if (onBack) onBack();
                  }
                }}
              >
                Save & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
