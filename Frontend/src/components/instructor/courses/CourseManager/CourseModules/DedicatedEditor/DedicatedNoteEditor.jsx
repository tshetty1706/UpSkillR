import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Eye,
  ArrowLeft,
  Check,
  FileText,
  UploadCloud,
  Columns,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Terminal,
  Copy,
  CheckCheck,
  AlertCircle,
  FileCode,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { API_BASE } from '../../../../../../config/api';
import { DeviceFileUploader } from '../Common/DeviceFileUploader';
import './DedicatedNoteEditor.css';

/**
 * Enhanced Markdown to HTML renderer for live preview
 * Renders styled code blocks with language header badges and copy buttons
 */
export const renderEnhancedMarkdown = (markdown = '', onCopyCode) => {
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
      <div class="dne-codeblock-container">
        <div class="dne-codeblock-header">
          <span>${cleanLang}</span>
          <button type="button" class="dne-codeblock-copy-btn" data-code="${encodedCode}">
            Copy
          </button>
        </div>
        <pre class="dne-codeblock-body"><code>${cleanCode}</code></pre>
      </div>
    `;
  });

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="md-h1">$1</h1>');

  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote class="md-blockquote">$1</blockquote>');

  // Bold, Italic, Underline, Strikethrough
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
  html = html.replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/g, '<u>$1</u>');

  // Horizontal Rule
  html = html.replace(/^---$/gim, '<hr class="md-hr" style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#10b981;text-decoration:underline;">$1</a>');

  // Tables
  const tableRegex = /((?:\|.+?\|\r?\n)+)/g;
  html = html.replace(tableRegex, (match) => {
    const rows = match.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return match;

    let tableHtml = '<div style="overflow-x:auto;margin:14px 0;"><table style="width:100%;border-collapse:collapse;border:1px solid #cbd5e1;">';
    let isHeader = true;

    rows.forEach((row, i) => {
      if (row.replace(/[\s|:-]/g, '').length === 0) {
        isHeader = false;
        return;
      }
      const cells = row.split('|').slice(1, -1);
      if (isHeader && i === 0) {
        tableHtml += '<thead style="background:#f1f5f9;"><tr>';
        cells.forEach(cell => {
          tableHtml += `<th style="padding:8px 12px;border:1px solid #cbd5e1;text-align:left;font-size:0.85rem;">${cell.trim()}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';
      } else {
        tableHtml += '<tr>';
        cells.forEach(cell => {
          tableHtml += `<td style="padding:8px 12px;border:1px solid #cbd5e1;font-size:0.85rem;">${cell.trim()}</td>`;
        });
        tableHtml += '</tr>';
      }
    });
    tableHtml += '</tbody></table></div>';
    return tableHtml;
  });

  // Lists
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li style="margin-left:20px;list-style-type:disc;">$1</li>');
  html = html.replace(/(<li style="margin-left:20px;list-style-type:disc;">[\s\S]*?<\/li>)/gm, '<ul style="margin:8px 0;padding-left:10px;">$1</ul>');
  html = html.replace(/<\/ul>\s*<ul style="margin:8px 0;padding-left:10px;">/g, '');

  html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li style="margin-left:20px;list-style-type:decimal;">$1</li>');
  html = html.replace(/(<li style="margin-left:20px;list-style-type:decimal;">[\s\S]*?<\/li>)/gm, '<ol style="margin:8px 0;padding-left:10px;">$1</ol>');
  html = html.replace(/<\/ol>\s*<ol style="margin:8px 0;padding-left:10px;">/g, '');

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
    return `<p class="md-p">${trimmed}</p>`;
  });

  return formattedLines.join('\n');
};

export const DedicatedNoteEditor = ({
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
  // Determine if editing existing item
  const [currentId, setCurrentId] = useState(() => initialItem?._id || initialItem?.itemId || null);
  const isEditingExisting = Boolean(currentId);

  // Source tab: 'markdown' | 'upload'
  const [sourceTab, setSourceTab] = useState(() => {
    if (initialItem?.type === 'pdf' || initialItem?.type === 'document' || initialItem?.initialTab === 'upload') {
      return 'upload';
    }
    return 'markdown';
  });

  // Note Details
  const [title, setTitle] = useState(() => initialItem?.title || `${activeLesson?.title || 'Lesson'} Notes`);
  const [description, setDescription] = useState(() => initialItem?.description || '');
  const [publicationStatus, setPublicationStatus] = useState(() => initialItem?.state || 'draft');
  const [contentType, setContentType] = useState(() => initialItem?.type || 'article_md');

  // Markdown Content
  const [markdownContent, setMarkdownContent] = useState(() => {
    return initialItem?.markdownContent || initialItem?.content || initialItem?.bodyMarkdown || `# ${activeLesson?.title || 'Lesson Notes'}\n\nWrite your note content here using Markdown...\n`;
  });

  // Document Upload Details (for PDF / Doc items)
  const [documentUrl, setDocumentUrl] = useState(() => initialItem?.fileUrl || initialItem?.mediaUrl || '');
  const [documentName, setDocumentName] = useState(() => initialItem?.fileName || '');
  const [documentSize, setDocumentSize] = useState(() => initialItem?.fileSize || 0);

  // Editor View Mode: 'split' | 'editor' | 'preview'
  const [viewMode, setViewMode] = useState('split');

  // Dirty State & Saving
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragOverMd, setIsDragOverMd] = useState(false);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewRef = useRef(null);

  // Track dirty changes
  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveNote();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, description, publicationStatus, markdownContent, documentUrl, currentId, contentType]);

  // Handle Code Copy inside Preview
  useEffect(() => {
    const previewEl = previewRef.current;
    if (!previewEl) return;

    const handleCopyClick = (e) => {
      const copyBtn = e.target.closest('.dne-codeblock-copy-btn');
      if (!copyBtn) return;
      const encoded = copyBtn.getAttribute('data-code');
      if (encoded) {
        const decoded = decodeURIComponent(encoded);
        navigator.clipboard.writeText(decoded).then(() => {
          copyBtn.innerText = 'Copied!';
          setTimeout(() => {
            if (copyBtn) copyBtn.innerText = 'Copy';
          }, 2000);
          toast?.success?.('Code snippet copied to clipboard');
        });
      }
    };

    previewEl.addEventListener('click', handleCopyClick);
    return () => previewEl.removeEventListener('click', handleCopyClick);
  }, [markdownContent]);

  // Dynamic Word Count
  const wordCount = useMemo(() => {
    if (!markdownContent || !markdownContent.trim()) return 0;
    return markdownContent.trim().split(/\s+/).filter(Boolean).length;
  }, [markdownContent]);

  // Line numbers calculation
  const lineCount = useMemo(() => {
    return (markdownContent || '').split('\n').length;
  }, [markdownContent]);

  // Toolbar Formatting Helpers
  const insertFormatting = (prefix, suffix = '', defaultText = '') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = markdownContent.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;

    const newContent =
      markdownContent.substring(0, start) +
      replacement +
      markdownContent.substring(end);

    setMarkdownContent(newContent);
    markDirty();

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const handleHeadingChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    insertFormatting(val + ' ', '', 'Heading Text');
    e.target.value = '';
  };

  const handleInsertTable = () => {
    const tableTemplate = `\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Item 1 | Details | Value |\n| Item 2 | Details | Value |\n\n`;
    insertFormatting(tableTemplate);
  };

  const handleInsertCodeBlock = () => {
    const codeTemplate = `\n\`\`\`bash\nsrc/\n  controllers/\n  routes/\n  models/\n\`\`\`\n`;
    insertFormatting(codeTemplate);
  };

  // Back Navigation with dirty check
  const handleBack = () => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        'You have unsaved changes in your note. Are you sure you want to discard them and return to the module?'
      );
      if (!confirmLeave) return;
    }
    if (onBack) onBack();
  };

  // Import Markdown (.md) File
  const handleImportMarkdownFile = (file) => {
    if (!file) return;

    const isMd = file.name.endsWith('.md') || file.type.includes('markdown') || file.type.includes('text');
    if (!isMd) {
      toast?.error?.('Please select a valid Markdown (.md) file');
      return;
    }

    if (markdownContent && markdownContent.trim().length > 30) {
      const confirmReplace = window.confirm(
        'Importing this file will replace your current editor content. Do you want to continue?'
      );
      if (!confirmReplace) return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (!text || !text.trim()) {
        toast?.error?.('The selected Markdown file is empty');
        return;
      }

      setMarkdownContent(text);
      setContentType('article_md');
      setSourceTab('markdown');
      markDirty();

      // If title is default or empty, set from file name or first H1
      const cleanFileName = file.name.replace(/\.[^/.]+$/, '');
      if (!title || title.includes('Lesson Notes') || title.includes('Lesson')) {
        const firstH1Match = text.match(/^#\s+(.+)$/m);
        if (firstH1Match && firstH1Match[1]) {
          setTitle(firstH1Match[1].trim());
        } else {
          setTitle(cleanFileName);
        }
      }

      toast?.success?.(`Successfully imported "${file.name}" into editor!`);
    };

    reader.onerror = () => {
      toast?.error?.('Failed to read the selected file. Please try again.');
    };

    reader.readAsText(file);
  };

  // Save Note Action
  const handleSaveNote = async () => {
    if (!title || !title.trim()) {
      toast?.error?.('Please provide a note title before saving.');
      return;
    }

    // Determine target content payload
    const isDoc = contentType === 'pdf' || contentType === 'document' || sourceTab === 'upload';

    if (!isDoc && (!markdownContent || !markdownContent.trim())) {
      toast?.error?.('Please write or import Markdown content before saving.');
      return;
    }

    if (isDoc && !documentUrl) {
      toast?.error?.('Please upload a document file or switch to Markdown writing mode.');
      return;
    }

    setIsSaving(true);

    try {
      const lessonId = activeLesson?._id;
      if (!lessonId) {
        toast?.error?.('Missing lesson identifier. Please return to the module and re-open.');
        setIsSaving(false);
        return;
      }

      const method = isEditingExisting ? 'PATCH' : 'POST';
      const endpoint = isEditingExisting
        ? `${apiBase}/courses/${courseId}/curriculum/lessons/${lessonId}/items/${currentId}`
        : `${apiBase}/courses/${courseId}/curriculum/lessons/${lessonId}/items`;

      const finalType = isDoc ? (contentType === 'pdf' ? 'pdf' : 'document') : 'article_md';

      const payload = {
        type: finalType,
        title: title.trim(),
        description: description.trim(),
        state: publicationStatus,
        markdownContent: markdownContent.trim(),
        content: markdownContent.trim(),
        bodyMarkdown: markdownContent.trim(),
        fileUrl: documentUrl || '',
        mediaUrl: documentUrl || '',
        fileName: documentName || '',
        fileSize: documentSize || 0
      };

      const res = await fetch(endpoint, {
        method,
        headers: getAuthHeader(),
        body: JSON.stringify(payload)
      });

      const resData = await res.json();

      if (resData.success) {
        const savedItem = resData.item || { ...payload, _id: currentId || resData.itemId };
        if (!isEditingExisting && savedItem._id) {
          setCurrentId(savedItem._id);
        }
        setIsDirty(false);
        toast?.success?.(isEditingExisting ? 'Note saved successfully!' : 'Note created successfully!');
        if (onSaveSuccess) onSaveSuccess(savedItem);
      } else {
        toast?.error?.(resData.message || 'Failed to save note');
      }
    } catch (err) {
      console.error('Error saving note:', err);
      toast?.error?.('Network error saving note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="dedicated-note-editor-container">
      {/* ── Top Header Actions Bar (Section 3.A & Image 2) ── */}
      <div className="dne-top-header">
        <div className="dne-header-left-group">
          <button
            type="button"
            className="dne-btn-back-link"
            onClick={handleBack}
            title="Return to Module Workspace"
          >
            <ArrowLeft size={16} />
            <span>Back to Module</span>
          </button>
        </div>

        <div className="dne-header-actions">
          {/* Status Pill Toggle */}
          <span
            className={`dne-status-pill ${publicationStatus}`}
            onClick={() => {
              const next = publicationStatus === 'published' ? 'draft' : 'published';
              setPublicationStatus(next);
              markDirty();
            }}
            title="Click to toggle between Draft and Published"
            style={{ cursor: 'pointer' }}
          >
            • {publicationStatus === 'published' ? 'Published' : 'Draft'}
          </span>

          {/* Save Note */}
          <button
            type="button"
            className="dne-btn-save-note"
            onClick={handleSaveNote}
            disabled={isSaving}
          >
            <Check size={16} />
            <span>{isSaving ? 'Saving...' : 'Save Note'}</span>
          </button>
        </div>
      </div>

      {/* ── Subheader Title Row (Image 2) ── */}
      <div className="dne-page-title-row">
        <div className="dne-title-icon-badge">
          <FileText size={22} />
        </div>
        <div className="dne-page-titles">
          <h2 className="dne-page-title">Note Editor</h2>
          <p className="dne-page-subtitle">
            Create study notes, upload documents, or write a detailed article using Markdown.
          </p>
        </div>
      </div>

      {/* ── Main Workspace Grid (Left Editor 70% + Right Details 30%) ── */}
      <div className="dne-workspace-grid">
        {/* ════════════════════════════════════════════════════════════
            LEFT COLUMN: MAIN EDITOR (Section 3.B, 3.C & Image 2)
            ════════════════════════════════════════════════════════════ */}
        <div className="dne-main-editor-column">
          {/* Source Tabs (Image 2 - Notice 'Use a Template' is intentionally excluded per Section 3.D) */}
          <div className="dne-source-tabs-row">
            <button
              type="button"
              className={`dne-source-tab-btn ${sourceTab === 'markdown' ? 'active' : ''}`}
              onClick={() => {
                setSourceTab('markdown');
                setContentType('article_md');
              }}
            >
              <FileCode size={15} />
              <span>Write with Markdown</span>
            </button>

            <button
              type="button"
              className={`dne-source-tab-btn ${sourceTab === 'upload' ? 'active' : ''}`}
              onClick={() => {
                setSourceTab('upload');
              }}
            >
              <UploadCloud size={15} />
              <span>Upload Document</span>
            </button>
          </div>

          {/* TAB 1: WRITE WITH MARKDOWN */}
          {sourceTab === 'markdown' && (
            <div className="dne-editor-card">
              {/* Markdown Toolbar */}
              <div className="dne-markdown-toolbar">
                <div className="dne-toolbar-left">
                  {/* Heading Select */}
                  <select
                    className="dne-heading-select"
                    onChange={handleHeadingChange}
                    defaultValue=""
                    title="Insert heading level"
                  >
                    <option value="" disabled>Heading Level</option>
                    <option value="# ">Heading 1</option>
                    <option value="## ">Heading 2</option>
                    <option value="### ">Heading 3</option>
                    <option value="">Paragraph</option>
                  </select>

                  <button
                    type="button"
                    className="dne-tool-btn"
                    onClick={() => insertFormatting('**', '**', 'bold text')}
                    title="Bold (**text**)"
                  >
                    <Bold size={15} />
                  </button>

                  <button
                    type="button"
                    className="dne-tool-btn"
                    onClick={() => insertFormatting('*', '*', 'italic text')}
                    title="Italic (*text*)"
                  >
                    <Italic size={15} />
                  </button>

                  <button
                    type="button"
                    className="dne-tool-btn"
                    onClick={() => insertFormatting('<u>', '</u>', 'underlined text')}
                    title="Underline"
                  >
                    <Underline size={15} />
                  </button>

                  <button
                    type="button"
                    className="dne-tool-btn"
                    onClick={() => insertFormatting('~~', '~~', 'strikethrough text')}
                    title="Strikethrough (~~text~~)"
                  >
                    <Strikethrough size={15} />
                  </button>

                  <div className="dne-toolbar-divider" />

                  <button
                    type="button"
                    className="dne-tool-btn"
                    onClick={() => insertFormatting('- ', '', 'List item')}
                    title="Bullet List"
                  >
                    <List size={15} />
                  </button>

                  <button
                    type="button"
                    className="dne-tool-btn"
                    onClick={() => insertFormatting('1. ', '', 'Numbered item')}
                    title="Numbered List"
                  >
                    <ListOrdered size={15} />
                  </button>

                  <div className="dne-toolbar-divider" />

                  <button
                    type="button"
                    className="dne-tool-btn"
                    onClick={() => insertFormatting('`', '`', 'code')}
                    title="Inline Code"
                  >
                    <Code size={15} />
                  </button>

                  <button
                    type="button"
                    className="dne-tool-btn"
                    onClick={() => insertFormatting('[', '](https://example.com)', 'Link text')}
                    title="Insert Link"
                  >
                    <LinkIcon size={15} />
                  </button>

                  <button
                    type="button"
                    className="dne-tool-btn"
                    onClick={() => insertFormatting('![', '](https://example.com/image.png)', 'Image Alt')}
                    title="Insert Image"
                  >
                    <ImageIcon size={15} />
                  </button>

                  <button
                    type="button"
                    className="dne-tool-btn"
                    onClick={handleInsertTable}
                    title="Insert Table"
                  >
                    <TableIcon size={15} />
                  </button>

                  <button
                    type="button"
                    className="dne-tool-btn"
                    onClick={handleInsertCodeBlock}
                    title="Fenced Code Block"
                  >
                    <Terminal size={15} />
                  </button>
                </div>

                {/* View Mode Controls (Image 2) */}
                <div className="dne-toolbar-right">
                  <button
                    type="button"
                    className={`dne-view-mode-btn ${viewMode === 'preview' ? 'active' : ''}`}
                    onClick={() => setViewMode(viewMode === 'preview' ? 'split' : 'preview')}
                    title="Toggle Preview only"
                  >
                    <Eye size={13} />
                    <span>Preview</span>
                  </button>

                  <button
                    type="button"
                    className={`dne-view-mode-btn ${viewMode === 'split' ? 'active' : ''}`}
                    onClick={() => setViewMode(viewMode === 'split' ? 'editor' : 'split')}
                    title="Toggle Split View"
                  >
                    <Columns size={13} />
                    <span>Split</span>
                  </button>
                </div>
              </div>

              {/* Editor Panes: Line Numbers + Textarea + Live Preview */}
              <div className={`dne-editor-panes-wrapper mode-${viewMode === 'split' ? 'split' : viewMode === 'preview' ? 'preview-only' : 'editor-only'}`}>
                {/* Left Code Area */}
                {viewMode !== 'preview' && (
                  <div className="dne-code-pane">
                    <div className="dne-line-numbers-gutter" aria-hidden="true">
                      {Array.from({ length: Math.max(1, lineCount) }).map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>

                    <textarea
                      ref={textareaRef}
                      className="dne-markdown-textarea"
                      value={markdownContent}
                      placeholder="# Enter note title&#10;&#10;Write detailed notes here using Markdown..."
                      onChange={(e) => {
                        setMarkdownContent(e.target.value);
                        markDirty();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          insertFormatting('  ');
                        }
                      }}
                      spellCheck={false}
                    />
                  </div>
                )}

                {/* Right Rendered Preview */}
                {viewMode !== 'editor' && (
                  <div
                    ref={previewRef}
                    className="dne-preview-pane"
                    dangerouslySetInnerHTML={{
                      __html: renderEnhancedMarkdown(markdownContent)
                    }}
                  />
                )}
              </div>

              {/* Editor Bottom Status Bar (Image 2) */}
              <div className="dne-editor-statusbar">
                <span>Markdown supported • Ctrl + S to save</span>
                <span>Words: {wordCount}</span>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD DOCUMENT (Section 4 & 7) */}
          {sourceTab === 'upload' && (
            <div className="dne-editor-card dne-upload-document-view">
              {/* Section A: Import Markdown File */}
              <div className="dne-upload-card-section">
                <h3 className="dne-upload-section-title">
                  <FileCode size={18} className="text-brand" />
                  <span>Import Markdown (.md) File</span>
                </h3>
                <p className="dne-upload-section-desc">
                  Select a Markdown file from your computer to populate this note editor.
                  Syntax, code blocks, and headings will be imported directly for immediate editing.
                </p>

                <div
                  className={`dne-md-dropzone ${isDragOverMd ? 'dragover' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOverMd(true);
                  }}
                  onDragLeave={() => setIsDragOverMd(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverMd(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleImportMarkdownFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud size={36} className="dne-dropzone-icon" />
                  <span className="dne-dropzone-prompt">
                    Click to browse or drag and drop a .md file here
                  </span>
                  <span className="dne-dropzone-subtext">
                    Supported: Standard Markdown (.md)
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,text/markdown,text/plain"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleImportMarkdownFile(e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              {/* Section B: PDF / Supported Document Lesson Upload (Section 7) */}
              <div className="dne-upload-card-section">
                <h3 className="dne-upload-section-title">
                  <BookOpen size={18} className="text-brand" />
                  <span>Upload PDF or Supported Document</span>
                </h3>
                <p className="dne-upload-section-desc">
                  Upload PDF slides, reference sheets, or documentation as a first-class lesson content item.
                </p>

                <DeviceFileUploader
                  fileType="pdf"
                  accept="application/pdf,.pdf"
                  maxSizeMB={50}
                  uploadEndpoint={`${apiBase}/courses/${courseId}/curriculum/upload/resource`}
                  getAuthHeader={getAuthHeader}
                  currentUrl={documentUrl}
                  currentName={documentName}
                  onUploadSuccess={({ url, fileName, fileSize }) => {
                    setDocumentUrl(url);
                    setDocumentName(fileName);
                    setDocumentSize(fileSize || 0);
                    setContentType('pdf');
                    markDirty();

                    if (!title || title.includes('Lesson Notes')) {
                      setTitle(fileName.replace(/\.[^/.]+$/, ''));
                    }
                    toast?.success?.(`Uploaded document "${fileName}" successfully!`);
                  }}
                  helpText="Supported formats: PDF (up to 50MB). Files are securely stored and streamed directly to enrolled learners."
                />

                {documentUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCheck size={16} color="#059669" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#047857' }}>
                        Document Attached: {documentName || 'Uploaded PDF'}
                      </span>
                    </div>
                    <a
                      href={documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.8rem', color: '#059669', textDecoration: 'underline' }}
                    >
                      View Upload
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════
            RIGHT COLUMN: NOTE DETAILS SIDEBAR (Section 3.D & Image 2)
            (Tags and Attachments are permanently excluded per mandate)
            ════════════════════════════════════════════════════════════ */}
        <div className="dne-sidebar-column">
          <div className="dne-sidebar-card">
            <h3 className="dne-sidebar-header">Note Details</h3>

            {/* Note Title Input */}
            <div className="dne-field-group">
              <label className="dne-field-label">
                Title <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className="dne-text-input"
                placeholder="e.g., Express.js Best Practices"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
              />
            </div>

            {/* Note Description Input */}
            <div className="dne-field-group">
              <label className="dne-field-label">
                Description (Optional)
              </label>
              <textarea
                className="dne-textarea-input"
                placeholder="Key best practices and tips for building scalable applications..."
                value={description}
                maxLength={300}
                onChange={(e) => {
                  setDescription(e.target.value);
                  markDirty();
                }}
              />
              <div className="dne-char-counter">
                {description.length}/300 characters
              </div>
            </div>

            {/* Publish Settings (Image 2) */}
            <div className="dne-publish-settings-card">
              <h4 className="dne-publish-title">Publish Settings</h4>
              <div className="dne-toggle-row">
                <div className="dne-toggle-info">
                  <span className="dne-toggle-label">
                    {publicationStatus === 'published' ? 'Published' : 'Draft'}
                  </span>
                  <span className="dne-toggle-subtext">
                    Make this note visible to learners
                  </span>
                </div>

                <label className="dne-switch-container">
                  <input
                    type="checkbox"
                    checked={publicationStatus === 'published'}
                    onChange={(e) => {
                      setPublicationStatus(e.target.checked ? 'published' : 'draft');
                      markDirty();
                    }}
                  />
                  <span className="dne-slider" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
