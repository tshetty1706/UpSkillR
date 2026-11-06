import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trophy,
  Flame,
  Star,
  Award,
  CheckCircle2,
  Sparkles,
  Clock,
  Search,
  ArrowUpDown,
  Download,
  Copy,
  Check,
  ExternalLink,
  Eye,
  X,
  Printer,
  ShieldCheck,
  Lock,
  BookOpen,
  Layers,
  Zap,
  ArrowRight,
  Filter
} from 'lucide-react';
import { API_BASE } from '../../../config/api';
import './LearnerAchievementsView.css';

export const LearnerAchievementsView = ({
  gamification: initialGamification = { points: 0, currentStreak: 0, longestStreak: 0 },
  enrolments = [],
  onExploreCourses
}) => {
  // ─── 1. Core State ───
  const [stats, setStats] = useState({
    totalPoints: initialGamification.points || 0,
    currentStreak: initialGamification.currentStreak || 0,
    longestStreak: initialGamification.longestStreak || 0,
    completedCourses: 0,
    modulesCompleted: 0
  });

  const [certificates, setCertificates] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [pointHistory, setPointHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── 2. Search, Filter & Pagination ───
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'oldest' | 'title'
  const [visibleCount, setVisibleCount] = useState(6);

  // ─── 3. Modal & Interactive State ───
  const [selectedCertModal, setSelectedCertModal] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Fetch all achievements, certificates, and milestones
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    const token = sessionStorage.getItem('upskillr_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      // 1. Fetch Learner Profile Stats
      const statsPromise = fetch(`${API_BASE}/learners/me`, { headers })
        .then((r) => r.json())
        .catch(() => null);

      // 2. Fetch Earned Certificates
      const certsPromise = fetch(`${API_BASE}/certificates/me`, { headers })
        .then((r) => r.json())
        .catch(() => null);

      // 3. Fetch Milestones
      const milestonesPromise = fetch(`${API_BASE}/learners/me/milestones`, { headers })
        .then((r) => r.json())
        .catch(() => null);

      // 4. Fetch Point Transactions History (latest 5)
      const historyPromise = fetch(`${API_BASE}/learners/me/point-history?page=1&limit=5`, { headers })
        .then((r) => r.json())
        .catch(() => null);

      const [statsRes, certsRes, milestonesRes, historyRes] = await Promise.all([
        statsPromise,
        certsPromise,
        milestonesPromise,
        historyPromise
      ]);

      // Set Stats
      if (statsRes?.success && statsRes.stats) {
        setStats({
          totalPoints: statsRes.stats.totalPoints || 0,
          currentStreak: statsRes.stats.currentStreak || 0,
          longestStreak: statsRes.stats.longestStreak || 0,
          completedCourses: statsRes.stats.coursesCompleted || 0,
          modulesCompleted: statsRes.stats.modulesCompleted || 0
        });
      } else {
        // Fallback calculation from enrolments prop
        const completedCount = enrolments.filter(
          (e) => e.progressPercentage === 100 || e.status === 'completed'
        ).length;
        setStats((prev) => ({ ...prev, completedCourses: completedCount }));
      }

      // Set Certificates
      if (certsRes?.success && Array.isArray(certsRes.certificates)) {
        setCertificates(certsRes.certificates);
      } else {
        // Fallback to /learners/me/certificates if needed
        try {
          const fallbackCerts = await fetch(`${API_BASE}/learners/me/certificates`, { headers }).then((r) => r.json());
          if (fallbackCerts?.success && Array.isArray(fallbackCerts.certificates)) {
            setCertificates(fallbackCerts.certificates);
          }
        } catch (e) {}
      }

      // Set Milestones
      if (milestonesRes?.success && Array.isArray(milestonesRes.milestones)) {
        setMilestones(milestonesRes.milestones);
      }

      // Set Point History
      if (historyRes?.success && Array.isArray(historyRes.history)) {
        setPointHistory(historyRes.history);
      }
    } catch (err) {
      console.error('Error loading achievements dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [enrolments]);

  useEffect(() => {
    loadDashboardData();

    const handlePointsUpdate = () => loadDashboardData();
    window.addEventListener('upskillr_points_updated', handlePointsUpdate);
    return () => window.removeEventListener('upskillr_points_updated', handlePointsUpdate);
  }, [loadDashboardData]);

  // ─── 4. Filtered & Sorted Certificates ───
  const filteredCertificates = useMemo(() => {
    let list = [...certificates];

    // Search filter by course title or certificate ID
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.courseTitle?.toLowerCase().includes(q) ||
          c.certificateId?.toLowerCase().includes(q) ||
          c.instructorName?.toLowerCase().includes(q)
      );
    }

    // Sort order
    if (sortBy === 'recent') {
      list.sort((a, b) => new Date(b.completionDate || b.issuedAt || 0) - new Date(a.completionDate || a.issuedAt || 0));
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.completionDate || a.issuedAt || 0) - new Date(b.completionDate || b.issuedAt || 0));
    } else if (sortBy === 'title') {
      list.sort((a, b) => (a.courseTitle || '').localeCompare(b.courseTitle || ''));
    }

    return list;
  }, [certificates, searchQuery, sortBy]);

  const visibleCertificates = useMemo(() => {
    return filteredCertificates.slice(0, visibleCount);
  }, [filteredCertificates, visibleCount]);

  // ─── 5. Actions ───
  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  const handleDownloadCertificate = (cert) => {
    if (!cert.certificateImageUrl) return;
    const link = document.createElement('a');
    link.href = cert.certificateImageUrl;
    link.download = `UpSkillR_Certificate_${cert.certificateId || 'Course'}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const handleNavigateExplore = () => {
    if (onExploreCourses) {
      onExploreCourses();
    } else {
      window.history.pushState({}, '', '/explore');
      window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/explore' } }));
    }
  };

  // Helper icon for milestones
  const getMilestoneIcon = (id) => {
    switch (id) {
      case 'first_course':
        return <BookOpen size={22} />;
      case 'first_module':
        return <Layers size={22} />;
      case 'streak_3':
        return <Flame size={22} />;
      case 'streak_7':
        return <Zap size={22} />;
      case 'streak_30':
        return <ShieldCheck size={22} />;
      case 'courses_5':
        return <Award size={22} />;
      case 'courses_10':
        return <Trophy size={22} />;
      default:
        return <Star size={22} />;
    }
  };

  return (
    <div className="learner-achievements-page">
      {/* ─── 1. TOP HEADER & LEARNING OVERVIEW ─── */}
      <header className="achievements-header">
        <h1 className="achievements-page-title">My Achievements</h1>
        <p className="achievements-page-subtitle">
          Every milestone tells a story of your learning journey.
        </p>
      </header>

      {/* ─── 2. STATS SUMMARY CARDS ─── */}
      <section className="achievements-stats-grid" aria-label="Learning Statistics">
        <div className="achieve-stat-card">
          <div className="achieve-icon-box streak-icon">
            <Flame size={24} />
          </div>
          <div className="achieve-stat-meta">
            <span className="achieve-stat-number">{stats.currentStreak} Days</span>
            <span className="achieve-stat-label">Current Streak</span>
          </div>
          <span className="stat-card-badge streak-badge">Active</span>
        </div>

        <div className="achieve-stat-card">
          <div className="achieve-icon-box best-streak-icon">
            <Trophy size={24} />
          </div>
          <div className="achieve-stat-meta">
            <span className="achieve-stat-number">{stats.longestStreak} Days</span>
            <span className="achieve-stat-label">Longest Streak</span>
          </div>
          <span className="stat-card-badge best-badge">Record</span>
        </div>

        <div className="achieve-stat-card">
          <div className="achieve-icon-box points-icon">
            <Star size={24} />
          </div>
          <div className="achieve-stat-meta">
            <span className="achieve-stat-number">{stats.totalPoints} pts</span>
            <span className="achieve-stat-label">Total Points</span>
          </div>
          <span className="stat-card-badge points-badge">+25 / Course</span>
        </div>

        <div className="achieve-stat-card">
          <div className="achieve-icon-box completed-icon">
            <Award size={24} />
          </div>
          <div className="achieve-stat-meta">
            <span className="achieve-stat-number">{stats.completedCourses}</span>
            <span className="achieve-stat-label">Completed Courses</span>
          </div>
          <span className="stat-card-badge completed-badge">100% Done</span>
        </div>
      </section>

      {/* ─── 3. CERTIFICATES SECTION (MAIN FOCUS) ─── */}
      <section className="achievements-certificates-section" aria-label="Course Certificates">
        <div className="cert-section-header">
          <div className="cert-title-lockup">
            <div className="cert-title-icon-badge">
              <Award size={22} className="accent-green" />
            </div>
            <div>
              <h2 className="cert-section-title">My Certificates</h2>
              <p className="cert-section-subtitle">
                Your learning achievements, officially recognized.
              </p>
            </div>
          </div>

          <span className="cert-counter-badge">
            {certificates.length} {certificates.length === 1 ? 'Certificate' : 'Certificates'}
          </span>
        </div>

        {/* Filter & Search Bar */}
        {certificates.length > 0 && (
          <div className="cert-controls-row">
            <div className="cert-search-input-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search certificates by course name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="cert-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn-clear-search"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="cert-sort-wrap">
              <ArrowUpDown size={15} className="sort-icon" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="cert-sort-select"
                aria-label="Sort certificates"
              >
                <option value="recent">Recently Earned</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Course Name (A-Z)</option>
              </select>
            </div>
          </div>
        )}

        {/* Content: Loading / Empty / Grid */}
        {loading ? (
          <div className="cert-state-box loading-box">
            <div className="cert-spinner" />
            <p>Loading your verified certificates...</p>
          </div>
        ) : certificates.length === 0 ? (
          /* Empty State when no certificates earned */
          <div className="cert-empty-collection-box">
            <div className="empty-trophy-symbol">
              <Award size={52} className="accent-green" />
            </div>
            <h3 className="empty-collection-title">Your Certificate Collection Starts Here!</h3>
            <p className="empty-collection-desc">
              Complete your enrolled courses and earn certificates that showcase your skills and dedication.
            </p>
            <button
              type="button"
              className="btn-explore-collection"
              onClick={handleNavigateExplore}
            >
              <span>Explore Courses</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : filteredCertificates.length === 0 ? (
          /* Empty state when search filters out all certificates */
          <div className="cert-state-box no-results-box">
            <Filter size={32} className="text-muted" />
            <h4>No certificates match "{searchQuery}"</h4>
            <p>Try searching with another keyword or clear your search query.</p>
            <button
              type="button"
              className="btn-clear-filter"
              onClick={() => setSearchQuery('')}
            >
              Clear Filter
            </button>
          </div>
        ) : (
          /* Real Certificates Grid */
          <>
            <div className="certificates-grid">
              {visibleCertificates.map((cert) => {
                const completionDateStr = cert.completionDate || cert.issuedAt;
                const formattedDate = completionDateStr
                  ? new Date(completionDateStr).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  : 'Completed';

                return (
                  <div key={cert.certificateId || cert._id} className="certificate-card">
                    {/* Actual Certificate Thumbnail Preview */}
                    <div
                      className="cert-card-preview-frame"
                      onClick={() => setSelectedCertModal(cert)}
                      title="Click to preview certificate in full resolution"
                    >
                      <img
                        src={cert.certificateImageUrl || '/assets/certificate_template.png'}
                        alt={`Certificate for ${cert.courseTitle}`}
                        className="cert-card-img"
                        loading="lazy"
                      />
                      <div className="cert-preview-hover-overlay">
                        <Eye size={20} />
                        <span>View Certificate</span>
                      </div>
                    </div>

                    {/* Certificate Card Body */}
                    <div className="cert-card-body">
                      <div className="cert-card-status-pill">
                        <ShieldCheck size={14} className="accent-green" />
                        <span>Verified & Authentic</span>
                      </div>

                      <h3 className="cert-card-title" title={cert.courseTitle}>
                        {cert.courseTitle}
                      </h3>

                      <div className="cert-card-meta-list">
                        <div className="cert-meta-row">
                          <span className="meta-label">Awarded To:</span>
                          <strong className="meta-value">{cert.studentName || 'Learner'}</strong>
                        </div>
                        <div className="cert-meta-row">
                          <span className="meta-label">Instructor:</span>
                          <span className="meta-value">{cert.instructorName || 'UpSkillR Instructor'}</span>
                        </div>
                        <div className="cert-meta-row">
                          <span className="meta-label">Date:</span>
                          <span className="meta-value">{formattedDate}</span>
                        </div>
                        <div className="cert-meta-row id-row">
                          <span className="meta-label">ID:</span>
                          <code className="cert-id-tag">{cert.certificateId}</code>
                          <button
                            type="button"
                            className="btn-copy-tag"
                            onClick={() => handleCopyId(cert.certificateId)}
                            title="Copy Certificate ID"
                          >
                            {copiedId === cert.certificateId ? (
                              <Check size={12} className="accent-green" />
                            ) : (
                              <Copy size={12} />
                            )}
                            <span>{copiedId === cert.certificateId ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Card Action Bar */}
                      <div className="cert-card-actions">
                        <button
                          type="button"
                          className="btn-action-view"
                          onClick={() => setSelectedCertModal(cert)}
                        >
                          <Eye size={15} />
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          className="btn-action-download"
                          onClick={() => handleDownloadCertificate(cert)}
                          title="Download high-resolution PNG"
                        >
                          <Download size={15} />
                          <span>Download</span>
                        </button>

                        <a
                          href={`/verify-certificate/${cert.certificateId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-action-verify"
                          title="Open public verification page"
                        >
                          <span>Verify</span>
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More Pagination */}
            {filteredCertificates.length > visibleCount && (
              <div className="cert-load-more-row">
                <button
                  type="button"
                  className="btn-load-more-certs"
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                >
                  <span>Load More Certificates</span>
                  <span className="load-count-chip">
                    +{filteredCertificates.length - visibleCount} remaining
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ─── 4. LEARNING MILESTONES SECTION ─── */}
      <section className="achievements-milestones-section" aria-label="Learning Milestones">
        <div className="milestones-header-row">
          <div>
            <h2 className="milestones-section-title">Learning Milestones</h2>
            <p className="milestones-section-subtitle">
              Milestones unlock automatically as you learn, complete modules, and finish courses.
            </p>
          </div>
          <span className="milestone-badge-count">
            {milestones.filter((m) => m.earned).length} / {milestones.length || 7} Unlocked
          </span>
        </div>

        <div className="milestones-grid">
          {milestones.map((milestone) => {
            const isEarned = milestone.earned;
            const progressPercent = milestone.target > 0
              ? Math.min(100, Math.round((milestone.current / milestone.target) * 100))
              : 0;

            const achievedDateStr = milestone.achievedAt
              ? new Date(milestone.achievedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : null;

            return (
              <div
                key={milestone.id}
                className={`milestone-card ${isEarned ? 'milestone-unlocked' : 'milestone-locked'}`}
              >
                <div className="milestone-icon-wrap">
                  {getMilestoneIcon(milestone.id)}
                  {isEarned ? (
                    <span className="milestone-check-badge">
                      <CheckCircle2 size={14} />
                    </span>
                  ) : (
                    <span className="milestone-lock-badge">
                      <Lock size={12} />
                    </span>
                  )}
                </div>

                <div className="milestone-body">
                  <div className="milestone-title-row">
                    <h3 className="milestone-title">{milestone.title}</h3>
                    <span className={`milestone-status-chip ${isEarned ? 'chip-earned' : 'chip-locked'}`}>
                      {isEarned ? 'UNLOCKED' : 'LOCKED'}
                    </span>
                  </div>

                  <p className="milestone-description">{milestone.description}</p>

                  {isEarned ? (
                    <div className="milestone-achieved-text">
                      <Sparkles size={13} className="accent-green" />
                      <span>{achievedDateStr ? `Achieved on ${achievedDateStr}` : 'Completed & Verified'}</span>
                    </div>
                  ) : (
                    <div className="milestone-progress-wrap">
                      <div className="milestone-progress-bar">
                        <div
                          className="milestone-progress-fill"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="milestone-progress-label">
                        {milestone.current} / {milestone.target}{' '}
                        {milestone.category === 'streak'
                          ? 'days'
                          : milestone.category === 'module'
                          ? 'modules'
                          : 'courses'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 5. POINTS & REWARDS SYSTEM AUDIT LOG ─── */}
      <section className="achievements-rewards-section" aria-label="Points Rules and Activity">
        <div className="rewards-rules-header">
          <div className="rules-icon-wrap">
            <Star size={20} className="accent-green" />
          </div>
          <div>
            <h2 className="rewards-rules-title">Points & Activity Rules</h2>
            <p className="rewards-rules-subtitle">
              Points are awarded automatically based on genuine platform activity.
            </p>
          </div>
        </div>

        <div className="rewards-rules-grid">
          <div className="reward-rule-card">
            <span className="rule-points-pill">+1 point</span>
            <h4 className="rule-card-title">Daily Login</h4>
            <p className="rule-card-desc">
              Awarded once per calendar day upon your first successful login.
            </p>
          </div>

          <div className="reward-rule-card">
            <span className="rule-points-pill">+5 points</span>
            <h4 className="rule-card-title">Module Completion</h4>
            <p className="rule-card-desc">
              Awarded for completing all lesson checks and videos in a module.
            </p>
          </div>

          <div className="reward-rule-card">
            <span className="rule-points-pill">+25 points</span>
            <h4 className="rule-card-title">Course Completion</h4>
            <p className="rule-card-desc">
              Awarded when you finish 100% of curriculum & satisfy watch criteria.
            </p>
          </div>
        </div>

        {/* Recent Ledger Activity */}
        {pointHistory.length > 0 && (
          <div className="rewards-ledger-box">
            <h4 className="ledger-box-title">Recent Point Awards</h4>
            <div className="ledger-items-list">
              {pointHistory.map((tx, idx) => (
                <div key={tx._id || idx} className="ledger-item-row">
                  <div className="ledger-item-left">
                    <span className="ledger-type-dot" />
                    <div>
                      <span className="ledger-desc">{tx.description}</span>
                      <span className="ledger-date">
                        {new Date(tx.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  <strong className="ledger-points">+{tx.points} pts</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ─── 6. DEDICATED CERTIFICATE VIEWER MODAL ─── */}
      {selectedCertModal && (
        <div
          className="cert-viewer-modal-overlay"
          onClick={() => setSelectedCertModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="cert-viewer-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="cert-viewer-header">
              <div className="cert-viewer-title-row">
                <Award size={22} className="accent-green" />
                <div>
                  <h3 className="cert-viewer-heading">{selectedCertModal.courseTitle}</h3>
                  <span className="cert-viewer-id">Certificate ID: {selectedCertModal.certificateId}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-cert-viewer-close"
                onClick={() => setSelectedCertModal(null)}
                aria-label="Close certificate dialog"
              >
                <X size={20} />
              </button>
            </div>

            {/* High-Resolution Document Canvas */}
            <div className="cert-viewer-canvas-wrap">
              <img
                src={selectedCertModal.certificateImageUrl || '/assets/certificate_template.png'}
                alt={`Certificate for ${selectedCertModal.courseTitle}`}
                className="cert-viewer-document-img"
              />
            </div>

            {/* Modal Actions */}
            <div className="cert-viewer-footer">
              <div className="cert-viewer-meta-tags">
                <span className="meta-tag">
                  <ShieldCheck size={14} className="accent-green" /> Officially Verified
                </span>
                <span className="meta-tag">
                  <Clock size={14} /> Completed:{' '}
                  {new Date(selectedCertModal.completionDate || selectedCertModal.issuedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="cert-viewer-action-btns">
                <button
                  type="button"
                  className="btn-viewer-copy"
                  onClick={() => handleCopyId(selectedCertModal.certificateId)}
                >
                  {copiedId === selectedCertModal.certificateId ? (
                    <Check size={15} className="accent-green" />
                  ) : (
                    <Copy size={15} />
                  )}
                  <span>{copiedId === selectedCertModal.certificateId ? 'Copied' : 'Copy ID'}</span>
                </button>

                <a
                  href={`/verify-certificate/${selectedCertModal.certificateId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-viewer-verify"
                >
                  <ExternalLink size={15} />
                  <span>Verify Online</span>
                </a>

                <button
                  type="button"
                  className="btn-viewer-print"
                  onClick={handlePrintCertificate}
                >
                  <Printer size={15} />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  className="btn-viewer-download"
                  onClick={() => handleDownloadCertificate(selectedCertModal)}
                >
                  <Download size={15} />
                  <span>Download PNG</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnerAchievementsView;
