import React from 'react';
import { DedicatedArticleEditor, renderArticleMarkdownToHTML } from './DedicatedArticleEditor';
import { DedicatedDocumentEditor } from './DedicatedDocumentEditor';
import './DedicatedNoteEditor.css';

/**
 * Backward-compatibility export for any older component referencing renderEnhancedMarkdown
 */
export const renderEnhancedMarkdown = renderArticleMarkdownToHTML;

/**
 * Backward compatibility wrapper for DedicatedNoteEditor
 * Delegates to DedicatedArticleEditor or DedicatedDocumentEditor based on item type
 */
export const DedicatedNoteEditor = (props) => {
  const itemType = props.initialItem?.type || (props.initialItem?.initialTab === 'upload' ? 'pdf' : 'article_md');
  const isDoc = ['pdf', 'document', 'resource'].includes(itemType) || props.initialItem?.initialTab === 'upload';

  if (isDoc) {
    return <DedicatedDocumentEditor {...props} />;
  }
  return <DedicatedArticleEditor {...props} />;
};

export default DedicatedNoteEditor;
