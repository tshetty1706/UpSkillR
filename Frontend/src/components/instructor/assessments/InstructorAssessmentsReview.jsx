import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Award,
  MessageSquare,
  FileText,
  Filter,
  Search,
  User,
  X,
  History,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import './InstructorAssessmentsReview.css';

const API_BASE = 'http://localhost:5000/api';

export const InstructorAssessmentsReview = ({ user }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({ total: 0, pendingAppeals: 0, passed: 0, failed: 0 });

  // Filters & Search
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [appealFilter, setAppealFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Action Modals State
  const [activeModal, setActiveModal] = useState(null); // 'grant' | 'manual_pass' | 'appeal' | 'reset' | 'audit'
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [appealDecision, setAppealDecision] = useState('approved');
  const [submittingAction, setSubmittingAction] = useState(false);

  const getAuthHeader = () => {
    const token = sessionStorage.getItem('upskillr_token');
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  };

  useEffect(() => {
    fetchReviewData();
  }, [courseFilter, statusFilter, appealFilter]);

  const fetchReviewData = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/courses/instructor/assessments-review?courseFilter=${courseFilter}&statusFilter=${statusFilter}&appealFilter=${appealFilter}`;
      const res = await fetch(url, { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.submissions || []);
        setCourses(data.courses || []);
        setStats(data.stats || { total: 0, pendingAppeals: 0, passed: 0, failed: 0 });
      } else {
        toast.error(data.message || 'Failed to load submissions review');
      }
    } catch (err) {
      console.error('Error fetching review data:', err);
      toast.error('Network error loading assessment reviews');
    } finally {
      setLoading(false);
    }
  };

  // Remediation Action Handler
  const handlePerformAction = async (e) => {
    e.preventDefault();
    if (!actionReason.trim() && activeModal !== 'audit') {
      toast.error('Please provide an audit reason for this action');
      return;
    }

    setSubmittingAction(true);
    try {
      let endpoint = '';
      let body = { reason: actionReason.trim() };

      if (activeModal === 'grant') {
        endpoint = `${API_BASE}/courses/instructor/assessments-review/${selectedSubmission._id}/grant-attempt`;
      } else if (activeModal === 'manual_pass') {
        endpoint = `${API_BASE}/courses/instructor/assessments-review/${selectedSubmission._id}/mark-complete`;
      } else if (activeModal === 'appeal') {
        endpoint = `${API_BASE}/courses/instructor/assessments-review/${selectedSubmission._id}/resolve-appeal`;
        body.decision = appealDecision;
      } else if (activeModal === 'reset') {
        endpoint = `${API_BASE}/courses/instructor/assessments-review/${selectedSubmission._id}/reset-attempts`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Action executed and logged to audit trail');
        setActiveModal(null);
        setSelectedSubmission(null);
        setActionReason('');
        fetchReviewData();
      } else {
        toast.error(data.message || 'Action failed');
      }
    } catch (err) {
      toast.error('Network error executing action');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Cooldown Formatter
  const getCooldownText = (cooldownDate) => {
    if (!cooldownDate) return null;
    const diff = new Date(cooldownDate).getTime() - new Date().getTime();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  };

  // Client-side search filtering
  const filteredSubmissions = submissions.filter(sub => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (sub.learnerName && sub.learnerName.toLowerCase().includes(q)) ||
      (sub.learnerEmail && sub.learnerEmail.toLowerCase().includes(q)) ||
      (sub.assessmentTitle && sub.assessmentTitle.toLowerCase().includes(q)) ||
      (sub.courseId?.title && sub.courseId.title.toLowerCase().includes(q))
    );
  });

  return (
    <div className="assessments-review-container">
      {/* ── Top Header Toolbar ── */}
      <div className="review-header-toolbar">
        <div>
          <div className="header-title-badge-row">
            <h1 className="review-page-title">Learner Assessment Review</h1>
            <span className="review-only-badge">Review & Remediation Only</span>
          </div>
          <p className="review-page-subtitle">
            Audit learner attempts, manage auto-reset cooldowns, resolve appeals, and grant extra attempts with immutable audit logs.
          </p>
        </div>
      </div>

      {/* ── Summary Stats Cards ── */}
      <div className="review-stats-grid">
        <div className="review-stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Total Submissions</span>
            <FileText size={18} className="stat-icon-muted" />
          </div>
          <span className="stat-value">{stats.total}</span>
          <span className="stat-subtext">Across all authored courses</span>
        </div>

        <div className="review-stat-card highlight-appeal">
          <div className="stat-card-top">
            <span className="stat-label">Pending Appeals</span>
            <AlertTriangle size={18} className="stat-icon-warning" />
          </div>
          <span className="stat-value">{stats.pendingAppeals}</span>
          <span className="stat-subtext">Learners requesting remediation</span>
        </div>

        <div className="review-stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Passed / Completed</span>
            <CheckCircle2 size={18} className="stat-icon-success" />
          </div>
          <span className="stat-value">{stats.passed}</span>
          <span className="stat-subtext">Met pass threshold</span>
        </div>

        <div className="review-stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Failed / Retrying</span>
            <XCircle size={18} className="stat-icon-danger" />
          </div>
          <span className="stat-value">{stats.failed}</span>
          <span className="stat-subtext">Under review or in cooldown</span>
        </div>
      </div>

      {/* ── Filter & Search Controls ── */}
      <div className="review-controls-bar">
        <div className="search-box-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="review-search-input"
            placeholder="Search by learner name, email, or assessment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filters-group">
          {/* Course filter */}
          <select
            className="filter-select"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="all">All Courses</option>
            {courses.map(c => (
              <option key={c._id} value={c._id}>{c.title}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Results</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>

          {/* Appeal filter */}
          <select
            className="filter-select"
            value={appealFilter}
            onChange={(e) => setAppealFilter(e.target.value)}
          >
            <option value="all">All Appeals</option>
            <option value="pending">Appeal Pending</option>
            <option value="approved">Appeal Approved</option>
            <option value="rejected">Appeal Rejected</option>
          </select>
        </div>
      </div>

      {/* ── Submissions Table ── */}
      <div className="review-table-card">
        {loading ? (
          <div className="table-loading-box">
            <div className="mini-spinner" />
            <span>Loading submissions...</span>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="table-empty-box">
            <HelpCircle size={40} className="empty-icon" />
            <h3>No Assessment Submissions Found</h3>
            <p>
              When enrolled learners take quizzes and course assessments, their attempts and appeal requests will be listed here.
            </p>
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="review-table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Course & Assessment</th>
                  <th>Attempts</th>
                  <th>Score / Result</th>
                  <th>Status & Cooldown</th>
                  <th>Appeals</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((sub) => {
                  const cooldownLeft = getCooldownText(sub.cooldownUntil);
                  const totalAllowed = (sub.maxAttempts || 3) + (sub.extraAttemptsGranted || 0);

                  return (
                    <tr key={sub._id} className={sub.appealStatus === 'pending' ? 'row-highlight-appeal' : ''}>
                      {/* Learner Info */}
                      <td>
                        <div className="learner-info-cell">
                          <div className="learner-avatar-bubble">
                            <User size={15} />
                          </div>
                          <div>
                            <span className="learner-name">{sub.learnerName}</span>
                            <span className="learner-email">{sub.learnerEmail}</span>
                          </div>
                        </div>
                      </td>

                      {/* Course & Assessment */}
                      <td>
                        <div className="assessment-info-cell">
                          <span className="course-title-label">{sub.courseId?.title || 'Course'}</span>
                          <span className="assessment-title-label">{sub.assessmentTitle}</span>
                        </div>
                      </td>

                      {/* Attempts Counter */}
                      <td>
                        <div className="attempts-cell">
                          <span className="attempt-counter-badge">
                            {sub.attemptNumber} / {totalAllowed}
                          </span>
                          {sub.extraAttemptsGranted > 0 && (
                            <span className="extra-granted-badge" title="Instructor granted extra attempts">
                              +{sub.extraAttemptsGranted} Extra
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Score / Result */}
                      <td>
                        <div className="score-cell">
                          <span className="score-percentage">
                            {sub.percentage ? `${Math.round(sub.percentage)}%` : `${sub.totalScore}/${sub.maxScore}`}
                          </span>
                          <span className={`result-pill ${sub.gradeResult || 'pending'}`}>
                            {sub.gradeResult === 'passed' ? 'Passed' : sub.gradeResult === 'failed' ? 'Failed' : 'Pending'}
                          </span>
                        </div>
                      </td>

                      {/* Status & Cooldown */}
                      <td>
                        <div className="status-cell">
                          {sub.manuallyMarkedComplete && (
                            <span className="manual-pass-badge" title="Manually passed by instructor">
                              <ShieldCheck size={13} />
                              <span>Manual Pass</span>
                            </span>
                          )}
                          {cooldownLeft ? (
                            <span className="cooldown-pill" title={`Cooldown until: ${new Date(sub.cooldownUntil).toLocaleString()}`}>
                              <Clock size={12} />
                              <span>{cooldownLeft}</span>
                            </span>
                          ) : (
                            <span className="no-cooldown-text">Active / Ready</span>
                          )}
                        </div>
                      </td>

                      {/* Appeal Status */}
                      <td>
                        <div className="appeal-cell">
                          {sub.appealStatus === 'pending' ? (
                            <span className="appeal-pill pending" title={sub.appealMessage}>
                              <AlertTriangle size={12} />
                              <span>Appeal Pending</span>
                            </span>
                          ) : sub.appealStatus === 'approved' ? (
                            <span className="appeal-pill approved">Appeal Approved</span>
                          ) : sub.appealStatus === 'rejected' ? (
                            <span className="appeal-pill rejected">Appeal Denied</span>
                          ) : (
                            <span className="text-muted-sm">None</span>
                          )}
                        </div>
                      </td>

                      {/* Remediation Action Buttons */}
                      <td>
                        <div className="actions-flex-cell">
                          {sub.appealStatus === 'pending' && (
                            <button
                              type="button"
                              className="btn-action-appeal"
                              onClick={() => {
                                setSelectedSubmission(sub);
                                setActiveModal('appeal');
                                setActionReason('');
                              }}
                              title="Review and resolve appeal"
                            >
                              <MessageSquare size={14} />
                              <span>Review Appeal</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn-action-grant"
                            onClick={() => {
                              setSelectedSubmission(sub);
                              setActiveModal('grant');
                              setActionReason('');
                            }}
                            title="Grant learner an extra attempt & clear cooldown"
                          >
                            <RotateCcw size={14} />
                            <span>Grant Attempt</span>
                          </button>

                          {sub.gradeResult !== 'passed' && (
                            <button
                              type="button"
                              className="btn-action-pass"
                              onClick={() => {
                                setSelectedSubmission(sub);
                                setActiveModal('manual_pass');
                                setActionReason('');
                              }}
                              title="Manually mark complete"
                            >
                              <CheckCircle2 size={14} />
                              <span>Pass</span>
                            </button>
                          )}

                          {sub.auditLog && sub.auditLog.length > 0 && (
                            <button
                              type="button"
                              className="btn-action-audit"
                              onClick={() => {
                                setSelectedSubmission(sub);
                                setActiveModal('audit');
                              }}
                              title="View remediation audit trail"
                            >
                              <History size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
         AUDITABLE REMEDIATION ACTION MODALS
         ───────────────────────────────────────────────────────────── */}
      {activeModal && selectedSubmission && (
        <div className="review-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="review-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top-bar">
              <h3 className="modal-title">
                {activeModal === 'grant' && 'Grant Extra Attempt'}
                {activeModal === 'manual_pass' && 'Manually Mark Assessment Complete'}
                {activeModal === 'appeal' && 'Review Learner Appeal'}
                {activeModal === 'reset' && 'Reset Learner Attempts'}
                {activeModal === 'audit' && 'Remediation Audit Log'}
              </h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setActiveModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Audit History View */}
            {activeModal === 'audit' ? (
              <div className="audit-log-modal-body">
                <p className="audit-summary-sub">
                  History of actions performed on submission for <strong>{selectedSubmission.learnerName}</strong>.
                </p>
                <div className="audit-items-list">
                  {selectedSubmission.auditLog.map((log, lIdx) => (
                    <div key={lIdx} className="audit-log-item">
                      <div className="audit-item-top">
                        <span className="audit-action-tag">{log.action}</span>
                        <span className="audit-time">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="audit-reason-text"><strong>Reason:</strong> {log.reason}</p>
                      <span className="audit-author">By: {log.performedBy} ({log.performedByRole})</span>
                    </div>
                  ))}
                </div>
                <div className="modal-footer-row">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={() => setActiveModal(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Action Form with Mandatory Audit Reason */
              <form className="modal-action-form" onSubmit={handlePerformAction}>
                <div className="learner-summary-box">
                  <div>
                    <strong>{selectedSubmission.learnerName}</strong> ({selectedSubmission.learnerEmail})
                  </div>
                  <div>
                    Course: <em>{selectedSubmission.courseId?.title}</em> • Assessment: <em>{selectedSubmission.assessmentTitle}</em>
                  </div>
                </div>

                {/* Appeal Specific View */}
                {activeModal === 'appeal' && (
                  <div className="appeal-message-card">
                    <span className="appeal-quote-label">Learner's Appeal Statement:</span>
                    <blockquote className="appeal-quote">
                      "{selectedSubmission.appealMessage || 'No written message provided.'}"
                    </blockquote>
                    <span className="appeal-date">
                      Submitted on: {selectedSubmission.appealedAt ? new Date(selectedSubmission.appealedAt).toLocaleString() : 'N/A'}
                    </span>

                    <div className="decision-radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="appealDecision"
                          value="approved"
                          checked={appealDecision === 'approved'}
                          onChange={() => setAppealDecision('approved')}
                        />
                        <span>Approve Appeal (Grants 1 Extra Attempt & Clears Cooldown)</span>
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="appealDecision"
                          value="rejected"
                          checked={appealDecision === 'rejected'}
                          onChange={() => setAppealDecision('rejected')}
                        />
                        <span>Deny Appeal</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Mandatory Audit Reason */}
                <div className="form-group-reason">
                  <label className="reason-label">
                    Audit Reason <span className="req-star">*</span>
                  </label>
                  <textarea
                    rows={3}
                    className="reason-textarea"
                    placeholder="Document the exact rationale for this action (required for audit compliance)..."
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="modal-footer-row">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={() => setActiveModal(null)}
                    disabled={submittingAction}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-modal-confirm"
                    disabled={submittingAction}
                  >
                    {submittingAction ? 'Executing...' : 'Confirm Action'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
