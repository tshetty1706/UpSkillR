import React, { useState, useEffect, useCallback } from 'react';
import { QuizInfoView } from './QuizInfoView.jsx';
import { PersonalQuizHistoryView } from './PersonalQuizHistoryView.jsx';
import { Loader2 } from 'lucide-react';
import { API_BASE } from '../../../config/api';
import './QuizView.css';

export const QuizWorkspaceContainer = ({
  lesson,
  contentItem,
  course,
  bookmarkState = {},
  moduleIdx,
  lessonIdx,
  itemIdx,
  onNavigate
}) => {
  const courseId = course?._id || course?.id;
  const quizId = contentItem?._id || lesson?._id;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizDetails, setQuizDetails] = useState(null);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [firstAttempt, setFirstAttempt] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [activeView, setActiveView] = useState('info'); // 'info' | 'results'
  const [isStarting, setIsStarting] = useState(false);

  // Construct return query parameters to preserve learning workspace context
  const buildContextQuery = useCallback(() => {
    const search = new URLSearchParams(window.location.search);
    const m = moduleIdx !== undefined && moduleIdx !== null ? moduleIdx : search.get('module');
    const l = lessonIdx !== undefined && lessonIdx !== null ? lessonIdx : search.get('lesson');
    const i = itemIdx !== undefined && itemIdx !== null ? itemIdx : search.get('item');

    const params = new URLSearchParams();
    if (m !== null && m !== undefined) params.set('module', m);
    if (l !== null && l !== undefined) params.set('lesson', l);
    if (i !== null && i !== undefined) params.set('item', i);

    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [moduleIdx, lessonIdx, itemIdx]);

  const getAuthHeader = () => {
    const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // 1. Fetch Quiz Information & Personal Attempts History
  const fetchQuizInfo = useCallback(async () => {
    if (!courseId || !quizId) return;

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE}/courses/${courseId}/quizzes/${quizId}/info`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load quiz details.');
      }

      setQuizDetails(data.quiz);
      setHasAttempted(Boolean(data.hasAttempted));
      setAttemptsCount(data.attemptsCount || 0);
      setFirstAttempt(data.firstAttempt || null);
      setAttempts(data.attempts || []);

      // If student has already attempted, show personal attempts history by default.
      // If student has not attempted, show Quiz Info instructions.
      if (data.hasAttempted && (data.firstAttempt || (data.attempts && data.attempts.length > 0))) {
        setActiveView('results');
      } else {
        setActiveView('info');
      }
    } catch (err) {
      console.error('fetchQuizInfo error:', err);
      setError(err.message || 'Error loading quiz.');
    } finally {
      setIsLoading(false);
    }
  }, [courseId, quizId]);

  useEffect(() => {
    fetchQuizInfo();
  }, [fetchQuizInfo]);

  // 2. Start or Retake Quiz Attempt
  const handleStartQuiz = async () => {
    if (isStarting || !courseId || !quizId) return;

    try {
      setIsStarting(true);
      const res = await fetch(`${API_BASE}/courses/${courseId}/quizzes/${quizId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to start quiz attempt.');
      }

      // Navigate to dedicated quiz taking page with workspace context preserved
      const attemptId = data.attemptId;
      const contextQuery = buildContextQuery();
      window.location.href = `/quiz/${courseId}/${quizId}/attempt/${attemptId}${contextQuery}`;
    } catch (err) {
      console.error('handleStartQuiz error:', err);
      alert(err.message || 'Could not start quiz. Please try again.');
      setIsStarting(false);
    }
  };

  // 3. Review a past attempt
  const handleReviewAttempt = (attemptId) => {
    if (!attemptId || !courseId || !quizId) return;
    const contextQuery = buildContextQuery();
    window.location.href = `/quiz/${courseId}/${quizId}/attempt/${attemptId}${contextQuery}`;
  };

  if (isLoading) {
    return (
      <div className="quiz-workspace-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--brand-primary, #10b981)', fontWeight: 600 }}>
          <Loader2 className="animate-spin" size={24} />
          <span>Loading quiz...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-workspace-container">
        <div style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ color: '#ef4444', fontWeight: 600, marginBottom: '12px' }}>{error}</p>
          <button type="button" className="btn-gfg-secondary" onClick={fetchQuizInfo}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-workspace-container">
      {activeView === 'results' && hasAttempted ? (
        <PersonalQuizHistoryView
          quiz={quizDetails}
          firstAttempt={firstAttempt}
          attempts={attempts}
          attemptsCount={attemptsCount}
          onStartQuiz={handleStartQuiz}
          onViewQuizInfo={() => setActiveView('info')}
          onReviewAttempt={handleReviewAttempt}
          isStarting={isStarting}
          isBookmarked={Boolean(bookmarkState.isBookmarked)}
          onToggleBookmark={bookmarkState.onToggleBookmark}
        />
      ) : (
        <QuizInfoView
          quiz={quizDetails}
          hasAttempted={hasAttempted}
          attemptsCount={attemptsCount}
          firstAttempt={firstAttempt}
          onStartQuiz={handleStartQuiz}
          onViewAttempts={() => setActiveView('results')}
          isStarting={isStarting}
          isBookmarked={Boolean(bookmarkState.isBookmarked)}
          onToggleBookmark={bookmarkState.onToggleBookmark}
        />
      )}
    </div>
  );
};

export default QuizWorkspaceContainer;
