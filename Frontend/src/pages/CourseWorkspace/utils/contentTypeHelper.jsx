import React from 'react';
import { PlayCircle, FileText, FileDown, HelpCircle, Code, AlertTriangle } from 'lucide-react';

/**
 * Normalizes content item or lesson type to one of the standard content types:
 * 'video' | 'article' | 'pdf' | 'quiz' | 'exercise' | 'unsupported'
 *
 * @param {Object} item - The contentItem from DB
 * @param {Object} lesson - The parent lesson from DB
 * @returns {string} Normalized content type
 */
export const normalizeContentType = (item, lesson = null) => {
  if (!item && !lesson) return 'article';

  // 1. Check item.type or lesson.type explicitly
  const rawType = String(item?.type || lesson?.type || lesson?.contentType || '').trim().toLowerCase();

  if (rawType === 'video' || rawType.includes('video')) {
    return 'video';
  }
  if (
    rawType === 'quiz' ||
    rawType.includes('quiz') ||
    rawType === 'assessment' ||
    rawType.includes('assessment')
  ) {
    return 'quiz';
  }
  if (
    rawType === 'pdf' ||
    rawType.includes('pdf') ||
    (item?.fileName && String(item.fileName).toLowerCase().endsWith('.pdf'))
  ) {
    return 'pdf';
  }
  if (
    rawType === 'article' ||
    rawType === 'article_md' ||
    rawType === 'note' ||
    rawType === 'text' ||
    rawType === 'markdown'
  ) {
    return 'article';
  }
  if (
    rawType === 'code' ||
    rawType === 'exercise' ||
    rawType === 'code_practice' ||
    rawType === 'practice' ||
    rawType.includes('exercise') ||
    rawType.includes('code')
  ) {
    return 'exercise';
  }

  // 2. Safe Fallback checks ONLY if type is ambiguous or empty
  // Check quiz questions
  if (item?.quiz?.questions && Array.isArray(item.quiz.questions) && item.quiz.questions.length > 0) {
    return 'quiz';
  }

  // Check valid video source (must be a non-empty string, not just an empty object)
  const videoUrl = item?.video?.videoUrl || item?.video?.url || item?.video?.fileUrl;
  const muxId = item?.video?.muxPlaybackId;
  if (
    (typeof videoUrl === 'string' && videoUrl.trim().length > 0) ||
    (typeof muxId === 'string' && muxId.trim().length > 0)
  ) {
    return 'video';
  }

  // Check PDF file URL
  const fileUrl = item?.fileUrl || item?.mediaUrl;
  if (typeof fileUrl === 'string' && fileUrl.toLowerCase().endsWith('.pdf')) {
    return 'pdf';
  }

  // Check Markdown / text body
  if (
    (item?.markdownContent && item.markdownContent.trim().length > 0) ||
    (item?.content && item.content.trim().length > 0) ||
    (item?.bodyMarkdown && item.bodyMarkdown.trim().length > 0)
  ) {
    return 'article';
  }

  // If lesson has attached notes of type article
  if (lesson?.notes && lesson.notes.length > 0) {
    return 'article';
  }

  // If rawType exists but is not recognized, mark as unsupported
  if (rawType && rawType !== 'resource' && rawType !== 'document') {
    return 'unsupported';
  }

  // Default fallback for general reading materials
  return 'article';
};

/**
 * Returns metadata (label, badgeClass, readable name) for a content type
 */
export const getContentTypeMeta = (type) => {
  const norm = String(type || '').toLowerCase();
  switch (norm) {
    case 'video':
      return {
        key: 'video',
        label: 'Video',
        badgeClass: 'video',
        description: 'Video Lecture'
      };
    case 'article':
      return {
        key: 'article',
        label: 'Article',
        badgeClass: 'article',
        description: 'Reading Material'
      };
    case 'pdf':
      return {
        key: 'pdf',
        label: 'PDF',
        badgeClass: 'pdf',
        description: 'PDF Document'
      };
    case 'quiz':
    case 'assessment':
      return {
        key: 'quiz',
        label: 'Quiz',
        badgeClass: 'quiz',
        description: 'Interactive Quiz'
      };
    case 'exercise':
    case 'code':
      return {
        key: 'exercise',
        label: 'Exercise',
        badgeClass: 'code',
        description: 'Coding Practice'
      };
    default:
      return {
        key: 'unsupported',
        label: 'Content',
        badgeClass: 'article',
        description: 'Learning Content'
      };
  }
};

/**
 * Returns the matching Lucide icon element for a content type
 */
export const getContentTypeIcon = (type, size = 16, className = '') => {
  const norm = String(type || '').toLowerCase();
  switch (norm) {
    case 'video':
      return <PlayCircle size={size} className={className} />;
    case 'article':
      return <FileText size={size} className={className} />;
    case 'pdf':
      return <FileDown size={size} className={className} />;
    case 'quiz':
    case 'assessment':
      return <HelpCircle size={size} className={className} />;
    case 'exercise':
    case 'code':
      return <Code size={size} className={className} />;
    default:
      return <FileText size={size} className={className} />;
  }
};
