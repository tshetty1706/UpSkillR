import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Send,
  CheckCircle2,
  Clock,
  HelpCircle,
  BookOpen,
  Loader2
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import './InstructorQuestionsManager.css';

export const InstructorQuestionsManager = () => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'pending', 'answered'

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const res = await fetch('http://localhost:5000/api/courses/instructor/questions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions || []);
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
      const token = localStorage.getItem('upskillr_token');
      const res = await fetch(`http://localhost:5000/api/courses/${courseId}/questions/${questionId}/reply`, {
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
        setActiveReplyId(null);
        setReplyText('');
        fetchQuestions();
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
    if (filterTab === 'pending') return q.status === 'pending';
    if (filterTab === 'answered') return q.status === 'answered';
    return true;
  });

  return (
    <div className="inquiries-manager-root">
      {/* Header */}
      <div className="inquiries-header">
        <div>
          <h1 className="inquiries-title">Course Inquiries & Doubts</h1>
          <p className="inquiries-subtitle">
            Respond to pre-enrollment questions asked by learners across your courses to increase enrollment confidence.
          </p>
        </div>

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
              ? 'Great job! You have answered all learner questions.'
              : 'When learners ask questions on your course overviews, they will appear here.'}
          </p>
        </div>
      ) : (
        <div className="inquiries-cards-list">
          {filteredQuestions.map((q) => {
            const isReplying = activeReplyId === q._id;

            return (
              <div key={q._id} className="inquiry-card">
                <div className="inquiry-card-course-badge">
                  <BookOpen size={14} />
                  <span>{q.courseTitle}</span>
                  <span className={`status-tag status-${q.status}`}>{q.status}</span>
                </div>

                <div className="inquiry-question-block">
                  <div className="inquiry-user-meta">
                    <span className="user-name">{q.userName || 'Learner'}</span>
                    <span className="date-posted">
                      {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="question-content">{q.question}</p>
                </div>

                {/* Existing Reply */}
                {q.instructorReply && (
                  <div className="inquiry-existing-reply">
                    <div className="reply-header">
                      <CheckCircle2 size={16} className="accent-green" />
                      <span>Your Answer</span>
                      {q.replyTimestamp && (
                        <span className="reply-date">
                          • {new Date(q.replyTimestamp).toLocaleDateString()}
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
                      rows={3}
                      className="inquiry-reply-textarea"
                      placeholder="Type your clear, encouraging reply to this learner..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
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
                        <span>Publish Reply</span>
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
                    <MessageCircle size={15} />
                    <span>{q.instructorReply ? 'Edit Reply' : 'Answer Question'}</span>
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
