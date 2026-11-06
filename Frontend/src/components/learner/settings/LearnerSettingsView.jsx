import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Save, Camera, Trash2, AlertTriangle, Check, AlertCircle,
  Lock, Plus, Edit2, Edit3, X, GraduationCap, Briefcase, KeyRound,
  ShieldAlert, Mail, RefreshCw, Eye, EyeOff, Clock, CheckCircle2
} from 'lucide-react';
import { Avatar } from '../../common/Avatar/Avatar';
import { DynamicTagInput } from './DynamicTagInput';
import { useToast } from '../../../context/ToastContext';
import { API_BASE } from '../../../config/api';
import './LearnerSettingsView.css';

// ─── Platform Icon Components ───
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

const PLATFORM_REGEXES = {
  github: /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/?$/,
  linkedin: /^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9_.-]+\/?$/,
  leetcode: /^https:\/\/(www\.)?leetcode\.com\/(u\/)?[A-Za-z0-9_.-]+\/?$/,
  instagram: /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.-]+\/?$/,
  facebook: /^https:\/\/(www\.)?facebook\.com\/[A-Za-z0-9_.-]+\/?$/,
  codeforces: /^https:\/\/(www\.)?codeforces\.com\/profile\/[A-Za-z0-9_.-]+\/?$/,
  geeksforgeeks: /^https:\/\/(www\.|auth\.)?geeksforgeeks\.org\/user\/[A-Za-z0-9_.-]+\/?$/,
  hackerrank: /^https:\/\/(www\.)?hackerrank\.com\/(profile\/)?[A-Za-z0-9_.-]+\/?$/
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

const LEARNING_GOAL_OPTIONS = [
  'Web Development',
  'Data Science & AI',
  'Mobile Development',
  'Cloud Computing & DevOps',
  'UI/UX Design',
  'Cybersecurity',
  'Product Management',
  'Software Engineering',
  'Blockchain & Web3'
];

export const LearnerSettingsView = ({ user }) => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const modalUsernameTimerRef = useRef(null);

  // ─── Edit Mode State ───
  // Default is View Mode (isEditing === false)
  const [isEditing, setIsEditing] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  // ─── Profile Form State ───
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

  // Saved profile baseline for rolling back on "Cancel"
  const [savedProfile, setSavedProfile] = useState(null);

  // ─── 30-Day Username Restriction State ───
  const [usernameEligibility, setUsernameEligibility] = useState({
    canChange: true,
    daysRemaining: 0,
    nextEligibleDate: null
  });
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [modalUsernameStatus, setModalUsernameStatus] = useState({ status: 'idle', message: '' });
  const [updatingUsername, setUpdatingUsername] = useState(false);

  // Common UI states
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ─── Danger Zone: Delete Account Modal Flow ───
  // deleteStep: null | 1 (confirmation) | 2 (password check) | 3 (email OTP)
  const [deleteStep, setDeleteStep] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteOtp, setDeleteOtp] = useState(['', '', '', '', '', '']);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [deleteError, setDeleteError] = useState('');
  const otpInputRefs = useRef([]);

  // Fetch current profile & username eligibility on mount
  useEffect(() => {
    const fetchCurrentProfile = async () => {
      try {
        const token = sessionStorage.getItem('upskillr_token');
        const res = await fetch(`${API_BASE}/learners/me`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.success && data.user) {
          const profileData = {
            fullName: data.user.fullName || '',
            email: data.user.email || '',
            username: data.user.username || '',
            avatar: data.user.avatar || '',
            bio: data.user.bio || '',
            learningGoal: data.user.learningGoal || 'Web Development',
            learningInterests: Array.isArray(data.user.learningInterests) ? data.user.learningInterests : [],
            socialLinks: {
              github: data.user.socialLinks?.github || '',
              linkedin: data.user.socialLinks?.linkedin || '',
              leetcode: data.user.socialLinks?.leetcode || '',
              instagram: data.user.socialLinks?.instagram || '',
              facebook: data.user.socialLinks?.facebook || '',
              codeforces: data.user.socialLinks?.codeforces || '',
              geeksforgeeks: data.user.socialLinks?.geeksforgeeks || '',
              hackerrank: data.user.socialLinks?.hackerrank || ''
            }
          };
          setProfile(profileData);
          setSavedProfile(JSON.parse(JSON.stringify(profileData)));

          if (data.user.usernameEligibility) {
            setUsernameEligibility(data.user.usernameEligibility);
          }
        }
      } catch (err) {
        console.error('Failed to load profile in settings:', err);
      }
    };
    fetchCurrentProfile();
  }, []);

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Dirty check: has user made changes in Edit Mode?
  const isDirty = useMemo(() => {
    if (!savedProfile) return false;
    if (profile.fullName !== savedProfile.fullName) return true;
    if (profile.bio !== savedProfile.bio) return true;
    if (profile.learningGoal !== savedProfile.learningGoal) return true;
    if (profile.avatar !== savedProfile.avatar) return true;
    if (JSON.stringify(profile.learningInterests) !== JSON.stringify(savedProfile.learningInterests)) return true;
    if (JSON.stringify(profile.socialLinks) !== JSON.stringify(savedProfile.socialLinks)) return true;
    return false;
  }, [profile, savedProfile]);

  // Prevent accidental navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isEditing && isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditing, isDirty]);

  // Handle Cancel Edit
  const handleCancelEdit = () => {
    if (isDirty) {
      setShowDiscardModal(true);
    } else {
      setIsEditing(false);
    }
  };

  const confirmDiscardChanges = () => {
    if (savedProfile) {
      setProfile(JSON.parse(JSON.stringify(savedProfile)));
    }
    setShowDiscardModal(false);
    setIsEditing(false);
  };

  // ─── Profile Photo Upload via Cloudinary ───
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP images are supported.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be under 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadingPhoto(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const res = await fetch(`${API_BASE}/auth/profile/upload/photo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json();
      if (data.success && data.user?.avatar) {
        const newAvatar = data.user.avatar;
        setProfile((prev) => ({ ...prev, avatar: newAvatar }));
        toast.success('Profile photo updated successfully!');

        // Update stored session user immediately
        const stored = sessionStorage.getItem('upskillr_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            parsed.avatar = newAvatar;
            sessionStorage.setItem('upskillr_user', JSON.stringify(parsed));
            window.dispatchEvent(new Event('upskillr_user_updated'));
          } catch (e) {}
        }
      } else {
        toast.error(data.message || 'Failed to upload photo.');
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      toast.error('Network error uploading profile photo.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove Profile Photo
  const handleRemovePhoto = async () => {
    if (!profile.avatar) return;
    setUploadingPhoto(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const res = await fetch(`${API_BASE}/auth/profile/upload/photo`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        setProfile((prev) => ({ ...prev, avatar: '' }));
        toast.success('Profile photo removed.');

        // Update stored session user immediately
        const stored = sessionStorage.getItem('upskillr_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            parsed.avatar = '';
            sessionStorage.setItem('upskillr_user', JSON.stringify(parsed));
            window.dispatchEvent(new Event('upskillr_user_updated'));
          } catch (e) {}
        }
      } else {
        toast.error(data.message || 'Failed to remove photo.');
      }
    } catch (err) {
      toast.error('Network error removing photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ─── Save Full Profile Changes (Edit Mode -> View Mode) ───
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();

    if (!profile.fullName.trim()) {
      toast.error('Full name is required.');
      return;
    }

    // Validate social links format
    for (const [platform, regex] of Object.entries(PLATFORM_REGEXES)) {
      const url = profile.socialLinks?.[platform];
      if (url && url.trim() && !regex.test(url.trim())) {
        const label = SOCIAL_PLATFORMS.find((p) => p.key === platform)?.label || platform;
        toast.error(`Please enter a valid URL for ${label}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const res = await fetch(`${API_BASE}/learners/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          fullName: profile.fullName.trim(),
          bio: profile.bio.trim().slice(0, 200),
          learningGoal: profile.learningGoal,
          learningInterests: profile.learningInterests,
          socialLinks: profile.socialLinks
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Profile settings updated successfully!');
        const updated = {
          ...profile,
          fullName: profile.fullName.trim(),
          bio: profile.bio.trim().slice(0, 200)
        };
        setProfile(updated);
        setSavedProfile(JSON.parse(JSON.stringify(updated)));
        setIsEditing(false); // Return to View Mode

        // Sync with session storage and notify rest of app
        const stored = sessionStorage.getItem('upskillr_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            parsed.fullName = updated.fullName;
            parsed.bio = updated.bio;
            parsed.learningGoal = updated.learningGoal;
            parsed.learningInterests = updated.learningInterests;
            parsed.socialLinks = updated.socialLinks;
            sessionStorage.setItem('upskillr_user', JSON.stringify(parsed));
            window.dispatchEvent(new Event('upskillr_user_updated'));
          } catch (e) {}
        }
        window.dispatchEvent(new Event('upskillr_points_updated'));
      } else {
        toast.error(data.message || 'Failed to save settings.');
      }
    } catch (err) {
      console.error('Save profile error:', err);
      toast.error('Network error saving profile settings.');
    } finally {
      setSaving(false);
    }
  };

  // ─── 30-Day Username Change Workflow ───
  const handleOpenUsernameModal = () => {
    setNewUsername(profile.username || '');
    setModalUsernameStatus({ status: 'idle', message: '' });
    setShowUsernameModal(true);
  };

  const handleModalUsernameChange = (val) => {
    const clean = val.replace(/^@/, '').trim().toLowerCase();
    setNewUsername(clean);

    if (modalUsernameTimerRef.current) clearTimeout(modalUsernameTimerRef.current);

    if (!clean) {
      setModalUsernameStatus({ status: 'idle', message: '' });
      return;
    }

    if (clean === profile.username?.toLowerCase()) {
      setModalUsernameStatus({
        status: 'invalid',
        message: 'This is already your current username.'
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(clean)) {
      setModalUsernameStatus({
        status: 'invalid',
        message: '3-20 characters; letters, numbers, and underscores only.'
      });
      return;
    }

    setModalUsernameStatus({ status: 'checking', message: 'Checking availability...' });
    modalUsernameTimerRef.current = setTimeout(async () => {
      try {
        const token = sessionStorage.getItem('upskillr_token');
        const res = await fetch(`${API_BASE}/learners/me/check-username?username=${encodeURIComponent(clean)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.available) {
          setModalUsernameStatus({ status: 'available', message: `✓ @${clean} is available!` });
        } else {
          setModalUsernameStatus({ status: 'taken', message: data.message || 'Username already taken.' });
        }
      } catch (err) {
        setModalUsernameStatus({ status: 'idle', message: '' });
      }
    }, 400);
  };

  const handleSaveUsername = async (e) => {
    if (e) e.preventDefault();
    const clean = newUsername.replace(/^@/, '').trim().toLowerCase();

    if (!clean || clean.length < 3 || clean.length > 20) {
      toast.error('Username must be 3-20 alphanumeric characters.');
      return;
    }

    if (clean === profile.username?.toLowerCase()) {
      toast.error('New username must be different from current username.');
      return;
    }

    setUpdatingUsername(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const res = await fetch(`${API_BASE}/learners/me/username`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ username: clean })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Username updated successfully! It is now locked for 30 days.');
        setProfile((prev) => ({ ...prev, username: clean }));
        if (savedProfile) {
          setSavedProfile((prev) => ({ ...prev, username: clean }));
        }

        if (data.usernameEligibility) {
          setUsernameEligibility(data.usernameEligibility);
        } else {
          setUsernameEligibility({
            canChange: false,
            daysRemaining: 30,
            nextEligibleDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          });
        }

        // Update stored user
        const stored = sessionStorage.getItem('upskillr_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            parsed.username = clean;
            sessionStorage.setItem('upskillr_user', JSON.stringify(parsed));
            window.dispatchEvent(new Event('upskillr_user_updated'));
          } catch (e) {}
        }
        window.dispatchEvent(new Event('upskillr_points_updated'));
        setShowUsernameModal(false);
      } else {
        toast.error(data.message || 'Failed to update username.');
      }
    } catch (err) {
      console.error('Update username error:', err);
      toast.error('Network error updating username.');
    } finally {
      setUpdatingUsername(false);
    }
  };

  // ─── Danger Zone: Step 1 -> Step 2 ───
  const handleStartDeleteAccount = () => {
    setDeleteError('');
    setDeletePassword('');
    setDeleteOtp(['', '', '', '', '', '']);
    setDeleteStep(1);
  };

  // Step 2: Verify Password and Send Email OTP
  const handleVerifyPassword = async (e) => {
    if (e) e.preventDefault();
    setDeleteError('');

    setDeleteLoading(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const res = await fetch(`${API_BASE}/learners/me/delete-account/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ password: deletePassword })
      });

      const data = await res.json();
      if (data.success) {
        toast.info(data.message || `Verification code sent to ${profile.email}`);
        setResendCooldown(data.cooldownSeconds || 60);
        setDeleteStep(3); // Advance to OTP step
      } else {
        setDeleteError(data.message || 'Incorrect password.');
      }
    } catch (err) {
      setDeleteError('Server error verifying password. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Step 3: Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const res = await fetch(`${API_BASE}/learners/me/delete-account/resend-otp`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        toast.success('A new 6-digit verification code has been sent to your email.');
        setResendCooldown(data.cooldownSeconds || 60);
      } else {
        setDeleteError(data.message || 'Failed to resend code.');
      }
    } catch (err) {
      setDeleteError('Error connecting to server. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpDigitChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...deleteOtp];
    newOtp[index] = value;
    setDeleteOtp(newOtp);

    // Auto-advance cursor to next box
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !deleteOtp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setDeleteOtp(newOtp);
    const nextIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIdx]?.focus();
  };

  // Step 4: Confirm Final Permanent Deletion
  const handleConfirmDeletion = async (e) => {
    if (e) e.preventDefault();
    const fullOtp = deleteOtp.join('');
    if (fullOtp.length !== 6) {
      setDeleteError('Please enter all 6 digits of the verification code.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const res = await fetch(`${API_BASE}/learners/me/delete-account/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ otp: fullOtp })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Your UpSkillR account has been permanently deleted.');
        // Clear all authentication sessions
        sessionStorage.removeItem('upskillr_token');
        sessionStorage.removeItem('upskillr_user');
        localStorage.removeItem('upskillr_token');
        localStorage.removeItem('upskillr_user');

        setTimeout(() => {
          window.location.href = '/';
        }, 800);
      } else {
        setDeleteError(data.message || 'Incorrect or expired code.');
      }
    } catch (err) {
      setDeleteError('Server error confirming deletion. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="learner-settings-page">
      {/* ─── PAGE HEADER & WORKFLOW CONTROLS ─── */}
      <div className="settings-page-header">
        <div className="header-text-block">
          <h1 className="settings-page-title">Account Settings &amp; Preferences</h1>
          <p className="settings-page-sub">
            Personalize your profile details, customize your learning domain, and manage your account credentials.
          </p>
        </div>

        {/* View Mode vs Edit Mode Header Actions */}
        <div className="header-actions">
          {!isEditing ? (
            <button
              type="button"
              className="btn-edit-profile-trigger"
              onClick={() => setIsEditing(true)}
              aria-label="Edit Profile"
            >
              <Edit3 size={16} />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="edit-mode-btn-group">
              <button
                type="button"
                className="btn-cancel-profile"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                <X size={15} />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                className="btn-save-profile-top"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="settings-content-stack">
        {/* ─── SECTION A: PROFILE SETTINGS PANEL ─── */}
        <section
          className={`settings-card-panel ${isEditing ? 'mode-editing' : 'mode-viewing'}`}
          aria-label="Profile Settings"
        >

          {/* 1. Photo Section */}
          <div className="settings-photo-row">
            <div className="settings-avatar-wrap">
              <Avatar
                image={profile.avatar}
                name={profile.fullName}
                size="large"
                className="settings-photo-avatar"
              />
            </div>
            <div className="settings-photo-actions">
              <h2 className="photo-user-name">{profile.fullName}</h2>
              {profile.username && (
                <span className="photo-username-handle">@{profile.username}</span>
              )}
              <span className="photo-email-display">{profile.email}</span>

              {/* Photo modification is enabled only in Edit Mode */}
              {isEditing ? (
                <div className="photo-btn-group">
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoSelect}
                  />
                  <button
                    type="button"
                    className="btn-photo-upload"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    <Camera size={15} />
                    <span>{uploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                  </button>
                  {profile.avatar && (
                    <button
                      type="button"
                      className="btn-photo-remove"
                      onClick={handleRemovePhoto}
                      disabled={uploadingPhoto}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ) : (
                <span className="photo-readonly-hint">
                  {profile.avatar ? 'Custom profile picture set' : 'Default avatar assigned'}
                </span>
              )}
            </div>
          </div>

          <hr className="settings-divider" />

          {/* 2. Personal Fields Form */}
          <form className="settings-form-grid" onSubmit={handleSaveProfile}>
            {/* Full Name */}
            <div className="form-field-group">
              <label className="form-field-label">
                Full Name <span className="req-star">*</span>
              </label>
              <input
                type="text"
                className="form-text-input"
                value={profile.fullName}
                onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Your full name"
                disabled={!isEditing}
                required
              />
            </div>

            {/* Unique Username – 30-Day Policy Enforced */}
            <div className="form-field-group">
              <div className="label-with-policy">
                <label className="form-field-label">Unique Username</label>
                <span className="policy-pill">30-Day Restriction</span>
              </div>
              <div className="input-with-prefix">
                <span className="username-prefix">@</span>
                <input
                  type="text"
                  className="form-text-input prefix-input readonly-input"
                  value={profile.username || ''}
                  readOnly
                  disabled
                  placeholder="username"
                  aria-label="Unique Username (Read-only)"
                />
                <Lock size={15} className="input-lock-icon-right" />
              </div>

              {/* 30-Day Restriction Notice & Change Button */}
              <div className="username-restriction-container">
                {!usernameEligibility.canChange ? (
                  <div className="username-status-box locked">
                    <Clock size={15} className="status-clock-icon" />
                    <span className="status-text">
                      Username can be changed again in{' '}
                      <strong>{usernameEligibility.daysRemaining} day{usernameEligibility.daysRemaining === 1 ? '' : 's'}</strong>
                      {usernameEligibility.nextEligibleDate && (
                        <>
                          {' '}
                          (available on{' '}
                          {new Date(usernameEligibility.nextEligibleDate).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                          )
                        </>
                      )}
                      .
                    </span>
                  </div>
                ) : (
                  <div className="username-status-box eligible">
                    <div className="eligible-left">
                      <CheckCircle2 size={15} className="status-check-icon" />
                      <span className="status-text">Username is eligible to be changed.</span>
                    </div>
                    <button
                      type="button"
                      className="btn-edit-username-trigger"
                      onClick={handleOpenUsernameModal}
                      title="Change username"
                    >
                      <Edit2 size={13} />
                      <span>Edit Username</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Email Address (Always Read-only) */}
            <div className="form-field-group">
              <label className="form-field-label">
                Email Address <span className="read-only-tag">(Read-only)</span>
              </label>
              <div className="input-with-icon">
                <Lock size={15} className="input-lock-icon" />
                <input
                  type="email"
                  className="form-text-input readonly-input"
                  value={profile.email}
                  readOnly
                  disabled
                />
              </div>
            </div>

            {/* Learning Goal (Domain) */}
            <div className="form-field-group">
              <label className="form-field-label">Learning Goal (Domain)</label>
              <select
                className="form-select-input"
                value={profile.learningGoal}
                onChange={(e) => setProfile((p) => ({ ...p, learningGoal: e.target.value }))}
                disabled={!isEditing}
              >
                {LEARNING_GOAL_OPTIONS.map((goal) => (
                  <option key={goal} value={goal}>
                    {goal}
                  </option>
                ))}
              </select>
            </div>

            {/* About Me (Bio) */}
            <div className="form-field-group full-width">
              <div className="label-with-counter">
                <label className="form-field-label">About Me (Bio)</label>
                {isEditing && (
                  <span className="char-counter">
                    {profile.bio.length} / 200 characters
                  </span>
                )}
              </div>
              <textarea
                className="form-textarea-input"
                rows={3}
                maxLength={200}
                value={profile.bio}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Share a short summary about your background, career targets, or learning path..."
                disabled={!isEditing}
              />
            </div>

            {/* Learning Interests – Dynamic Tag System */}
            <div className="form-field-group full-width">
              <label className="form-field-label">
                Learning Interests &amp; Skills
              </label>
              {isEditing && (
                <p className="field-hint-text">
                  Add skills, topics, or technologies you want to master. Press Enter or click Add to add each interest.
                </p>
              )}
              <DynamicTagInput
                tags={profile.learningInterests}
                onChange={(updatedTags) =>
                  setProfile((p) => ({ ...p, learningInterests: updatedTags }))
                }
                placeholder="Add a learning interest (e.g. React, Node.js, Python)..."
                disabled={!isEditing}
              />
            </div>
          </form>

          <hr className="settings-divider" />

          {/* 3. Developer & Social Profile Links */}
          <div className="social-profiles-edit-section">
            <h3 className="section-subheading">Developer &amp; Social Profiles</h3>
            <p className="field-hint-text">
              Add your coding handles and social links to showcase your projects and competitive programming profiles.
            </p>

            <div className="social-inputs-grid">
              {SOCIAL_PLATFORMS.map((platform) => {
                const IconComponent = platform.Icon;
                const currentVal = profile.socialLinks?.[platform.key] || '';
                const regex = PLATFORM_REGEXES[platform.key];
                const isValid = !currentVal.trim() || (regex && regex.test(currentVal.trim()));

                return (
                  <div key={platform.key} className="social-field-item">
                    <label className="social-field-label">
                      <span className="platform-icon-wrap">
                        <IconComponent size={16} />
                      </span>
                      <span>{platform.label}</span>
                    </label>
                    <input
                      type="url"
                      className={`form-text-input social-input ${!isValid ? 'input-error' : ''}`}
                      placeholder={platform.placeholder}
                      value={currentVal}
                      disabled={!isEditing}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfile((prev) => ({
                          ...prev,
                          socialLinks: {
                            ...prev.socialLinks,
                            [platform.key]: val
                          }
                        }));
                      }}
                    />
                    {isEditing && !isValid && (
                      <span className="field-error-text">
                        Please enter a valid {platform.label} URL.
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>  
        </section>

        {/* ─── SECTION B: DANGER ZONE (DELETE ACCOUNT) ─── */}
        <section className="danger-zone-panel" aria-label="Account Danger Zone">
          <div className="danger-zone-header">
            <div className="danger-icon-box">
              <ShieldAlert size={22} />
            </div>
            <div className="danger-text-col">
              <h2 className="danger-title">Danger Zone</h2>
              <p className="danger-desc">
                Permanently delete your UpSkillR student account, learning history, certificates, and achievements.
              </p>
            </div>
          </div>

          <div className="danger-action-row">
            <div className="danger-warning-note">
              <AlertTriangle size={16} className="warning-note-icon" />
              <span>
                Once deleted, your account cannot be recovered. All enrolled courses and progress points will be permanently erased.
              </span>
            </div>
            <button
              type="button"
              className="btn-trigger-delete"
              onClick={handleStartDeleteAccount}
            >
              <Trash2 size={16} />
              <span>Delete Account</span>
            </button>
          </div>
        </section>
      </div>

      {/* ─── DEDICATED 30-DAY USERNAME CHANGE MODAL ─── */}
      {showUsernameModal && (
        <div
          className="settings-modal-overlay"
          onClick={() => {
            if (!updatingUsername) setShowUsernameModal(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="username-modal-title"
        >
          <div className="settings-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <div className="modal-title-row">
                <Edit2 size={18} className="modal-header-icon" />
                <h3 id="username-modal-title">Change Unique Username</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowUsernameModal(false)}
                disabled={updatingUsername}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form className="settings-modal-body" onSubmit={handleSaveUsername}>
              {/* Important 30-day notice */}
              <div className="username-modal-notice">
                <AlertCircle size={18} className="notice-icon" />
                <div className="notice-text">
                  <strong>30-Day Restriction Policy:</strong>
                  <p>
                    UpSkillR enforces a <strong>30-day lock</strong> on username changes. Once you change your username today, you will not be able to change it again for the next 30 days.
                  </p>
                </div>
              </div>

              {/* Current username indicator */}
              <div className="current-username-card">
                <span className="current-label">Current Handle:</span>
                <span className="current-value">@{profile.username || 'not_set'}</span>
              </div>

              {/* New username input */}
              <div className="form-field-group">
                <label className="form-field-label">
                  New Username <span className="req-star">*</span>
                </label>
                <div className="input-with-prefix">
                  <span className="username-prefix">@</span>
                  <input
                    type="text"
                    className="form-text-input prefix-input"
                    value={newUsername}
                    onChange={(e) => handleModalUsernameChange(e.target.value)}
                    placeholder="new_username"
                    maxLength={20}
                    autoFocus
                    disabled={updatingUsername}
                  />
                </div>
                {modalUsernameStatus.message && (
                  <span className={`username-status-msg ${modalUsernameStatus.status}`}>
                    {modalUsernameStatus.message}
                  </span>
                )}
                <span className="field-hint-text">
                  3–20 characters. Letters, numbers, and underscores only.
                </span>
              </div>

              <div className="settings-modal-footer">
                <button
                  type="button"
                  className="btn-modal-secondary"
                  onClick={() => setShowUsernameModal(false)}
                  disabled={updatingUsername}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-primary"
                  disabled={
                    updatingUsername ||
                    !newUsername ||
                    newUsername === profile.username?.toLowerCase() ||
                    modalUsernameStatus.status !== 'available'
                  }
                >
                  {updatingUsername ? 'Saving...' : 'Confirm & Save Username'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── UNSAVED CHANGES DISCARD MODAL ─── */}
      {showDiscardModal && (
        <div
          className="settings-modal-overlay"
          onClick={() => setShowDiscardModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="settings-modal-box confirm-discard-box" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <div className="modal-title-row">
                <AlertTriangle size={18} className="modal-header-icon text-warning" />
                <h3>Discard Unsaved Changes?</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowDiscardModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            <div className="settings-modal-body">
              <p className="discard-body-text">
                You have modified your profile information without saving. Discarding will revert all fields back to their previously saved state.
              </p>
              <div className="settings-modal-footer">
                <button
                  type="button"
                  className="btn-modal-secondary"
                  onClick={() => setShowDiscardModal(false)}
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  className="btn-modal-danger"
                  onClick={confirmDiscardChanges}
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECURE 4-STEP DELETE ACCOUNT MODAL ─── */}
      {deleteStep !== null && (
        <div
          className="delete-modal-overlay"
          onClick={() => {
            if (!deleteLoading) setDeleteStep(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="delete-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="delete-modal-header">
              <div className="modal-title-with-badge">
                <div className="danger-icon-badge">
                  <AlertTriangle size={20} />
                </div>
                <h3>Permanent Account Deletion</h3>
              </div>
              <button
                type="button"
                className="btn-delete-modal-close"
                onClick={() => setDeleteStep(null)}
                disabled={deleteLoading}
                aria-label="Close deletion dialog"
              >
                <X size={20} />
              </button>
            </div>

            {/* ─── STEP 1: INITIAL CONFIRMATION WARNING ─── */}
            {deleteStep === 1 && (
              <div className="delete-modal-body">
                <div className="deletion-consequence-card">
                  <p className="deletion-consequence-intro">
                    Are you absolutely sure you want to delete your UpSkillR account?
                  </p>
                  <p className="deletion-consequence-sub">
                    This action is <strong>irreversible</strong> and will permanently remove:
                  </p>
                  <ul className="deletion-consequence-list">
                    <li>All course enrolments, completion milestones, and progress</li>
                    <li>Official verified certificates of completion</li>
                    <li>Your streak counter, point history, and daily learning activity</li>
                    <li>All submitted reviews, feedback, and course bookmarks</li>
                  </ul>
                </div>

                <div className="delete-modal-footer">
                  <button
                    type="button"
                    className="btn-cancel-delete"
                    onClick={() => setDeleteStep(null)}
                  >
                    Cancel, Keep Account
                  </button>
                  <button
                    type="button"
                    className="btn-continue-deletion"
                    onClick={() => {
                      setDeleteError('');
                      setDeleteStep(2);
                    }}
                  >
                    Continue to Verification
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 2: PASSWORD VERIFICATION ─── */}
            {deleteStep === 2 && (
              <form className="delete-modal-body" onSubmit={handleVerifyPassword}>
                <div className="step-direction-banner">
                  <KeyRound size={20} className="step-icon" />
                  <div>
                    <h4 className="step-title">Step 1 of 2: Security Password Verification</h4>
                    <p className="step-desc">
                      Please enter your current account password to verify account ownership.
                    </p>
                  </div>
                </div>

                <div className="form-field-group" style={{ marginTop: '16px' }}>
                  <label className="form-field-label">Account Password</label>
                  <div className="password-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-text-input"
                      placeholder="Enter your current password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-toggle-pw"
                      onClick={() => setShowPassword((p) => !p)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {deleteError && (
                  <div className="delete-error-banner" role="alert">
                    <AlertCircle size={15} />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="delete-modal-footer">
                  <button
                    type="button"
                    className="btn-cancel-delete"
                    onClick={() => setDeleteStep(1)}
                    disabled={deleteLoading}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn-continue-deletion"
                    disabled={deleteLoading || !deletePassword}
                  >
                    {deleteLoading ? 'Verifying...' : 'Verify Password & Send Code'}
                  </button>
                </div>
              </form>
            )}

            {/* ─── STEP 3: EMAIL OTP VERIFICATION ─── */}
            {deleteStep === 3 && (
              <form className="delete-modal-body" onSubmit={handleConfirmDeletion}>
                <div className="step-direction-banner">
                  <Mail size={20} className="step-icon" />
                  <div>
                    <h4 className="step-title">Step 2 of 2: Email OTP Verification</h4>
                    <p className="step-desc">
                      A 6-digit confirmation code was sent to <strong>{profile.email}</strong>.
                    </p>
                  </div>
                </div>

                <div className="otp-digit-boxes-row" onPaste={handleOtpPaste}>
                  {deleteOtp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className="otp-digit-box"
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                <div className="otp-resend-row">
                  {resendCooldown > 0 ? (
                    <span className="resend-cooldown-text">
                      Resend code in <strong>{resendCooldown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn-resend-otp"
                      onClick={handleResendOtp}
                      disabled={deleteLoading}
                    >
                      <RefreshCw size={13} />
                      <span>Resend Verification Code</span>
                    </button>
                  )}
                </div>

                {deleteError && (
                  <div className="delete-error-banner" role="alert">
                    <AlertCircle size={15} />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="delete-modal-footer">
                  <button
                    type="button"
                    className="btn-cancel-delete"
                    onClick={() => setDeleteStep(null)}
                    disabled={deleteLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-final-delete"
                    disabled={deleteLoading || deleteOtp.join('').length !== 6}
                  >
                    {deleteLoading ? 'Deleting Account...' : 'Permanently Delete Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnerSettingsView;
