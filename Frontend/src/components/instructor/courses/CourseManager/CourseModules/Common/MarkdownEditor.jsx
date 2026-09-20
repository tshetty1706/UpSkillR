import React, { useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Link as LinkIcon,
  Table as TableIcon,
  Eye,
  Edit3,
  Columns,
  Minus
} from 'lucide-react';

/**
 * Simple, secure Markdown to HTML renderer for live preview
 */
export const renderMarkdownToHTML = (markdown = '') => {
  if (!markdown) return '';

  let html = markdown
    // Escape HTML tags to prevent XSS
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (```lang ... ```)
  html = html.replace(/```([\s\S]*?)```/g, (match, p1) => {
    return `<pre class="md-pre"><code>${p1.trim()}</code></pre>`;
  });

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="md-h1">$1</h1>');

  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote class="md-blockquote">$1</blockquote>');

  // Bold and Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Horizontal Rule
  html = html.replace(/^---$/gim, '<hr class="md-hr" />');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');

  // Tables
  const tableRegex = /((?:\|.+?\|\r?\n)+)/g;
  html = html.replace(tableRegex, (match) => {
    const rows = match.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return match;

    let tableHtml = '<div class="md-table-wrap"><table class="md-table">';
    let isHeader = true;

    rows.forEach((row, i) => {
      // Check if it's separator row |---|---|
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

  // Unordered list items (- item)
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="md-li">$1</li>');
  html = html.replace(/(<li class="md-li">[\s\S]*?<\/li>)/gm, '<ul class="md-ul">$1</ul>');
  // Clean up nested consecutive uls
  html = html.replace(/<\/ul>\s*<ul class="md-ul">/g, '');

  // Ordered list items (1. item)
  html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="md-oli">$1</li>');
  html = html.replace(/(<li class="md-oli">[\s\S]*?<\/li>)/gm, '<ol class="md-ol">$1</ol>');
  html = html.replace(/<\/ol>\s*<ol class="md-ol">/g, '');

  // Paragraphs (lines with text not already wrapped in tags)
  const lines = html.split('\n');
  const formattedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (
      trimmed.startsWith('<h1') ||
      trimmed.startsWith('<h2') ||
      trimmed.startsWith('<h3') ||
      trimmed.startsWith('<blockquote') ||
      trimmed.startsWith('<pre') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('<ol') ||
      trimmed.startsWith('<li') ||
      trimmed.startsWith('<div') ||
      trimmed.startsWith('<table') ||
      trimmed.startsWith('<hr')
    ) {
      return line;
    }
    return `<p class="md-p">${trimmed}</p>`;
  });

  return formattedLines.join('\n');
};

export const MarkdownEditor = ({
  value = '',
  onChange,
  placeholder = 'Write in Markdown format...',
  minHeight = '320px',
  disabled = false
}) => {
  const textareaRef = useRef(null);
  const [viewMode, setViewMode] = useState('split'); // 'edit' | 'preview' | 'split'

  const insertFormatting = (prefix, suffix = '', defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end) || defaultText;

    const replacement = prefix + selectedText + suffix;
    const newText = text.substring(0, start) + replacement + text.substring(end);

    onChange(newText);

    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 0);
  };

  const wordCount = (value || '').trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = (value || '').length;

  return (
    <div className="markdown-editor-wrapper">
      {/* ── Toolbar ── */}
      <div className="md-toolbar">
        <div className="md-toolbar-group formatting-tools">
          <button
            type="button"
            className="md-tool-btn"
            title="Bold (**text**)"
            onClick={() => insertFormatting('**', '**', 'bold text')}
            disabled={disabled}
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            className="md-tool-btn"
            title="Italic (*text*)"
            onClick={() => insertFormatting('*', '*', 'italic text')}
            disabled={disabled}
          >
            <Italic size={15} />
          </button>
          <div className="md-tool-separator" />
          <button
            type="button"
            className="md-tool-btn"
            title="Heading 1 (# Heading)"
            onClick={() => insertFormatting('# ', '', 'Heading 1')}
            disabled={disabled}
          >
            <Heading1 size={15} />
          </button>
          <button
            type="button"
            className="md-tool-btn"
            title="Heading 2 (## Heading)"
            onClick={() => insertFormatting('## ', '', 'Heading 2')}
            disabled={disabled}
          >
            <Heading2 size={15} />
          </button>
          <button
            type="button"
            className="md-tool-btn"
            title="Heading 3 (### Heading)"
            onClick={() => insertFormatting('### ', '', 'Heading 3')}
            disabled={disabled}
          >
            <Heading3 size={15} />
          </button>
          <div className="md-tool-separator" />
          <button
            type="button"
            className="md-tool-btn"
            title="Bullet List (- item)"
            onClick={() => insertFormatting('\n- ', '', 'List item')}
            disabled={disabled}
          >
            <List size={15} />
          </button>
          <button
            type="button"
            className="md-tool-btn"
            title="Numbered List (1. item)"
            onClick={() => insertFormatting('\n1. ', '', 'First item')}
            disabled={disabled}
          >
            <ListOrdered size={15} />
          </button>
          <div className="md-tool-separator" />
          <button
            type="button"
            className="md-tool-btn"
            title="Code block"
            onClick={() => insertFormatting('\n```javascript\n', '\n```\n', '// write code here')}
            disabled={disabled}
          >
            <Code size={15} />
          </button>
          <button
            type="button"
            className="md-tool-btn"
            title="Quote"
            onClick={() => insertFormatting('\n> ', '', 'Important note or quote')}
            disabled={disabled}
          >
            <Quote size={15} />
          </button>
          <button
            type="button"
            className="md-tool-btn"
            title="Link"
            onClick={() => insertFormatting('[', '](https://example.com)', 'Link Title')}
            disabled={disabled}
          >
            <LinkIcon size={15} />
          </button>
          <button
            type="button"
            className="md-tool-btn"
            title="Table"
            onClick={() =>
              insertFormatting(
                '\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Row 1 | Data | Data |\n| Row 2 | Data | Data |\n'
              )
            }
            disabled={disabled}
          >
            <TableIcon size={15} />
          </button>
          <button
            type="button"
            className="md-tool-btn"
            title="Divider"
            onClick={() => insertFormatting('\n---\n')}
            disabled={disabled}
          >
            <Minus size={15} />
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="md-toolbar-group view-mode-switcher">
          <button
            type="button"
            className={`md-mode-btn ${viewMode === 'edit' ? 'active' : ''}`}
            onClick={() => setViewMode('edit')}
            title="Edit mode only"
          >
            <Edit3 size={14} />
            <span>Write</span>
          </button>
          <button
            type="button"
            className={`md-mode-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
            title="Split view (Side-by-Side)"
          >
            <Columns size={14} />
            <span>Split</span>
          </button>
          <button
            type="button"
            className={`md-mode-btn ${viewMode === 'preview' ? 'active' : ''}`}
            onClick={() => setViewMode('preview')}
            title="Live Preview only"
          >
            <Eye size={14} />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* ── Editor Body ── */}
      <div className={`md-editor-body mode-${viewMode}`} style={{ minHeight }}>
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className="md-pane md-editor-pane">
            <textarea
              ref={textareaRef}
              className="md-textarea"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
            />
          </div>
        )}

        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="md-pane md-preview-pane">
            <div className="md-preview-header">
              <span>Live Article Preview</span>
            </div>
            <div
              className="md-rendered-content"
              dangerouslySetInnerHTML={{
                __html: renderMarkdownToHTML(value) || '<p class="md-placeholder-text">Preview will appear here as you type...</p>'
              }}
            />
          </div>
        )}
      </div>

      {/* ── Editor Footer Bar ── */}
      <div className="md-footer-bar">
        <div className="md-stats">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{charCount} characters</span>
        </div>
        <div className="md-help-link">
          <span>Supports Markdown & Tables</span>
        </div>
      </div>
    </div>
  );
};
