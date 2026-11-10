import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  CheckSquare,
  Award,
  Loader2,
  RotateCcw,
  BookOpen,
  Trophy,
  Play,
  Lock,
  Layers,
  Target,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import { navigateTo } from '../../utils/navigationHelper';
import { RetakeLeaderboardPanel } from '../../components/learner/assessment/RetakeLeaderboardPanel';
import './AssessmentTakingPage.css';

export const AssessmentTakingPage = ({
  courseId,
  assessmentId,
  attemptId = null,
  user
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pre-start / details state (when !attemptId)
  const [detailsData, setDetailsData] = useState(null);
  const [attemptsHistory, setAttemptsHistory] = useState([]);
  const [isStarting, setIsStarting] = useState(false);

  // Active exam state (when attemptId)
  const [assessmentMeta, setAssessmentMeta] = useState(null);
  const [attemptMeta, setAttemptMeta] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(() => {
    try {
      if (attemptId) {
        const saved = sessionStorage.getItem(`upskillr_ass_answers_${attemptId}`);
        return saved ? JSON.parse(saved) : {};
      }
    } catch (_) {}
    return {};
  });

  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRetakeLeaderboard, setShowRetakeLeaderboard] = useState(false);

  // Review / Results state
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [officialSummary, setOfficialSummary] = useState(null);
  const [reviewQuestions, setReviewQuestions] = useState([]);

  const autoSubmittedRef = useRef(false);
  const clockOffsetRef = useRef(0);
  const expiresAtMsRef = useRef(null);
  const answersRef = useRef(answers);
  const draftSyncTimerRef = useRef(null);

  useEffect(() => {
    answersRef.current = answers;
    if (attemptId && !isReviewMode) {
      try {
        sessionStorage.setItem(`upskillr_ass_answers_${attemptId}`, JSON.stringify(answers));
      } catch (_) {}
    }
  }, [answers, attemptId, isReviewMode]);

  const getAuthHeader = () => {
    const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleBackToAssessments = useCallback(() => {
    navigateTo(`/courses/${courseId}?tab=assessments`);
  }, [courseId]);

  const handleViewCourseLeaderboard = useCallback(() => {
    navigateTo(`/courses/${courseId}?tab=leaderboard`);
  }, [courseId]);

  // Debounced backend draft-answer sync so page reloads or timer expiry preserve answers
  const syncDraftAnswersToServer = useCallback(async (nextAnswers) => {
    if (!attemptId || isReviewMode) return;
    try {
      await fetch(`${API_BASE}/courses/${courseId}/assessments/${assessmentId}/attempt/${attemptId}/answers`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        credentials: 'include',
        body: JSON.stringify({ answers: nextAnswers })
      });
    } catch (_) {}
  }, [courseId, assessmentId, attemptId, isReviewMode]);

  const scheduleDraftSync = useCallback((nextAnswers) => {
    if (draftSyncTimerRef.current) {
      clearTimeout(draftSyncTimerRef.current);
    }
    draftSyncTimerRef.current = setTimeout(() => {
      syncDraftAnswersToServer(nextAnswers);
    }, 450);
  }, [syncDraftAnswersToServer]);

  useEffect(() => {
    return () => {
      if (draftSyncTimerRef.current) {
        clearTimeout(draftSyncTimerRef.current);
      }
    };
  }, []);

  // Load either pre-start instructions OR active/finalized attempt
  const loadPageData = useCallback(async () => {
    if (!courseId || !assessmentId) return;
    setIsLoading(true);
    setError(null);
    autoSubmittedRef.current = false;

    try {
      if (!attemptId) {
        // Pre-start Instructions Screen
        const res = await fetch(`${API_BASE}/courses/${courseId}/assessments/${assessmentId}/details`, {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Unable to load assessment details.');
        }
        setDetailsData(data.assessment);
        setAssessmentMeta({
          title: data.assessment.title,
          courseTitle: data.courseTitle,
          description: data.assessment.description,
          instructions: data.assessment.instructions,
          durationMinutes: data.assessment.durationMinutes,
          totalQuestions: data.assessment.questionCount,
          totalMarks: data.assessment.totalMarks,
          passThresholdPercent: data.assessment.passThresholdPercent
        });
        setAttemptsHistory(data.attempts || []);
        setIsReviewMode(false);
        return;
      }

      // Active attempt or finalized review
      const res = await fetch(`${API_BASE}/courses/${courseId}/assessments/${assessmentId}/attempt/${attemptId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to retrieve assessment session.');
      }

      setAssessmentMeta(data.assessment);
      setAttemptMeta({
        attemptId: data.attemptId,
        attemptNumber: data.attemptNumber,
        attemptType: data.attemptType,
        startedAt: data.startedAt,
        expiresAt: data.expiresAt,
        durationMinutes: data.durationMinutes
      });

      if (data.isSubmitted && data.result) {
        try {
          sessionStorage.removeItem(`upskillr_ass_answers_${attemptId}`);
        } catch (_) {}
        setResultData(data.result);
        setOfficialSummary(data.officialAttempt || null);
        setReviewQuestions(data.review?.questions || []);
        setIsReviewMode(true);
        return;
      }

      // Active exam session
      setQuestions(data.assessment?.questions || []);
      setIsReviewMode(false);

      // Merge server draftAnswers + local sessionStorage safely
      const serverDraft = data.draftAnswers && typeof data.draftAnswers === 'object' ? data.draftAnswers : {};
      let localDraft = {};
      try {
        const stored = sessionStorage.getItem(`upskillr_ass_answers_${attemptId}`);
        if (stored) localDraft = JSON.parse(stored);
      } catch (_) {}
      const merged = { ...serverDraft, ...localDraft };
      setAnswers(merged);

      // Server-synchronized countdown initialization
      const serverNow = Number(data.serverTime) || Date.now();
      clockOffsetRef.current = serverNow - Date.now();
      const expMs = new Date(data.expiresAt).getTime();
      expiresAtMsRef.current = expMs;
      const rem = Math.max(0, Math.ceil((expMs - (Date.now() + clockOffsetRef.current)) / 1000));
      setRemainingSeconds(rem);
    } catch (err) {
      setError(err.message || 'Could not load assessment.');
    } finally {
      setIsLoading(false);
    }
  }, [courseId, assessmentId, attemptId]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Start or Resume Attempt from Instructions Screen / Retake
  const handleStartAssessment = async (e) => {
    if (e) e.preventDefault();
    if (isStarting || isRetaking) return;

    setIsStarting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/assessments/${assessmentId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not start assessment.');
      }
      navigateTo(`/assessment/${courseId}/${assessmentId}/attempt/${data.attemptId}`);
    } catch (err) {
      setError(err.message || 'Unable to begin assessment.');
    } finally {
      setIsStarting(false);
    }
  };

  // Submit Assessment Attempt
  const handleSubmitAssessment = useCallback(async (isAutoTimeout = false) => {
    if (!attemptId || isSubmitting || autoSubmittedRef.current) return;
    if (isAutoTimeout) {
      autoSubmittedRef.current = true;
    }

    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/assessments/${assessmentId}/attempt/${attemptId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        credentials: 'include',
        body: JSON.stringify({
          answers: answersRef.current,
          isTimeoutSubmit: Boolean(isAutoTimeout)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.code === 'DEADLINE_EXPIRED') {
          // Reload finalized attempt from backend
          await loadPageData();
          return;
        }
        throw new Error(data.message || 'Failed to submit assessment.');
      }

      try {
        sessionStorage.removeItem(`upskillr_ass_answers_${attemptId}`);
      } catch (_) {}

      setResultData(data.result);
      setOfficialSummary(data.officialAttempt || null);
      setReviewQuestions(data.review?.questions || []);
      setIsReviewMode(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.');
      autoSubmittedRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  }, [courseId, assessmentId, attemptId, isSubmitting, loadPageData]);

  // Retake Handler from Results screen
  const handleRetakeAssessment = async () => {
    if (isRetaking) return;
    setIsRetaking(true);
    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/assessments/${assessmentId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to start practice retake.');
      }
      navigateTo(`/assessment/${courseId}/${assessmentId}/attempt/${data.attemptId}`);
    } catch (err) {
      setError(err.message || 'Unable to start retake attempt.');
    } finally {
      setIsRetaking(false);
    }
  };

  // Wall-clock server-synchronized countdown timer (immune to tab switching throttling)
  useEffect(() => {
    if (!attemptId || isLoading || isReviewMode || isSubmitting || !expiresAtMsRef.current) return;

    const tick = () => {
      if (!expiresAtMsRef.current) return;
      const serverNow = Date.now() + clockOffsetRef.current;
      const rem = Math.max(0, Math.ceil((expiresAtMsRef.current - serverNow) / 1000));
      setRemainingSeconds(rem);
      if (rem <= 0 && !autoSubmittedRef.current) {
        handleSubmitAssessment(true);
      }
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [attemptId, isLoading, isReviewMode, isSubmitting, handleSubmitAssessment]);

  const formatTimer = (sec) => {
    if (sec === null || sec === undefined) return '--:--';
    const hrs = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (hrs > 0) {
      return `${hrs}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatDurationText = (sec) => {
    if (!sec && sec !== 0) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  const getTimerClass = () => {
    if (remainingSeconds === null) return 'normal';
    if (remainingSeconds <= 60) return 'danger';
    if (remainingSeconds <= 180) return 'warning';
    return 'normal';
  };

  const handleSelectOption = (qKey, optIdx, isMulti) => {
    setAnswers((prev) => {
      let nextVal;
      if (isMulti) {
        const cur = Array.isArray(prev[qKey]) ? [...prev[qKey]] : [];
        nextVal = cur.includes(optIdx)
          ? cur.filter(x => x !== optIdx)
          : [...cur, optIdx].sort((a, b) => a - b);
      } else {
        nextVal = optIdx;
      }
      const next = { ...prev, [qKey]: nextVal };
      scheduleDraftSync(next);
      return next;
    });
  };

  const handleTextAnswerChange = (qKey, textVal) => {
    setAnswers((prev) => {
      const next = { ...prev, [qKey]: textVal };
      scheduleDraftSync(next);
      return next;
    });
  };

  const handleClearAnswer = (qKey) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[qKey];
      scheduleDraftSync(next);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="assessment-taking-page centered-state">
        <div className="assessment-loading-box">
          <Loader2 size={28} className="ass-spinner" />
          <span>Loading secure assessment workspace...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="assessment-taking-page centered-state">
        <div className="assessment-error-dialog">
          <AlertCircle size={40} className="ass-error-icon" />
          <h2>Assessment Unavailable</h2>
          <p>{error}</p>
          <button type="button" className="btn-ass-primary" onClick={handleBackToAssessments}>
            <ArrowLeft size={16} />
            <span>Back to Course Assessments</span>
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // MODE 1: PRE-START ASSESSMENT INSTRUCTIONS & ATTEMPT OVERVIEW
  // ══════════════════════════════════════════════════════════════════
  if (!attemptId && detailsData) {
    const isUnlocked = Boolean(detailsData.unlocked);
    const hasOfficial = Boolean(detailsData.hasCompletedOfficial && detailsData.officialAttempt);
    const activeAttempt = detailsData.activeAttempt;
    const reqMods = detailsData.prerequisiteInfo?.requiredModules || [];

    return (
      <div className="assessment-taking-page review-mode">
        <header className="ass-top-bar">
          <div className="ass-top-left">
            <button type="button" className="btn-ass-back" onClick={handleBackToAssessments}>
              <ArrowLeft size={16} />
              <span>Course Assessments</span>
            </button>
            <div className="ass-header-divider" />
            <div className="ass-top-meta">
              <h2 className="ass-top-title">{detailsData.title}</h2>
              <p className="ass-top-subtitle">{assessmentMeta?.courseTitle || 'Course Assessment'}</p>
            </div>
          </div>

          <div className="ass-top-right">
            <button type="button" className="btn-ass-secondary" onClick={handleViewCourseLeaderboard}>
              <Trophy size={16} />
              <span>Course Leaderboard</span>
            </button>
          </div>
        </header>

        <main className="ass-scroll-body">
          <div className="ass-prestart-container">
            {/* Hero Overview Card */}
            <section className="ass-overview-hero-card">
              <div className="ass-prestart-header-row">
                <div>
                  <span className="ass-overline">Course Milestone Assessment</span>
                  <h1 className="ass-prestart-title">{detailsData.title}</h1>
                  {detailsData.description && (
                    <p className="ass-prestart-desc">{detailsData.description}</p>
                  )}
                </div>

                <span className={`ass-status-badge ${isUnlocked ? 'unlocked' : 'locked'}`}>
                  {isUnlocked ? <ShieldCheck size={15} /> : <Lock size={15} />}
                  <span>
                    {!isUnlocked
                      ? 'Locked'
                      : activeAttempt
                        ? 'Attempt In Progress'
                        : hasOfficial
                          ? 'Practice Retakes Open'
                          : 'Ready to Begin'}
                  </span>
                </span>
              </div>

              <div className="ass-prestart-metrics">
                <div className="ass-prestart-metric">
                  <Clock size={16} />
                  <div>
                    <span className="m-label">Duration</span>
                    <span className="m-val">{detailsData.durationMinutes} min</span>
                  </div>
                </div>
                <div className="ass-prestart-metric">
                  <HelpCircle size={16} />
                  <div>
                    <span className="m-label">Total Questions</span>
                    <span className="m-val">{detailsData.questionCount}</span>
                  </div>
                </div>
                <div className="ass-prestart-metric">
                  <Award size={16} />
                  <div>
                    <span className="m-label">Total Marks</span>
                    <span className="m-val">{detailsData.totalMarks}</span>
                  </div>
                </div>
                <div className="ass-prestart-metric">
                  <Target size={16} />
                  <div>
                    <span className="m-label">Passing Score</span>
                    <span className="m-val">{detailsData.passThresholdPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="ass-instructions-panel">
                <h3>
                  <BookOpen size={16} />
                  <span>Assessment Instructions</span>
                </h3>
                {detailsData.instructions && detailsData.instructions.trim() ? (
                  <p className="ass-instructions-text">{detailsData.instructions}</p>
                ) : (
                  <ul className="ass-instructions-list">
                    <li>You will have exactly <strong>{detailsData.durationMinutes} minutes</strong> once the assessment begins.</li>
                    <li>The countdown timer is controlled by the server and continues across browser refreshes or tab switches.</li>
                    <li>The assessment automatically submits when the timer reaches <strong>00:00</strong>.</li>
                    <li>Your first submitted attempt becomes your permanent <strong>Official Score</strong> for the Course Leaderboard.</li>
                  </ul>
                )}
              </div>

              {/* Official vs Retake Notice */}
              <div className="ass-policy-callout">
                <AlertCircle size={17} />
                <div>
                  {hasOfficial ? (
                    <span>
                      <strong>Official Attempt Completed ({detailsData.officialAttempt.obtainedMarks}/{detailsData.officialAttempt.totalMarks} &bull; {detailsData.officialAttempt.percentage}%):</strong> Starting a new session creates a <strong>Practice Retake</strong>. Practice retakes do not modify your official Course Leaderboard score.
                    </span>
                  ) : (
                    <span>
                      <strong>Official Examination Policy:</strong> Your first submitted attempt counts toward official Course Leaderboard standings. After finishing, you may retake the assessment for practice at any time.
                    </span>
                  )}
                </div>
              </div>

              {/* Prerequisite Module Breakdown */}
              {reqMods.length > 0 && (
                <div className={`ass-prereq-panel ${isUnlocked ? 'done' : 'locked'}`}>
                  <div className="ass-prereq-top">
                    <h4>
                      <Layers size={15} />
                      <span>Prerequisite Modules</span>
                    </h4>
                    {!isUnlocked && (
                      <span className="ass-lock-warn">Complete all prerequisite modules to unlock this assessment.</span>
                    )}
                  </div>
                  <div className="ass-prereq-grid">
                    {reqMods.map((m) => (
                      <div key={m._id} className={`ass-prereq-chip ${m.isCompleted ? 'done' : 'pending'}`}>
                        <span className="chip-code">M{m.orderNumber || '?'}</span>
                        <span className="chip-title">{m.title}</span>
                        <span className="chip-pct">{m.isCompleted ? '100%' : `${m.progressPercentage}%`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Row */}
              <div className="ass-prestart-actions">
                {!isUnlocked ? (
                  <button type="button" className="btn-ass-primary locked" disabled>
                    <Lock size={16} />
                    <span>Locked</span>
                  </button>
                ) : activeAttempt ? (
                  <button
                    type="button"
                    className="btn-ass-primary"
                    onClick={() => navigateTo(`/assessment/${courseId}/${assessmentId}/attempt/${activeAttempt.attemptId}`)}
                  >
                    <Clock size={16} />
                    <span>Resume Active Assessment</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-ass-primary"
                    onClick={handleStartAssessment}
                    disabled={isStarting}
                  >
                    {hasOfficial ? <RotateCcw size={16} /> : <Play size={16} />}
                    <span>
                      {isStarting
                        ? 'Starting Session...'
                        : hasOfficial
                          ? 'Retake Assessment (Practice)'
                          : 'Start Assessment'}
                    </span>
                  </button>
                )}

                {hasOfficial && (
                  <button
                    type="button"
                    className="btn-ass-secondary"
                    onClick={() =>
                      navigateTo(`/assessment/${courseId}/${assessmentId}/attempt/${detailsData.officialAttempt.attemptId}`)
                    }
                  >
                    <Award size={16} />
                    <span>View Official Results</span>
                  </button>
                )}

                {hasOfficial && (
                  <button
                    type="button"
                    className="btn-ass-outline"
                    onClick={() => setShowRetakeLeaderboard(v => !v)}
                  >
                    <Trophy size={16} />
                    <span>View Retake Leaderboard</span>
                    {showRetakeLeaderboard ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                )}
              </div>

              {showRetakeLeaderboard && (
                <RetakeLeaderboardPanel
                  courseId={courseId}
                  assessmentId={assessmentId}
                  assessmentTitle={detailsData.title}
                  onClose={() => setShowRetakeLeaderboard(false)}
                />
              )}
            </section>

            {/* Previous Attempts Table if any */}
            {attemptsHistory.length > 0 && (
              <section className="ass-history-card">
                <h3>Your Attempt History</h3>
                <div className="ass-history-table-wrap">
                  <table className="ass-history-table">
                    <thead>
                      <tr>
                        <th>Attempt</th>
                        <th>Category</th>
                        <th>Marks</th>
                        <th>Percentage</th>
                        <th>Result</th>
                        <th>Submitted On</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attemptsHistory.map((att) => (
                        <tr key={att.attemptId}>
                          <td className="font-bold">Attempt #{att.attemptNumber}</td>
                          <td>
                            <span className={`att-type-pill ${att.attemptType === 'OFFICIAL' ? 'official' : 'practice'}`}>
                              {att.attemptType === 'OFFICIAL' ? 'Official' : 'Retake'}
                            </span>
                          </td>
                          <td className="font-mono">{att.obtainedMarks} / {att.totalMarks}</td>
                          <td className="font-mono">{att.percentage}%</td>
                          <td>
                            <span className={`att-res-pill ${att.resultStatus === 'PASS' ? 'pass' : 'fail'}`}>
                              {att.resultStatus}
                            </span>
                          </td>
                          <td>{formatDate(att.submittedAt)}</td>
                          <td className="text-right">
                            <button
                              type="button"
                              className="btn-history-view"
                              onClick={() =>
                                navigateTo(`/assessment/${courseId}/${assessmentId}/attempt/${att.attemptId}`)
                              }
                            >
                              View Results
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // MODE 2: RESULTS & QUESTION-BY-QUESTION REVIEW
  // ══════════════════════════════════════════════════════════════════
  if (isReviewMode && resultData) {
    const isPassed = resultData.resultStatus === 'PASS';
    const isOfficial = Boolean(resultData.isOfficial || resultData.attemptType === 'OFFICIAL');

    return (
      <div className="assessment-taking-page review-mode">
        <header className="ass-top-bar">
          <div className="ass-top-left">
            <button type="button" className="btn-ass-back" onClick={handleBackToAssessments}>
              <ArrowLeft size={16} />
              <span>Course Assessments</span>
            </button>
            <div className="ass-header-divider" />
            <div className="ass-top-meta">
              <h2 className="ass-top-title">{assessmentMeta?.title || 'Assessment'} — Results</h2>
              <p className="ass-top-subtitle">
                {assessmentMeta?.courseTitle} &bull; Attempt #{resultData.attemptNumber} ({isOfficial ? 'Official Score' : 'Practice Retake'})
              </p>
            </div>
          </div>

          <div className="ass-top-right">
            <button type="button" className="btn-ass-outline" onClick={handleViewCourseLeaderboard}>
              <Trophy size={16} />
              <span>View Course Leaderboard</span>
            </button>
            <button
              type="button"
              className="btn-ass-primary"
              onClick={handleRetakeAssessment}
              disabled={isRetaking}
            >
              <RotateCcw size={16} />
              <span>{isRetaking ? 'Starting...' : 'Retake Assessment'}</span>
            </button>
          </div>
        </header>

        <div className="ass-scroll-body">
          <div className="ass-review-wrapper">
            {/* Hero Result Card */}
            <section className="ass-result-hero-card">
              <div className="ass-result-top-row">
                <div>
                  <span className="ass-overline">
                    {assessmentMeta?.courseTitle} &bull; Attempt #{resultData.attemptNumber}
                  </span>
                  <h1 className="ass-result-title">{assessmentMeta?.title || 'Assessment'}</h1>
                </div>

                <div className="ass-result-badges">
                  <span className={`att-type-pill ${isOfficial ? 'official' : 'practice'}`}>
                    <Award size={14} />
                    <span>{isOfficial ? 'Official Score' : 'Practice Retake'}</span>
                  </span>
                  <span className={`att-res-pill large ${isPassed ? 'pass' : 'fail'}`}>
                    {isPassed ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{isPassed ? 'PASS' : 'FAIL'}</span>
                  </span>
                </div>
              </div>

              <div className="ass-score-hero-row">
                <div className="ass-score-numbers">
                  <span className="score-obtained">{resultData.obtainedMarks}</span>
                  <span className="score-max"> / {resultData.totalMarks} Marks</span>
                </div>
                <div className="ass-score-pct-wrap">
                  <span className="ass-score-pct">{resultData.percentage}%</span>
                  <span className="ass-pass-req">Passing Required: {resultData.passThresholdPercent ?? 70}%</span>
                </div>
              </div>

              <div className="ass-result-metrics-grid">
                <div className="ass-metric-cell">
                  <span className="cell-label">Total Questions</span>
                  <span className="cell-value">{resultData.totalQuestions || reviewQuestions.length}</span>
                </div>
                <div className="ass-metric-cell">
                  <span className="cell-label">Correct Answers</span>
                  <span className="cell-value correct">{resultData.correctCount ?? 0}</span>
                </div>
                <div className="ass-metric-cell">
                  <span className="cell-label">Incorrect Answers</span>
                  <span className="cell-value incorrect">{resultData.incorrectCount ?? 0}</span>
                </div>
                <div className="ass-metric-cell">
                  <span className="cell-label">Unanswered</span>
                  <span className="cell-value">{resultData.unansweredCount ?? 0}</span>
                </div>
                <div className="ass-metric-cell">
                  <span className="cell-label">Time Taken</span>
                  <span className="cell-value">{formatDurationText(resultData.timeTakenSeconds)}</span>
                </div>
                <div className="ass-metric-cell">
                  <span className="cell-label">Status</span>
                  <span className="cell-value date">
                    {resultData.submissionStatus === 'timed_out' ? 'Auto-Submitted (Timeout)' : formatDate(resultData.submittedAt)}
                  </span>
                </div>
              </div>

              <div className="ass-policy-callout">
                <AlertCircle size={16} />
                <span>
                  {isOfficial ? (
                    <>
                      <strong>Official Leaderboard Score Recorded:</strong> This first attempt ({resultData.obtainedMarks}/{resultData.totalMarks}) permanently counts toward your Course Leaderboard score. Any subsequent attempts are recorded separately as practice retakes.
                    </>
                  ) : (
                    <>
                      <strong>Practice Retake Notice:</strong> This is a practice retake and does not modify your official leaderboard standing
                      {officialSummary ? ` (Official Attempt #1 Score: ${officialSummary.obtainedMarks}/${officialSummary.totalMarks} • ${officialSummary.percentage}%)` : ''}.
                    </>
                  )}
                </span>
              </div>

              <div className="ass-result-actions-row">
                <button type="button" className="btn-ass-primary" onClick={handleViewCourseLeaderboard}>
                  <Trophy size={16} />
                  <span>View Course Leaderboard</span>
                </button>
                <button
                  type="button"
                  className="btn-ass-outline"
                  onClick={() => setShowRetakeLeaderboard(v => !v)}
                >
                  <RotateCcw size={16} />
                  <span>View Retake Leaderboard</span>
                  {showRetakeLeaderboard ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
                <button type="button" className="btn-ass-secondary" onClick={handleBackToAssessments}>
                  <ArrowLeft size={16} />
                  <span>Back to Assessments</span>
                </button>
              </div>

              {showRetakeLeaderboard && (
                <RetakeLeaderboardPanel
                  courseId={courseId}
                  assessmentId={assessmentId}
                  assessmentTitle={assessmentMeta?.title}
                  onClose={() => setShowRetakeLeaderboard(false)}
                />
              )}
            </section>

            {/* Question-by-Question Review */}
            <section className="ass-review-questions-block">
              <div className="review-block-head">
                <h2>Answer Review &amp; Explanations</h2>
                <p>Compare your selected answers against the verified instructor solutions.</p>
              </div>

              <div className="review-cards-stack">
                {reviewQuestions.map((q, idx) => {
                  const isMulti = q.type === 'multiple_response';
                  const isText = q.type === 'short_answer' || q.type === 'long_answer';
                  const isAnswered = Boolean(q.isAnswered);
                  const isCorrect = Boolean(q.isCorrect);

                  return (
                    <div
                      key={q.questionId || idx}
                      className={`ass-review-q-card ${
                        isCorrect ? 'is-correct' : !isAnswered ? 'is-unanswered' : 'is-incorrect'
                      }`}
                    >
                      <div className="review-q-card-top">
                        <span className="review-q-pill">
                          Question {idx + 1} of {reviewQuestions.length}
                        </span>
                        <div className="review-q-chips">
                          {isCorrect ? (
                            <span className="q-chip correct">
                              <CheckCircle2 size={14} />
                              <span>Correct (+{q.marksAwarded} Marks)</span>
                            </span>
                          ) : !isAnswered ? (
                            <span className="q-chip unanswered">
                              <HelpCircle size={14} />
                              <span>Unanswered (0 / {q.maxMarks})</span>
                            </span>
                          ) : (
                            <span className="q-chip incorrect">
                              <XCircle size={14} />
                              <span>Incorrect (0 / {q.maxMarks})</span>
                            </span>
                          )}
                          <span className="q-marks-tag">{q.marksAwarded} / {q.maxMarks} Marks</span>
                        </div>
                      </div>

                      <h3 className="review-q-text">{q.questionText}</h3>

                      {isText ? (
                        <div className="review-text-answers">
                          <div className="review-text-row">
                            <span className="lbl">Your Answer:</span>
                            <span className="val">{isAnswered ? String(q.studentAnswer) : 'No response submitted'}</span>
                          </div>
                          {q.correctAnswer && (
                            <div className="review-text-row correct">
                              <span className="lbl">Correct Answer:</span>
                              <span className="val">{String(q.correctAnswer)}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="review-options-stack">
                          {(q.options || []).map((opt, optIdx) => {
                            const isSelected = isMulti
                              ? Array.isArray(q.studentAnswer) && q.studentAnswer.map(Number).includes(optIdx)
                              : q.studentAnswer !== null && q.studentAnswer !== undefined && q.studentAnswer !== '' && Number(q.studentAnswer) === optIdx;

                            const isCorrectOpt = isMulti
                              ? Array.isArray(q.correctAnswer) && q.correctAnswer.map(Number).includes(optIdx)
                              : q.correctAnswer !== null && q.correctAnswer !== undefined && q.correctAnswer !== '' && Number(q.correctAnswer) === optIdx;

                            let optCls = 'ass-review-opt neutral';
                            if (isCorrectOpt) {
                              optCls = isSelected ? 'ass-review-opt correct-selected' : 'ass-review-opt correct-solution';
                            } else if (isSelected && !isCorrectOpt) {
                              optCls = 'ass-review-opt incorrect-selected';
                            }

                            return (
                              <div key={optIdx} className={optCls}>
                                <div className="opt-left">
                                  <span className="opt-letter">{String.fromCharCode(65 + optIdx)}</span>
                                  <span className="opt-label">{opt}</span>
                                </div>
                                <div className="opt-badges">
                                  {isCorrectOpt && isSelected && (
                                    <span className="opt-pill correct">
                                      <CheckCircle2 size={13} />
                                      <span>Selected &bull; Correct</span>
                                    </span>
                                  )}
                                  {isCorrectOpt && !isSelected && (
                                    <span className="opt-pill solution">
                                      <CheckCircle2 size={13} />
                                      <span>Correct Answer</span>
                                    </span>
                                  )}
                                  {isSelected && !isCorrectOpt && (
                                    <span className="opt-pill incorrect">
                                      <XCircle size={13} />
                                      <span>Your Answer</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.explanation && q.explanation.trim() && (
                        <div className="review-explanation-panel">
                          <div className="exp-title">
                            <BookOpen size={15} />
                            <span>Explanation</span>
                          </div>
                          <p>{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // MODE 3: ACTIVE SERVER-TIMED ASSESSMENT WORKSPACE
  // ══════════════════════════════════════════════════════════════════
  const currentQ = questions[currentIndex] || {};
  const currentKey = currentQ._id ? String(currentQ._id) : String(currentIndex);
  const qType = String(currentQ.type || 'mcq').toLowerCase();
  const isMulti = qType === 'multiple_response';
  const isText = qType === 'short_answer' || qType === 'long_answer';
  const selectedAnswer = answers[currentKey];

  const isQuestionAnswered = (q, idx) => {
    const k = q._id ? String(q._id) : String(idx);
    const val = answers[k];
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'string') return val.trim().length > 0;
    return val !== undefined && val !== null && val !== '';
  };

  const totalQuestions = questions.length;
  const answeredCount = questions.filter((q, i) => isQuestionAnswered(q, i)).length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  return (
    <div className="assessment-taking-page active-mode">
      {/* Top Bar */}
      <header className="ass-top-bar">
        <div className="ass-top-left">
          <span className="ass-brand-mark">UpSkillR</span>
          <div className="ass-header-divider" />
          <div className="ass-top-meta">
            <h2 className="ass-top-title">{assessmentMeta?.title || 'Assessment'}</h2>
            <p className="ass-top-subtitle">
              {assessmentMeta?.courseTitle} &bull; Question {currentIndex + 1} of {totalQuestions}
              {' '}&bull; {attemptMeta?.attemptType === 'RETAKE' ? `Retake #${attemptMeta.attemptNumber}` : 'Official Attempt'}
            </p>
          </div>
        </div>

        <div className="ass-top-center">
          <div className={`ass-timer-pill ${getTimerClass()}`} aria-live="polite">
            <Clock size={16} />
            <span>{formatTimer(remainingSeconds)}</span>
          </div>
        </div>

        <div className="ass-top-right">
          <button
            type="button"
            className="btn-ass-primary"
            onClick={() => setShowConfirmModal(true)}
            disabled={isSubmitting}
          >
            <CheckSquare size={16} />
            <span>{isSubmitting ? 'Submitting...' : 'Submit Assessment'}</span>
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <div className="ass-exam-workspace">
        <main className="ass-question-stage">
          <div className="ass-q-meta-row">
            <div className="ass-q-meta-left">
              <span className="ass-q-counter-pill">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
              <span className="ass-q-type-tag">
                {isMulti ? 'Multiple Response (Select all that apply)' : qType === 'true_false' ? 'True / False' : isText ? 'Written Response' : 'Single Choice MCQ'}
              </span>
            </div>
            <span className="ass-q-marks-pill">
              <Award size={14} />
              <span>{currentQ.marks || 1} {(currentQ.marks || 1) === 1 ? 'Mark' : 'Marks'}</span>
            </span>
          </div>

          <h2 className="ass-q-prompt">{currentQ.questionText}</h2>

          {isText ? (
            <div className="ass-text-answer-wrap">
              <textarea
                className="ass-text-answer-input"
                rows={4}
                placeholder="Type your response here..."
                value={typeof selectedAnswer === 'string' ? selectedAnswer : ''}
                onChange={(e) => handleTextAnswerChange(currentKey, e.target.value)}
              />
            </div>
          ) : (
            <div className="ass-options-grid">
              {(currentQ.options || []).map((opt, optIdx) => {
                const isSelected = isMulti
                  ? Array.isArray(selectedAnswer) && selectedAnswer.includes(optIdx)
                  : selectedAnswer === optIdx;
                const optImage = (currentQ.optionImages || [])[optIdx];

                return (
                  <button
                    key={optIdx}
                    type="button"
                    className={`ass-option-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectOption(currentKey, optIdx, isMulti)}
                  >
                    <span className={`ass-option-marker ${isMulti ? 'square' : 'circle'}`}>
                      {isMulti && isSelected ? '✓' : String.fromCharCode(65 + optIdx)}
                    </span>
                    <div className="ass-option-content">
                      <span className="ass-option-text">{opt}</span>
                      {optImage && (
                        <img src={optImage} alt={`Option ${String.fromCharCode(65 + optIdx)}`} className="ass-option-img" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Question Footer Navigation */}
          <div className="ass-q-nav-bar">
            <button
              type="button"
              className="btn-ass-secondary"
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
            >
              <ArrowLeft size={16} />
              <span>Previous</span>
            </button>

            {isQuestionAnswered(currentQ, currentIndex) && (
              <button
                type="button"
                className="btn-ass-clear"
                onClick={() => handleClearAnswer(currentKey)}
              >
                Clear Answer
              </button>
            )}

            {currentIndex < totalQuestions - 1 ? (
              <button
                type="button"
                className="btn-ass-primary"
                onClick={() => setCurrentIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
              >
                <span>Next</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn-ass-primary"
                onClick={() => setShowConfirmModal(true)}
              >
                <span>Review &amp; Submit</span>
                <CheckSquare size={16} />
              </button>
            )}
          </div>
        </main>

        {/* Question Palette Sidebar (remains visible & stacked on tablet/mobile) */}
        <aside className="ass-palette-sidebar" aria-label="Question Navigation Palette">
          <div className="palette-head">
            <h3>Question Navigator</h3>
            <div className="palette-legend">
              <span><i className="dot answered" /> Answered ({answeredCount})</span>
              <span><i className="dot remaining" /> Unanswered ({unansweredCount})</span>
            </div>
          </div>

          <div className="ass-palette-grid">
            {questions.map((q, idx) => {
              const answered = isQuestionAnswered(q, idx);
              const active = idx === currentIndex;
              return (
                <button
                  key={q._id || idx}
                  type="button"
                  className={`ass-palette-btn ${answered ? 'answered' : ''} ${active ? 'current' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="palette-submit-box">
            <button
              type="button"
              className="btn-ass-primary full-width"
              onClick={() => setShowConfirmModal(true)}
              disabled={isSubmitting}
            >
              <CheckSquare size={16} />
              <span>Finish &amp; Submit</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="ass-modal-backdrop" onClick={() => !isSubmitting && setShowConfirmModal(false)}>
          <div className="ass-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Submit Assessment?</h3>
            <p>
              {attemptMeta?.attemptType === 'RETAKE'
                ? 'Are you sure you want to finish this practice retake? Retake results do not alter your official Course Leaderboard score.'
                : 'Are you sure you want to submit your official attempt? Once finalized, your score will be permanently recorded for the Course Leaderboard.'}
            </p>
            <div className="ass-confirm-stats">
              <span>Answered: <strong>{answeredCount}</strong> / {totalQuestions}</span>
              <span>Time Left: <strong>{formatTimer(remainingSeconds)}</strong></span>
            </div>
            <div className="ass-confirm-actions">
              <button
                type="button"
                className="btn-ass-secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                Continue Attempt
              </button>
              <button
                type="button"
                className="btn-ass-primary"
                onClick={() => handleSubmitAssessment(false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Evaluating...' : 'Submit Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentTakingPage;
