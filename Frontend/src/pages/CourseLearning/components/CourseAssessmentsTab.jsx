import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  Clock,
  HelpCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Play,
  Eye,
  RotateCcw,
  Trophy,
  AlertCircle,
  Layers,
  Loader2,
  ChevronDown,
  ChevronUp,
  Target
} from 'lucide-react';
import { API_BASE } from '../../../config/api';
import { navigateTo } from '../../../utils/navigationHelper';
import { RetakeLeaderboardPanel } from '../../../components/learner/assessment/RetakeLeaderboardPanel';
import './CourseAssessmentsTab.css';

export const CourseAssessmentsTab = ({
  courseId,
  course,
  enrolment,
  user
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assessments, setAssessments] = useState([]);
  const [expandedRetakeIds, setExpandedRetakeIds] = useState({});

  const getAuthHeader = () => {
    const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchAssessments = useCallback(async () => {
    if (!courseId) return;
    if (!enrolment || !user) {
      setAssessments(course?.courseAssessments || []);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/learner-assessments`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load course assessments.');
      }
      setAssessments(data.assessments || []);
    } catch (err) {
      setError(err.message || 'Unable to load assessment details.');
    } finally {
      setLoading(false);
    }
  }, [courseId, enrolment, user, course?.courseAssessments]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const toggleRetakeLeaderboard = (assessmentId) => {
    setExpandedRetakeIds((prev) => ({
      ...prev,
      [assessmentId]: !prev[assessmentId]
    }));
  };

  if (loading) {
    return (
      <div className="assessments-tab-loading">
        <Loader2 size={26} className="assessments-spinner" />
        <span>Verifying assessment eligibility and module prerequisites...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="assessments-tab-error">
        <AlertCircle size={32} />
        <h3>Unable to Load Assessments</h3>
        <p>{error}</p>
        <button type="button" className="btn btn-primary" onClick={fetchAssessments}>
          Try Again
        </button>
      </div>
    );
  }

  if (!enrolment) {
    return (
      <div className="assessments-tab-empty">
        <Award size={40} className="empty-state-icon" />
        <h3>Enroll to Access Course Assessments</h3>
        <p>
          Enroll in this course to unlock graded milestone assessments, track module prerequisites, and compete on the course leaderboard.
        </p>
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="assessments-tab-empty">
        <Award size={40} className="empty-state-icon" />
        <h3>No Published Assessments Yet</h3>
        <p>
          Your instructor has not published any milestone assessments for this course yet. Lesson knowledge checks remain available inside curriculum modules.
        </p>
      </div>
    );
  }

  return (
    <div className="learner-assessments-list">
      {assessments.map((ass, idx) => {
        const isUnlocked = Boolean(ass.unlocked);
        const hasOfficial = Boolean(ass.hasCompletedOfficial && ass.officialAttempt);
        const activeAttempt = ass.activeAttempt;
        const prereq = ass.prerequisiteInfo || {};
        const reqMods = prereq.requiredModules || [];
        const isRetakeOpen = Boolean(expandedRetakeIds[ass._id]);

        let statusBadge = { className: 'status-locked', label: 'Locked', icon: <Lock size={13} /> };
        if (activeAttempt) {
          statusBadge = { className: 'status-active', label: 'In Progress', icon: <Clock size={13} /> };
        } else if (hasOfficial) {
          statusBadge = { className: 'status-completed', label: 'Official Completed', icon: <CheckCircle2 size={13} /> };
        } else if (isUnlocked) {
          statusBadge = { className: 'status-unlocked', label: 'Unlocked • Eligible', icon: <Unlock size={13} /> };
        }

        return (
          <article key={ass._id || idx} className={`learner-assessment-card ${!isUnlocked ? 'is-locked' : ''}`}>
            {/* Card Header */}
            <div className="la-card-header">
              <div className="la-title-block">
                <div className="la-index-badge">
                  <Award size={18} />
                </div>
                <div>
                  <div className="la-title-row">
                    <h3 className="la-title">{ass.title}</h3>
                    <span className="la-availability-pill">
                      {ass.availabilityStatus === 'available' ? 'Published' : 'Unavailable'}
                    </span>
                  </div>
                  <p className="la-desc">
                    {ass.description || 'Complete this graded milestone assessment to validate mastery of the prerequisite modules.'}
                  </p>
                </div>
              </div>

              <span className={`la-eligibility-pill ${statusBadge.className}`}>
                {statusBadge.icon}
                <span>{statusBadge.label}</span>
              </span>
            </div>

            {/* Instructor Configuration Metrics */}
            <div className="la-metrics-grid">
              <div className="la-metric-box">
                <Clock size={15} className="la-metric-icon" />
                <div>
                  <span className="la-metric-label">Duration</span>
                  <span className="la-metric-val">
                    {ass.durationMinutes} {ass.durationMinutes === 1 ? 'minute' : 'minutes'}
                  </span>
                </div>
              </div>

              <div className="la-metric-box">
                <HelpCircle size={15} className="la-metric-icon" />
                <div>
                  <span className="la-metric-label">Questions</span>
                  <span className="la-metric-val">{ass.questionCount}</span>
                </div>
              </div>

              <div className="la-metric-box">
                <Trophy size={15} className="la-metric-icon" />
                <div>
                  <span className="la-metric-label">Total Marks</span>
                  <span className="la-metric-val">{ass.totalMarks}</span>
                </div>
              </div>

              <div className="la-metric-box">
                <Target size={15} className="la-metric-icon" />
                <div>
                  <span className="la-metric-label">Passing Score</span>
                  <span className="la-metric-val">{ass.passThresholdPercent}%</span>
                </div>
              </div>
            </div>

            {/* Prerequisite Module Requirements */}
            <div className={`la-prereq-section ${isUnlocked ? 'is-satisfied' : 'is-pending'}`}>
              <div className="la-prereq-header">
                <div className="la-prereq-title">
                  <Layers size={15} />
                  <span>
                    Prerequisite Modules ({prereq.completedRequiredModules || 0} / {reqMods.length} Completed)
                  </span>
                </div>
                {!isUnlocked && (
                  <span className="la-lock-explanation">
                    Complete all prerequisite modules to unlock this assessment.
                  </span>
                )}
              </div>

              {reqMods.length === 0 ? (
                <p className="la-no-prereq-note">
                  No prerequisite modules required. This assessment is immediately available.
                </p>
              ) : (
                <div className="la-prereq-modules-list">
                  {reqMods.map((mod) => (
                    <div
                      key={mod._id}
                      className={`la-prereq-mod-item ${mod.isCompleted ? 'done' : 'pending'}`}
                    >
                      <div className="la-mod-top-row">
                        <div className="la-mod-name-wrap">
                          <span className="la-mod-code">M{mod.orderNumber || '?'}</span>
                          <span className="la-mod-name">{mod.title}</span>
                        </div>
                        <span className={`la-mod-status ${mod.isCompleted ? 'done' : 'pending'}`}>
                          {mod.isCompleted ? (
                            <>
                              <CheckCircle2 size={14} />
                              <span>100% Complete</span>
                            </>
                          ) : (
                            <>
                              <Lock size={13} />
                              <span>
                                {mod.progressPercentage}% ({mod.completedItems}/{mod.totalItems} items)
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="la-mod-progress-track">
                        <div
                          className="la-mod-progress-fill"
                          style={{ width: `${mod.isCompleted ? 100 : mod.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Official Score Summary if Official Attempt Exists */}
            {hasOfficial && (
              <div className="la-official-score-strip">
                <div className="la-official-score-left">
                  <span className="la-official-label">Official Attempt Score (Leaderboard)</span>
                  <div className="la-official-numbers">
                    <strong>
                      {ass.officialAttempt.obtainedMarks} / {ass.officialAttempt.totalMarks}
                    </strong>
                    <span>({ass.officialAttempt.percentage}%)</span>
                    <span
                      className={`la-result-pill ${
                        ass.officialAttempt.resultStatus === 'PASS' ? 'pass' : 'fail'
                      }`}
                    >
                      {ass.officialAttempt.resultStatus}
                    </span>
                  </div>
                </div>
                <span className="la-attempt-count-note">
                  {ass.attemptsCount} {ass.attemptsCount === 1 ? 'Attempt' : 'Attempts'} recorded
                  {ass.retakesCount > 0 ? ` (${ass.retakesCount} practice retake${ass.retakesCount > 1 ? 's' : ''})` : ''}
                </span>
              </div>
            )}

            {/* Action Footer */}
            <div className="la-card-footer">
              <div className="la-footer-left">
                {(hasOfficial || ass.retakesCount > 0) && (
                  <button
                    type="button"
                    className="btn-la-retake-lb"
                    onClick={() => toggleRetakeLeaderboard(ass._id)}
                  >
                    <Trophy size={15} />
                    <span>View Retake Leaderboard</span>
                    {isRetakeOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                )}
              </div>

              <div className="la-footer-actions">
                {!isUnlocked ? (
                  <button
                    type="button"
                    className="btn-la-primary is-locked"
                    disabled
                    title="Complete all prerequisite modules to unlock this assessment."
                  >
                    <Lock size={15} />
                    <span>Locked</span>
                  </button>
                ) : activeAttempt ? (
                  <button
                    type="button"
                    className="btn-la-primary"
                    onClick={() =>
                      navigateTo(`/assessment/${courseId}/${ass._id}/attempt/${activeAttempt.attemptId}`)
                    }
                  >
                    <Clock size={15} />
                    <span>Resume Assessment</span>
                  </button>
                ) : !hasOfficial ? (
                  <button
                    type="button"
                    className="btn-la-primary"
                    onClick={() => navigateTo(`/assessment/${courseId}/${ass._id}`)}
                  >
                    <Play size={15} />
                    <span>Take Assessment</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-la-secondary"
                      onClick={() =>
                        navigateTo(`/assessment/${courseId}/${ass._id}/attempt/${ass.officialAttempt.attemptId}`)
                      }
                    >
                      <Eye size={15} />
                      <span>View Results</span>
                    </button>
                    <button
                      type="button"
                      className="btn-la-primary"
                      onClick={() => navigateTo(`/assessment/${courseId}/${ass._id}?mode=retake`)}
                    >
                      <RotateCcw size={15} />
                      <span>Retake Assessment</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Inline Expandable Practice Retake Leaderboard */}
            {isRetakeOpen && (
              <RetakeLeaderboardPanel
                courseId={courseId}
                assessmentId={ass._id}
                assessmentTitle={ass.title}
                onClose={() => toggleRetakeLeaderboard(ass._id)}
              />
            )}
          </article>
        );
      })}
    </div>
  );
};
