import React, { useState } from 'react';
import { UserCheck, Mail, Shield, Save, User } from 'lucide-react';
import './InstructorProfile.css';

export const InstructorProfile = ({ user }) => {
  const [profile, setProfile] = useState({
    fullName: user?.fullName || 'Instructor',
    email: user?.email || '',
    avatar: user?.avatar || '',
    bio: 'Passionate instructor building engaging, skill-focused online courses on UpSkillr.',
    specialization: 'Software Engineering & Web Development'
  });
  const [savedMessage, setSavedMessage] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    setSavedMessage('Profile information saved successfully!');
    setTimeout(() => setSavedMessage(''), 3000);
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

        <div className="profile-avatar-row">
          <div className="profile-avatar-large">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.fullName} />
            ) : (
              <span>{profile.fullName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="avatar-meta">
            <h2>{profile.fullName}</h2>
            <p><Mail size={14} /> {profile.email}</p>
            <span className="role-pill">Instructor Account</span>
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
