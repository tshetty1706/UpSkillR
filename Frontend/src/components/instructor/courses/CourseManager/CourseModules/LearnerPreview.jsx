import React, { useState } from 'react';
import {
  ArrowLeft,
  Eye,
  Lock,
  Unlock,
  CheckCircle2,
  Play,
  HelpCircle,
  Award,
  BookOpen,
  FileText,
  RotateCcw,
  Sparkles,
  Video,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock
} from 'lucide-react';
import { InstructorTip } from './Common/InstructorTip';

export const LearnerPreview = ({
  modules = [],
  notes = [],
  courseAssessments = [],
  onExitPreview,
  toast
}) => {
  // Filter only published items as a real learner would see
  const publishedModules = modules.filter(m => m.state === 'published');
  const publishedNotes = notes.filter(n => n.state === 'published');
  const publishedAssessments = courseAssessments.filter(a => a.state === 'published');

  // Simulation state: completed item IDs
  const [completedItems, setCompletedItems] = useState({});
  const [completedAssessments, setCompletedAssessments] = useState({});
  const [expandedModules, setExpandedModules] = useState({ 0: true });

  const toggleModule = (idx) => {
    setExpandedModules(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Check if a specific module is 100% completed in simulation
  const isModuleComplete = (module) => {
    const pubLessons = (module.lessons || []).filter(l => l.state === 'published');
    if (pubLessons.length === 0) return true;

    for (const lesson of pubLessons) {
      const pubItems = (lesson.items || []).filter(i => i.state === 'published');
      for (const item of pubItems) {
        if (!completedItems[item._id]) {
          return false;
        }
      }
    }
    return true;
  };

  // Check if a module is locked by sequential progression
  const isModuleLocked = (modIndex) => {
    if (modIndex === 0) return false;
    for (let i = 0; i < modIndex; i++) {
      if (!isModuleComplete(publishedModules[i])) {
        return true;
      }
    }
    return false;
  };

  // Check if an assessment is unlocked
  const isAssessmentUnlocked = (assessment) => {
    const reqIds = assessment.requiredModuleIds || [];
    if (reqIds.length === 0) return true;

    return reqIds.every(reqId => {
      const targetMod = publishedModules.find(m => m._id === reqId);
      if (!targetMod) return true; // If module was unpublished, do not block
      return isModuleComplete(targetMod);
    });
  };

  // Interactive simulate actions
  const handleSimulateWatchVideo = (itemId, title) => {
    setCompletedItems(prev => ({ ...prev, [itemId]: true }));
    toast.success(`Simulated: Completed watched threshold for "${title}"!`);
  };

  const handleSimulatePassQuiz = (itemId, title) => {
    setCompletedItems(prev => ({ ...prev, [itemId]: true }));
    toast.success(`Simulated: Passed quiz "${title}" (85% score)!`);
  };

  const handleSimulatePassAssessment = (assId, title) => {
    setCompletedAssessments(prev => ({ ...prev, [assId]: true }));
    toast.success(`Simulated: Passed assessment "${title}" (92% score)!`);
  };

  const handleResetSimulation = () => {
    setCompletedItems({});
    setCompletedAssessments({});
    toast.info('Learner simulation state reset to initial enrollment state.');
  };

  // Calculate overall progress %
  const allGatingItems = publishedModules.flatMap(m =>
    (m.lessons || []).filter(l => l.state === 'published').flatMap(l =>
      (l.items || []).filter(i => i.state === 'published')
    )
  );

  const completedCount = allGatingItems.filter(i => completedItems[i._id]).length;
  const progressPercent = allGatingItems.length > 0
    ? Math.round((completedCount / allGatingItems.length) * 100)
    : 100;

  return (
    <div className="learner-preview-subpage">
      {/* ── Header ── */}
      <div className="subpage-header-row preview-header">
        <div className="subpage-title-group">
          <button
            type="button"
            className="btn-back-nav btn-exit-preview"
            onClick={onExitPreview}
          >
            <ArrowLeft size={18} />
            <span>Exit Learner Preview</span>
          </button>
          <div className="subpage-heading-block">
            <div className="preview-heading-row">
              <h2 className="subpage-title">Learner Progression Simulation</h2>
              <span className="simulation-live-pill">SIMULATION ACTIVE</span>
            </div>
            <p className="subpage-subtitle">
              Verify sequential module gating, gating watch thresholds, and milestone assessment locks.
            </p>
          </div>
        </div>

        <div className="subpage-header-actions">
          <button
            type="button"
            className="btn-reset-simulation"
            onClick={handleResetSimulation}
            title="Reset progress to beginning"
          >
            <RotateCcw size={15} />
            <span>Reset Simulation</span>
          </button>
        </div>
      </div>

      {/* ── Simulation Progress Bar Banner ── */}
      <div className="simulation-progress-banner">
        <div className="banner-top-row">
          <div className="progress-info">
            <span className="progress-label">Simulated Learner Progress</span>
            <span className="progress-fraction">
              {completedCount} of {allGatingItems.length} Gating Lectures & Quizzes Completed
            </span>
          </div>
          <span className="progress-percentage">{progressPercent}%</span>
        </div>
        <div className="progress-track-large">
          <div className="progress-fill-large" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* ── Progression Guidance Tip ── */}
      <InstructorTip
        type="tip"
        title="Progression Mechanics in Effect"
        message="Notice how Module 1 is accessible, while subsequent modules remain strictly locked until all gating items in the preceding modules are satisfied. Supplementary Notes & Resources remain accessible at any time without gating progression."
      />

      {/* ── Main Preview Content Container ── */}
      <div className="preview-curriculum-container">
        <div className="preview-main-column">
          <h3 className="column-title">Course Modules & Sequential Path</h3>

          {publishedModules.length === 0 ? (
            <div className="empty-preview-notice">
              <p>No published modules found. Publish your modules in the editor to simulate them here.</p>
            </div>
          ) : (
            <div className="preview-modules-list">
              {publishedModules.map((module, modIndex) => {
                const isLocked = isModuleLocked(modIndex);
                const isDone = isModuleComplete(module);
                const isExpanded = !!expandedModules[modIndex];
                const lessons = (module.lessons || []).filter(l => l.state === 'published');

                return (
                  <div
                    key={module._id}
                    className={`preview-module-card ${isLocked ? 'is-locked' : 'is-unlocked'} ${isDone ? 'is-complete' : ''}`}
                  >
                    <div
                      className="preview-module-header"
                      onClick={() => !isLocked && toggleModule(modIndex)}
                    >
                      <div className="module-left">
                        <div className={`status-lock-icon ${isLocked ? 'locked' : isDone ? 'complete' : 'unlocked'}`}>
                          {isLocked ? <Lock size={16} /> : isDone ? <CheckCircle2 size={16} /> : <Unlock size={16} />}
                        </div>
                        <div className="module-titles">
                          <span className="module-number-label">Module {modIndex + 1}</span>
                          <h4 className="module-title">{module.title}</h4>
                        </div>
                      </div>

                      <div className="module-right">
                        {isLocked ? (
                          <span className="locked-badge">
                            <Lock size={12} /> Locked (Complete Module {modIndex})
                          </span>
                        ) : isDone ? (
                          <span className="completed-badge">
                            <CheckCircle2 size={12} /> Completed
                          </span>
                        ) : (
                          <span className="unlocked-badge">In Progress</span>
                        )}

                        {!isLocked && (
                          <button type="button" className="btn-chevron">
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {!isLocked && isExpanded && (
                      <div className="preview-module-body">
                        {module.description && (
                          <p className="module-desc-preview">{module.description}</p>
                        )}

                        <div className="preview-lessons-list">
                          {lessons.map((lesson, lesIndex) => {
                            const items = (lesson.items || []).filter(i => i.state === 'published');

                            return (
                              <div key={lesson._id} className="preview-lesson-block">
                                <div className="preview-lesson-header">
                                  <span className="lesson-badge">Lesson {modIndex + 1}.{lesIndex + 1}</span>
                                  <h5 className="lesson-name">{lesson.title}</h5>
                                </div>

                                <div className="preview-items-list">
                                  {items.map((item) => {
                                    const isItemComplete = !!completedItems[item._id];

                                    return (
                                      <div
                                        key={item._id}
                                        className={`preview-item-row ${isItemComplete ? 'item-done' : ''}`}
                                      >
                                        <div className="item-info-left">
                                          {item.type === 'video' ? (
                                            <Video size={16} className="item-icon video" />
                                          ) : (
                                            <HelpCircle size={16} className="item-icon quiz" />
                                          )}
                                          <div className="item-meta">
                                            <span className="item-name">{item.title}</span>
                                            <span className="item-requirement">
                                              {item.type === 'video'
                                                ? `Gating: Requires ${item.video?.watchedThresholdPercent || 90}% watch`
                                                : `Gating: Requires ${item.quiz?.passThresholdPercent || 70}% pass score`}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="item-simulation-controls">
                                          {isItemComplete ? (
                                            <span className="status-finished">
                                              <CheckCircle2 size={14} /> Completed
                                            </span>
                                          ) : item.type === 'video' ? (
                                            <button
                                              type="button"
                                              className="btn-simulate-action btn-sim-video"
                                              onClick={() => handleSimulateWatchVideo(item._id, item.title)}
                                            >
                                              <Play size={13} />
                                              <span>Simulate 90% Watched</span>
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              className="btn-simulate-action btn-sim-quiz"
                                              onClick={() => handleSimulatePassQuiz(item._id, item.title)}
                                            >
                                              <Award size={13} />
                                              <span>Simulate Pass Quiz</span>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Assessments Milestone Gating Section ── */}
          <div className="preview-assessments-section">
            <h3 className="column-title">Milestone Assessments (Module-Gated)</h3>
            {publishedAssessments.length === 0 ? (
              <p className="empty-subtext">No published assessments.</p>
            ) : (
              <div className="preview-assessments-list">
                {publishedAssessments.map((ass) => {
                  const unlocked = isAssessmentUnlocked(ass);
                  const isPassed = !!completedAssessments[ass._id];
                  const requiredModNames = (ass.requiredModuleIds || []).map(id => {
                    const m = publishedModules.find(mod => mod._id === id);
                    return m ? m.title : 'Module';
                  });

                  return (
                    <div
                      key={ass._id}
                      className={`preview-assessment-card ${unlocked ? 'is-unlocked' : 'is-locked'} ${isPassed ? 'is-passed' : ''}`}
                    >
                      <div className="ass-left">
                        <div className={`ass-icon-circle ${unlocked ? 'unlocked' : 'locked'}`}>
                          {unlocked ? <Award size={18} /> : <Lock size={18} />}
                        </div>
                        <div className="ass-details">
                          <h4 className="ass-title">{ass.title}</h4>
                          <p className="ass-req-text">
                            Prerequisites: {requiredModNames.join(', ') || 'None'}
                          </p>
                        </div>
                      </div>

                      <div className="ass-right">
                        {isPassed ? (
                          <span className="passed-badge">
                            <CheckCircle2 size={13} /> Passed (92%)
                          </span>
                        ) : unlocked ? (
                          <button
                            type="button"
                            className="btn-simulate-action btn-sim-assessment"
                            onClick={() => handleSimulatePassAssessment(ass._id, ass.title)}
                          >
                            <Award size={14} />
                            <span>Simulate Pass Assessment</span>
                          </button>
                        ) : (
                          <span className="locked-pill">
                            <Lock size={12} /> Locked by Prerequisites
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Supplementary Resources Sidebar (Non-Gating) ── */}
        <div className="preview-resources-sidebar">
          <div className="sidebar-header">
            <BookOpen size={18} />
            <h4>Supplementary Resources</h4>
          </div>
          <p className="sidebar-hint">
            Always accessible. Non-gating materials do not restrict sequential module progression.
          </p>

          {publishedNotes.length === 0 ? (
            <div className="empty-resources-prompt">
              <span>No published resources yet.</span>
            </div>
          ) : (
            <div className="preview-resources-list">
              {publishedNotes.map((note) => (
                <div key={note._id} className="preview-resource-pill">
                  <div className="pill-type-icon">
                    {note.type === 'article' && <FileText size={15} />}
                    {note.type === 'pdf' && <BookOpen size={15} />}
                    {note.type === 'image' && <Sparkles size={15} />}
                  </div>
                  <div className="pill-info">
                    <span className="pill-title">{note.title}</span>
                    <span className="pill-scope">{note.scope.toUpperCase()} LEVEL</span>
                  </div>
                  {note.mediaUrl && (
                    <a
                      href={note.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pill-link"
                      title="Open attached media"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
