import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mail, Settings, Flame, Trophy, BookOpen, CheckCircle,
  ExternalLink, Calendar, Star, MessageSquare, Award,
  Compass, Tag, Layers, CheckCircle2, X, Printer, Download, Sparkles
} from 'lucide-react';
import { Avatar } from '../../common/Avatar/Avatar';
import { useToast } from '../../../context/ToastContext';
import { API_BASE } from '../../../config/api';
import './LearnerProfileView.css';

// ─── Platform Icon Components (Inline SVG) ───
const GithubIcon = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const LinkedinIcon = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const LeetcodeIcon = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" />
  </svg>
);

const InstagramIcon = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const FacebookIcon = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const CodeforcesIcon = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4.5 7.5C4.5 6.12 5.62 5 7 5s2.5 1.12 2.5 2.5v9C9.5 17.88 8.38 19 7 19s-2.5-1.12-2.5-2.5v-9zm7-4C11.5 2.12 12.62 1 14 1s2.5 1.12 2.5 2.5v13c0 1.38-1.12 2.5-2.5 2.5s-2.5-1.12-2.5-2.5V3.5zm7 7C18.5 9.12 19.62 8 21 8s2.5 1.12 2.5 2.5v6C23.5 17.88 22.38 19 21 19s-2.5-1.12-2.5-2.5v-6z" />
  </svg>
);

const GFGIcon = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M5.6 10c-.5 0-.9.2-1.2.5-.3.3-.5.7-.5 1.2v.6c0 .5.2.9.5 1.2.3.3.7.5 1.2.5h12.8c.5 0 .9-.2 1.2-.5.3-.3.5-.7.5-1.2v-.6c0-.5-.2-.9-.5-1.2-.3-.3-.7-.5-1.2-.5H12v-.4c.8-.3 1.4-.8 1.9-1.4.5-.7.7-1.4.7-2.2 0-.9-.3-1.7-.8-2.3-.6-.6-1.3-.9-2.2-.9s-1.6.3-2.2.9c-.5.6-.8 1.4-.8 2.3 0 .8.2 1.5.7 2.2.5.7 1.1 1.1 1.9 1.4V10H5.6zm6.4-4.8c.4 0 .7.1 1 .4.3.3.4.6.4 1s-.1.7-.4 1c-.3.3-.6.4-1 .4s-.7-.1-1-.4c-.3-.3-.4-.6-.4-1s.1-.7.4-1c.3-.3.6-.4 1-.4zm6.4 12H5.6c-.5 0-.9.2-1.2.5-.3.3-.5.7-.5 1.2v.6c0 .5.2.9.5 1.2.3.3.7.5 1.2.5h12.8c.5 0 .9-.2 1.2-.5.3-.3.5-.7.5-1.2v-.6c0-.5-.2-.9-.5-1.2-.3-.3-.7-.5-1.2-.5z" />
  </svg>
);

const HackerRankIcon = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0c1.285 0 9.75 4.886 10.392 6 .645 1.115.645 10.885 0 12C21.75 19.114 13.284 24 12 24 10.716 24 2.25 19.114 1.608 18 .963 16.885.963 7.115 1.608 6 2.25 4.886 10.715 0 12 0zm-1.72 5.5a.25.25 0 0 0-.25.25v4.505l-.28.147C9.41 10.71 9.175 11 9.175 11.25s.235.54.575.748l.28.147V16.25a.25.25 0 0 0 .25.25h.25a.25.25 0 0 0 .25-.25v-4.505l.28-.147c.34-.207.575-.498.575-.748s-.235-.54-.575-.748l-.28-.147V5.75a.25.25 0 0 0-.25-.25zm3.44 0a.25.25 0 0 0-.25.25v3.505l-.28.147c-.34.207-.575.498-.575.748s.235.54.575.748l.28.147V16.25a.25.25 0 0 0 .25.25h.25a.25.25 0 0 0 .25-.25v-3.505l.28-.147c.34-.207.575-.498.575-.748s-.235-.54-.575-.748l-.28-.147V5.75a.25.25 0 0 0-.25-.25z" />
  </svg>
);

const SOCIAL_PLATFORMS = [
  { key: 'github', label: 'GitHub', Icon: GithubIcon },
  { key: 'linkedin', label: 'LinkedIn', Icon: LinkedinIcon },
  { key: 'leetcode', label: 'LeetCode', Icon: LeetcodeIcon },
  { key: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { key: 'facebook', label: 'Facebook', Icon: FacebookIcon },
  { key: 'codeforces', label: 'Codeforces', Icon: CodeforcesIcon },
  { key: 'geeksforgeeks', label: 'GeeksforGeeks', Icon: GFGIcon },
  { key: 'hackerrank', label: 'HackerRank', Icon: HackerRankIcon }
];

// Helper to validate and format platform url
const getCleanUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

// ─── Heatmap Sub-Component ───
const ActivityHeatmap = ({ activityData = [], loading = false }) => {
  const [hoveredDay, setHoveredDay] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const scrollRef = useRef(null);

  const { weeks, monthLabels, totalCount } = useMemo(() => {
    const activityMap = {};
    let total = 0;
    (activityData || []).forEach((item) => {
      activityMap[item.date] = {
        count: item.count || 0,
        activities: item.activities || [],
        descriptions: item.descriptions || []
      };
      total += item.count || 0;
    });

    const now = new Date();
    now.setHours(23, 59, 59, 999);

    const startDate = new Date(now);
    startDate.setFullYear(startDate.getFullYear() - 1);
    startDate.setDate(startDate.getDate() + 1);

    const dayOfWeek = startDate.getDay();
    const daysBack = (dayOfWeek + 6) % 7; // Monday = 0
    startDate.setDate(startDate.getDate() - daysBack);

    const weeksArr = [];
    const monthsArr = [];
    let currentWeek = [];
    let cur = new Date(startDate);
    let lastMonth = -1;
    let colIndex = 0;

    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    while (cur <= now || currentWeek.length > 0) {
      const dateStr = cur.toISOString().split('T')[0];
      const isFuture = cur > now;
      const dataForDay = activityMap[dateStr] || { count: 0, activities: [], descriptions: [] };

      if (cur.getMonth() !== lastMonth && !isFuture) {
        lastMonth = cur.getMonth();
        monthsArr.push({ label: MONTH_NAMES[lastMonth], colIdx: colIndex });
      }

      currentWeek.push({
        dateStr,
        isFuture,
        count: isFuture ? 0 : dataForDay.count,
        descriptions: dataForDay.descriptions || []
      });

      if (currentWeek.length === 7) {
        weeksArr.push(currentWeek);
        currentWeek = [];
        colIndex++;
      }

      cur.setDate(cur.getDate() + 1);
      if (cur > now && currentWeek.length === 0) break;
    }

    return { weeks: weeksArr, monthLabels: monthsArr, totalCount: total };
  }, [activityData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [loading, weeks.length]);

  if (loading) {
    return <div className="heatmap-loading">Loading activity data...</div>;
  }

  const activeDay = hoveredDay || selectedDay;
  const formattedDate = activeDay
    ? new Date(activeDay.dateStr + 'T12:00:00').toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-header-summary">
        <span className="heatmap-total-badge">
          <strong>{totalCount}</strong> {totalCount === 1 ? 'activity' : 'activities'} in the last 12 months
        </span>
        <span className="heatmap-hint-sub">Scroll or click dates to inspect activity</span>
      </div>

      <div className="heatmap-scroll-container" ref={scrollRef} onMouseLeave={() => setHoveredDay(null)}>
        <div className="heatmap-scroll-inner">
          <div className="heatmap-month-header">
            <div className="heatmap-weekday-spacer" />
            <div
              className="heatmap-months-track"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${weeks.length}, 13px)`,
                columnGap: '3px'
              }}
            >
              {monthLabels.map((m) => (
                <span
                  key={m.label + m.colIdx}
                  style={{ gridColumnStart: m.colIdx + 1 }}
                  className="heatmap-month-name"
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          <div className="heatmap-grid-row">
            <div className="heatmap-day-labels" aria-hidden="true">
              <span className="day-label" />
              <span className="day-label">Mon</span>
              <span className="day-label" />
              <span className="day-label">Wed</span>
              <span className="day-label" />
              <span className="day-label">Fri</span>
              <span className="day-label" />
            </div>

            <div
              className="heatmap-weeks-track"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${weeks.length}, 13px)`,
                columnGap: '3px'
              }}
            >
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="heatmap-week-col">
                  {week.map((day, dIdx) => {
                    const isSelected = activeDay?.dateStr === day.dateStr;
                    return (
                      <button
                        type="button"
                        key={dIdx}
                        className={`heatmap-cell ${day.isFuture ? 'heat-future' : `heat-${Math.min(day.count, 3)}`} ${isSelected ? 'cell-selected' : ''}`}
                        onMouseEnter={() => !day.isFuture && setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={() => !day.isFuture && setSelectedDay(day)}
                        aria-label={day.isFuture ? '' : `${day.dateStr}: ${day.count} activities`}
                        title={day.isFuture ? '' : `${day.dateStr} • ${day.count} activities`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="heatmap-footer-row">
        <span className="heatmap-click-tip">Click or hover any date to inspect details</span>
        <div className="heatmap-legend">
          <span className="legend-label">More</span>
          <div className="heatmap-cell heat-1" title="1 activity" />
          <div className="heatmap-cell heat-2" title="2 activities" />
          <div className="heatmap-cell heat-3" title="3+ activities" />
          <div className="heatmap-cell heat-0" title="0 activities" />
          <span className="legend-label">Less</span>
        </div>
      </div>

      {activeDay && (
        <div className="heatmap-detail-card">
          <div className="heatmap-detail-header">
            <div className="heatmap-detail-date-col">
              <div className="heatmap-detail-date-title">
                <Calendar size={15} className="heatmap-cal-icon" />
                <span>{formattedDate}</span>
              </div>
              <div className="heatmap-detail-count-badge">
                {activeDay.count === 0 ? (
                  <span className="count-zero">No learning activity on this day</span>
                ) : (
                  <span className="count-active">
                    <strong>{activeDay.count}</strong> {activeDay.count === 1 ? 'activity' : 'activities'} logged
                  </span>
                )}
              </div>
            </div>
          </div>

          {activeDay.descriptions && activeDay.descriptions.length > 0 ? (
            <ul className="heatmap-activity-list">
              {activeDay.descriptions.map((desc, idx) => (
                <li key={idx} className="heatmap-activity-item">
                  <span className="activity-bullet">•</span>
                  <span>{desc}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="heatmap-no-activity-desc">
              Consistent daily practice drives real progress. Complete a lesson, pass a quiz, or check in daily to grow your streak!
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main LearnerProfileView Component ───
export const LearnerProfileView = ({ user, onNavigateSettings }) => {
  const { toast } = useToast();

  const [profile, setProfile] = useState({
    fullName: user?.fullName || 'Learner',
    email: user?.email || '',
    username: user?.username || '',
    avatar: user?.avatar || '',
    bio: user?.bio || '',
    learningGoal: user?.learningGoal || 'Web Development',
    learningInterests: user?.learningInterests || ['Web Development', 'JavaScript'],
    socialLinks: {
      github: user?.socialLinks?.github || '',
      linkedin: user?.socialLinks?.linkedin || '',
      leetcode: user?.socialLinks?.leetcode || '',
      instagram: user?.socialLinks?.instagram || '',
      facebook: user?.socialLinks?.facebook || '',
      codeforces: user?.socialLinks?.codeforces || '',
      geeksforgeeks: user?.socialLinks?.geeksforgeeks || '',
      hackerrank: user?.socialLinks?.hackerrank || ''
    }
  });

  const [stats, setStats] = useState({
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    coursesEnrolled: 0,
    coursesCompleted: 0,
    modulesCompleted: 0
  });

  const [activityData, setActivityData] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const [certificates, setCertificates] = useState([]);
  const [certsLoading, setCertsLoading] = useState(true);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const [selectedCertificateModal, setSelectedCertificateModal] = useState(null);

  // Fetch full profile and learning stats from DB
  const fetchProfileAndStats = async () => {
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const res = await fetch(`${API_BASE}/learners/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success && data.user) {
        setProfile({
          fullName: data.user.fullName || 'Learner',
          email: data.user.email || '',
          username: data.user.username || '',
          avatar: data.user.avatar || '',
          bio: data.user.bio || '',
          learningGoal: data.user.learningGoal || '',
          learningInterests: Array.isArray(data.user.learningInterests) ? data.user.learningInterests : [],
          socialLinks: data.user.socialLinks || {}
        });

        if (data.stats) {
          setStats({
            totalPoints: data.stats.totalPoints || 0,
            currentStreak: data.stats.currentStreak || 0,
            longestStreak: data.stats.longestStreak || 0,
            coursesEnrolled: data.stats.coursesEnrolled || 0,
            coursesCompleted: data.stats.coursesCompleted || 0,
            modulesCompleted: data.stats.modulesCompleted || 0
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile and stats:', err);
    }
  };

  // Fetch verified learning activity heatmap
  const fetchActivity = async () => {
    setActivityLoading(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const res = await fetch(`${API_BASE}/learners/me/activity`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        setActivityData(data.activity || []);
      }
    } catch (err) {
      console.error('Failed to load activity heatmap:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  // Fetch completed course certificates
  const fetchCertificates = async () => {
    setCertsLoading(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const res = await fetch(`${API_BASE}/learners/me/certificates`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        setCertificates(data.certificates || []);
      }
    } catch (err) {
      console.error('Failed to load certificates:', err);
    } finally {
      setCertsLoading(false);
    }
  };

  // Fetch learner's own reviews
  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const res = await fetch(`${API_BASE}/learners/me/reviews`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndStats();
    fetchActivity();
    fetchCertificates();
    fetchReviews();

    const handleRefresh = () => {
      fetchProfileAndStats();
      fetchActivity();
    };
    window.addEventListener('upskillr_points_updated', handleRefresh);
    return () => window.removeEventListener('upskillr_points_updated', handleRefresh);
  }, []);

  // Filter connected developer & social profiles with URLs provided
  const connectedSocialProfiles = useMemo(() => {
    return SOCIAL_PLATFORMS.filter((platform) => {
      const url = profile.socialLinks?.[platform.key];
      return url && typeof url === 'string' && url.trim().length > 0;
    }).map((platform) => ({
      ...platform,
      href: getCleanUrl(profile.socialLinks[platform.key])
    }));
  }, [profile.socialLinks]);

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="learner-profile-overview-view">
      {/* ─── PAGE HEADER ─── */}
      <div className="profile-overview-header">
        <div className="header-titles">
          <h1 className="page-heading">Student Profile &amp; Achievements</h1>
          <p className="page-subheading">
            Review your verified credentials, learning statistics, and public profile overview.
          </p>
        </div>
        {onNavigateSettings && (
          <button
            type="button"
            className="btn-go-settings"
            onClick={onNavigateSettings}
            title="Edit profile information in Settings"
          >
            <Settings size={16} />
            <span>Edit Profile &amp; Settings</span>
          </button>
        )}
      </div>

      <div className="profile-overview-stack">
        {/* ─── 1. PROFILE INFORMATION CARD ─── */}
        <section className="profile-overview-card" aria-label="Personal Information">
          <div className="profile-hero-row">
            <div className="profile-avatar-wrap">
              <Avatar
                image={profile.avatar}
                name={profile.fullName}
                size="large"
                className="profile-hero-avatar"
              />
            </div>

            <div className="profile-main-meta">
              <div className="profile-name-row">
                <h2 className="profile-full-name">{profile.fullName}</h2>
                {profile.username && (
                  <span className="profile-username-tag">@{profile.username}</span>
                )}
              </div>

              {profile.email && (
                <div className="profile-email-meta">
                  <Mail size={15} />
                  <span>{profile.email}</span>
                </div>
              )}

              {profile.bio ? (
                <p className="profile-bio-text">{profile.bio}</p>
              ) : (
                <p className="profile-bio-empty">
                  No bio added yet. Add a brief summary about your learning journey in Settings.
                </p>
              )}

              {/* Goal & Interests Tags */}
              <div className="profile-tags-row">
                {profile.learningGoal && (
                  <div className="profile-goal-badge" title="Learning Domain Goal">
                    <Compass size={14} className="goal-icon" />
                    <span>Domain: <strong>{profile.learningGoal}</strong></span>
                  </div>
                )}

                {profile.learningInterests && profile.learningInterests.length > 0 && (
                  <div className="profile-interests-wrapper">
                    {profile.learningInterests.map((interest, idx) => (
                      <span key={idx} className="profile-interest-tag">
                        #{interest}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── 2. LEARNING STATS (6 VERIFIED STAT CARDS) ─── */}
        <section className="profile-stats-section" aria-label="Learning Statistics">
          <div className="section-title-line">
            <div className="title-with-icon">
              <Sparkles size={18} className="title-icon-accent" />
              <h2 className="section-title">Your Learning Stats</h2>
            </div>
            <span className="stats-verified-pill">Read-Only &bull; Verified</span>
          </div>

          <div className="profile-stats-grid">
            {/* 1. Total Points */}
            <div className="profile-stat-box">
              <div className="stat-icon-wrapper star-accent">
                <Star size={24} />
              </div>
              <div className="stat-text-meta">
                <span className="stat-metric-label">TOTAL POINTS</span>
                <span className="stat-metric-val">{stats.totalPoints}</span>
              </div>
            </div>

            {/* 2. Current Streak */}
            <div className="profile-stat-box">
              <div className="stat-icon-wrapper flame-accent">
                <Flame size={24} />
              </div>
              <div className="stat-text-meta">
                <span className="stat-metric-label">CURRENT STREAK</span>
                <span className="stat-metric-val">
                  {stats.currentStreak} {stats.currentStreak === 1 ? 'Day' : 'Days'}
                </span>
              </div>
            </div>

            {/* 3. Longest Streak */}
            <div className="profile-stat-box">
              <div className="stat-icon-wrapper trophy-accent">
                <Trophy size={24} />
              </div>
              <div className="stat-text-meta">
                <span className="stat-metric-label">LONGEST STREAK</span>
                <span className="stat-metric-val">
                  {stats.longestStreak} {stats.longestStreak === 1 ? 'Day' : 'Days'}
                </span>
              </div>
            </div>

            {/* 4. Courses Enrolled */}
            <div className="profile-stat-box">
              <div className="stat-icon-wrapper layers-accent">
                <Layers size={24} />
              </div>
              <div className="stat-text-meta">
                <span className="stat-metric-label">COURSES ENROLLED</span>
                <span className="stat-metric-val">{stats.coursesEnrolled}</span>
              </div>
            </div>

            {/* 5. Courses Completed */}
            <div className="profile-stat-box">
              <div className="stat-icon-wrapper check-accent">
                <CheckCircle2 size={24} />
              </div>
              <div className="stat-text-meta">
                <span className="stat-metric-label">COURSES COMPLETED</span>
                <span className="stat-metric-val">{stats.coursesCompleted}</span>
              </div>
            </div>

            {/* 6. Modules Completed */}
            <div className="profile-stat-box">
              <div className="stat-icon-wrapper book-accent">
                <BookOpen size={24} />
              </div>
              <div className="stat-text-meta">
                <span className="stat-metric-label">MODULES COMPLETED</span>
                <span className="stat-metric-val">{stats.modulesCompleted}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 3. LEARNING ACTIVITY HEATMAP ─── */}
        <section className="profile-activity-section" aria-label="Learning Activity">
          <div className="section-title-line">
            <div className="title-with-icon">
              <Flame size={18} className="title-icon-accent" />
              <h2 className="section-title">Learning Activity</h2>
            </div>
            <span className="stats-verified-pill">Last 12 Months</span>
          </div>

          <ActivityHeatmap activityData={activityData} loading={activityLoading} />
        </section>

        {/* ─── 4. DEVELOPER & SOCIAL PROFILES ─── */}
        <section className="profile-social-section" aria-label="Developer Profiles">
          <div className="section-title-line">
            <div className="title-with-icon">
              <ExternalLink size={18} className="title-icon-accent" />
              <h2 className="section-title">Developer &amp; Social Profiles</h2>
            </div>
          </div>

          {connectedSocialProfiles.length === 0 ? (
            <div className="social-empty-box">
              <ExternalLink size={30} className="empty-icon-subtle" />
              <p className="empty-lead">No developer or social links connected yet.</p>
              <p className="empty-sub">
                Connect your GitHub, LinkedIn, LeetCode, and other coding profiles in Settings so instructors and peers can view your work.
              </p>
              {onNavigateSettings && (
                <button
                  type="button"
                  className="btn-connect-socials"
                  onClick={onNavigateSettings}
                >
                  <Settings size={15} />
                  <span>Connect Profiles in Settings</span>
                </button>
              )}
            </div>
          ) : (
            <div className="social-links-grid">
              {connectedSocialProfiles.map((platform) => {
                const IconComponent = platform.Icon;
                return (
                  <a
                    key={platform.key}
                    href={platform.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-profile-card"
                    title={`Open ${platform.label} Profile (${platform.href})`}
                  >
                    <div className="social-icon-circle">
                      <IconComponent size={20} />
                    </div>
                    <div className="social-info-meta">
                      <span className="social-platform-name">{platform.label}</span>
                      <span className="social-platform-url">{platform.href.replace(/^https?:\/\//i, '')}</span>
                    </div>
                    <ExternalLink size={14} className="social-link-out-icon" />
                  </a>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── 5. CERTIFICATES ─── */}
        <section className="profile-certificates-section" aria-label="Earned Certificates">
          <div className="section-title-line">
            <div className="title-with-icon">
              <Trophy size={18} className="title-icon-accent" />
              <h2 className="section-title">Certificates</h2>
            </div>
            {!certsLoading && (
              <span className="stats-verified-pill">
                {certificates.length} {certificates.length === 1 ? 'Earned' : 'Earned'}
              </span>
            )}
          </div>

          {certsLoading ? (
            <div className="certs-loading-state">Loading your verified certificates...</div>
          ) : certificates.length === 0 ? (
            <div className="certs-empty-box">
              <Award size={34} className="empty-icon-subtle" />
              <p className="empty-lead">No certificates earned yet.</p>
              <p className="empty-sub">
                Complete all lesson modules and pass milestone assessments in any enrolled course to receive your verified certificate!
              </p>
            </div>
          ) : (
            <div className="certificates-grid">
              {certificates.map((cert) => (
                <div key={cert._id} className="certificate-item-card">
                  <div className="cert-top-row">
                    <span className="cert-trophy-symbol">🏆</span>
                    <div className="cert-main-info">
                      <h3 className="cert-course-heading">{cert.courseTitle}</h3>
                      {cert.category && (
                        <span className="cert-category-chip">{cert.category}</span>
                      )}
                    </div>
                  </div>

                  <div className="cert-status-badge-row">
                    <CheckCircle2 size={15} className="cert-verified-icon" />
                    <span>Course Completed</span>
                  </div>

                  <div className="cert-details-meta">
                    {cert.completedAt && (
                      <span className="cert-date-text">
                        Completed: {new Date(cert.completedAt).toLocaleDateString(undefined, {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    )}
                    {cert.instructorName && (
                      <span className="cert-instructor-text">Instructor: {cert.instructorName}</span>
                    )}
                  </div>

                  <div className="cert-action-bar">
                    <button
                      type="button"
                      className="btn-view-cert"
                      onClick={() => setSelectedCertificateModal(cert)}
                    >
                      <Award size={15} />
                      <span>View Certificate</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ─── CERTIFICATE MODAL ─── */}
      {selectedCertificateModal && (
        <div
          className="cert-modal-overlay"
          onClick={() => setSelectedCertificateModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="cert-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cert-modal-header">
              <div className="cert-modal-title-row">
                <Award size={20} className="modal-title-icon" />
                <h3>Verified Certificate of Completion</h3>
              </div>
              <button
                type="button"
                className="btn-cert-modal-close"
                onClick={() => setSelectedCertificateModal(null)}
                aria-label="Close certificate dialog"
              >
                <X size={20} />
              </button>
            </div>

            {/* Printable Certificate Canvas */}
            <div className="certificate-document-canvas">
              <div className="cert-canvas-border">
                <div className="cert-seal-badge">
                  <Award size={40} className="cert-award-icon" />
                </div>
                <span className="cert-brand-heading">UpSkillR Verified Certificate</span>
                <p className="cert-presents-text">This certifies that</p>
                <h2 className="cert-learner-name">{profile.fullName || user?.fullName || 'Learner'}</h2>
                <p className="cert-body-p">has successfully completed the comprehensive course curriculum for</p>
                <h3 className="cert-course-name">{selectedCertificateModal.courseTitle}</h3>
                <div className="cert-footer-meta">
                  <div className="cert-date-col">
                    <span className="meta-lbl">Date of Completion</span>
                    <span className="meta-val">
                      {new Date(selectedCertificateModal.completedAt || Date.now()).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="cert-id-col">
                    <span className="meta-lbl">Instructor</span>
                    <span className="meta-val">{selectedCertificateModal.instructorName || 'UpSkillR Instructor'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="cert-modal-actions">
              <button
                type="button"
                className="btn-print-cert"
                onClick={handlePrintCertificate}
              >
                <Printer size={16} />
                <span>Print Certificate</span>
              </button>
              <button
                type="button"
                className="btn-close-cert-subtle"
                onClick={() => setSelectedCertificateModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnerProfileView;
