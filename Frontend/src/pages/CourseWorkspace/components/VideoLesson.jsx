import React from 'react';
import { PlayCircle } from 'lucide-react';
import { renderMarkdownToHTML } from '../../../components/instructor/courses/CourseManager/CourseModules/Common/MarkdownEditor.jsx';
import { EmptyContentState } from './EmptyContentState.jsx';

export const VideoLesson = ({
  lesson,
  contentItem,
  course,
  videoRef,
  onTimeUpdate,
  onPlay,
  onPause,
  onLoadedMetadata
}) => {
  const videoObj = contentItem?.video || {};
  const rawVideoUrl =
    videoObj.videoUrl ||
    videoObj.url ||
    videoObj.fileUrl ||
    contentItem?.fileUrl ||
    contentItem?.mediaUrl;

  const hasVideoSource = typeof rawVideoUrl === 'string' && rawVideoUrl.trim().length > 0;

  // Attached notes for this lesson
  const notesList = lesson?.notes || contentItem?.notes || [];

  return (
    <div className="content-type-video-view">
      {hasVideoSource ? (
        <div className="video-player-container">
          <video
            ref={videoRef}
            src={rawVideoUrl}
            controls
            className="workspace-video-element"
            onTimeUpdate={onTimeUpdate}
            onPlay={onPlay}
            onPause={onPause}
            onLoadedMetadata={onLoadedMetadata}
            poster={course?.thumbnail || videoObj.thumbnailUrl || ''}
          />
        </div>
      ) : (
        <EmptyContentState
          type="video"
          title="Video Stream Unavailable"
          message="The video file for this lesson has not been attached or is currently processing."
        />
      )}

      <div className="content-meta-article">
        <h2 className="lesson-heading-title">{contentItem?.title || lesson?.title}</h2>
        {(contentItem?.description || lesson?.description) && (
          <p className="lesson-description-text">
            {contentItem?.description || lesson?.description}
          </p>
        )}

        {/* Instructor Lesson Notes */}
        {notesList.length > 0 && (
          <div className="lesson-attached-notes-box">
            <h3>Lesson Notes &amp; Highlights</h3>
            {notesList.map((note, nIdx) => (
              <div key={note._id || nIdx} className="note-card-inner">
                {note.title && <h4>{note.title}</h4>}
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdownToHTML(
                      note.markdownContent || note.content || note.bodyMarkdown || ''
                    )
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoLesson;
