import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Calendar
} from 'lucide-react';
import { Avatar } from '../../common/Avatar/Avatar';
import { API_BASE } from '../../../config/api';
import './RetakeLeaderboardPanel.css';

export const RetakeLeaderboardPanel = ({
  courseId,
  assessmentId,
  assessmentTitle = 'Assessment',
  onClose
}) => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getAuthHeader = () => {
    const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchRetakes = useCallback(async (targetPage = page) => {
    if (!courseId || !assessmentId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API_BASE}/courses/${courseId}/assessments/${assessmentId}/retake-leaderboard?page=${targetPage}&limit=10`,
        {
          headers: getAuthHeader(),
          credentials: 'include'
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to load retake leaderboard.');
      }
      setData(json);
    } catch (err) {
      setError(err.message || 'Could not load retake standings.');
    } finally {
      setLoading(false);
    }
  }, [courseId, assessmentId, page]);

  useEffect(() => {
    fetchRetakes(page);
  }, [fetchRetakes, page]);

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  };

  const retakes = data?.retakes || [];
  const pagination = data?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalRetakes: 0,
    hasPrevPage: false,
    hasNextPage: false
  };

  return (
    <div className="retake-lb-panel" role="region" aria-label={`${assessmentTitle} Practice Retake Leaderboard`}>
      <div className="retake-lb-header">
        <div className="retake-lb-title-wrap">
          <div className="retake-lb-icon">
            <RotateCcw size={16} />
          </div>
          <div>
            <h4 className="retake-lb-title">Practice Retake Leaderboard</h4>
            <p className="retake-lb-subtitle">
              Ranks practice retake attempts only (Attempt #2+). Retake scores never alter the official Course Leaderboard.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            className="retake-lb-close-btn"
            onClick={onClose}
            aria-label="Close Retake Leaderboard"
            title="Close Retake Leaderboard"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="retake-lb-state-box">
          <Loader2 size={20} className="retake-spinner" />
          <span>Loading retake standings...</span>
        </div>
      ) : error ? (
        <div className="retake-lb-state-box error">
          <span>{error}</span>
          <button type="button" className="retake-lb-retry-btn" onClick={() => fetchRetakes(page)}>
            Retry
          </button>
        </div>
      ) : retakes.length === 0 ? (
        <div className="retake-lb-empty">
          <Trophy size={24} className="retake-empty-icon" />
          <p>No practice retake attempts recorded yet for this assessment.</p>
        </div>
      ) : (
        <>
          <div className="retake-lb-table-wrap">
            <table className="retake-lb-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Learner</th>
                  <th>Attempt</th>
                  <th className="text-right">Marks</th>
                  <th className="text-right">Percentage</th>
                  <th>Status</th>
                  <th className="text-right">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {retakes.map((row) => (
                  <tr key={row.attemptId} className={row.isCurrentUser ? 'is-me' : ''}>
                    <td>
                      <span className={`retake-rank-pill rank-${row.rank <= 3 ? row.rank : 'std'}`}>
                        #{row.rank}
                      </span>
                    </td>
                    <td>
                      <div className="retake-learner-cell">
                        <Avatar image={row.avatar} name={row.learnerName} size="small" />
                        <span className="retake-learner-name">{row.learnerName}</span>
                        {row.isCurrentUser && <span className="retake-you-tag">You</span>}
                      </div>
                    </td>
                    <td>
                      <span className="retake-attempt-chip">Attempt #{row.attemptNumber}</span>
                    </td>
                    <td className="text-right font-mono">
                      <strong>{row.obtainedMarks}</strong> / {row.totalMarks}
                    </td>
                    <td className="text-right font-mono">{row.percentage}%</td>
                    <td>
                      <span className={`retake-status-pill ${row.resultStatus === 'PASS' ? 'pass' : 'fail'}`}>
                        {row.resultStatus === 'PASS' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        <span>{row.resultStatus}</span>
                      </span>
                    </td>
                    <td className="text-right retake-date-cell">
                      <Calendar size={13} />
                      <span>{formatDate(row.submittedAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="retake-lb-pagination">
              <span className="retake-page-meta">
                Page {pagination.currentPage} of {pagination.totalPages} &bull; {pagination.totalRetakes} retakes
              </span>
              <div className="retake-page-btns">
                <button
                  type="button"
                  className="retake-page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrevPage}
                >
                  <ChevronLeft size={15} />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  className="retake-page-btn"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={!pagination.hasNextPage}
                >
                  <span>Next</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
