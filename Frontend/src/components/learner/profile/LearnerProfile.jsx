import React, { useState, useEffect, useRef } from 'react';
import { Mail, Save, Camera, Check, AlertCircle, Sparkles, Flame, Trophy, BookOpen, CheckCircle, FileText, ExternalLink, Trash2 } from 'lucide-react';
import './LearnerProfile.css';
import { Avatar } from '../../common/Avatar/Avatar';
import { useToast } from '../../../context/ToastContext';
import { API_BASE } from '../../../config/api';

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

const GITHUB_REGEX = /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/?$/;
const LINKEDIN_REGEX = /^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9_.-]+\/?$/;
const LEETCODE_REGEX = /^https:\/\/(www\.)?leetcode\.com\/u\/[A-Za-z0-9_.-]+\/?$/;

const validatePlatformUrl = (platform, url) => {
  const trimmed = (url || '').trim();
  if (!trimmed) {
    return { status: 'idle', message: '' };
  }
  if (platform === 'github') {
    if (GITHUB_REGEX.test(trimmed)) {
      return { status: 'valid', message: '✓ Valid GitHub URL' };
    }
    return { status: 'invalid', message: 'Please enter a valid GitHub profile URL (e.g. https://github.com/username).' };
  }
  if (platform === 'linkedin') {
    if (LINKEDIN_REGEX.test(trimmed)) {
      return { status: 'valid', message: '✓ Valid LinkedIn URL' };
    }
    return { status: 'invalid', message: 'Please enter a valid LinkedIn profile URL (e.g. https://www.linkedin.com/in/username).' };
  }
  if (platform === 'leetcode') {
    if (LEETCODE_REGEX.test(trimmed)) {
      return { status: 'valid', message: '✓ Valid LeetCode URL' };
    }
    return { status: 'invalid', message: 'Please enter a valid LeetCode profile URL (e.g. https://leetcode.com/u/username/).' };
  }
  return { status: 'idle', message: '' };
};

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
    learningInterests: user?.learningInterests || ['Web Development', 'JavaScript'],
    socialLinks: {
      github: user?.socialLinks?.github || '',
      linkedin: user?.socialLinks?.linkedin || '',
      leetcode: user?.socialLinks?.leetcode || ''
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

  const [usernameStatus, setUsernameStatus] = useState({
    status: 'idle', // 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
    message: ''
  });

  const [socialValidation, setSocialValidation] = useState({
    github: { status: 'idle', message: '' },
    linkedin: { status: 'idle', message: '' },
    leetcode: { status: 'idle', message: '' }
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
            : ['Web Development', 'JavaScript'],
          socialLinks: {
            github: data.user.socialLinks?.github || '',
            linkedin: data.user.socialLinks?.linkedin || '',
            leetcode: data.user.socialLinks?.leetcode || ''
          }
        });

        if (data.user.socialLinks) {
          setSocialValidation({
            github: validatePlatformUrl('github', data.user.socialLinks.github),
            linkedin: validatePlatformUrl('linkedin', data.user.socialLinks.linkedin),
            leetcode: validatePlatformUrl('leetcode', data.user.socialLinks.leetcode)
          });
        }

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

  // Social link change with immediate real-time feedback
  const handleSocialLinkChange = (platform, val) => {
    setProfile(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: val
      }
    }));

    const feedback = validatePlatformUrl(platform, val);
    setSocialValidation(prev => ({
      ...prev,
      [platform]: feedback
    }));
  };

  // Remove social link: clear field, reset validation, auto-persist to DB
  const handleRemoveSocialLink = async (platform) => {
    const updatedLinks = {
      ...profile.socialLinks,
      [platform]: ''
    };
    setProfile(prev => ({
      ...prev,
      socialLinks: updatedLinks
    }));
    setSocialValidation(prev => ({
      ...prev,
      [platform]: { status: 'idle', message: '' }
    }));

    const token = localStorage.getItem('upskillr_token');
    if (token) {
      try {
        const response = await fetch(`${API_BASE}/learners/me`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            socialLinks: updatedLinks
          })
        });
        const data = await response.json();
        if (data.success) {
          const platformLabel = platform === 'github' ? 'GitHub' : platform === 'linkedin' ? 'LinkedIn' : 'LeetCode';
          toast.success(`${platformLabel} profile link removed.`);
          const storedUser = localStorage.getItem('upskillr_user');
          if (storedUser) {
            try {
              const parsed = JSON.parse(storedUser);
              parsed.socialLinks = data.user.socialLinks;
              localStorage.setItem('upskillr_user', JSON.stringify(parsed));
            } catch (err) {}
          }
          window.dispatchEvent(new Event('upskillr_user_updated'));
        }
      } catch (err) {
        console.error('Failed to remove social link from database:', err);
      }
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

  const handleSave = async (e) => {
    e.preventDefault();

    if (usernameStatus.status === 'taken' || usernameStatus.status === 'invalid') {
      toast.error(usernameStatus.message || 'Please provide a valid, unique username.');
      return;
    }

    // Verify all social link inputs
    const ghCheck = validatePlatformUrl('github', profile.socialLinks?.github);
    const liCheck = validatePlatformUrl('linkedin', profile.socialLinks?.linkedin);
    const lcCheck = validatePlatformUrl('leetcode', profile.socialLinks?.leetcode);

    if (ghCheck.status === 'invalid' || liCheck.status === 'invalid' || lcCheck.status === 'invalid') {
      setSocialValidation({
        github: ghCheck,
        linkedin: liCheck,
        leetcode: lcCheck
      });
      const firstInvalidMsg = ghCheck.message || liCheck.message || lcCheck.message;
      toast.error(firstInvalidMsg || 'Please enter valid developer profile URLs.');
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
          learningInterests: profile.learningInterests,
          socialLinks: profile.socialLinks
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
            parsed.socialLinks = data.user.socialLinks;
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
              {(profile.socialLinks?.github || profile.socialLinks?.linkedin || profile.socialLinks?.leetcode) && (
                <div className="avatar-meta-social-row">
                  {profile.socialLinks.github && (
                    <a
                      href={profile.socialLinks.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="avatar-social-btn"
                      title="GitHub Profile"
                    >
                      <GithubIcon size={14} />
                      <span>GitHub</span>
                    </a>
                  )}
                  {profile.socialLinks.linkedin && (
                    <a
                      href={profile.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="avatar-social-btn"
                      title="LinkedIn Profile"
                    >
                      <LinkedinIcon size={14} />
                      <span>LinkedIn</span>
                    </a>
                  )}
                  {profile.socialLinks.leetcode && (
                    <a
                      href={profile.socialLinks.leetcode}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="avatar-social-btn"
                      title="LeetCode Profile"
                    >
                      <LeetcodeIcon size={14} />
                      <span>LeetCode</span>
                    </a>
                  )}
                </div>
              )}
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

            {/* DEVELOPER PROFILES SECTION */}
            <div className="developer-profiles-section">
              <div className="developer-section-header">
                <h3 className="developer-section-title">Developer Profiles</h3>
                <p className="developer-section-subtitle">Connect your coding and professional profiles.</p>
              </div>

              {/* Saved Clickable Profile Badges (Requirement 7) */}
              {(Boolean(profile.socialLinks?.github) || Boolean(profile.socialLinks?.linkedin) || Boolean(profile.socialLinks?.leetcode)) && (
                <div className="connected-profiles-preview">
                  <span className="connected-profiles-label">Connected Profiles:</span>
                  <div className="connected-profiles-pills">
                    {profile.socialLinks?.github && socialValidation.github.status !== 'invalid' && (
                      <a
                        href={profile.socialLinks.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-pill-btn github-pill"
                        title="Open GitHub Profile"
                      >
                        <GithubIcon size={14} />
                        <span>GitHub</span>
                        <ExternalLink size={11} className="pill-ext-icon" />
                      </a>
                    )}
                    {profile.socialLinks?.linkedin && socialValidation.linkedin.status !== 'invalid' && (
                      <a
                        href={profile.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-pill-btn linkedin-pill"
                        title="Open LinkedIn Profile"
                      >
                        <LinkedinIcon size={14} />
                        <span>LinkedIn</span>
                        <ExternalLink size={11} className="pill-ext-icon" />
                      </a>
                    )}
                    {profile.socialLinks?.leetcode && socialValidation.leetcode.status !== 'invalid' && (
                      <a
                        href={profile.socialLinks.leetcode}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-pill-btn leetcode-pill"
                        title="Open LeetCode Profile"
                      >
                        <LeetcodeIcon size={14} />
                        <span>LeetCode</span>
                        <ExternalLink size={11} className="pill-ext-icon" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* GitHub Field */}
              <div className="form-group social-form-group">
                <div className="social-field-header">
                  <label className="form-label social-field-label">
                    <GithubIcon size={15} />
                    <span>GitHub</span>
                  </label>
                  {profile.socialLinks?.github && (
                    <button
                      type="button"
                      className="btn-remove-link"
                      onClick={() => handleRemoveSocialLink('github')}
                      title="Remove GitHub profile link"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <div className="social-input-wrapper">
                  <input
                    type="url"
                    className={`form-input social-input ${socialValidation.github.status === 'invalid' ? 'input-error' : socialValidation.github.status === 'valid' ? 'input-valid' : ''}`}
                    placeholder="https://github.com/username"
                    value={profile.socialLinks?.github || ''}
                    onChange={(e) => handleSocialLinkChange('github', e.target.value)}
                  />
                </div>
                {socialValidation.github.status !== 'idle' && (
                  <div className={`social-feedback ${socialValidation.github.status}`}>
                    {socialValidation.github.status === 'valid' ? <Check size={13} /> : <AlertCircle size={13} />}
                    <span>{socialValidation.github.message}</span>
                  </div>
                )}
              </div>

              {/* LinkedIn Field */}
              <div className="form-group social-form-group">
                <div className="social-field-header">
                  <label className="form-label social-field-label">
                    <LinkedinIcon size={15} />
                    <span>LinkedIn</span>
                  </label>
                  {profile.socialLinks?.linkedin && (
                    <button
                      type="button"
                      className="btn-remove-link"
                      onClick={() => handleRemoveSocialLink('linkedin')}
                      title="Remove LinkedIn profile link"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <div className="social-input-wrapper">
                  <input
                    type="url"
                    className={`form-input social-input ${socialValidation.linkedin.status === 'invalid' ? 'input-error' : socialValidation.linkedin.status === 'valid' ? 'input-valid' : ''}`}
                    placeholder="https://linkedin.com/in/username"
                    value={profile.socialLinks?.linkedin || ''}
                    onChange={(e) => handleSocialLinkChange('linkedin', e.target.value)}
                  />
                </div>
                {socialValidation.linkedin.status !== 'idle' && (
                  <div className={`social-feedback ${socialValidation.linkedin.status}`}>
                    {socialValidation.linkedin.status === 'valid' ? <Check size={13} /> : <AlertCircle size={13} />}
                    <span>{socialValidation.linkedin.message}</span>
                  </div>
                )}
              </div>

              {/* LeetCode Field */}
              <div className="form-group social-form-group">
                <div className="social-field-header">
                  <label className="form-label social-field-label">
                    <LeetcodeIcon size={15} />
                    <span>LeetCode</span>
                  </label>
                  {profile.socialLinks?.leetcode && (
                    <button
                      type="button"
                      className="btn-remove-link"
                      onClick={() => handleRemoveSocialLink('leetcode')}
                      title="Remove LeetCode profile link"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <div className="social-input-wrapper">
                  <input
                    type="url"
                    className={`form-input social-input ${socialValidation.leetcode.status === 'invalid' ? 'input-error' : socialValidation.leetcode.status === 'valid' ? 'input-valid' : ''}`}
                    placeholder="https://leetcode.com/u/username/"
                    value={profile.socialLinks?.leetcode || ''}
                    onChange={(e) => handleSocialLinkChange('leetcode', e.target.value)}
                  />
                </div>
                {socialValidation.leetcode.status !== 'idle' && (
                  <div className={`social-feedback ${socialValidation.leetcode.status}`}>
                    {socialValidation.leetcode.status === 'valid' ? <Check size={13} /> : <AlertCircle size={13} />}
                    <span>{socialValidation.leetcode.message}</span>
                  </div>
                )}
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
