import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import './InstructorApplication.css';
import {
  BookOpen,
  User,
  Briefcase,
  GraduationCap,
  Award,
  Video,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Save,
  LogOut,
  RefreshCw,
  Upload,
  Trash2,
  ExternalLink,
  Plus,
  X,
  Edit2,
  Check
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api/instructor/application';

// Helper to format file size in KB or MB
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const InstructorApplication = ({ user, onLogout }) => {
  const { theme } = useTheme();

  // Active step state (1 to 7)
  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Refs for native OS file pickers
  const photoInputRef = useRef(null);
  const resumeInputRef = useRef(null);

  // Skill Tag Input State
  const [skillInputValue, setSkillInputValue] = useState('');

  // Certification Modal State
  const [showCertModal, setShowCertModal] = useState(false);
  const [editingCertIndex, setEditingCertIndex] = useState(null);
  const [certForm, setCertForm] = useState({
    name: '',
    issuingOrganization: '',
    issueDate: '',
    expirationDate: '',
    doesNotExpire: false,
    credentialId: '',
    credentialUrl: ''
  });

  // Main Form Data State
  const [formData, setFormData] = useState({
    personalInfo: {
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: '',
      professionalTitle: '',
      bio: '',
      location: '',
      photoUrl: user?.avatar || ''
    },
    professionalInfo: {
      currentRole: '',
      organization: '',
      yearsOfExperience: '1-3 years',
      linkedinUrl: '',
      websiteUrl: '',
      keySkills: []
    },
    education: {
      degree: '',
      fieldOfStudy: '',
      institution: '',
      graduationYear: ''
    },
    teachingExperience: {
      priorExperience: 'Yes, online & offline',
      targetStudentLevel: 'Beginner to Intermediate',
      preferredTeachingStyle: 'Hands-on projects & live coding',
      sampleVideoUrl: ''
    },
    coursesExpertise: {
      primaryCategory: 'Web Development',
      proposedCourseTitle: '',
      proposedCourseDesc: '',
      targetAudience: '',
      certifications: []
    },
    documents: {
      idDocumentRef: '',
      resume: {
        url: '',
        originalName: '',
        size: 0,
        mimeType: ''
      },
      additionalNotes: ''
    }
  });

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
  };

  // Fetch initial application data on mount
  useEffect(() => {
    fetchApplicationData();
  }, []);

  const fetchApplicationData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(API_BASE_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success && data.application) {
        const app = data.application;

        // If already submitted, redirect to dashboard immediately
        if (data.applicationStatus === 'submitted' || app.applicationStatus === 'submitted') {
          navigate('/instructor/dashboard');
          return;
        }

        let parsedSkills = [];
        if (Array.isArray(app.professionalInfo?.keySkills)) {
          parsedSkills = app.professionalInfo.keySkills;
        } else if (typeof app.professionalInfo?.keySkills === 'string') {
          parsedSkills = app.professionalInfo.keySkills
            ? app.professionalInfo.keySkills.split(',').map((s) => s.trim()).filter(Boolean)
            : [];
        }

        setFormData({
          personalInfo: {
            fullName: app.personalInfo?.fullName || user?.fullName || '',
            email: app.personalInfo?.email || user?.email || '',
            phone: app.personalInfo?.phone || '',
            professionalTitle: app.personalInfo?.professionalTitle || '',
            bio: app.personalInfo?.bio || '',
            location: app.personalInfo?.location || '',
            photoUrl: app.personalInfo?.photoUrl || user?.avatar || ''
          },
          professionalInfo: {
            currentRole: app.professionalInfo?.currentRole || '',
            organization: app.professionalInfo?.organization || '',
            yearsOfExperience: app.professionalInfo?.yearsOfExperience || '1-3 years',
            linkedinUrl: app.professionalInfo?.linkedinUrl || '',
            websiteUrl: app.professionalInfo?.websiteUrl || '',
            keySkills: parsedSkills
          },
          education: {
            degree: app.education?.degree || '',
            fieldOfStudy: app.education?.fieldOfStudy || '',
            institution: app.education?.institution || '',
            graduationYear: app.education?.graduationYear || ''
          },
          teachingExperience: {
            priorExperience: app.teachingExperience?.priorExperience || 'Yes, online & offline',
            targetStudentLevel: app.teachingExperience?.targetStudentLevel || 'Beginner to Intermediate',
            preferredTeachingStyle: app.teachingExperience?.preferredTeachingStyle || 'Hands-on projects & live coding',
            sampleVideoUrl: app.teachingExperience?.sampleVideoUrl || ''
          },
          coursesExpertise: {
            primaryCategory: app.coursesExpertise?.primaryCategory || 'Web Development',
            proposedCourseTitle: app.coursesExpertise?.proposedCourseTitle || '',
            proposedCourseDesc: app.coursesExpertise?.proposedCourseDesc || '',
            targetAudience: app.coursesExpertise?.targetAudience || '',
            certifications: Array.isArray(app.coursesExpertise?.certifications)
              ? app.coursesExpertise.certifications
              : []
          },
          documents: {
            idDocumentRef: app.documents?.idDocumentRef || '',
            resume: {
              url: app.documents?.resume?.url || '',
              originalName: app.documents?.resume?.originalName || '',
              size: app.documents?.resume?.size || 0,
              mimeType: app.documents?.resume?.mimeType || ''
            },
            additionalNotes: app.documents?.additionalNotes || ''
          }
        });

        if (app.currentSection && app.currentSection >= 1 && app.currentSection <= 7) {
          setActiveStep(app.currentSection);
        }
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
      setErrorMessage('Could not load application data from server.');
    } finally {
      setLoading(false);
    }
  };

  // Continuous Auto-Save Function
  const saveToServer = async (updatedData, stepToSave) => {
    setAutoSaveStatus('saving');
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(API_BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...updatedData,
          currentSection: stepToSave || activeStep
        })
      });

      const data = await response.json();
      if (data.success) {
        setAutoSaveStatus('saved');
        setTimeout(() => {
          setAutoSaveStatus('idle');
        }, 2000);
      } else {
        setAutoSaveStatus('error');
      }
    } catch (err) {
      console.error('Auto-save error:', err);
      setAutoSaveStatus('error');
    }
  };

  // Debounced Auto-Save Handler
  const debounceTimerRef = useRef(null);

  const handleInputChange = (section, field, value) => {
    const updated = {
      ...formData,
      [section]: {
        ...formData[section],
        [field]: value
      }
    };
    setFormData(updated);

    if (errorMessage) setErrorMessage('');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      saveToServer(updated, activeStep);
    }, 1000);
  };

  // Profile Photo Native Device File Upload Handler
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size <= 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Profile photo size must be less than 5MB.');
      return;
    }

    // Validate format (PNG, JPG, WEBP)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setErrorMessage('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    setErrorMessage('');
    setAutoSaveStatus('saving');

    const formDataPayload = new FormData();
    formDataPayload.append('file', file);

    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE_URL}/upload/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataPayload
      });
      const data = await response.json();

      if (data.success) {
        const updated = {
          ...formData,
          personalInfo: {
            ...formData.personalInfo,
            photoUrl: data.photoUrl
          }
        };
        setFormData(updated);
        setAutoSaveStatus('saved');

        // Update local storage user profile photo
        const storedUser = localStorage.getItem('upskillr_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.avatar = data.photoUrl;
            localStorage.setItem('upskillr_user', JSON.stringify(parsed));
          } catch (err) {}
        }
      } else {
        setErrorMessage(data.message || 'Failed to upload profile photo.');
        setAutoSaveStatus('error');
      }
    } catch (err) {
      setErrorMessage('Error uploading profile photo.');
      setAutoSaveStatus('error');
    }
  };

  // Remove Profile Photo (Revert to default profile icon)
  const handleRemovePhoto = async () => {
    setErrorMessage('');
    setAutoSaveStatus('saving');
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE_URL}/upload/photo`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        const updated = {
          ...formData,
          personalInfo: {
            ...formData.personalInfo,
            photoUrl: ''
          }
        };
        setFormData(updated);
        setAutoSaveStatus('saved');

        const storedUser = localStorage.getItem('upskillr_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.avatar = '';
            localStorage.setItem('upskillr_user', JSON.stringify(parsed));
          } catch (err) {}
        }
      }
    } catch (err) {
      setErrorMessage('Failed to remove profile photo.');
      setAutoSaveStatus('error');
    }
  };

  // Resume Document Native Device File Upload Handler
  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size <= 10MB
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Resume file size must be less than 10MB.');
      return;
    }

    // Validate format (.pdf, .doc, .docx)
    const allowedExts = ['.pdf', '.doc', '.docx'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExts.includes(fileExt)) {
      setErrorMessage('Please select a valid document (.pdf, .doc, or .docx).');
      return;
    }

    setErrorMessage('');
    setAutoSaveStatus('saving');

    const formDataPayload = new FormData();
    formDataPayload.append('file', file);

    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE_URL}/upload/resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataPayload
      });
      const data = await response.json();

      if (data.success && data.resume) {
        const updated = {
          ...formData,
          documents: {
            ...formData.documents,
            resume: data.resume
          }
        };
        setFormData(updated);
        setAutoSaveStatus('saved');
      } else {
        setErrorMessage(data.message || 'Failed to upload resume.');
        setAutoSaveStatus('error');
      }
    } catch (err) {
      setErrorMessage('Error uploading resume.');
      setAutoSaveStatus('error');
    }
  };

  // Remove Resume Handler
  const handleRemoveResume = async () => {
    setErrorMessage('');
    setAutoSaveStatus('saving');
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE_URL}/upload/resume`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        const updated = {
          ...formData,
          documents: {
            ...formData.documents,
            resume: { url: '', originalName: '', size: 0, mimeType: '' }
          }
        };
        setFormData(updated);
        setAutoSaveStatus('saved');
      }
    } catch (err) {
      setErrorMessage('Failed to remove resume.');
      setAutoSaveStatus('error');
    }
  };

  // LinkedIn-Style Skills Tag Input Handlers
  const handleAddSkill = (skillText) => {
    const trimmed = skillText.trim();
    if (!trimmed) return;

    const currentSkills = formData.professionalInfo.keySkills || [];
    // Case-insensitive duplicate check
    const isDuplicate = currentSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      setSkillInputValue('');
      return;
    }

    const updatedSkills = [...currentSkills, trimmed];
    const updatedData = {
      ...formData,
      professionalInfo: {
        ...formData.professionalInfo,
        keySkills: updatedSkills
      }
    };
    setFormData(updatedData);
    setSkillInputValue('');
    saveToServer(updatedData, activeStep);
  };

  const handleRemoveSkill = (indexToRemove) => {
    const currentSkills = formData.professionalInfo.keySkills || [];
    const updatedSkills = currentSkills.filter((_, idx) => idx !== indexToRemove);
    const updatedData = {
      ...formData,
      professionalInfo: {
        ...formData.professionalInfo,
        keySkills: updatedSkills
      }
    };
    setFormData(updatedData);
    saveToServer(updatedData, activeStep);
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddSkill(skillInputValue);
    } else if (e.key === 'Backspace' && !skillInputValue) {
      const currentSkills = formData.professionalInfo.keySkills || [];
      if (currentSkills.length > 0) {
        handleRemoveSkill(currentSkills.length - 1);
      }
    }
  };

  // LinkedIn-Style Certifications Handlers
  const handleOpenCertModal = (index = null) => {
    if (index !== null) {
      const certToEdit = formData.coursesExpertise.certifications[index];
      setEditingCertIndex(index);
      setCertForm({
        name: certToEdit.name || '',
        issuingOrganization: certToEdit.issuingOrganization || '',
        issueDate: certToEdit.issueDate || '',
        expirationDate: certToEdit.expirationDate || '',
        doesNotExpire: certToEdit.doesNotExpire || false,
        credentialId: certToEdit.credentialId || '',
        credentialUrl: certToEdit.credentialUrl || ''
      });
    } else {
      setEditingCertIndex(null);
      setCertForm({
        name: '',
        issuingOrganization: '',
        issueDate: '',
        expirationDate: '',
        doesNotExpire: false,
        credentialId: '',
        credentialUrl: ''
      });
    }
    setShowCertModal(true);
  };

  const handleSaveCert = () => {
    if (!certForm.name.trim() || !certForm.issuingOrganization.trim()) {
      setErrorMessage('Please enter Certification Name and Issuing Organization.');
      return;
    }

    const currentCerts = [...(formData.coursesExpertise.certifications || [])];
    const newCertEntry = {
      name: certForm.name.trim(),
      issuingOrganization: certForm.issuingOrganization.trim(),
      issueDate: certForm.issueDate,
      expirationDate: certForm.doesNotExpire ? '' : certForm.expirationDate,
      doesNotExpire: certForm.doesNotExpire,
      credentialId: certForm.credentialId.trim(),
      credentialUrl: certForm.credentialUrl.trim()
    };

    if (editingCertIndex !== null) {
      currentCerts[editingCertIndex] = newCertEntry;
    } else {
      currentCerts.push(newCertEntry);
    }

    const updatedData = {
      ...formData,
      coursesExpertise: {
        ...formData.coursesExpertise,
        certifications: currentCerts
      }
    };

    setFormData(updatedData);
    setShowCertModal(false);
    setErrorMessage('');
    saveToServer(updatedData, activeStep);
  };

  const handleRemoveCert = (indexToRemove) => {
    const currentCerts = (formData.coursesExpertise.certifications || []).filter(
      (_, idx) => idx !== indexToRemove
    );
    const updatedData = {
      ...formData,
      coursesExpertise: {
        ...formData.coursesExpertise,
        certifications: currentCerts
      }
    };
    setFormData(updatedData);
    saveToServer(updatedData, activeStep);
  };

  // Step Navigation
  const handleSaveAndContinue = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    await saveToServer(formData, activeStep + 1);

    if (activeStep < 7) {
      setActiveStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setErrorMessage('');
    if (activeStep > 1) {
      setActiveStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveAndExit = async () => {
    await saveToServer(formData, activeStep);
    navigate('/');
  };

  // Submit Final Application
  const handleSubmitApplication = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setSubmitting(true);

    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE_URL}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Validation failed. Please complete all required sections.');
      }

      setSuccessMessage('Instructor Application submitted successfully! Unlocking Instructor Dashboard...');

      const storedUser = localStorage.getItem('upskillr_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          parsed.applicationStatus = 'submitted';
          if (data.user?.avatar) parsed.avatar = data.user.avatar;
          localStorage.setItem('upskillr_user', JSON.stringify(parsed));
        } catch (err) {}
      }

      setTimeout(() => {
        navigate('/instructor/dashboard');
      }, 1200);
    } catch (err) {
      setErrorMessage(err.message || 'Submission failed. Please check required fields.');
    } finally {
      setSubmitting(false);
    }
  };

  // Stepper Definition
  const steps = [
    { id: 1, name: 'Personal Info', icon: User },
    { id: 2, name: 'Professional Info', icon: Briefcase },
    { id: 3, name: 'Education', icon: GraduationCap },
    { id: 4, name: 'Teaching Experience', icon: Video },
    { id: 5, name: 'Courses & Expertise', icon: Award },
    { id: 6, name: 'Documents', icon: FileText },
    { id: 7, name: 'Review & Submit', icon: CheckCircle2 }
  ];

  if (loading) {
    return (
      <div className="instructor-application-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <RefreshCw size={32} className="spinner-icon" style={{ color: 'var(--brand-primary)' }} />
          <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Loading your application...
          </span>
        </div>
      </div>
    );
  }

  const photoFullUrl = formData.personalInfo.photoUrl
    ? (formData.personalInfo.photoUrl.startsWith('http')
        ? formData.personalInfo.photoUrl
        : `http://localhost:5000${formData.personalInfo.photoUrl}`)
    : '';

  return (
    <div className="instructor-application-page">
      {/* Sticky Navigation Header */}
      <header className="app-header-nav">
        <div className="app-header-container">
          <a
            href="/"
            className="app-brand"
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
          >
            <div className="app-brand-icon-box">
              <BookOpen size={22} />
            </div>
            <span className="app-brand-title">UpSkillr Studio</span>
          </a>

          <div className="app-header-right">
            {/* Live Auto-Save Status Badge */}
            <div className={`autosave-status-badge ${autoSaveStatus}`}>
              {autoSaveStatus === 'saving' && (
                <>
                  <RefreshCw size={14} className="spinner-icon" />
                  <span>Saving...</span>
                </>
              )}
              {autoSaveStatus === 'saved' && (
                <>
                  <Check size={14} />
                  <span>Saved just now</span>
                </>
              )}
              {autoSaveStatus === 'error' && (
                <>
                  <AlertCircle size={14} />
                  <span>Unable to save</span>
                </>
              )}
              {autoSaveStatus === 'idle' && (
                <>
                  <Save size={14} />
                  <span>Auto-save enabled</span>
                </>
              )}
            </div>

            <button type="button" className="btn-save-exit" onClick={handleSaveAndExit}>
              <LogOut size={16} />
              <span>Save & Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="app-main-layout">
        {/* Left Column: Stepper Sidebar Timeline */}
        <aside className="app-stepper-sidebar">
          <div className="stepper-header">
            <h2 className="stepper-title">Instructor Application</h2>
            <p className="stepper-subtitle">Complete all steps to unlock Dashboard access</p>

            <div className="stepper-progress-bar-bg">
              <div
                className="stepper-progress-bar-fill"
                style={{ width: `${Math.round((activeStep / 7) * 100)}%` }}
              />
            </div>
          </div>

          <ul className="stepper-list">
            {steps.map((step) => {
              const StepIcon = step.icon;
              const isCompleted = activeStep > step.id;
              const isActive = activeStep === step.id;

              return (
                <li
                  key={step.id}
                  className={`stepper-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  onClick={() => setActiveStep(step.id)}
                >
                  <div className="stepper-icon-box">
                    {isCompleted ? <Check size={16} strokeWidth={3} /> : <StepIcon size={16} />}
                  </div>
                  <div className="stepper-info">
                    <span className="stepper-step-label">Step {step.id}</span>
                    <span className="stepper-step-name">{step.name}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Right Column: Active Form Section */}
        <section className="app-form-workspace">
          {/* Global Alert Banners */}
          {errorMessage && (
            <div className="app-alert-banner error">
              <AlertCircle size={20} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="app-alert-banner success">
              <CheckCircle2 size={20} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* STEP 1: Personal Information */}
          {activeStep === 1 && (
            <div className="form-section-content">
              <div className="form-section-header">
                <span className="section-badge">Section 1 of 7</span>
                <h1 className="section-title">Personal Information</h1>
                <p className="section-subtitle">Introduce yourself and setup your professional instructor profile.</p>
              </div>

              {/* Profile Photo Uploader Card with Default Profile Icon */}
              <div className="photo-uploader-card">
                <div className="profile-avatar-wrapper">
                  {photoFullUrl ? (
                    <img src={photoFullUrl} alt="Instructor Profile" className="profile-avatar-img" />
                  ) : (
                    <User size={40} />
                  )}
                </div>

                <div className="photo-uploader-info">
                  <span className="photo-title">Profile Photo</span>
                  <span className="photo-desc">
                    {photoFullUrl
                      ? 'Custom profile photo uploaded. You can replace or remove it.'
                      : 'No photo uploaded. Default professional profile icon is shown.'}
                  </span>

                  <div className="photo-actions-row">
                    <input
                      type="file"
                      ref={photoInputRef}
                      accept="image/png,image/jpeg,image/webp"
                      style={{ display: 'none' }}
                      onChange={handlePhotoUpload}
                    />

                    <button
                      type="button"
                      className="btn-upload-action"
                      onClick={() => photoInputRef.current?.click()}
                    >
                      <Upload size={15} />
                      <span>{photoFullUrl ? 'Replace Photo' : 'Upload Photo'}</span>
                    </button>

                    {photoFullUrl && (
                      <button
                        type="button"
                        className="btn-remove-action"
                        onClick={handleRemovePhoto}
                      >
                        <Trash2 size={15} />
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-grid-2col">
                <div className="form-group-field">
                  <label className="field-label">Full Name <span className="required-star">*</span></label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. Dr. Alex Morgan"
                    value={formData.personalInfo.fullName}
                    onChange={(e) => handleInputChange('personalInfo', 'fullName', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-field">
                  <label className="field-label">Email Address <span className="required-star">*</span></label>
                  <input
                    type="email"
                    className="field-input"
                    value={formData.personalInfo.email}
                    onChange={(e) => handleInputChange('personalInfo', 'email', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2col">
                <div className="form-group-field">
                  <label className="field-label">Phone Number <span className="required-star">*</span></label>
                  <input
                    type="tel"
                    className="field-input"
                    placeholder="+1 (555) 000-0000"
                    value={formData.personalInfo.phone}
                    onChange={(e) => handleInputChange('personalInfo', 'phone', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-field">
                  <label className="field-label">Professional Title <span className="required-star">*</span></label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. Senior Software Architect & Tech Lead"
                    value={formData.personalInfo.professionalTitle}
                    onChange={(e) => handleInputChange('personalInfo', 'professionalTitle', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group-field">
                <label className="field-label">Location / Country</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. San Francisco, CA, USA"
                  value={formData.personalInfo.location}
                  onChange={(e) => handleInputChange('personalInfo', 'location', e.target.value)}
                />
              </div>

              <div className="form-group-field">
                <label className="field-label">Short Instructor Bio</label>
                <textarea
                  className="field-textarea"
                  placeholder="Write a brief intro highlighting your background, expertise, and teaching philosophy..."
                  value={formData.personalInfo.bio}
                  onChange={(e) => handleInputChange('personalInfo', 'bio', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Professional Information */}
          {activeStep === 2 && (
            <div className="form-section-content">
              <div className="form-section-header">
                <span className="section-badge">Section 2 of 7</span>
                <h1 className="section-title">Professional Information</h1>
                <p className="section-subtitle">Share your current industry experience, achievements, and technical background.</p>
              </div>

              <div className="form-grid-2col">
                <div className="form-group-field">
                  <label className="field-label">Current Role / Position <span className="required-star">*</span></label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. Staff Engineer, University Professor"
                    value={formData.professionalInfo.currentRole}
                    onChange={(e) => handleInputChange('professionalInfo', 'currentRole', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-field">
                  <label className="field-label">Company / Institution</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. Google, MIT, Freelance"
                    value={formData.professionalInfo.organization}
                    onChange={(e) => handleInputChange('professionalInfo', 'organization', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grid-2col">
                <div className="form-group-field">
                  <label className="field-label">Years of Industry Experience <span className="required-star">*</span></label>
                  <select
                    className="field-select"
                    value={formData.professionalInfo.yearsOfExperience}
                    onChange={(e) => handleInputChange('professionalInfo', 'yearsOfExperience', e.target.value)}
                  >
                    <option value="1-3 years">1 - 3 Years</option>
                    <option value="3-5 years">3 - 5 Years</option>
                    <option value="5-10 years">5 - 10 Years</option>
                    <option value="10+ years">10+ Years</option>
                  </select>
                </div>

                <div className="form-group-field">
                  <label className="field-label">LinkedIn Profile URL</label>
                  <input
                    type="url"
                    className="field-input"
                    placeholder="https://linkedin.com/in/username"
                    value={formData.professionalInfo.linkedinUrl}
                    onChange={(e) => handleInputChange('professionalInfo', 'linkedinUrl', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group-field">
                <label className="field-label">Website / Portfolio URL</label>
                <input
                  type="url"
                  className="field-input"
                  placeholder="https://yourportfolio.com"
                  value={formData.professionalInfo.websiteUrl}
                  onChange={(e) => handleInputChange('professionalInfo', 'websiteUrl', e.target.value)}
                />
              </div>

              {/* LinkedIn-Style Key Technical Skills Tag Input */}
              <div className="form-group-field">
                <label className="field-label">Key Technical Skills & Expertise</label>
                <div className="skills-tag-container">
                  {(formData.professionalInfo.keySkills || []).map((skill, idx) => (
                    <span key={idx} className="skill-tag-chip">
                      <span>{skill}</span>
                      <button
                        type="button"
                        className="skill-tag-remove-btn"
                        onClick={() => handleRemoveSkill(idx)}
                        title="Remove skill"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}

                  <input
                    type="text"
                    className="skills-tag-input"
                    placeholder={
                      (formData.professionalInfo.keySkills || []).length === 0
                        ? 'Type a skill (e.g. React) and press Enter...'
                        : 'Type a skill...'
                    }
                    value={skillInputValue}
                    onChange={(e) => setSkillInputValue(e.target.value)}
                    onKeyDown={handleSkillKeyDown}
                    onBlur={() => {
                      if (skillInputValue.trim()) {
                        handleAddSkill(skillInputValue);
                      }
                    }}
                  />
                </div>
                <span className="field-hint">Press Enter or comma to create a skill tag. Press Backspace to remove last tag.</span>
              </div>
            </div>
          )}

          {/* STEP 3: Education */}
          {activeStep === 3 && (
            <div className="form-section-content">
              <div className="form-section-header">
                <span className="section-badge">Section 3 of 7</span>
                <h1 className="section-title">Education & Qualifications</h1>
                <p className="section-subtitle">Provide details regarding your academic qualifications.</p>
              </div>

              <div className="form-grid-2col">
                <div className="form-group-field">
                  <label className="field-label">Highest Degree / Qualification <span className="required-star">*</span></label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. Bachelor of Science, Master of Computer Applications, PhD"
                    value={formData.education.degree}
                    onChange={(e) => handleInputChange('education', 'degree', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-field">
                  <label className="field-label">Field of Study</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. Computer Science, Information Technology"
                    value={formData.education.fieldOfStudy}
                    onChange={(e) => handleInputChange('education', 'fieldOfStudy', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grid-2col">
                <div className="form-group-field">
                  <label className="field-label">University / Institution <span className="required-star">*</span></label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. Stanford University, IIT Delhi"
                    value={formData.education.institution}
                    onChange={(e) => handleInputChange('education', 'institution', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-field">
                  <label className="field-label">Graduation Year</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. 2020"
                    value={formData.education.graduationYear}
                    onChange={(e) => handleInputChange('education', 'graduationYear', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Teaching Experience */}
          {activeStep === 4 && (
            <div className="form-section-content">
              <div className="form-section-header">
                <span className="section-badge">Section 4 of 7</span>
                <h1 className="section-title">Teaching Experience</h1>
                <p className="section-subtitle">Tell us about your previous teaching, mentoring, or public speaking experience.</p>
              </div>

              <div className="form-grid-2col">
                <div className="form-group-field">
                  <label className="field-label">Prior Teaching Experience <span className="required-star">*</span></label>
                  <select
                    className="field-select"
                    value={formData.teachingExperience.priorExperience}
                    onChange={(e) => handleInputChange('teachingExperience', 'priorExperience', e.target.value)}
                  >
                    <option value="Yes, online & offline">Yes, online & offline</option>
                    <option value="Yes, online courses only">Yes, online courses only</option>
                    <option value="Yes, university / classroom bootcamp">Yes, university / classroom bootcamp</option>
                    <option value="No prior formal teaching (First time educator)">No prior formal teaching (First time educator)</option>
                  </select>
                </div>

                <div className="form-group-field">
                  <label className="field-label">Target Student Level</label>
                  <select
                    className="field-select"
                    value={formData.teachingExperience.targetStudentLevel}
                    onChange={(e) => handleInputChange('teachingExperience', 'targetStudentLevel', e.target.value)}
                  >
                    <option value="Beginner to Intermediate">Beginner to Intermediate</option>
                    <option value="Absolute Beginners">Absolute Beginners</option>
                    <option value="Advanced Professionals">Advanced Professionals</option>
                    <option value="All Levels">All Levels</option>
                  </select>
                </div>
              </div>

              <div className="form-group-field">
                <label className="field-label">Preferred Teaching Style</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Practical hands-on projects, step-by-step code walkthroughs"
                  value={formData.teachingExperience.preferredTeachingStyle}
                  onChange={(e) => handleInputChange('teachingExperience', 'preferredTeachingStyle', e.target.value)}
                />
              </div>

              <div className="form-group-field">
                <label className="field-label">Sample Video / Demo Teaching Link (YouTube/Vimeo/Drive)</label>
                <input
                  type="url"
                  className="field-input"
                  placeholder="https://youtube.com/watch?v=example"
                  value={formData.teachingExperience.sampleVideoUrl}
                  onChange={(e) => handleInputChange('teachingExperience', 'sampleVideoUrl', e.target.value)}
                />
                <span className="field-hint">Optional, but helps speed up application review.</span>
              </div>
            </div>
          )}

          {/* STEP 5: Courses & Expertise */}
          {activeStep === 5 && (
            <div className="form-section-content">
              <div className="form-section-header">
                <span className="section-badge">Section 5 of 7</span>
                <h1 className="section-title">Proposed Courses & Expertise</h1>
                <p className="section-subtitle">Outline the primary topic, proposed course, and structured certifications.</p>
              </div>

              <div className="form-group-field">
                <label className="field-label">Primary Teaching Category <span className="required-star">*</span></label>
                <select
                  className="field-select"
                  value={formData.coursesExpertise.primaryCategory}
                  onChange={(e) => handleInputChange('coursesExpertise', 'primaryCategory', e.target.value)}
                >
                  <option value="Web Development">Web Development</option>
                  <option value="Data Science & AI">Data Science & AI</option>
                  <option value="Mobile Development">Mobile Development</option>
                  <option value="Cloud Computing & DevOps">Cloud Computing & DevOps</option>
                  <option value="UI/UX Design">UI/UX Design</option>
                  <option value="Cybersecurity">Cybersecurity</option>
                </select>
              </div>

              <div className="form-group-field">
                <label className="field-label">Proposed First Course Title <span className="required-star">*</span></label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Full-Stack Web Development Bootcamp 2026"
                  value={formData.coursesExpertise.proposedCourseTitle}
                  onChange={(e) => handleInputChange('coursesExpertise', 'proposedCourseTitle', e.target.value)}
                  required
                />
              </div>

              <div className="form-group-field">
                <label className="field-label">Proposed Course Description</label>
                <textarea
                  className="field-textarea"
                  placeholder="Summarize what learners will achieve and build in your course..."
                  value={formData.coursesExpertise.proposedCourseDesc}
                  onChange={(e) => handleInputChange('coursesExpertise', 'proposedCourseDesc', e.target.value)}
                />
              </div>

              {/* LinkedIn-Style Structured Certifications Section */}
              <div className="certifications-section-container">
                <div className="field-label" style={{ marginBottom: '0.65rem', fontSize: '1rem', fontWeight: 700 }}>
                  Certifications
                </div>

                <div className="certifications-list">
                  {(formData.coursesExpertise.certifications || []).map((cert, idx) => (
                    <div key={idx} className="certification-card">
                      <div className="cert-info-main">
                        <span className="cert-name">{cert.name}</span>
                        <span className="cert-org">{cert.issuingOrganization}</span>
                        <span className="cert-dates">
                          {cert.issueDate ? `Issued ${cert.issueDate}` : ''}
                          {cert.doesNotExpire
                            ? ' · No expiration'
                            : cert.expirationDate
                            ? ` · Expires ${cert.expirationDate}`
                            : ''}
                        </span>
                        {cert.credentialId && (
                          <span className="cert-dates" style={{ marginTop: '0.15rem' }}>
                            Credential ID: {cert.credentialId}
                          </span>
                        )}
                        {cert.credentialUrl && (
                          <a
                            href={cert.credentialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="cert-dates"
                            style={{ color: 'var(--brand-primary)', textDecoration: 'underline', marginTop: '0.15rem' }}
                          >
                            See credential
                          </a>
                        )}
                      </div>

                      <div className="cert-actions">
                        <button
                          type="button"
                          className="btn-upload-action"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          onClick={() => handleOpenCertModal(idx)}
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          className="btn-remove-action"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          onClick={() => handleRemoveCert(idx)}
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn-add-cert"
                  onClick={() => handleOpenCertModal()}
                >
                  <Plus size={16} />
                  <span>Add Certification</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Documents */}
          {activeStep === 6 && (
            <div className="form-section-content">
              <div className="form-section-header">
                <span className="section-badge">Section 6 of 7</span>
                <h1 className="section-title">Documents & Credentials</h1>
                <p className="section-subtitle">Provide identification reference and upload your resume from your device.</p>
              </div>

              {/* Native Device Resume File Uploader Card */}
              <div className="resume-uploader-card">
                <input
                  type="file"
                  ref={resumeInputRef}
                  accept=".pdf,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={handleResumeUpload}
                />

                {formData.documents.resume?.url ? (
                  <div className="resume-attached-box">
                    <div className="resume-file-info">
                      <div className="resume-icon-circle">
                        <FileText size={22} />
                      </div>
                      <div>
                        <div className="resume-file-name">
                          {formData.documents.resume.originalName || 'Uploaded Resume'}
                        </div>
                        <div className="resume-file-size">
                          {formatFileSize(formData.documents.resume.size)}
                        </div>
                      </div>
                    </div>

                    <div className="resume-actions-group">
                      <a
                        href={
                          formData.documents.resume.url.startsWith('http')
                            ? formData.documents.resume.url
                            : `http://localhost:5000${formData.documents.resume.url}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="btn-upload-action"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.825rem', textDecoration: 'none' }}
                      >
                        <ExternalLink size={14} />
                        <span>View</span>
                      </a>

                      <button
                        type="button"
                        className="btn-upload-action"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.825rem' }}
                        onClick={() => resumeInputRef.current?.click()}
                      >
                        <Upload size={14} />
                        <span>Replace</span>
                      </button>

                      <button
                        type="button"
                        className="btn-remove-action"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.825rem' }}
                        onClick={handleRemoveResume}
                      >
                        <Trash2 size={14} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="resume-empty-box">
                    <div className="resume-icon-circle">
                      <FileText size={24} />
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Resume / CV</span>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      Upload PDF, DOC, or DOCX document (Max 10MB)
                    </span>
                    <button
                      type="button"
                      className="btn-upload-action"
                      style={{ marginTop: '0.5rem' }}
                      onClick={() => resumeInputRef.current?.click()}
                    >
                      <Upload size={15} />
                      <span>Upload Resume</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group-field">
                <label className="field-label">Govt ID / Passport Reference <span className="required-star">*</span></label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. ID-987654321 or Document Reference Number"
                  value={formData.documents.idDocumentRef}
                  onChange={(e) => handleInputChange('documents', 'idDocumentRef', e.target.value)}
                  required
                />
              </div>

              <div className="form-group-field">
                <label className="field-label">Additional Notes for Review Team</label>
                <textarea
                  className="field-textarea"
                  placeholder="Any additional info or requests for the UpSkillr instructor onboarding team..."
                  value={formData.documents.additionalNotes}
                  onChange={(e) => handleInputChange('documents', 'additionalNotes', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 7: Review & Submit */}
          {activeStep === 7 && (
            <div className="form-section-content">
              <div className="form-section-header">
                <span className="section-badge">Section 7 of 7</span>
                <h1 className="section-title">Review & Submit Application</h1>
                <p className="section-subtitle">Please review your information below before submitting your application.</p>
              </div>

              <div className="review-summary-container">
                {/* 1. Personal Info Summary */}
                <div className="review-section-card">
                  <div className="review-card-header">
                    <span className="review-card-title">
                      <CheckCircle2 size={18} style={{ color: 'var(--brand-primary)' }} />
                      Personal Information
                    </span>
                    <button type="button" className="review-edit-btn" onClick={() => setActiveStep(1)}>Edit</button>
                  </div>
                  <div className="review-card-grid">
                    <div className="review-field-item">
                      <span className="review-field-label">Full Name</span>
                      <span className="review-field-val">{formData.personalInfo.fullName || '—'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Email</span>
                      <span className="review-field-val">{formData.personalInfo.email || '—'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Phone</span>
                      <span className="review-field-val">{formData.personalInfo.phone || '—'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Title</span>
                      <span className="review-field-val">{formData.personalInfo.professionalTitle || '—'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Profile Photo</span>
                      <span className="review-field-val">
                        {formData.personalInfo.photoUrl ? 'Uploaded Photo' : 'Default Profile Icon'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Professional Info Summary */}
                <div className="review-section-card">
                  <div className="review-card-header">
                    <span className="review-card-title">
                      <CheckCircle2 size={18} style={{ color: 'var(--brand-primary)' }} />
                      Professional Information
                    </span>
                    <button type="button" className="review-edit-btn" onClick={() => setActiveStep(2)}>Edit</button>
                  </div>
                  <div className="review-card-grid">
                    <div className="review-field-item">
                      <span className="review-field-label">Current Role</span>
                      <span className="review-field-val">{formData.professionalInfo.currentRole || '—'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Experience</span>
                      <span className="review-field-val">{formData.professionalInfo.yearsOfExperience || '—'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Technical Skills</span>
                      <span className="review-field-val">
                        {(formData.professionalInfo.keySkills || []).length > 0
                          ? formData.professionalInfo.keySkills.join(', ')
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Education Summary */}
                <div className="review-section-card">
                  <div className="review-card-header">
                    <span className="review-card-title">
                      <CheckCircle2 size={18} style={{ color: 'var(--brand-primary)' }} />
                      Education
                    </span>
                    <button type="button" className="review-edit-btn" onClick={() => setActiveStep(3)}>Edit</button>
                  </div>
                  <div className="review-card-grid">
                    <div className="review-field-item">
                      <span className="review-field-label">Degree</span>
                      <span className="review-field-val">{formData.education.degree || '—'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Institution</span>
                      <span className="review-field-val">{formData.education.institution || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Teaching Experience Summary */}
                <div className="review-section-card">
                  <div className="review-card-header">
                    <span className="review-card-title">
                      <CheckCircle2 size={18} style={{ color: 'var(--brand-primary)' }} />
                      Teaching Experience
                    </span>
                    <button type="button" className="review-edit-btn" onClick={() => setActiveStep(4)}>Edit</button>
                  </div>
                  <div className="review-card-grid">
                    <div className="review-field-item">
                      <span className="review-field-label">Prior Experience</span>
                      <span className="review-field-val">{formData.teachingExperience.priorExperience || '—'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Student Level</span>
                      <span className="review-field-val">{formData.teachingExperience.targetStudentLevel || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* 5. Courses & Expertise Summary */}
                <div className="review-section-card">
                  <div className="review-card-header">
                    <span className="review-card-title">
                      <CheckCircle2 size={18} style={{ color: 'var(--brand-primary)' }} />
                      Courses & Expertise
                    </span>
                    <button type="button" className="review-edit-btn" onClick={() => setActiveStep(5)}>Edit</button>
                  </div>
                  <div className="review-card-grid">
                    <div className="review-field-item">
                      <span className="review-field-label">Category</span>
                      <span className="review-field-val">{formData.coursesExpertise.primaryCategory || '—'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Proposed Title</span>
                      <span className="review-field-val">{formData.coursesExpertise.proposedCourseTitle || '—'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Certifications</span>
                      <span className="review-field-val">
                        {(formData.coursesExpertise.certifications || []).length > 0
                          ? `${formData.coursesExpertise.certifications.length} Certifications Added`
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. Documents Summary */}
                <div className="review-section-card">
                  <div className="review-card-header">
                    <span className="review-card-title">
                      <CheckCircle2 size={18} style={{ color: 'var(--brand-primary)' }} />
                      Documents
                    </span>
                    <button type="button" className="review-edit-btn" onClick={() => setActiveStep(6)}>Edit</button>
                  </div>
                  <div className="review-card-grid">
                    <div className="review-field-item">
                      <span className="review-field-label">ID Document Ref</span>
                      <span className="review-field-val">{formData.documents.idDocumentRef || '—'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Resume</span>
                      <span className="review-field-val">
                        {formData.documents.resume?.url
                          ? formData.documents.resume.originalName || 'Attached PDF/DOC'
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions Footer Bar */}
          <div className="form-actions-bar">
            {activeStep > 1 ? (
              <button type="button" className="btn-secondary-prev" onClick={handleBack}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
            ) : <div />}

            {activeStep < 7 ? (
              <button type="button" className="btn-primary-next" onClick={handleSaveAndContinue}>
                <span>Save & Continue</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary-next"
                onClick={handleSubmitApplication}
                disabled={submitting}
              >
                {submitting ? (
                  <span>Submitting Application...</span>
                ) : (
                  <>
                    <span>Submit Application</span>
                    <CheckCircle2 size={18} />
                  </>
                )}
              </button>
            )}
          </div>
        </section>
      </main>

      {/* Certification Add/Edit Modal */}
      {showCertModal && (
        <div className="cert-modal-backdrop" onClick={() => setShowCertModal(false)}>
          <div className="cert-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="cert-modal-header">
              <h3 className="cert-modal-title">
                {editingCertIndex !== null ? 'Edit Certification' : 'Add Certification'}
              </h3>
              <button
                type="button"
                className="skill-tag-remove-btn"
                style={{ width: 24, height: 24 }}
                onClick={() => setShowCertModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="form-group-field">
              <label className="field-label">Certification Name <span className="required-star">*</span></label>
              <input
                type="text"
                className="field-input"
                placeholder="e.g. AWS Certified Developer"
                value={certForm.name}
                onChange={(e) => setCertForm({ ...certForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group-field">
              <label className="field-label">Issuing Organization <span className="required-star">*</span></label>
              <input
                type="text"
                className="field-input"
                placeholder="e.g. Amazon Web Services"
                value={certForm.issuingOrganization}
                onChange={(e) => setCertForm({ ...certForm, issuingOrganization: e.target.value })}
                required
              />
            </div>

            <div className="form-grid-2col">
              <div className="form-group-field">
                <label className="field-label">Issue Date</label>
                <input
                  type="date"
                  className="field-input"
                  value={certForm.issueDate}
                  onChange={(e) => setCertForm({ ...certForm, issueDate: e.target.value })}
                />
              </div>

              {!certForm.doesNotExpire && (
                <div className="form-group-field">
                  <label className="field-label">Expiration Date</label>
                  <input
                    type="date"
                    className="field-input"
                    value={certForm.expirationDate}
                    onChange={(e) => setCertForm({ ...certForm, expirationDate: e.target.value })}
                  />
                </div>
              )}
            </div>

            <label className="checkbox-label-row">
              <input
                type="checkbox"
                checked={certForm.doesNotExpire}
                onChange={(e) =>
                  setCertForm({
                    ...certForm,
                    doesNotExpire: e.target.checked,
                    expirationDate: e.target.checked ? '' : certForm.expirationDate
                  })
                }
              />
              <span>This credential does not expire</span>
            </label>

            <div className="form-grid-2col" style={{ marginTop: '0.85rem' }}>
              <div className="form-group-field">
                <label className="field-label">Credential ID</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. ABC123456"
                  value={certForm.credentialId}
                  onChange={(e) => setCertForm({ ...certForm, credentialId: e.target.value })}
                />
              </div>

              <div className="form-group-field">
                <label className="field-label">Credential URL</label>
                <input
                  type="url"
                  className="field-input"
                  placeholder="https://example.com/verify/ABC123456"
                  value={certForm.credentialUrl}
                  onChange={(e) => setCertForm({ ...certForm, credentialUrl: e.target.value })}
                />
              </div>
            </div>

            <div className="form-actions-bar" style={{ marginTop: '1.5rem', paddingTop: '1rem' }}>
              <button
                type="button"
                className="btn-secondary-prev"
                onClick={() => setShowCertModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary-next"
                onClick={handleSaveCert}
              >
                Save Certification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
