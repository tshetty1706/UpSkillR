import React, { useState, useEffect, useRef } from 'react';
import { Mail, Save, Camera, Check, AlertCircle, Sparkles, Flame, Trophy, BookOpen, CheckCircle, FileText } from 'lucide-react';
import './LearnerProfile.css';
import { Avatar } from '../../common/Avatar/Avatar';
import { useToast } from '../../../context/ToastContext';
import { API_BASE } from '../../../config/api';

const LEARNING_GOAL_OPTIONS = [
  'Web Development',
  'Data Science & AI',
  'Mobile Development',
  'Cloud Computing & DevOps',
  'UI/UX Design',
  'Cybersecurity',
  'Business & Management',
  'Other'
];

const AVAILABLE_INTERESTS = [
  'Web Development',
  'JavaScript',
  'React',
  'Node.js',
  'Python',
  'Data Science',
  'AI & Machine Learning',
  'UI/UX Design',
  'DevOps & Cloud',
  'Cybersecurity',
  'Mobile Apps',
  'Database Management'
];

export const LearnerProfile = ({ user }) => {
  const { toast } = useToast();
  const [profile, setProfile] = useState({
    fullName: user?.fullName || 'Learner',
    email: user?.email || '',
    username: user?.username || '',
    avatar: user?.avatar || '',
    bio: user?.bio || '',
    learningGoal: user?.learningGoal || 'Web Development',
    learningInterests: user?.learningInterests || ['Web Development', 'JavaScript']
  });

  const [stats, setStats] = useState({
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    coursesEnrolled: 0,
    coursesCompleted: 0,
    modulesCompleted: 0
  });

  const [usernameStatus, setUsernameStatus] = useState({
    status: 'idle', // 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
    message: ''
  });

  const [saving, setSaving] = useState(false);
  const checkUsernameTimerRef = useRef(null);

  // Fetch full learner profile & live backend stats on mount
  useEffect(() => {
    fetchLearnerData();
  }, [user]);

  const fetchLearnerData = async () => {
    try {
      const token = localStorage.getItem('upskillr_token');
      if (!token) return;

      const response = await fetch(`${API_BASE}/learners/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success && data.user) {
        setProfile({
          fullName: data.user.fullName || 'Learner',
          email: data.user.email || '',
          username: data.user.username || '',
          avatar: data.user.avatar || '',
          bio: data.user.bio || '',
          learningGoal: data.user.learningGoal || 'Web Development',
          learningInterests: data.user.learningInterests?.length > 0
            ? data.user.learningInterests
            : ['Web Development', 'JavaScript']
        });

        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch learner stats and details:', err);
    }
  };

  // Real-time debounced username availability check
  const handleUsernameChange = (e) => {
    const rawVal = e.target.value.replace(/^@/, '').toLowerCase().trim();
    setProfile(prev => ({ ...prev, username: rawVal }));

    if (checkUsernameTimerRef.current) clearTimeout(checkUsernameTimerRef.current);

    if (!rawVal) {
      setUsernameStatus({ status: 'idle', message: '' });
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(rawVal)) {
      setUsernameStatus({
        status: 'invalid',
        message: 'Username must be 3-20 characters long and contain only letters, numbers, or underscores.'
      });
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
      } catch (err) {
        setUsernameStatus({ status: 'idle', message: '' });
      }
    }, 400);
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

  const handleSave = async (e) => {
    e.preventDefault();

    if (usernameStatus.status === 'taken' || usernameStatus.status === 'invalid') {
      toast.error(usernameStatus.message || 'Please provide a valid, unique username.');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/learners/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: profile.fullName,
          username: profile.username,
          bio: profile.bio,
          learningGoal: profile.learningGoal,
          learningInterests: profile.learningInterests
        })
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Learner profile saved successfully!');
        const storedUser = localStorage.getItem('upskillr_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.fullName = data.user.fullName;
            parsed.username = data.user.username;
            parsed.bio = data.user.bio;
            parsed.learningGoal = data.user.learningGoal;
            parsed.learningInterests = data.user.learningInterests;
            localStorage.setItem('upskillr_user', JSON.stringify(parsed));
          } catch (err) {}
        }
        window.dispatchEvent(new Event('upskillr_user_updated'));
      } else {
        toast.error(data.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Error saving learner profile:', err);
      toast.error('Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

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
        setProfile((prev) => ({ ...prev, avatar: newAvatar }));

        const storedUser = localStorage.getItem('upskillr_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.avatar = newAvatar;
            localStorage.setItem('upskillr_user', JSON.stringify(parsed));
          } catch (err) {}
        }
        window.dispatchEvent(new Event('upskillr_user_updated'));
      } else {
        toast.error(data.message || 'Failed to upload photo.');
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
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
        setProfile((prev) => ({ ...prev, avatar: '' }));

        const storedUser = localStorage.getItem('upskillr_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.avatar = '';
            localStorage.setItem('upskillr_user', JSON.stringify(parsed));
          } catch (err) {}
        }
        window.dispatchEvent(new Event('upskillr_user_updated'));
      } else {
        toast.error(data.message || 'Failed to remove photo.');
      }
    } catch (err) {
      console.error('Error removing photo:', err);
      toast.error('Failed to remove profile photo.');
    }
  };

  return (
    <main className="learner-main-workspace section">
      <div className="container" style={{ maxWidth: '840px' }}>
        <div className="learner-welcome-header">
          <h1>Student Profile & Learning Preferences</h1>
          <p>Personalize your unique handle, learning goals, and review your verified learning stats.</p>
        </div>

        <div className="learner-profile-card">
          {/* Avatar and Basic Header */}
          <div className="learner-avatar-row">
            <Avatar image={profile.avatar} name={profile.fullName} size="large" />
            <div className="learner-avatar-meta">
              <h2>{profile.fullName}</h2>
              <div className="learner-user-handle">
                {profile.username ? `@${profile.username}` : '@username_pending'}
              </div>
              <p><Mail size={14} /> {profile.email}</p>
              <div className="avatar-upload-actions" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <label className="btn btn-outline" style={{ padding: '6px 12px', minHeight: '34px', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Camera size={14} />
                  <span>Upload Photo</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                </label>
                {profile.avatar && (
                  <button type="button" className="btn btn-outline btn-danger" onClick={handlePhotoRemove} style={{ padding: '6px 12px', minHeight: '34px', fontSize: '12px', color: 'var(--color-error)', borderColor: 'var(--color-error-border)' }}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <form className="learner-profile-form" onSubmit={handleSave}>
            <div className="learner-form-grid">
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  placeholder="e.g. Aarti Singh"
                  required
                />
              </div>

              {/* Unique Username */}
              <div className="form-group">
                <label className="form-label">Unique Username</label>
                <div className="username-input-wrapper">
                  <span className="username-prefix">@</span>
                  <input
                    type="text"
                    className="form-input username-input"
                    value={profile.username}
                    onChange={handleUsernameChange}
                    placeholder="aartisingh"
                  />
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

              {/* Email Address (Read-only) */}
              <div className="form-group">
                <label className="form-label">Email Address (Read-only)</label>
                <input
                  type="email"
                  className="form-input"
                  value={profile.email}
                  disabled
                />
              </div>

              {/* Learning Goal */}
              <div className="form-group">
                <label className="form-label">Learning Goal (Domain)</label>
                <select
                  className="form-input"
                  value={profile.learningGoal}
                  onChange={(e) => setProfile({ ...profile, learningGoal: e.target.value })}
                >
                  {LEARNING_GOAL_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bio (About Me) */}
            <div className="form-group">
              <label className="form-label">About Me (Bio)</label>
              <textarea
                className="form-input"
                rows="3"
                maxLength={200}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Share a short summary about your background, career targets, or learning path (150-200 characters max)..."
              />
              <div className="char-counter">
                {(profile.bio || '').length} / 200 characters
              </div>
            </div>

            {/* Learning Interests */}
            <div className="form-group">
              <label className="form-label">Learning Interests</label>
              <div className="interests-grid">
                {AVAILABLE_INTERESTS.map(interest => {
                  const isSelected = profile.learningInterests.includes(interest);
                  return (
                    <label
                      key={interest}
                      className={`interest-chip ${isSelected ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleInterestToggle(interest)}
                      />
                      <span>{isSelected ? '☑' : '☐'} {interest}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </form>

          {/* READ-ONLY LEARNING STATS SECTION */}
          <section className="stats-section-wrapper" aria-label="Your Learning Stats">
            <div className="stats-section-header">
              <h2 className="stats-section-title">
                <Sparkles size={18} style={{ color: 'var(--brand-primary)' }} />
                <span>Your Learning Stats</span>
              </h2>
              <span className="stats-readonly-badge">Read-Only • Verified</span>
            </div>

            <div className="stats-grid-6col">
              {/* Total Points */}
              <div className="stat-metric-card">
                <div className="stat-metric-icon">⭐</div>
                <div className="stat-metric-content">
                  <span className="stat-metric-label">Total Points</span>
                  <span className="stat-metric-value">{stats.totalPoints}</span>
                </div>
              </div>

              {/* Current Streak */}
              <div className="stat-metric-card">
                <div className="stat-metric-icon">🔥</div>
                <div className="stat-metric-content">
                  <span className="stat-metric-label">Current Streak</span>
                  <span className="stat-metric-value">{stats.currentStreak} {stats.currentStreak === 1 ? 'Day' : 'Days'}</span>
                </div>
              </div>

              {/* Longest Streak */}
              <div className="stat-metric-card">
                <div className="stat-metric-icon">🏆</div>
                <div className="stat-metric-content">
                  <span className="stat-metric-label">Longest Streak</span>
                  <span className="stat-metric-value">{stats.longestStreak} {stats.longestStreak === 1 ? 'Day' : 'Days'}</span>
                </div>
              </div>

              {/* Courses Enrolled */}
              <div className="stat-metric-card">
                <div className="stat-metric-icon">📚</div>
                <div className="stat-metric-content">
                  <span className="stat-metric-label">Courses Enrolled</span>
                  <span className="stat-metric-value">{stats.coursesEnrolled}</span>
                </div>
              </div>

              {/* Courses Completed */}
              <div className="stat-metric-card">
                <div className="stat-metric-icon">✅</div>
                <div className="stat-metric-content">
                  <span className="stat-metric-label">Courses Completed</span>
                  <span className="stat-metric-value">{stats.coursesCompleted}</span>
                </div>
              </div>

              {/* Modules Completed */}
              <div className="stat-metric-card">
                <div className="stat-metric-icon">📖</div>
                <div className="stat-metric-content">
                  <span className="stat-metric-label">Modules Completed</span>
                  <span className="stat-metric-value">{stats.modulesCompleted}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
