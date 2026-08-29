import React, { useState, useEffect } from 'react';
import { UserCheck, Mail, Shield, Save, User, Camera } from 'lucide-react';
import './InstructorProfile.css';
import { Avatar } from '../../../common/Avatar/Avatar';

export const InstructorProfile = ({ user }) => {
  const [profile, setProfile] = useState({
    fullName: user?.fullName || 'Instructor',
    email: user?.email || '',
    avatar: user?.avatar || '',
    bio: user?.bio || 'Passionate instructor building engaging, skill-focused online courses on UpSkillr.',
    specialization: user?.specialization || 'Software Engineering & Web Development'
  });
  const [savedMessage, setSavedMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Sync state if user prop changes
  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.fullName || 'Instructor',
        email: user.email || '',
        avatar: user.avatar || '',
        bio: user.bio || 'Passionate instructor building engaging, skill-focused online courses on UpSkillr.',
        specialization: user.specialization || 'Software Engineering & Web Development'
      });
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSavedMessage('');

    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: profile.fullName,
          bio: profile.bio,
          specialization: profile.specialization
        })
      });
      const data = await response.json();

      if (data.success) {
        setSavedMessage('Profile information saved successfully!');
        const storedUser = localStorage.getItem('upskillr_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.fullName = data.user.fullName;
            parsed.bio = data.user.bio;
            parsed.specialization = data.user.specialization;
            localStorage.setItem('upskillr_user', JSON.stringify(parsed));
          } catch (err) {}
        }
        window.dispatchEvent(new Event('upskillr_user_updated'));
        setTimeout(() => setSavedMessage(''), 3000);
      } else {
        setErrorMessage(data.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setErrorMessage('Failed to save profile changes.');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setErrorMessage('');
    setSavedMessage('');

    const formDataPayload = new FormData();
    formDataPayload.append('file', file);

    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch('http://localhost:5000/api/auth/profile/upload/photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataPayload
      });
      const data = await response.json();

      if (data.success) {
        setSavedMessage('Profile photo uploaded successfully!');
        setProfile((prev) => ({ ...prev, avatar: data.user.avatar }));
        
        const storedUser = localStorage.getItem('upskillr_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.avatar = data.user.avatar;
            localStorage.setItem('upskillr_user', JSON.stringify(parsed));
          } catch (err) {}
        }
        window.dispatchEvent(new Event('upskillr_user_updated'));
        setTimeout(() => setSavedMessage(''), 3000);
      } else {
        setErrorMessage(data.message || 'Failed to upload photo.');
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      setErrorMessage('Error uploading profile photo.');
    }
  };

  const handlePhotoRemove = async () => {
    setErrorMessage('');
    setSavedMessage('');

    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch('http://localhost:5000/api/auth/profile/upload/photo', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setSavedMessage('Profile photo removed.');
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
        setTimeout(() => setSavedMessage(''), 3000);
      } else {
        setErrorMessage(data.message || 'Failed to remove photo.');
      }
    } catch (err) {
      console.error('Error removing photo:', err);
      setErrorMessage('Failed to remove profile photo.');
    }
  };

  return (
    <div className="instructor-profile-page">
      <div className="profile-header">
        <h1 className="page-title">Instructor Profile & Settings</h1>
        <p className="page-subtitle">Manage your personal details and studio preferences.</p>
      </div>

      <div className="profile-card">
        {savedMessage && (
          <div className="alert-box success" style={{ marginBottom: '1rem' }}>
            <span>{savedMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="alert-box danger" style={{ marginBottom: '1rem', color: 'var(--color-error)', backgroundColor: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="profile-avatar-row">
          <Avatar image={profile.avatar} name={profile.fullName} size="large" />
          <div className="avatar-meta">
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

        <form className="profile-form" onSubmit={handleSave}>
          <div className="wizard-form-grid">
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

            <div className="form-group span-2">
              <label className="form-label">Specialization / Expertise</label>
              <input
                type="text"
                className="form-input"
                value={profile.specialization}
                onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
              />
            </div>

            <div className="form-group span-2">
              <label className="form-label">Instructor Bio</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            <Save size={16} />
            <span>Save Profile Changes</span>
          </button>
        </form>
      </div>
    </div>
  );
};
