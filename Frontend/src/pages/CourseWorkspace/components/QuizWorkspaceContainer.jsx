import React, { useState, useEffect, useCallback } from 'react';
import { QuizInfoView } from './QuizInfoView.jsx';
import { QuizResultsLeaderboardView } from './QuizResultsLeaderboardView.jsx';
import { Loader2 } from 'lucide-react';
import './QuizView.css';

export const QuizWorkspaceContainer = ({
  lesson,
  contentItem,
  course,
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
  const [activeView, setActiveView] = useState('info'); // 'info' | 'results'
  const [isStarting, setIsStarting] = useState(false);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  const getAuthHeader = () => {
    const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // 1. Fetch Quiz Information & Attempt Status
  const fetchQuizInfo = useCallback(async () => {
    if (!courseId || !quizId) return;

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`http://localhost:5000/api/courses/${courseId}/quizzes/${quizId}/info`, {
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

      // Default view: If student has already attempted, show Results & Leaderboard.
      // If student has NOT attempted, show Quiz Info page.
      if (data.hasAttempted && data.firstAttempt) {
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

  // 2. Fetch Leaderboard (Authorized only if student has completed >= 1 attempt)
  const fetchLeaderboard = useCallback(async () => {
    if (!courseId || !quizId || !hasAttempted) return;

    try {
      setIsLoadingLeaderboard(true);
      const res = await fetch(`http://localhost:5000/api/courses/${courseId}/quizzes/${quizId}/leaderboard`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLeaderboard(data.leaderboard || []);
        setUserRank(data.userRank || null);
        setTotalParticipants(data.totalParticipants || 0);
      }
    } catch (err) {
      console.error('fetchLeaderboard error:', err);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, [courseId, quizId, hasAttempted]);

  useEffect(() => {
    if (activeView === 'results' && hasAttempted) {
      fetchLeaderboard();
    }
  }, [activeView, hasAttempted, fetchLeaderboard]);

  // 3. Start or Retake Quiz Attempt
  const handleStartQuiz = async () => {
    if (isStarting || !courseId || !quizId) return;

    try {
      setIsStarting(true);
      const res = await fetch(`http://localhost:5000/api/courses/${courseId}/quizzes/${quizId}/start`, {
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

      // Navigate to dedicated quiz taking page
      const attemptId = data.attemptId;
      window.location.href = `/quiz/${courseId}/${quizId}/attempt/${attemptId}`;
    } catch (err) {
      console.error('handleStartQuiz error:', err);
      alert(err.message || 'Could not start quiz. Please try again.');
      setIsStarting(false);
    }
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
        <QuizResultsLeaderboardView
          quiz={quizDetails}
          firstAttempt={firstAttempt}
          attemptsCount={attemptsCount}
          leaderboard={leaderboard}
          userRank={userRank}
          totalParticipants={totalParticipants}
          isLoadingLeaderboard={isLoadingLeaderboard}
          onStartQuiz={handleStartQuiz}
          onViewQuizInfo={() => setActiveView('info')}
          isStarting={isStarting}
        />
      ) : (
        <QuizInfoView
          quiz={quizDetails}
          hasAttempted={hasAttempted}
          attemptsCount={attemptsCount}
          firstAttempt={firstAttempt}
          onStartQuiz={handleStartQuiz}
          onViewLeaderboard={() => setActiveView('results')}
          isStarting={isStarting}
        />
      )}
    </div>
  );
};

export default QuizWorkspaceContainer;
