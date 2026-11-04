import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { renderMarkdownToHTML } from '../../../components/instructor/courses/CourseManager/CourseModules/Common/MarkdownEditor.jsx';
import { EmptyContentState } from './EmptyContentState.jsx';

export const ArticleLesson = ({ lesson, contentItem }) => {
  // Extract text from contentItem first, then fallback to lesson notes
  const rawMarkdown = useMemo(() => {
    if (contentItem) {
      if (contentItem.markdownContent && contentItem.markdownContent.trim()) {
        return contentItem.markdownContent;
      }
      if (contentItem.content && contentItem.content.trim()) {
        return contentItem.content;
      }
      if (contentItem.bodyMarkdown && contentItem.bodyMarkdown.trim()) {
        return contentItem.bodyMarkdown;
      }
    }

    if (lesson?.notes && lesson.notes.length > 0) {
      const firstNote = lesson.notes[0];
      return firstNote.markdownContent || firstNote.content || firstNote.bodyMarkdown || '';
    }

    return '';
  }, [contentItem, lesson]);

  const hasContent = typeof rawMarkdown === 'string' && rawMarkdown.trim().length > 0;

  // Calculate estimated reading time
  const readingTime = useMemo(() => {
    if (!hasContent) return 1;
    const words = rawMarkdown.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 180));
  }, [rawMarkdown, hasContent]);

  const renderedHTML = useMemo(() => {
    if (!hasContent) return '';
    return renderMarkdownToHTML(rawMarkdown);
  }, [rawMarkdown, hasContent]);

  return (
    <article className="content-type-article-view">
      <div className="article-header-lead">
        <span className="reading-time-badge">
          <Clock size={14} />
          <span>{readingTime} min read</span>
        </span>
        <h2 className="lesson-heading-title">{contentItem?.title || lesson?.title}</h2>
        {(contentItem?.description || lesson?.description) && (
          <p className="lesson-lead-summary">
            {contentItem?.description || lesson?.description}
          </p>
        )}
      </div>

      {hasContent ? (
        <div
          className="article-markdown-body"
          dangerouslySetInnerHTML={{ __html: renderedHTML }}
        />
      ) : (
        <EmptyContentState
          type="article"
          title="Article Content Unavailable"
          message="Article content is not available yet. The instructor is preparing the reading materials for this lesson."
        />
      )}
    </article>
  );
};

export default ArticleLesson;
