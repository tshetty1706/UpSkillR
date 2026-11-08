import React from 'react';
import { VideoLesson } from './VideoLesson.jsx';
import { ArticleLesson } from './ArticleLesson.jsx';
import { PdfLesson } from './PdfLesson.jsx';
import { QuizWorkspaceContainer } from './QuizWorkspaceContainer.jsx';
import { ExerciseLesson } from './ExerciseLesson.jsx';
import { UnsupportedContent } from './UnsupportedContent.jsx';

/**
 * Centralized Dynamic Content Renderer
 * Responsibilities:
 * - Receive selected lesson and content item.
 * - Route to the exact subcomponent based on normalized content type.
 * - Guarantee that Sidebar and Main Content always render the same content type.
 * - Quizzes use the dedicated Quiz Information Page & Leaderboard interface.
 * - Handle missing or unsupported content gracefully without broken UI or mock data.
 */
export const LessonContentRenderer = ({
  lesson,
  contentItem,
  contentType,
  course,
  videoState = {},
  quizState = {},
  codeState = {},
  bookmarkState = {},
  moduleIdx,
  lessonIdx,
  itemIdx
}) => {
  if (!lesson) {
    return null;
  }

  switch (contentType) {
    case 'video':
      return (
        <VideoLesson
          key={contentItem?._id || lesson?._id || 'video-lesson'}
          lesson={lesson}
          contentItem={contentItem}
          course={course}
          courseId={course?._id}
          isCompleted={videoState.isCompleted}
          onWatchEligibilityChange={videoState.onWatchEligibilityChange}
          videoRef={videoState.videoRef}
          onTimeUpdate={videoState.onTimeUpdate}
          onPlay={videoState.onPlay}
          onPause={videoState.onPause}
          onLoadedMetadata={videoState.onLoadedMetadata}
        />
      );

    case 'article':
      return (
        <ArticleLesson
          lesson={lesson}
          contentItem={contentItem}
        />
      );

    case 'pdf':
      return (
        <PdfLesson
          lesson={lesson}
          contentItem={contentItem}
        />
      );

    case 'quiz':
      return (
        <QuizWorkspaceContainer
          lesson={lesson}
          contentItem={contentItem}
          course={course}
          bookmarkState={bookmarkState}
          moduleIdx={moduleIdx}
          lessonIdx={lessonIdx}
          itemIdx={itemIdx}
        />
      );

    case 'exercise':
      return (
        <ExerciseLesson
          lesson={lesson}
          contentItem={contentItem}
          codeEditorInput={codeState.codeEditorInput}
          onCodeChange={codeState.onCodeChange}
          codeOutput={codeState.codeOutput}
          onRunCode={codeState.onRunCode}
          isExecutingCode={codeState.isExecutingCode}
          onResetCode={codeState.onResetCode}
        />
      );

    default:
      return (
        <UnsupportedContent
          rawType={contentItem?.type || lesson?.type || 'unknown'}
          lessonTitle={contentItem?.title || lesson?.title || ''}
        />
      );
  }
};

export default LessonContentRenderer;
