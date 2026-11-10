import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Send,
  CheckCircle2,
  Clock,
  HelpCircle,
  BookOpen,
  Loader2,
  Filter,
  User,
  ShieldCheck,
  Edit3
} from 'lucide-react';
import { API_BASE } from '../../../config/api';
import { useToast } from '../../../context/ToastContext';
import './InstructorQuestionsManager.css';

export const InstructorQuestionsManager = () => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'pending', 'answered'
  const [courseFilter, setCourseFilter] = useState('all'); // 'all' or courseId
  const highlightedRef = useRef(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const res = await fetch(`${API_BASE}/courses/instructor/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const fetchedQuestions = data.questions || [];
        setQuestions(fetchedQuestions);

        if (Array.isArray(data.courses) && data.courses.length > 0) {
          setCourses(data.courses);
        } else {
          // Extract unique courses from questions
          const courseMap = {};
          fetchedQuestions.forEach((q) => {
            if (q.courseId && !courseMap[q.courseId]) {
              courseMap[q.courseId] = q.courseTitle || 'Course';
            }
          });
          setCourses(Object.entries(courseMap).map(([id, title]) => ({ _id: id, title })));
        }

        // Check for deep-link params in URL
        const params = new URLSearchParams(window.location.search);
        const qCourseId = params.get('courseId');
        const qQuestionId = params.get('questionId');

        if (qCourseId) {
          setCourseFilter(qCourseId);
        }
        if (qQuestionId) {
          setActiveReplyId(qQuestionId);
          const targetQ = fetchedQuestions.find((q) => q._id === qQuestionId);
          if (targetQ) {
            setReplyText(targetQ.instructorReply || '');
          }
          setTimeout(() => {
            const el = document.getElementById(`inquiry-${qQuestionId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('highlight-thread-pulse');
              setTimeout(() => el.classList.remove('highlight-thread-pulse'), 3000);
            }
          }, 200);
        }
      }
    } catch (e) {
      console.error('Failed to load instructor inquiries:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (courseId, questionId) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const res = await fetch(`${API_BASE}/courses/${courseId}/questions/${questionId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reply: replyText.trim() })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Reply submitted successfully!');
        const updatedQuestion = data.question;

        // Update question locally
        setQuestions((prev) =>
          prev.map((q) => {
            if (q._id === questionId) {
              return {
                ...q,
                ...updatedQuestion,
                instructorReply: replyText.trim(),
                status: 'answered',
                replyTimestamp: new Date()
              };
            }
            return q;
          })
        );

        setActiveReplyId(null);
        setReplyText('');
      } else {
        toast.error(data.message || 'Failed to submit reply.');
      }
    } catch (e) {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    // Tab filter
    if (filterTab === 'pending' && q.status !== 'pending') return false;
    if (filterTab === 'answered' && q.status !== 'answered') return false;

    // Course filter
    if (courseFilter !== 'all' && q.courseId !== courseFilter && q.courseId?.toString() !== courseFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="inquiries-manager-root">
      {/* Header */}
      <div className="inquiries-header">
        <div>
          <h1 className="inquiries-title">Course Inquiries &amp; Doubts</h1>
          <p className="inquiries-subtitle">
            Respond directly to questions asked by learners in your courses. Replies appear instantly in the learner's Q&amp;A tab and send an in-app notification.
          </p>
        </div>

        <div className="inquiries-controls-row">
          {/* Course Dropdown Filter */}
          {courses.length > 0 && (
            <div className="inquiries-course-select-wrap">
              <Filter size={14} className="filter-select-icon" />
              <select
                className="inquiries-course-select"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                aria-label="Filter by course"
              >
                <option value="all">All Courses ({questions.length})</option>
                {courses.map((c) => {
                  const count = questions.filter(
                    (q) => q.courseId === c._id || q.courseId?.toString() === c._id?.toString()
                  ).length;
                  return (
                    <option key={c._id} value={c._id}>
                      {c.title} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Status Filter Pills */}
          <div className="inquiries-filter-pills">
            <button
              type="button"
              className={`filter-pill-btn ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              All ({questions.length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${filterTab === 'pending' ? 'active' : ''}`}
              onClick={() => setFilterTab('pending')}
            >
              Pending ({questions.filter((q) => q.status === 'pending').length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${filterTab === 'answered' ? 'active' : ''}`}
              onClick={() => setFilterTab('answered')}
            >
              Answered ({questions.filter((q) => q.status === 'answered').length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="inquiries-loading-box">
          <Loader2 size={28} className="spinner-rotate" />
          <span>Loading learner questions...</span>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="inquiries-empty-state">
          <HelpCircle size={36} className="empty-inquiry-icon" />
          <h3>No inquiries found</h3>
          <p>
            {filterTab === 'pending'
              ? 'Great job! You have answered all pending learner questions.'
              : courseFilter !== 'all'
              ? 'No questions found for the selected course.'
              : 'When learners ask questions on your course overviews, they will appear here.'}
          </p>
        </div>
      ) : (
        <div className="inquiries-cards-list">
          {filteredQuestions.map((q) => {
            const isReplying = activeReplyId === q._id;

            return (
              <div
                key={q._id}
                id={`inquiry-${q._id}`}
                className={`inquiry-card ${isReplying ? 'is-replying' : ''}`}
              >
                <div className="inquiry-card-course-badge">
                  <BookOpen size={14} />
                  <span className="inquiry-course-title-text">{q.courseTitle}</span>
                  <span className={`status-tag status-${q.status}`}>
                    {q.status === 'answered' ? (
                      <>
                        <CheckCircle2 size={12} /> Answered
                      </>
                    ) : (
                      <>
                        <Clock size={12} /> Pending
                      </>
                    )}
                  </span>
                </div>

                <div className="inquiry-question-block">
                  <div className="inquiry-user-meta">
                    {q.userAvatar ? (
                      <img src={q.userAvatar} alt={q.userName} className="inquiry-user-avatar" />
                    ) : (
                      <div className="inquiry-avatar-fallback">
                        {(q.userName || 'L').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="user-name">{q.userName || 'Learner'}</span>
                    <span className="date-posted">
                      {q.createdAt
                        ? new Date(q.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : ''}
                    </span>
                  </div>
                  <p className="question-content">{q.question}</p>
                </div>

                {/* Existing Reply */}
                {q.instructorReply && (
                  <div className="inquiry-existing-reply">
                    <div className="reply-header">
                      <div className="reply-header-left">
                        <CheckCircle2 size={15} className="accent-green" />
                        <span>Your Published Reply</span>
                        <span className="instructor-tag">Instructor</span>
                      </div>
                      {q.replyTimestamp && (
                        <span className="reply-date">
                          {new Date(q.replyTimestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                    <p className="reply-content">{q.instructorReply}</p>
                  </div>
                )}

                {/* Reply Form */}
                {isReplying ? (
                  <div className="inquiry-reply-box">
                    <textarea
                      rows={4}
                      className="inquiry-reply-textarea"
                      placeholder="Type your clear, encouraging reply to this learner..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      autoFocus
                    />
                    <div className="reply-actions-row">
                      <button
                        type="button"
                        className="btn-cancel-reply"
                        onClick={() => {
                          setActiveReplyId(null);
                          setReplyText('');
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-submit-reply"
                        disabled={!replyText.trim() || submittingReply}
                        onClick={() => handleSendReply(q.courseId, q._id)}
                      >
                        {submittingReply ? (
                          <Loader2 size={14} className="spinner-rotate" />
                        ) : (
                          <Send size={14} />
                        )}
                        <span>{q.instructorReply ? 'Update Reply' : 'Publish Reply'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-open-reply"
                    onClick={() => {
                      setActiveReplyId(q._id);
                      setReplyText(q.instructorReply || '');
                    }}
                  >
                    {q.instructorReply ? (
                      <>
                        <Edit3 size={15} />
                        <span>Edit Reply</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle size={15} />
                        <span>Answer Question</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
