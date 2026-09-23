import React, { useState, useEffect } from 'react';
import { Mail, Save, Camera } from 'lucide-react';
import './LearnerProfile.css';
import { Avatar } from '../../common/Avatar/Avatar';
import { useToast } from '../../../context/ToastContext';

import { API_BASE } from '../../../config/api';

export const LearnerProfile = ({ user }) => {
  const { toast } = useToast();
  const [profile, setProfile] = useState({
    fullName: user?.fullName || 'Learner',
    email: user?.email || '',
    avatar: user?.avatar || ''
  });

  // Keep state synced with user prop
  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.fullName || 'Learner',
        email: user.email || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: profile.fullName
        })
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Profile information saved successfully!');
        const storedUser = localStorage.getItem('upskillr_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.fullName = data.user.fullName;
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
            parsed.photoUrl = '';
            parsed.profilePhoto = '';
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
      <div className="container" style={{ maxWidth: '800px' }}>
        <div className="learner-welcome-header">
          <h1>Student Profile & Settings</h1>
          <p>Update your display name, profile photo, and manage your account settings.</p>
        </div>

        <div className="learner-profile-card">
          <div className="learner-avatar-row">
            <Avatar image={profile.avatar} name={profile.fullName} size="large" />
            <div className="learner-avatar-meta">
              <h2>{profile.fullName}</h2>
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

          <form className="learner-profile-form" onSubmit={handleSave}>
            <div className="learner-form-grid">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (Read-only)</label>
                <input
                  type="email"
                  className="form-input"
                  value={profile.email}
                  disabled
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Save size={16} />
              <span>Save Profile Changes</span>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};
