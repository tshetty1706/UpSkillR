import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Check,
  FileText,
  UploadCloud,
  Columns,
  Eye,
  FileCode,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Code,
  Quote,
  Link as LinkIcon,
  Table as TableIcon,
  Minus,
  RefreshCw,
  Copy,
  CheckCheck
} from 'lucide-react';
import { API_BASE } from '../../../../../../config/api';
import './DedicatedArticleEditor.css';

/**
 * Enhanced Markdown to HTML renderer for live preview.
 * Strictly adheres to rule: NO images allowed in article Markdown.
 * Any ![alt](url) syntax is sanitized and not rendered as an <img> tag.
 */
export const renderArticleMarkdownToHTML = (markdown = '', onCopyCode) => {
  if (!markdown) return '';

  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (```lang\n...```)
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const cleanLang = lang.trim() || 'code';
    const cleanCode = code.trim();
    const encodedCode = encodeURIComponent(cleanCode);
    return `
      <div class="dae-codeblock-container">
        <div class="dae-codeblock-header">
          <span class="dae-codeblock-lang">${cleanLang}</span>
          <button type="button" class="dae-codeblock-copy-btn" data-code="${encodedCode}">
            Copy
          </button>
        </div>
        <pre class="dae-codeblock-body"><code>${cleanCode}</code></pre>
      </div>
    `;
  });

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="dae-inline-code">$1</code>');

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 class="dae-h3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="dae-h2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="dae-h1">$1</h1>');

  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote class="dae-blockquote">$1</blockquote>');

  // Bold, Italic, Underline, Strikethrough
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
  html = html.replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/g, '<u>$1</u>');

  // Horizontal Rule
  html = html.replace(/^---$/gim, '<hr class="dae-hr" />');

  // Strictly disallow/sanitize images: convert ![alt](url) to text so no <img> tag renders
  html = html.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '<span class="dae-image-blocked" title="Images are omitted in article notes">[Image: $1]</span>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="dae-link">$1</a>');

  // Tables
  const tableRegex = /((?:\|.+?\|\r?\n)+)/g;
  html = html.replace(tableRegex, (match) => {
    const rows = match.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return match;

    let tableHtml = '<div class="dae-table-wrap"><table class="dae-table">';
    let isHeader = true;

    rows.forEach((row, i) => {
      if (row.replace(/[\s|:-]/g, '').length === 0) {
        isHeader = false;
        return;
      }
      const cells = row.split('|').slice(1, -1);
      if (isHeader && i === 0) {
        tableHtml += '<thead><tr>';
        cells.forEach(cell => {
          tableHtml += `<th>${cell.trim()}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';
      } else {
        tableHtml += '<tr>';
        cells.forEach(cell => {
          tableHtml += `<td>${cell.trim()}</td>`;
        });
        tableHtml += '</tr>';
      }
    });
    tableHtml += '</tbody></table></div>';
    return tableHtml;
  });

  // Bullet and Numbered Lists
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="dae-li-bullet">$1</li>');
  html = html.replace(/(<li class="dae-li-bullet">[\s\S]*?<\/li>)/gm, '<ul class="dae-ul">$1</ul>');
  html = html.replace(/<\/ul>\s*<ul class="dae-ul">/g, '');

  html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="dae-li-num">$1</li>');
  html = html.replace(/(<li class="dae-li-num">[\s\S]*?<\/li>)/gm, '<ol class="dae-ol">$1</ol>');
  html = html.replace(/<\/ol>\s*<ol class="dae-ol">/g, '');

  // Paragraphs
  const lines = html.split('\n');
  const formattedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (
      trimmed.startsWith('<h1') ||
      trimmed.startsWith('<h2') ||
      trimmed.startsWith('<h3') ||
      trimmed.startsWith('<blockquote') ||
      trimmed.startsWith('<div') ||
      trimmed.startsWith('<pre') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('<ol') ||
      trimmed.startsWith('<li') ||
      trimmed.startsWith('<table') ||
      trimmed.startsWith('<hr')
    ) {
      return line;
    }
    return `<p class="dae-p">${trimmed}</p>`;
  });

  return formattedLines.join('\n');
};

export const DedicatedArticleEditor = ({
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

  // Article Details
  const [title, setTitle] = useState(() => initialItem?.title || `${activeLesson?.title || 'Lesson'} Notes`);
  const [description, setDescription] = useState(() => initialItem?.description || '');
  const [publicationStatus, setPublicationStatus] = useState(() => initialItem?.state || 'draft');

  // Markdown Content
  const [markdownContent, setMarkdownContent] = useState(() => {
    return initialItem?.markdownContent ||
      initialItem?.content ||
      initialItem?.bodyMarkdown ||
      `# ${activeLesson?.title || 'Lesson Notes'}\n\nWrite your learning content here using Markdown...\n`;
  });

  // View Mode: 'write' | 'preview' | 'split'
  const [viewMode, setViewMode] = useState('write');

  // Save & Dirty Tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Refs
  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const markdownFileInputRef = useRef(null);

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

  // Handle Copy Button Click inside Code Blocks in Live Preview
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    const handleCopyClick = async (e) => {
      const copyBtn = e.target.closest('.dae-codeblock-copy-btn');
      if (!copyBtn) return;

      const encoded = copyBtn.getAttribute('data-code');
      if (encoded) {
        const decoded = decodeURIComponent(encoded);
        try {
          await navigator.clipboard.writeText(decoded);
          const originalText = copyBtn.innerText;
          copyBtn.innerText = 'Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.innerText = originalText;
            copyBtn.classList.remove('copied');
          }, 2000);
          toast?.success?.('Code copied to clipboard!');
        } catch (err) {
          console.warn('Clipboard write failed:', err);
        }
      }
    };

    container.addEventListener('click', handleCopyClick);
    return () => container.removeEventListener('click', handleCopyClick);
  }, [markdownContent, viewMode]);

  // Word and Character Counts
  const stats = useMemo(() => {
    const text = markdownContent.trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const chars = text.length;
    return { words, chars };
  }, [markdownContent]);

  // Rendered HTML Preview
  const renderedHTML = useMemo(() => {
    return renderArticleMarkdownToHTML(markdownContent);
  }, [markdownContent]);

  // Formatting Toolbar Helper
  const insertFormatting = (prefix, suffix = '', defaultPlaceholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const selectedText = currentVal.substring(start, end) || defaultPlaceholder;
    const replacement = `${prefix}${selectedText}${suffix}`;

    const nextVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);
    setMarkdownContent(nextVal);
    markDirty();

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  // Upload & Import Markdown File (.md, .markdown)
  const handleImportMarkdownFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isMd = file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.type.includes('markdown') || file.type.includes('text');
    if (!isMd) {
      toast?.error?.('Please select a valid Markdown (.md or .markdown) file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast?.error?.('Markdown file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        if (!text.trim()) {
          toast?.warning?.('Selected file is empty.');
          return;
        }
        setMarkdownContent(text);
        markDirty();

        // If title is default or empty, infer from filename
        if (!title || title.includes('Notes') || title.includes('Lesson')) {
          const cleanName = file.name.replace(/\.(md|markdown)$/i, '').replace(/[-_]/g, ' ');
          if (cleanName.trim()) {
            setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
          }
        }
        toast?.success?.(`Imported "${file.name}" into Markdown editor.`);
      }
    };
    reader.onerror = () => {
      toast?.error?.('Failed to read the selected file.');
    };
    reader.readAsText(file);

    // Reset input so re-selecting same file triggers onChange
    if (markdownFileInputRef.current) {
      markdownFileInputRef.current.value = '';
    }
  };

  // Save Article to Backend
  const handleSaveArticle = async () => {
    if (!title.trim()) {
      toast?.error?.('Please enter an Article Title.');
      return;
    }

    if (!markdownContent.trim()) {
      toast?.error?.('Article Markdown content cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        type: 'article_md',
        state: publicationStatus,
        role: 'lesson_check',
        markdownContent: markdownContent.trim(),
        content: markdownContent.trim(),
        bodyMarkdown: markdownContent.trim()
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
        toast?.success?.('Article saved successfully!');
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
        toast?.error?.(data.message || 'Failed to save article.');
        return false;
      }
    } catch (err) {
      console.error('Save article network error:', err);
      toast?.error?.('Network error saving article.');
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
    <div className="dedicated-article-editor-container">
      {/* Hidden file input for importing Markdown files */}
      <input
        ref={markdownFileInputRef}
        type="file"
        accept=".md,.markdown,text/markdown,text/plain"
        style={{ display: 'none' }}
        onChange={handleImportMarkdownFile}
      />

      {/* ── Top Unified Header (Consistent with Quiz & Video Editor) ── */}
      <header className="dae-unified-header">
        <div className="dae-header-left">
          <button
            type="button"
            className="dae-btn-back-circle"
            onClick={handleBack}
            title="Back to Lesson Workspace"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="dae-header-title-cluster">
            {/* Breadcrumb Navigation */}
            <div className="dae-breadcrumb-row">
              <span className="dae-breadcrumb-item">Courses</span>
              <span className="dae-breadcrumb-sep">/</span>
              <span className="dae-breadcrumb-item" title={course?.title}>
                {course?.title ? (course.title.length > 20 ? course.title.slice(0, 20) + '...' : course.title) : 'Course'}
              </span>
              <span className="dae-breadcrumb-sep">/</span>
              <span className="dae-breadcrumb-item" title={activeModule?.title}>
                {activeModule?.title ? (activeModule.title.length > 20 ? activeModule.title.slice(0, 20) + '...' : activeModule.title) : 'Module'}
              </span>
              <span className="dae-breadcrumb-sep">/</span>
              <span className="dae-breadcrumb-item" title={activeLesson?.title}>
                {activeLesson?.title ? (activeLesson.title.length > 20 ? activeLesson.title.slice(0, 20) + '...' : activeLesson.title) : 'Lesson'}
              </span>
              <span className="dae-breadcrumb-sep">/</span>
              <span className="dae-breadcrumb-current">Article Editor</span>
            </div>

            <div className="dae-heading-badge-row">
              <h1 className="dae-main-title">Article Editor</h1>
              {activeLesson?.title && (
                <span className="dae-lesson-badge" title={activeLesson.title}>
                  Lesson: {activeLesson.title}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="dae-header-right">
          <div
            className={`dae-status-pill ${publicationStatus}`}
            onClick={() => {
              const nextStatus = publicationStatus === 'published' ? 'draft' : 'published';
              setPublicationStatus(nextStatus);
              markDirty();
              toast?.info?.(`Article marked as ${nextStatus}. Remember to save.`);
            }}
            title="Click to toggle publication status"
          >
            <span className="dae-status-dot" />
            <span className="dae-status-label">
              {publicationStatus === 'published' ? 'Published' : 'Draft'}
            </span>
          </div>

          <button
            type="button"
            className="dae-btn-save-article"
            onClick={handleSaveArticle}
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
      <div className="dae-workspace-layout">
        {/* Card 1: Article Details (Title & Optional Description) */}
        <div className="dae-card dae-details-card">
          <div className="dae-card-header-bar">
            <div className="dae-card-header-left">
              <div className="dae-icon-badge">
                <FileText size={16} />
              </div>
              <h2 className="dae-card-title">Article Details</h2>
            </div>
            <div className="dae-stats-pill">
              <span>{stats.words} words</span>
              <span className="dae-stats-dot" />
              <span>{stats.chars} characters</span>
            </div>
          </div>

          <div className="dae-form-grid">
            <div className="dae-form-group">
              <label className="dae-form-label">
                Article Title <span className="dae-req">*</span>
              </label>
              <input
                type="text"
                className="dae-form-input"
                placeholder="e.g. Introduction to React State and Hooks"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
              />
            </div>

            <div className="dae-form-group">
              <label className="dae-form-label">
                Short Description (Optional)
              </label>
              <input
                type="text"
                className="dae-form-input"
                placeholder="Brief summary for learners before reading..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  markDirty();
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Markdown Editor Area */}
        <div className="dae-card dae-editor-card">
          {/* Top Control Bar: View Modes + Import Markdown File */}
          <div className="dae-editor-top-bar">
            <div className="dae-view-mode-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'write'}
                className={`dae-mode-tab-btn ${viewMode === 'write' ? 'is-active' : ''}`}
                onClick={() => setViewMode('write')}
              >
                <FileCode size={13} />
                <span>Write</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'preview'}
                className={`dae-mode-tab-btn ${viewMode === 'preview' ? 'is-active' : ''}`}
                onClick={() => setViewMode('preview')}
              >
                <Eye size={13} />
                <span>Preview</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'split'}
                className={`dae-mode-tab-btn ${viewMode === 'split' ? 'is-active' : ''}`}
                onClick={() => setViewMode('split')}
              >
                <Columns size={13} />
                <span>Split View</span>
              </button>
            </div>

            <div className="dae-editor-top-actions">
              <button
                type="button"
                className="dae-btn-import-md"
                onClick={() => markdownFileInputRef.current?.click()}
                title="Upload and import Markdown file (.md) from device"
              >
                <UploadCloud size={13} />
                <span>Import Markdown (.md)</span>
              </button>
            </div>
          </div>

          {/* Formatting Toolbar (Shown in Write and Split Views) */}
          {(viewMode === 'write' || viewMode === 'split') && (
            <div className="dae-formatting-toolbar">
              <button
                type="button"
                className="dae-tool-btn"
                onClick={() => insertFormatting('# ', '', 'Heading 1')}
                title="Heading 1"
              >
                <span className="dae-tool-text">H1</span>
              </button>
              <button
                type="button"
                className="dae-tool-btn"
                onClick={() => insertFormatting('## ', '', 'Heading 2')}
                title="Heading 2"
              >
                <span className="dae-tool-text">H2</span>
              </button>
              <button
                type="button"
                className="dae-tool-btn"
                onClick={() => insertFormatting('### ', '', 'Heading 3')}
                title="Heading 3"
              >
                <span className="dae-tool-text">H3</span>
              </button>

              <div className="dae-tool-divider" />

              <button
                type="button"
                className="dae-tool-btn"
                onClick={() => insertFormatting('**', '**', 'bold text')}
                title="Bold"
              >
                <Bold size={13} />
              </button>
              <button
                type="button"
                className="dae-tool-btn"
                onClick={() => insertFormatting('*', '*', 'italic text')}
                title="Italic"
              >
                <Italic size={13} />
              </button>
              <button
                type="button"
                className="dae-tool-btn"
                onClick={() => insertFormatting('<u>', '</u>', 'underlined text')}
                title="Underline"
              >
                <Underline size={13} />
              </button>
              <button
                type="button"
                className="dae-tool-btn"
                onClick={() => insertFormatting('~~', '~~', 'strikethrough')}
                title="Strikethrough"
              >
                <Strikethrough size={13} />
              </button>

              <div className="dae-tool-divider" />

              <button
                type="button"
                className="dae-tool-btn"
                onClick={() => insertFormatting('\n- ', '', 'List item')}
                title="Bullet List"
              >
                <List size={13} />
              </button>
              <button
                type="button"
                className="dae-tool-btn"
                onClick={() => insertFormatting('\n1. ', '', 'Item')}
                title="Numbered List"
              >
                <ListOrdered size={13} />
              </button>
              <button
                type="button"
                className="dae-tool-btn"
                onClick={() => insertFormatting('\n> ', '', 'Quote')}
                title="Blockquote"
              >
                <Quote size={13} />
              </button>

              <div className="dae-tool-divider" />

              <button
                type="button"
                className="dae-tool-btn"
                onClick={() => insertFormatting('\n```javascript\n', '\n```\n', '// write code here')}
                title="Code Block"
              >
                <Code size={13} />
              </button>
              <button
                type="button"
                className="dae-tool-btn"
                onClick={() => insertFormatting('`', '`', 'inline_code')}
                title="Inline Code"
              >
                <span className="dae-tool-text">&lt;&gt;</span>
              </button>
              <button
                type="button"
                className="dae-tool-btn"
                onClick={() => insertFormatting('[', '](https://)', 'Link text')}
                title="Insert Link"
              >
                <LinkIcon size={13} />
              </button>
              <button
                type="button"
                className="dae-tool-btn"
                onClick={() => insertFormatting('\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Item 1   | Item 2   |\n')}
                title="Insert Table"
              >
                <TableIcon size={13} />
              </button>
              <button
                type="button"
                className="dae-tool-btn"
                onClick={() => insertFormatting('\n---\n')}
                title="Horizontal Divider"
              >
                <Minus size={13} />
              </button>
            </div>
          )}

          {/* Editor Canvas Area */}
          <div className={`dae-canvas-area ${viewMode}`}>
            {/* Write View */}
            {(viewMode === 'write' || viewMode === 'split') && (
              <div className="dae-pane-write">
                <textarea
                  ref={textareaRef}
                  className="dae-markdown-textarea"
                  placeholder="# Write your article here in Markdown..."
                  value={markdownContent}
                  onChange={(e) => {
                    setMarkdownContent(e.target.value);
                    markDirty();
                  }}
                  spellCheck="false"
                />
              </div>
            )}

            {/* Preview View */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className="dae-pane-preview" ref={previewRef}>
                <div
                  className="dae-rendered-content"
                  dangerouslySetInnerHTML={{ __html: renderedHTML }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Unsaved Changes Confirmation Modal ── */}
      {showUnsavedModal && (
        <div className="dae-modal-backdrop">
          <div className="dae-modal-box">
            <div className="dae-modal-icon-wrap">
              <ArrowLeft size={22} />
            </div>
            <h3 className="dae-modal-title">Unsaved Changes</h3>
            <p className="dae-modal-message">
              You have unsaved changes in this article. Leaving without saving will discard your modifications.
            </p>
            <div className="dae-modal-actions">
              <button
                type="button"
                className="dae-btn-modal-cancel"
                onClick={() => setShowUnsavedModal(false)}
              >
                Continue Editing
              </button>
              <button
                type="button"
                className="dae-btn-modal-discard"
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
                className="dae-btn-modal-save"
                onClick={async () => {
                  const ok = await handleSaveArticle();
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
