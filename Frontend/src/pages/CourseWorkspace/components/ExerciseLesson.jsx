import React from 'react';
import { Play, RotateCcw } from 'lucide-react';

export const ExerciseLesson = ({
  lesson,
  contentItem,
  codeEditorInput,
  onCodeChange,
  codeOutput,
  onRunCode,
  isExecutingCode,
  onResetCode
}) => {
  return (
    <div className="content-type-code-view">
      <div className="code-view-header">
        <span className="code-badge">Interactive Coding Practice</span>
        <h2 className="lesson-heading-title">{contentItem?.title || lesson?.title}</h2>
        <p className="code-instructions">
          {contentItem?.description ||
            lesson?.description ||
            'Write and execute your solution in the browser console editor below.'}
        </p>
      </div>

      <div className="code-editor-console-split">
        <div className="editor-pane-box">
          <div className="editor-pane-toolbar">
            <span>JavaScript (Node Sandbox)</span>
            <div className="editor-toolbar-actions">
              {onResetCode && (
                <button
                  type="button"
                  className="btn-editor-reset"
                  onClick={onResetCode}
                  title="Reset to starter code"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              )}
              <button
                type="button"
                className="btn-editor-run"
                onClick={onRunCode}
                disabled={isExecutingCode}
              >
                <Play size={13} />
                <span>{isExecutingCode ? 'Running...' : 'Run Code'}</span>
              </button>
            </div>
          </div>
          <textarea
            className="code-editor-textarea"
            value={codeEditorInput}
            onChange={(e) => onCodeChange(e.target.value)}
            rows={12}
            spellCheck="false"
            placeholder="// Write your solution here..."
          />
        </div>

        <div className="terminal-output-pane">
          <div className="terminal-header">Terminal Console Output</div>
          <pre className="terminal-pre">
            {codeOutput || 'Click "Run Code" to inspect output logs.'}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ExerciseLesson;
