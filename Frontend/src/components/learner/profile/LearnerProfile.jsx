import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mail, Save, Camera, Check, AlertCircle, Sparkles, Flame, Trophy,
  BookOpen, CheckCircle, FileText, ExternalLink, Trash2, Plus, Edit2,
  X, GraduationCap, Briefcase, Star, MessageSquare
} from 'lucide-react';
import './LearnerProfile.css';
import { Avatar } from '../../common/Avatar/Avatar';
import { useToast } from '../../../context/ToastContext';
import { API_BASE } from '../../../config/api';

// ─── Platform Icon Components (inline SVG, no external deps) ───
const LinkedinIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const GithubIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const LeetcodeIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" />
  </svg>
);

const InstagramIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const FacebookIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const CodeforcesIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4.5 7.5C4.5 6.12 5.62 5 7 5s2.5 1.12 2.5 2.5v9C9.5 17.88 8.38 19 7 19s-2.5-1.12-2.5-2.5v-9zm7-4C11.5 2.12 12.62 1 14 1s2.5 1.12 2.5 2.5v13c0 1.38-1.12 2.5-2.5 2.5s-2.5-1.12-2.5-2.5V3.5zm7 7C18.5 9.12 19.62 8 21 8s2.5 1.12 2.5 2.5v6C23.5 17.88 22.38 19 21 19s-2.5-1.12-2.5-2.5v-6z"/>
  </svg>
);

const GFGIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M5.6 10c-.5 0-.9.2-1.2.5-.3.3-.5.7-.5 1.2v.6c0 .5.2.9.5 1.2.3.3.7.5 1.2.5h12.8c.5 0 .9-.2 1.2-.5.3-.3.5-.7.5-1.2v-.6c0-.5-.2-.9-.5-1.2-.3-.3-.7-.5-1.2-.5H12v-.4c.8-.3 1.4-.8 1.9-1.4.5-.7.7-1.4.7-2.2 0-.9-.3-1.7-.8-2.3-.6-.6-1.3-.9-2.2-.9s-1.6.3-2.2.9c-.5.6-.8 1.4-.8 2.3 0 .8.2 1.5.7 2.2.5.7 1.1 1.1 1.9 1.4V10H5.6zm6.4-4.8c.4 0 .7.1 1 .4.3.3.4.6.4 1s-.1.7-.4 1c-.3.3-.6.4-1 .4s-.7-.1-1-.4c-.3-.3-.4-.6-.4-1s.1-.7.4-1c.3-.3.6-.4 1-.4zm6.4 12H5.6c-.5 0-.9.2-1.2.5-.3.3-.5.7-.5 1.2v.6c0 .5.2.9.5 1.2.3.3.7.5 1.2.5h12.8c.5 0 .9-.2 1.2-.5.3-.3.5-.7.5-1.2v-.6c0-.5-.2-.9-.5-1.2-.3-.3-.7-.5-1.2-.5z"/>
  </svg>
);

const HackerRankIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0c1.285 0 9.75 4.886 10.392 6 .645 1.115.645 10.885 0 12C21.75 19.114 13.284 24 12 24 10.716 24 2.25 19.114 1.608 18 .963 16.885.963 7.115 1.608 6 2.25 4.886 10.715 0 12 0zm-1.72 5.5a.25.25 0 0 0-.25.25v4.505l-.28.147C9.41 10.71 9.175 11 9.175 11.25s.235.54.575.748l.28.147V16.25a.25.25 0 0 0 .25.25h.25a.25.25 0 0 0 .25-.25v-4.505l.28-.147c.34-.207.575-.498.575-.748s-.235-.54-.575-.748l-.28-.147V5.75a.25.25 0 0 0-.25-.25zm3.44 0a.25.25 0 0 0-.25.25v3.505l-.28.147c-.34.207-.575.498-.575.748s.235.54.575.748l.28.147V16.25a.25.25 0 0 0 .25.25h.25a.25.25 0 0 0 .25-.25v-3.505l.28-.147c.34-.207.575-.498.575-.748s-.235-.54-.575-.748l-.28-.147V5.75a.25.25 0 0 0-.25-.25z"/>
  </svg>
);

// ─── Platform configuration ───
const PLATFORM_REGEXES = {
  github: /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/?$/,
  linkedin: /^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9_.-]+\/?$/,
  leetcode: /^https:\/\/(www\.)?leetcode\.com\/u\/[A-Za-z0-9_.-]+\/?$/,
  instagram: /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.-]+\/?$/,
  facebook: /^https:\/\/(www\.)?facebook\.com\/[A-Za-z0-9_.-]+\/?$/,
  codeforces: /^https:\/\/(www\.)?codeforces\.com\/profile\/[A-Za-z0-9_.-]+\/?$/,
  geeksforgeeks: /^https:\/\/(www\.)?geeksforgeeks\.org\/user\/[A-Za-z0-9_.-]+\/?$/,
  hackerrank: /^https:\/\/(www\.)?hackerrank\.com\/profile\/[A-Za-z0-9_.-]+\/?$/
};

const SOCIAL_PLATFORMS = [
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/username', Icon: GithubIcon },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username', Icon: LinkedinIcon },
  { key: 'leetcode', label: 'LeetCode', placeholder: 'https://leetcode.com/u/username/', Icon: LeetcodeIcon },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/username/', Icon: InstagramIcon },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/username/', Icon: FacebookIcon },
  { key: 'codeforces', label: 'Codeforces', placeholder: 'https://codeforces.com/profile/username', Icon: CodeforcesIcon },
  { key: 'geeksforgeeks', label: 'GeeksforGeeks', placeholder: 'https://geeksforgeeks.org/user/username/', Icon: GFGIcon },
  { key: 'hackerrank', label: 'HackerRank', placeholder: 'https://hackerrank.com/profile/username', Icon: HackerRankIcon }
];

const validatePlatformUrl = (platform, url) => {
  const trimmed = (url || '').trim();
  if (!trimmed) return { status: 'idle', message: '' };
  const regex = PLATFORM_REGEXES[platform];
  if (!regex) return { status: 'idle', message: '' };
  const label = SOCIAL_PLATFORMS.find(p => p.key === platform)?.label || platform;
  if (regex.test(trimmed)) return { status: 'valid', message: `✓ Valid ${label} URL` };
  return { status: 'invalid', message: `Please enter a valid ${label} profile URL (e.g. ${SOCIAL_PLATFORMS.find(p => p.key === platform)?.placeholder || ''}).` };
};

const LEARNING_GOAL_OPTIONS = [
  'Web Development', 'Data Science & AI', 'Mobile Development',
  'Cloud Computing & DevOps', 'UI/UX Design', 'Cybersecurity',
  'Business & Management', 'Other'
];

const AVAILABLE_INTERESTS = [
  'Web Development', 'JavaScript', 'React', 'Node.js', 'Python',
  'Data Science', 'AI & Machine Learning', 'UI/UX Design',
  'DevOps & Cloud', 'Cybersecurity', 'Mobile Apps', 'Database Management'
];

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance', 'Self-employed'];

// ─── Helper: render star rating ───
const StarRating = ({ rating, size = 15 }) => (
  <span className="star-rating-display" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map(s => (
      <Star key={s} size={size} className={s <= rating ? 'star-filled' : 'star-empty'} />
    ))}
  </span>
);

// ─── Activity Heatmap Component ───
const ActivityHeatmap = ({ activityData, loading }) => {
  const [tooltip, setTooltip] = useState({ visible: false, data: null });

  const activityMap = {};
  (activityData || []).forEach(item => {
    activityMap[item.date] = item;
  });

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Start from ~52 weeks ago, aligned to Sunday
  const start = new Date(today);
  start.setDate(start.getDate() - 363);
  start.setDate(start.getDate() - start.getDay()); // align to Sunday

  const weeks = [];
  const monthLabels = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    const week = [];
    const weekStart = new Date(cursor);

    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().split('T')[0];
      const isFuture = new Date(cursor) > today;
      week.push({
        date: new Date(cursor),
        dateStr,
        isFuture,
        count: activityMap[dateStr]?.count || 0,
        activities: activityMap[dateStr]?.activities || [],
        descriptions: activityMap[dateStr]?.descriptions || []
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    // Month label when week starts a new month
    if (weeks.length === 0 || weekStart.getMonth() !== (weeks.length > 0 ? weeks[weeks.length - 1][0].date.getMonth() : -1)) {
      monthLabels.push({ wIdx: weeks.length, label: weekStart.toLocaleString('en-US', { month: 'short' }) });
    }
    weeks.push(week);
  }

  if (loading) {
    return <div className="heatmap-loading">Loading activity data...</div>;
  }

  return (
    <div className="heatmap-wrapper">
      {/* Month labels */}
      <div className="heatmap-months-row">
        {monthLabels.map((m, i) => (
          <div
            key={i}
            className="heatmap-month-label"
            style={{ left: `${m.wIdx * 15}px` }}
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="heatmap-scroll-container">
        <div className="heatmap-grid">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="heatmap-week-col">
              {week.map((day, dIdx) => (
                <div
                  key={dIdx}
                  className={`heatmap-cell ${day.isFuture ? 'heat-future' : `heat-${Math.min(day.count, 3)}`}`}
                  onMouseEnter={() => !day.isFuture && setTooltip({ visible: true, data: day })}
                  onMouseLeave={() => setTooltip({ visible: false, data: null })}
                  aria-label={day.isFuture ? '' : `${day.dateStr}: ${day.count} activities`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {tooltip.visible && tooltip.data && (
          <div className="heatmap-tooltip-card">
            <div className="tooltip-date-label">
              {new Date(tooltip.data.dateStr + 'T12:00:00').toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric'
              })}
            </div>
            <div className="tooltip-count-label">
              {tooltip.data.count === 0 ? 'No activity' : `${tooltip.data.count} ${tooltip.data.count === 1 ? 'activity' : 'activities'}`}
            </div>
            {tooltip.data.descriptions.length > 0 && (
              <ul className="tooltip-activities-list">
                {tooltip.data.descriptions.map((desc, i) => (
                  <li key={i}>✓ {desc}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="heatmap-legend">
        <span className="legend-label">Less</span>
        {[0, 1, 2, 3].map(level => (
          <div key={level} className={`heatmap-cell heat-${level}`} style={{ width: '12px', height: '12px' }} />
        ))}
        <span className="legend-label">More</span>
      </div>
    </div>
  );
};

// ─── Inline Education Form ───
const EducationForm = ({ value, onChange, onSave, onCancel }) => (
  <div className="inline-entry-form">
    <div className="entry-form-grid">
      <div className="form-group">
        <label className="form-label">Institution *</label>
        <input className="form-input" value={value.institution} onChange={e => onChange(p => ({ ...p, institution: e.target.value }))} placeholder="College / University Name" />
      </div>
      <div className="form-group">
        <label className="form-label">Degree / Course *</label>
        <input className="form-input" value={value.degree} onChange={e => onChange(p => ({ ...p, degree: e.target.value }))} placeholder="B.E., B.Tech, M.Sc., etc." />
      </div>
      <div className="form-group">
        <label className="form-label">Field of Study</label>
        <input className="form-input" value={value.fieldOfStudy} onChange={e => onChange(p => ({ ...p, fieldOfStudy: e.target.value }))} placeholder="Information Technology, CS, etc." />
      </div>
      <div className="form-group">
        <label className="form-label">Start Year</label>
        <input className="form-input" value={value.startDate} onChange={e => onChange(p => ({ ...p, startDate: e.target.value }))} placeholder="2020" />
      </div>
      <div className="form-group">
        <label className="form-label">End Year</label>
        <input className="form-input" value={value.current ? 'Present' : value.endDate} disabled={value.current} onChange={e => onChange(p => ({ ...p, endDate: e.target.value }))} placeholder="2024" />
      </div>
      <div className="form-group form-group-checkbox">
        <label className="checkbox-label">
          <input type="checkbox" checked={value.current} onChange={e => onChange(p => ({ ...p, current: e.target.checked, endDate: e.target.checked ? '' : p.endDate }))} />
          <span>Currently Studying</span>
        </label>
      </div>
    </div>
    <div className="form-group">
      <label className="form-label">Description (optional)</label>
      <textarea className="form-textarea" rows="2" value={value.description} onChange={e => onChange(p => ({ ...p, description: e.target.value }))} placeholder="Relevant coursework, achievements..." maxLength={500} />
    </div>
    <div className="entry-form-actions">
      <button type="button" className="btn btn-primary btn-sm" onClick={onSave}>Save</button>
      <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
    </div>
  </div>
);

// ─── Inline Experience Form ───
const ExperienceForm = ({ value, onChange, onSave, onCancel }) => (
  <div className="inline-entry-form">
    <div className="entry-form-grid">
      <div className="form-group">
        <label className="form-label">Role / Title *</label>
        <input className="form-input" value={value.role} onChange={e => onChange(p => ({ ...p, role: e.target.value }))} placeholder="Software Developer Intern" />
      </div>
      <div className="form-group">
        <label className="form-label">Company / Organization *</label>
        <input className="form-input" value={value.company} onChange={e => onChange(p => ({ ...p, company: e.target.value }))} placeholder="Company Name" />
      </div>
      <div className="form-group">
        <label className="form-label">Employment Type</label>
        <select className="form-input" value={value.employmentType} onChange={e => onChange(p => ({ ...p, employmentType: e.target.value }))}>
          <option value="">Select type</option>
          {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Location (optional)</label>
        <input className="form-input" value={value.location} onChange={e => onChange(p => ({ ...p, location: e.target.value }))} placeholder="Mumbai, Remote, etc." />
      </div>
      <div className="form-group">
        <label className="form-label">Start Date</label>
        <input className="form-input" value={value.startDate} onChange={e => onChange(p => ({ ...p, startDate: e.target.value }))} placeholder="Jan 2024" />
      </div>
      <div className="form-group">
        <label className="form-label">End Date</label>
        <input className="form-input" value={value.current ? 'Present' : value.endDate} disabled={value.current} onChange={e => onChange(p => ({ ...p, endDate: e.target.value }))} placeholder="Jun 2024" />
      </div>
      <div className="form-group form-group-checkbox">
        <label className="checkbox-label">
          <input type="checkbox" checked={value.current} onChange={e => onChange(p => ({ ...p, current: e.target.checked, endDate: e.target.checked ? '' : p.endDate }))} />
          <span>Currently Working Here</span>
        </label>
      </div>
    </div>
    <div className="form-group">
      <label className="form-label">Description (optional)</label>
      <textarea className="form-textarea" rows="2" value={value.description} onChange={e => onChange(p => ({ ...p, description: e.target.value }))} placeholder="Responsibilities, achievements..." maxLength={500} />
    </div>
    <div className="entry-form-actions">
      <button type="button" className="btn btn-primary btn-sm" onClick={onSave}>Save</button>
      <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
    </div>
  </div>
);

// ─── Default form states ───
const DEFAULT_EDU = { institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', current: false, description: '' };
const DEFAULT_EXP = { role: '', company: '', employmentType: '', startDate: '', endDate: '', current: false, location: '', description: '' };

// ─── Initial socialValidation state (all 8 platforms) ───
const buildInitialValidation = () =>
  Object.fromEntries(SOCIAL_PLATFORMS.map(p => [p.key, { status: 'idle', message: '' }]));

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
export const LearnerProfile = ({ user }) => {
  const { toast } = useToast();

  // ─── Core Profile State ───
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

  // ─── Education & Experience State ───
  const [education, setEducation] = useState(user?.education || []);
  const [experience, setExperience] = useState(user?.experience || []);

  // Education form state
  const [showEduForm, setShowEduForm] = useState(false);
  const [editingEduIdx, setEditingEduIdx] = useState(null);
  const [eduForm, setEduForm] = useState(DEFAULT_EDU);

  // Experience form state
  const [showExpForm, setShowExpForm] = useState(false);
  const [editingExpIdx, setEditingExpIdx] = useState(null);
  const [expForm, setExpForm] = useState(DEFAULT_EXP);

  // ─── Stats State ───
  const [stats, setStats] = useState({
    totalPoints: 0, currentStreak: 0, longestStreak: 0,
    coursesEnrolled: 0, coursesCompleted: 0, modulesCompleted: 0
  });

  // ─── Username Validation ───
  const [usernameStatus, setUsernameStatus] = useState({ status: 'idle', message: '' });
  const [socialValidation, setSocialValidation] = useState(buildInitialValidation());
  const [saving, setSaving] = useState(false);
  const checkUsernameTimerRef = useRef(null);

  // ─── New Sections State ───
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [certsLoading, setCertsLoading] = useState(true);
  const [activityData, setActivityData] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // ─── Entry saving state (education / experience auto-save) ───
  const [entrySaving, setEntrySaving] = useState(false);

  // ════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ════════════════════════════════════════════════════════════════
  const fetchLearnerData = useCallback(async () => {
    try {
      const token = localStorage.getItem('upskillr_token');
      if (!token) return;
      const response = await fetch(`${API_BASE}/learners/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.user) {
        const sl = data.user.socialLinks || {};
        setProfile({
          fullName: data.user.fullName || 'Learner',
          email: data.user.email || '',
          username: data.user.username || '',
          avatar: data.user.avatar || '',
          bio: data.user.bio || '',
          learningGoal: data.user.learningGoal || 'Web Development',
          learningInterests: data.user.learningInterests?.length > 0
            ? data.user.learningInterests : ['Web Development', 'JavaScript'],
          socialLinks: {
            github: sl.github || '', linkedin: sl.linkedin || '', leetcode: sl.leetcode || '',
            instagram: sl.instagram || '', facebook: sl.facebook || '',
            codeforces: sl.codeforces || '', geeksforgeeks: sl.geeksforgeeks || '',
            hackerrank: sl.hackerrank || ''
          }
        });
        setEducation(data.user.education || []);
        setExperience(data.user.experience || []);

        // Rebuild socialValidation for all saved links
        const newVal = buildInitialValidation();
        for (const p of SOCIAL_PLATFORMS) {
          newVal[p.key] = validatePlatformUrl(p.key, sl[p.key]);
        }
        setSocialValidation(newVal);

        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch learner data:', err);
    }
  }, []);

  const fetchReviews = useCallback(async () => {
    try {
      const token = localStorage.getItem('upskillr_token');
      if (!token) return;
      setReviewsLoading(true);
      const res = await fetch(`${API_BASE}/learners/me/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setReviews(data.reviews || []);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  const fetchCertificates = useCallback(async () => {
    try {
      const token = localStorage.getItem('upskillr_token');
      if (!token) return;
      setCertsLoading(true);
      const res = await fetch(`${API_BASE}/learners/me/certificates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setCertificates(data.certificates || []);
    } catch (err) {
      console.error('Failed to fetch certificates:', err);
    } finally {
      setCertsLoading(false);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const token = localStorage.getItem('upskillr_token');
      if (!token) return;
      setActivityLoading(true);
      const res = await fetch(`${API_BASE}/learners/me/activity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setActivityData(data.activity || []);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLearnerData();
    fetchReviews();
    fetchCertificates();
    fetchActivity();
  }, [fetchLearnerData, fetchReviews, fetchCertificates, fetchActivity]);

  // ════════════════════════════════════════════════════════════════
  // EDUCATION HANDLERS
  // ════════════════════════════════════════════════════════════════
  const persistEducation = async (updatedList) => {
    setEntrySaving(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const res = await fetch(`${API_BASE}/learners/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ education: updatedList })
      });
      const data = await res.json();
      if (data.success) {
        setEducation(data.user?.education || updatedList);
        toast.success('Education updated.');
      } else {
        toast.error(data.message || 'Failed to save education.');
      }
    } catch {
      toast.error('Failed to save education.');
    } finally {
      setEntrySaving(false);
    }
  };

  const handleSaveEdu = async () => {
    if (!eduForm.institution.trim() || !eduForm.degree.trim()) {
      toast.error('Institution and Degree are required.');
      return;
    }
    let updated;
    if (editingEduIdx !== null) {
      updated = education.map((e, i) => i === editingEduIdx ? { ...eduForm } : e);
    } else {
      updated = [...education, { ...eduForm }];
    }
    await persistEducation(updated);
    setShowEduForm(false);
    setEditingEduIdx(null);
    setEduForm(DEFAULT_EDU);
  };

  const handleEditEdu = (idx) => {
    setEduForm({ ...education[idx] });
    setEditingEduIdx(idx);
    setShowEduForm(false);
  };

  const handleRemoveEdu = async (idx) => {
    const updated = education.filter((_, i) => i !== idx);
    await persistEducation(updated);
  };

  const handleCancelEdu = () => {
    setShowEduForm(false);
    setEditingEduIdx(null);
    setEduForm(DEFAULT_EDU);
  };

  // ════════════════════════════════════════════════════════════════
  // EXPERIENCE HANDLERS
  // ════════════════════════════════════════════════════════════════
  const persistExperience = async (updatedList) => {
    setEntrySaving(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const res = await fetch(`${API_BASE}/learners/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ experience: updatedList })
      });
      const data = await res.json();
      if (data.success) {
        setExperience(data.user?.experience || updatedList);
        toast.success('Experience updated.');
      } else {
        toast.error(data.message || 'Failed to save experience.');
      }
    } catch {
      toast.error('Failed to save experience.');
    } finally {
      setEntrySaving(false);
    }
  };

  const handleSaveExp = async () => {
    if (!expForm.role.trim() || !expForm.company.trim()) {
      toast.error('Role and Company are required.');
      return;
    }
    let updated;
    if (editingExpIdx !== null) {
      updated = experience.map((e, i) => i === editingExpIdx ? { ...expForm } : e);
    } else {
      updated = [...experience, { ...expForm }];
    }
    await persistExperience(updated);
    setShowExpForm(false);
    setEditingExpIdx(null);
    setExpForm(DEFAULT_EXP);
  };

  const handleEditExp = (idx) => {
    setExpForm({ ...experience[idx] });
    setEditingExpIdx(idx);
    setShowExpForm(false);
  };

  const handleRemoveExp = async (idx) => {
    const updated = experience.filter((_, i) => i !== idx);
    await persistExperience(updated);
  };

  const handleCancelExp = () => {
    setShowExpForm(false);
    setEditingExpIdx(null);
    setExpForm(DEFAULT_EXP);
  };

  // ════════════════════════════════════════════════════════════════
  // USERNAME & SOCIAL LINK HANDLERS
  // ════════════════════════════════════════════════════════════════
  const handleUsernameChange = (e) => {
    const rawVal = e.target.value.replace(/^@/, '').toLowerCase().trim();
    setProfile(prev => ({ ...prev, username: rawVal }));
    if (checkUsernameTimerRef.current) clearTimeout(checkUsernameTimerRef.current);
    if (!rawVal) { setUsernameStatus({ status: 'idle', message: '' }); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(rawVal)) {
      setUsernameStatus({ status: 'invalid', message: 'Username must be 3-20 characters long and contain only letters, numbers, or underscores.' });
      return;
    }
    setUsernameStatus({ status: 'checking', message: 'Checking availability...' });
    checkUsernameTimerRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('upskillr_token');
        const res = await fetch(`${API_BASE}/learners/me/check-username?username=${encodeURIComponent(rawVal)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const checkData = await res.json();
        if (checkData.available) {
          setUsernameStatus({ status: 'available', message: `✓ @${rawVal} is available!` });
        } else {
          setUsernameStatus({ status: 'taken', message: checkData.message || 'Username already taken.' });
        }
      } catch {
        setUsernameStatus({ status: 'idle', message: '' });
      }
    }, 400);
  };

  const handleSocialLinkChange = (platform, val) => {
    setProfile(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, [platform]: val } }));
    setSocialValidation(prev => ({ ...prev, [platform]: validatePlatformUrl(platform, val) }));
  };

  const handleRemoveSocialLink = async (platform) => {
    const updatedLinks = { ...profile.socialLinks, [platform]: '' };
    setProfile(prev => ({ ...prev, socialLinks: updatedLinks }));
    setSocialValidation(prev => ({ ...prev, [platform]: { status: 'idle', message: '' } }));
    const token = localStorage.getItem('upskillr_token');
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/learners/me`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ socialLinks: updatedLinks })
        });
        const data = await res.json();
        if (data.success) {
          const label = SOCIAL_PLATFORMS.find(p => p.key === platform)?.label || platform;
          toast.success(`${label} profile link removed.`);
          updateLocalStorage(data.user);
        }
      } catch { console.error('Failed to remove social link'); }
    }
  };

  const handleInterestToggle = (interest) => {
    setProfile(prev => {
      const exists = prev.learningInterests.includes(interest);
      const updated = exists
        ? prev.learningInterests.filter(i => i !== interest)
        : [...prev.learningInterests, interest];
      return { ...prev, learningInterests: updated };
    });
  };

  // ════════════════════════════════════════════════════════════════
  // MAIN SAVE HANDLER
  // ════════════════════════════════════════════════════════════════
  const handleSave = async (e) => {
    e.preventDefault();
    if (usernameStatus.status === 'taken' || usernameStatus.status === 'invalid') {
      toast.error(usernameStatus.message || 'Please provide a valid, unique username.');
      return;
    }
    // Validate all social links
    const newValidation = {};
    let hasInvalid = false;
    for (const p of SOCIAL_PLATFORMS) {
      newValidation[p.key] = validatePlatformUrl(p.key, profile.socialLinks?.[p.key]);
      if (newValidation[p.key].status === 'invalid') hasInvalid = true;
    }
    if (hasInvalid) {
      setSocialValidation(prev => ({ ...prev, ...newValidation }));
      const firstMsg = Object.values(newValidation).find(v => v.status === 'invalid')?.message;
      toast.error(firstMsg || 'Please enter valid profile URLs.');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/learners/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullName: profile.fullName,
          username: profile.username,
          bio: profile.bio,
          learningGoal: profile.learningGoal,
          learningInterests: profile.learningInterests,
          socialLinks: profile.socialLinks
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Profile saved successfully!');
        updateLocalStorage(data.user);
        window.dispatchEvent(new Event('upskillr_user_updated'));
      } else {
        toast.error(data.message || 'Failed to update profile.');
      }
    } catch {
      toast.error('Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const updateLocalStorage = (userData) => {
    if (!userData) return;
    const storedUser = localStorage.getItem('upskillr_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        Object.assign(parsed, {
          fullName: userData.fullName,
          username: userData.username,
          bio: userData.bio,
          learningGoal: userData.learningGoal,
          learningInterests: userData.learningInterests,
          socialLinks: userData.socialLinks,
          avatar: userData.avatar
        });
        localStorage.setItem('upskillr_user', JSON.stringify(parsed));
        window.dispatchEvent(new Event('upskillr_user_updated'));
      } catch {}
    }
  };

  // ════════════════════════════════════════════════════════════════
  // PHOTO HANDLERS
  // ════════════════════════════════════════════════════════════════
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formDataPayload = new FormData();
    formDataPayload.append('file', file);
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/auth/profile/upload/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataPayload
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Profile photo uploaded successfully!');
        const newAvatar = data.user?.avatar || data.photoUrl || '';
        setProfile(prev => ({ ...prev, avatar: newAvatar }));
        updateLocalStorage({ ...profile, avatar: newAvatar });
      } else {
        toast.error(data.message || 'Failed to upload photo.');
      }
    } catch {
      toast.error('Error uploading profile photo.');
    } finally {
      e.target.value = '';
    }
  };

  const handlePhotoRemove = async () => {
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/auth/profile/upload/photo`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Profile photo removed.');
        setProfile(prev => ({ ...prev, avatar: '' }));
        updateLocalStorage({ ...profile, avatar: '' });
      } else {
        toast.error(data.message || 'Failed to remove photo.');
      }
    } catch {
      toast.error('Failed to remove profile photo.');
    }
  };

  // ─── Derived: any social link is saved? ───
  const hasSavedLinks = SOCIAL_PLATFORMS.some(p => profile.socialLinks?.[p.key]);

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <main className="learner-main-workspace section">
      <div className="container" style={{ maxWidth: '860px' }}>
        <div className="learner-welcome-header">
          <h1>Student Profile &amp; Learning Preferences</h1>
          <p>Personalize your unique handle, learning goals, and review your verified learning stats.</p>
        </div>

        <div className="learner-profile-card">
          {/* ─── Avatar Row ─── */}
          <div className="learner-avatar-row">
            <Avatar image={profile.avatar} name={profile.fullName} size="large" />
            <div className="learner-avatar-meta">
              <h2>{profile.fullName}</h2>
              <div className="learner-user-handle">
                {profile.username ? `@${profile.username}` : '@username_pending'}
              </div>
              <p><Mail size={14} /> {profile.email}</p>
              {hasSavedLinks && (
                <div className="avatar-meta-social-row">
                  {SOCIAL_PLATFORMS.map(p => profile.socialLinks?.[p.key] && (
                    <a key={p.key} href={profile.socialLinks[p.key]} target="_blank" rel="noopener noreferrer"
                      className={`avatar-social-btn`} title={`${p.label} Profile`}>
                      <p.Icon size={14} />
                      <span>{p.label}</span>
                    </a>
                  ))}
                </div>
              )}
              <div className="avatar-upload-actions" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <label className="btn btn-outline" style={{ padding: '6px 12px', minHeight: '34px', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Camera size={14} />
                  <span>Upload Photo</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                </label>
                {profile.avatar && (
                  <button type="button" className="btn btn-outline btn-danger" onClick={handlePhotoRemove}
                    style={{ padding: '6px 12px', minHeight: '34px', fontSize: '12px', color: 'var(--color-error)', borderColor: 'var(--color-error-border)' }}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ─── Main Profile Form ─── */}
          <form className="learner-profile-form" onSubmit={handleSave}>
            <div className="learner-form-grid">
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  placeholder="e.g. Aarti Singh" required />
              </div>

              {/* Unique Username */}
              <div className="form-group">
                <label className="form-label">Unique Username</label>
                <div className="username-input-wrapper">
                  <span className="username-prefix">@</span>
                  <input type="text" className="form-input username-input" value={profile.username}
                    onChange={handleUsernameChange} placeholder="aartisingh" />
                </div>
                {usernameStatus.status !== 'idle' && (
                  <div className={`username-feedback ${usernameStatus.status}`}>
                    {usernameStatus.status === 'available' && <Check size={13} />}
                    {usernameStatus.status === 'taken' && <AlertCircle size={13} />}
                    {usernameStatus.status === 'invalid' && <AlertCircle size={13} />}
                    <span>{usernameStatus.message}</span>
                  </div>
                )}
              </div>

              {/* Email (Read-only) */}
              <div className="form-group">
                <label className="form-label">Email Address (Read-only)</label>
                <input type="email" className="form-input" value={profile.email} disabled />
              </div>

              {/* Learning Goal */}
              <div className="form-group">
                <label className="form-label">Learning Goal (Domain)</label>
                <select className="form-input" value={profile.learningGoal}
                  onChange={(e) => setProfile({ ...profile, learningGoal: e.target.value })}>
                  {LEARNING_GOAL_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bio */}
            <div className="form-group">
              <label className="form-label">About Me (Bio)</label>
              <textarea className="form-textarea profile-bio-textarea" rows="4" maxLength={200}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Share a short summary about your background, career targets, or learning path..." />
              <div className="char-counter">{(profile.bio || '').length} / 200 characters</div>
            </div>

            {/* Learning Interests */}
            <div className="form-group">
              <label className="form-label">Learning Interests</label>
              <div className="interests-grid">
                {AVAILABLE_INTERESTS.map(interest => {
                  const isSelected = profile.learningInterests.includes(interest);
                  return (
                    <label key={interest} className={`interest-chip ${isSelected ? 'selected' : ''}`}>
                      <input type="checkbox" checked={isSelected} onChange={() => handleInterestToggle(interest)} />
                      <span>{isSelected ? '☑' : '☐'} {interest}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ─── DEVELOPER / SOCIAL PROFILES ─── */}
            <div className="developer-profiles-section">
              <div className="developer-section-header">
                <h3 className="developer-section-title">Developer &amp; Social Profiles</h3>
                <p className="developer-section-subtitle">Connect your coding and professional profiles. All fields are optional.</p>
              </div>

              {/* Connected Profiles Pills (preview) */}
              {hasSavedLinks && (
                <div className="connected-profiles-preview">
                  <span className="connected-profiles-label">Connected Profiles:</span>
                  <div className="connected-profiles-pills">
                    {SOCIAL_PLATFORMS.map(p => (
                      profile.socialLinks?.[p.key] && socialValidation[p.key]?.status !== 'invalid' && (
                        <a key={p.key} href={profile.socialLinks[p.key]} target="_blank" rel="noopener noreferrer"
                          className={`social-pill-btn ${p.key}-pill`} title={`Open ${p.label} Profile`}>
                          <p.Icon size={14} />
                          <span>{p.label}</span>
                          <ExternalLink size={11} className="pill-ext-icon" />
                        </a>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Platform Input Fields */}
              <div className="social-platforms-grid">
                {SOCIAL_PLATFORMS.map(({ key, label, placeholder, Icon }) => (
                  <div key={key} className="form-group social-form-group">
                    <div className="social-field-header">
                      <label className="form-label social-field-label">
                        <Icon size={15} />
                        <span>{label}</span>
                      </label>
                      {profile.socialLinks?.[key] && (
                        <button type="button" className="btn-remove-link"
                          onClick={() => handleRemoveSocialLink(key)} title={`Remove ${label} link`}>
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <div className="social-input-wrapper">
                      <input
                        type="url"
                        className={`form-input social-input ${socialValidation[key]?.status === 'invalid' ? 'input-error' : socialValidation[key]?.status === 'valid' ? 'input-valid' : ''}`}
                        placeholder={placeholder}
                        value={profile.socialLinks?.[key] || ''}
                        onChange={(e) => handleSocialLinkChange(key, e.target.value)}
                      />
                    </div>
                    {socialValidation[key]?.status !== 'idle' && (
                      <div className={`social-feedback ${socialValidation[key].status}`}>
                        {socialValidation[key].status === 'valid' ? <Check size={13} /> : <AlertCircle size={13} />}
                        <span>{socialValidation[key].message}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <button type="submit" className="btn btn-primary" disabled={saving}
              style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}>
              <Save size={16} />
              <span>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </form>

          {/* ─── EDUCATION SECTION ─── */}
          <section className="profile-extended-section" aria-label="Education">
            <div className="extended-section-header">
              <div className="extended-section-title-row">
                <GraduationCap size={18} className="section-title-icon" />
                <h2 className="extended-section-title">Education</h2>
              </div>
              {!showEduForm && editingEduIdx === null && (
                <button type="button" className="btn btn-outline btn-sm"
                  onClick={() => { setShowEduForm(true); setEduForm(DEFAULT_EDU); }}>
                  <Plus size={14} /> Add Education
                </button>
              )}
            </div>

            {education.length === 0 && !showEduForm && (
              <div className="section-empty-state">
                <GraduationCap size={32} className="empty-icon" />
                <p>No education entries yet. Add your academic background.</p>
              </div>
            )}

            {education.map((edu, idx) => (
              <div key={idx} className="entry-card">
                {editingEduIdx === idx ? (
                  <EducationForm value={eduForm} onChange={setEduForm} onSave={handleSaveEdu} onCancel={handleCancelEdu} />
                ) : (
                  <div className="entry-card-content">
                    <div className="entry-card-main">
                      <div className="entry-card-icon-col">
                        <div className="entry-icon-circle">
                          <GraduationCap size={16} />
                        </div>
                      </div>
                      <div className="entry-card-details">
                        <div className="entry-title">{edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}</div>
                        <div className="entry-subtitle">{edu.institution}</div>
                        <div className="entry-date">
                          {edu.startDate} {edu.startDate && '–'} {edu.current ? 'Present' : edu.endDate}
                        </div>
                        {edu.description && <p className="entry-description">{edu.description}</p>}
                      </div>
                    </div>
                    <div className="entry-card-actions">
                      <button type="button" className="btn-icon-action" onClick={() => handleEditEdu(idx)} title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button type="button" className="btn-icon-action btn-icon-danger" onClick={() => handleRemoveEdu(idx)} title="Remove">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {showEduForm && editingEduIdx === null && (
              <EducationForm value={eduForm} onChange={setEduForm} onSave={handleSaveEdu} onCancel={handleCancelEdu} />
            )}
          </section>

          {/* ─── EXPERIENCE SECTION ─── */}
          <section className="profile-extended-section" aria-label="Experience">
            <div className="extended-section-header">
              <div className="extended-section-title-row">
                <Briefcase size={18} className="section-title-icon" />
                <h2 className="extended-section-title">Experience</h2>
              </div>
              {!showExpForm && editingExpIdx === null && (
                <button type="button" className="btn btn-outline btn-sm"
                  onClick={() => { setShowExpForm(true); setExpForm(DEFAULT_EXP); }}>
                  <Plus size={14} /> Add Experience
                </button>
              )}
            </div>

            {experience.length === 0 && !showExpForm && (
              <div className="section-empty-state">
                <Briefcase size={32} className="empty-icon" />
                <p>No experience entries yet. Add your work history.</p>
              </div>
            )}

            {experience.map((exp, idx) => (
              <div key={idx} className="entry-card">
                {editingExpIdx === idx ? (
                  <ExperienceForm value={expForm} onChange={setExpForm} onSave={handleSaveExp} onCancel={handleCancelExp} />
                ) : (
                  <div className="entry-card-content">
                    <div className="entry-card-main">
                      <div className="entry-card-icon-col">
                        <div className="entry-icon-circle">
                          <Briefcase size={16} />
                        </div>
                      </div>
                      <div className="entry-card-details">
                        <div className="entry-title">{exp.role}</div>
                        <div className="entry-subtitle">{exp.company}{exp.employmentType ? ` · ${exp.employmentType}` : ''}</div>
                        <div className="entry-date">
                          {exp.startDate} {exp.startDate && '–'} {exp.current ? 'Present' : exp.endDate}
                          {exp.location ? ` · ${exp.location}` : ''}
                        </div>
                        {exp.description && <p className="entry-description">{exp.description}</p>}
                      </div>
                    </div>
                    <div className="entry-card-actions">
                      <button type="button" className="btn-icon-action" onClick={() => handleEditExp(idx)} title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button type="button" className="btn-icon-action btn-icon-danger" onClick={() => handleRemoveExp(idx)} title="Remove">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {showExpForm && editingExpIdx === null && (
              <ExperienceForm value={expForm} onChange={setExpForm} onSave={handleSaveExp} onCancel={handleCancelExp} />
            )}
          </section>

          {/* ─── LEARNING STATS (Read-only) ─── */}
          <section className="stats-section-wrapper" aria-label="Your Learning Stats">
            <div className="stats-section-header">
              <h2 className="stats-section-title">
                <Sparkles size={18} style={{ color: 'var(--brand-primary)' }} />
                <span>Your Learning Stats</span>
              </h2>
              <span className="stats-readonly-badge">Read-Only • Verified</span>
            </div>
            <div className="stats-grid-6col">
              {[
                { icon: '⭐', label: 'Total Points', value: stats.totalPoints },
                { icon: '🔥', label: 'Current Streak', value: `${stats.currentStreak} ${stats.currentStreak === 1 ? 'Day' : 'Days'}` },
                { icon: '🏆', label: 'Longest Streak', value: `${stats.longestStreak} ${stats.longestStreak === 1 ? 'Day' : 'Days'}` },
                { icon: '📚', label: 'Courses Enrolled', value: stats.coursesEnrolled },
                { icon: '✅', label: 'Courses Completed', value: stats.coursesCompleted },
                { icon: '📖', label: 'Modules Completed', value: stats.modulesCompleted }
              ].map(({ icon, label, value }) => (
                <div key={label} className="stat-metric-card">
                  <div className="stat-metric-icon">{icon}</div>
                  <div className="stat-metric-content">
                    <span className="stat-metric-label">{label}</span>
                    <span className="stat-metric-value">{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ─── LEARNING ACTIVITY HEATMAP ─── */}
          <section className="profile-extended-section" aria-label="Learning Activity">
            <div className="extended-section-header">
              <div className="extended-section-title-row">
                <Flame size={18} className="section-title-icon" />
                <h2 className="extended-section-title">Learning Activity</h2>
              </div>
              <span className="stats-readonly-badge">Last 12 Months</span>
            </div>
            <ActivityHeatmap activityData={activityData} loading={activityLoading} />
          </section>

          {/* ─── CERTIFICATES SECTION ─── */}
          <section className="profile-extended-section" aria-label="Certificates">
            <div className="extended-section-header">
              <div className="extended-section-title-row">
                <Trophy size={18} className="section-title-icon" />
                <h2 className="extended-section-title">Certificates</h2>
              </div>
            </div>

            {certsLoading ? (
              <div className="section-loading">Loading certificates...</div>
            ) : certificates.length === 0 ? (
              <div className="section-empty-state cert-empty-state">
                <div className="cert-empty-icon">🏆</div>
                <p className="cert-empty-title">No certificates received yet.</p>
                <p className="cert-empty-sub">Complete a course to earn your first certificate.</p>
              </div>
            ) : (
              <div className="cert-grid">
                {certificates.map(cert => (
                  <div key={cert._id} className="cert-card">
                    <div className="cert-card-header">
                      <span className="cert-badge">🏆</span>
                      <div className="cert-card-info">
                        <div className="cert-course-title">{cert.courseTitle}</div>
                        <div className="cert-category">{cert.category}</div>
                      </div>
                    </div>
                    <div className="cert-card-meta">
                      <CheckCircle size={13} className="cert-check-icon" />
                      <span>Course Completed</span>
                    </div>
                    {cert.completedAt && (
                      <div className="cert-date">
                        Completed: {new Date(cert.completedAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </div>
                    )}
                    {cert.instructorName && (
                      <div className="cert-instructor">Instructor: {cert.instructorName}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ─── COURSE REVIEWS SECTION ─── */}
          <section className="profile-extended-section" aria-label="Course Reviews">
            <div className="extended-section-header">
              <div className="extended-section-title-row">
                <MessageSquare size={18} className="section-title-icon" />
                <h2 className="extended-section-title">Course Reviews</h2>
              </div>
              {!reviewsLoading && reviews.length > 0 && (
                <span className="stats-readonly-badge">{reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}</span>
              )}
            </div>

            {reviewsLoading ? (
              <div className="section-loading">Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div className="section-empty-state">
                <MessageSquare size={32} className="empty-icon" />
                <p>No course reviews yet. Complete a course to share your feedback.</p>
              </div>
            ) : (
              <div className="reviews-list">
                {reviews.map(review => (
                  <div key={review._id} className="review-card">
                    <div className="review-card-header">
                      <div className="review-course-info">
                        <FileText size={14} className="review-course-icon" />
                        <span className="review-course-title">{review.courseTitle}</span>
                        {review.category && (
                          <span className="review-course-category">{review.category}</span>
                        )}
                      </div>
                      <div className="review-date">
                        {new Date(review.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                        {review.updatedAt && review.updatedAt !== review.createdAt && (
                          <span className="review-edited"> (edited)</span>
                        )}
                      </div>
                    </div>
                    <div className="review-rating-row">
                      <StarRating rating={review.rating} size={15} />
                      <span className="review-rating-text">{review.rating}/5</span>
                    </div>
                    {review.feedback && (
                      <p className="review-feedback">"{review.feedback}"</p>
                    )}
                    {review.tags && review.tags.length > 0 && (
                      <div className="review-tags">
                        {review.tags.map(tag => (
                          <span key={tag} className="review-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>{/* end learner-profile-card */}
      </div>
    </main>
  );
};
