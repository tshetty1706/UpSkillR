import React, { useState, useEffect, useRef } from 'react';
import {
  UserCheck, Mail, Shield, Save, User, Camera,
  Briefcase, GraduationCap, Award, FileText, ExternalLink,
  Lock, KeyRound, CheckCircle2, Clock, Plus, X, Globe, Building,
  AlertCircle, Edit3, Eye, EyeOff, ArrowRight, Download,
  Upload, Trash2, Check, FileCheck
} from 'lucide-react';
import './InstructorProfile.css';
import { Avatar } from '../../../common/Avatar/Avatar';
import { useToast } from '../../../../context/ToastContext';
import { API_BASE } from '../../../../config/api';

// Helper to format file sizes consistently
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const InstructorProfile = ({ user }) => {
  const { toast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState('profile'); // 'profile' | 'qualifications' | 'settings'
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingQualifications, setSavingQualifications] = useState(false);

  // Qualifications edit mode toggle
  const [isEditingQualifications, setIsEditingQualifications] = useState(false);

  // Document preview modal state
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    url: '',
    title: ''
  });

  // Certificate Add/Edit Modal state
  const [certModal, setCertModal] = useState({
    isOpen: false,
    index: null,
    name: '',
    issuingOrganization: '',
    issueDate: '',
    expirationDate: '',
    doesNotExpire: true,
    credentialId: '',
    credentialUrl: '',
    certificateFile: { url: '', originalName: '', size: 0, mimeType: '' },
    isUploading: false,
    error: ''
  });
  const certFileInputRef = useRef(null);
  const resumeFileInputRef = useRef(null);
  const [resumeUploading, setResumeUploading] = useState(false);

  // Active editable profile state
  const [profile, setProfile] = useState({
    fullName: user?.fullName || 'Instructor',
    email: user?.email || '',
    avatar: user?.avatar || '',
    designation: user?.designation || user?.specialization || 'Software Engineering & Web Development',
    bio: user?.bio || 'Passionate instructor building engaging, skill-focused online courses on UpSkillr.',
    keySkills: user?.keySkills || [],
    authProvider: user?.authProvider || 'local',
    isVerified: user?.isVerified || false,
    createdAt: user?.createdAt || null,
    passwordChangedAt: user?.passwordChangedAt || null
  });

  // Submitted Application snapshot state
  const [application, setApplication] = useState(null);

  // Qualifications editable form state
  const [qualForm, setQualForm] = useState({
    currentRole: '',
    organization: '',
    yearsOfExperience: '',
    linkedinUrl: '',
    websiteUrl: '',
    keySkills: [],
    degree: '',
    fieldOfStudy: '',
    institution: '',
    graduationYear: '',
    priorExperience: '',
    targetStudentLevel: '',
    primaryTeachingStyles: [],
    certifications: [],
    resume: { url: '', originalName: '', size: 0, mimeType: '' },
    idDocumentRef: ''
  });

  // Skill input state for adding tags to Active Profile
  const [newSkillInput, setNewSkillInput] = useState('');

  // Skill input state for adding tags to Qualifications
  const [newQualSkillInput, setNewQualSkillInput] = useState('');

  // Multi-step Password Update (Mirrors Forgot Password Flow)
  const [passwordStep, setPasswordStep] = useState(1); // 1 = Request OTP, 2 = Verify OTP & Set Password, 3 = Success
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  const otpInputsRef = useRef([]);

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (otpCooldown > 0) {
      timer = setInterval(() => {
        setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Fetch full combined instructor profile and application snapshot
  useEffect(() => {
    fetchProfileAndApplication();
  }, [user]);

  const fetchProfileAndApplication = async () => {
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/auth/instructor/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success && data.profile) {
        setProfile({
          fullName: data.profile.fullName || '',
          email: data.profile.email || '',
          avatar: data.profile.avatar || '',
          designation: data.profile.designation || data.profile.specialization || '',
          bio: data.profile.bio || '',
          keySkills: data.profile.keySkills || [],
          authProvider: data.profile.authProvider || 'local',
          isVerified: Boolean(data.profile.isVerified),
          createdAt: data.profile.createdAt || null,
          passwordChangedAt: data.profile.passwordChangedAt || null
        });

        if (data.application) {
          setApplication(data.application);
          setQualForm({
            currentRole: data.application.professionalInfo?.currentRole || '',
            organization: data.application.professionalInfo?.organization || '',
            yearsOfExperience: data.application.professionalInfo?.yearsOfExperience || '',
            linkedinUrl: data.application.professionalInfo?.linkedinUrl || '',
            websiteUrl: data.application.professionalInfo?.websiteUrl || '',
            keySkills: data.application.professionalInfo?.keySkills || [],
            degree: data.application.education?.degree || '',
            fieldOfStudy: data.application.education?.fieldOfStudy || '',
            institution: data.application.education?.institution || '',
            graduationYear: data.application.education?.graduationYear || '',
            priorExperience: data.application.teachingExperience?.priorExperience || '',
            targetStudentLevel: data.application.teachingExperience?.targetStudentLevel || '',
            primaryTeachingStyles: data.application.teachingExperience?.primaryTeachingStyles || [],
            certifications: Array.isArray(data.application.coursesExpertise?.certifications)
              ? data.application.coursesExpertise.certifications
              : [],
            resume: data.application.documents?.resume || { url: '', originalName: '', size: 0, mimeType: '' },
            idDocumentRef: data.application.documents?.idDocumentRef || ''
          });
        }
      } else if (user) {
        // Fallback to prop
        setProfile((prev) => ({
          ...prev,
          fullName: user.fullName || prev.fullName,
          email: user.email || prev.email,
          avatar: user.avatar || prev.avatar,
          designation: user.designation || user.specialization || prev.designation,
          bio: user.bio || prev.bio,
          keySkills: user.keySkills || prev.keySkills
        }));
      }
    } catch (err) {
      console.error('Error fetching instructor profile details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add skill to Active Profile
  const handleAddSkill = (e) => {
    if (e) e.preventDefault();
    const clean = newSkillInput.trim();
    if (!clean) return;

    if (profile.keySkills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      toast.info(`"${clean}" is already in your skills list.`);
      setNewSkillInput('');
      return;
    }

    if (profile.keySkills.length >= 25) {
      toast.warning('Maximum 25 key skills reached.');
      return;
    }

    setProfile((prev) => ({
      ...prev,
      keySkills: [...prev.keySkills, clean]
    }));
    setNewSkillInput('');
  };

  // Remove skill from Active Profile
  const handleRemoveSkill = (skillToRemove) => {
    setProfile((prev) => ({
      ...prev,
      keySkills: prev.keySkills.filter((s) => s !== skillToRemove)
    }));
  };

  // Add skill to Qualifications Form
  const handleAddQualSkill = (e) => {
    if (e) e.preventDefault();
    const clean = newQualSkillInput.trim();
    if (!clean) return;

    if (qualForm.keySkills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      toast.info(`"${clean}" is already in skills list.`);
      setNewQualSkillInput('');
      return;
    }

    setQualForm((prev) => ({
      ...prev,
      keySkills: [...prev.keySkills, clean]
    }));
    setNewQualSkillInput('');
  };

  // Remove skill from Qualifications Form
  const handleRemoveQualSkill = (skillToRemove) => {
    setQualForm((prev) => ({
      ...prev,
      keySkills: prev.keySkills.filter((s) => s !== skillToRemove)
    }));
  };

  // Save active profile changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.fullName.trim()) {
      toast.error('Full name is required.');
      return;
    }

    setSavingProfile(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: profile.fullName.trim(),
          bio: profile.bio.trim(),
          designation: profile.designation.trim(),
          specialization: profile.designation.trim(),
          keySkills: profile.keySkills
        })
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Profile changes saved successfully!');
        localStorage.removeItem('upskillr_user');
        const storedUser = sessionStorage.getItem('upskillr_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.fullName = data.user.fullName;
            parsed.bio = data.user.bio;
            parsed.designation = data.user.designation;
            parsed.specialization = data.user.designation;
            parsed.keySkills = data.user.keySkills;
            sessionStorage.setItem('upskillr_user', JSON.stringify(parsed));
          } catch (err) {}
        }
        window.dispatchEvent(new Event('upskillr_user_updated'));
      } else {
        toast.error(data.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error('Failed to save profile changes.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Save updated qualifications, credentials & documents
  const handleSaveQualifications = async (e) => {
    e.preventDefault();
    setSavingQualifications(true);

    try {
      const token = sessionStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/instructor/application`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          professionalInfo: {
            ...(application?.professionalInfo || {}),
            currentRole: qualForm.currentRole.trim(),
            organization: qualForm.organization.trim(),
            yearsOfExperience: qualForm.yearsOfExperience.trim(),
            linkedinUrl: qualForm.linkedinUrl.trim(),
            websiteUrl: qualForm.websiteUrl.trim(),
            keySkills: qualForm.keySkills
          },
          education: {
            ...(application?.education || {}),
            degree: qualForm.degree.trim(),
            fieldOfStudy: qualForm.fieldOfStudy.trim(),
            institution: qualForm.institution.trim(),
            graduationYear: qualForm.graduationYear.trim()
          },
          teachingExperience: {
            ...(application?.teachingExperience || {}),
            priorExperience: qualForm.priorExperience.trim(),
            targetStudentLevel: qualForm.targetStudentLevel.trim(),
            primaryTeachingStyles: qualForm.primaryTeachingStyles
          },
          coursesExpertise: {
            ...(application?.coursesExpertise || {}),
            certifications: qualForm.certifications || []
          },
          documents: {
            ...(application?.documents || {}),
            resume: qualForm.resume || { url: '', originalName: '', size: 0, mimeType: '' },
            idDocumentRef: (qualForm.idDocumentRef || '').trim()
          }
        })
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Qualifications, certificates & documents updated successfully!');
        setIsEditingQualifications(false);
        fetchProfileAndApplication();
      } else {
        toast.error(data.message || 'Failed to update qualifications.');
      }
    } catch (err) {
      console.error('Error saving qualifications:', err);
      toast.error('Failed to save qualifications.');
    } finally {
      setSavingQualifications(false);
    }
  };

  // Cancel qualifications editing
  const handleCancelQualificationsEdit = () => {
    if (application) {
      setQualForm({
        currentRole: application.professionalInfo?.currentRole || '',
        organization: application.professionalInfo?.organization || '',
        yearsOfExperience: application.professionalInfo?.yearsOfExperience || '',
        linkedinUrl: application.professionalInfo?.linkedinUrl || '',
        websiteUrl: application.professionalInfo?.websiteUrl || '',
        keySkills: application.professionalInfo?.keySkills || [],
        degree: application.education?.degree || '',
        fieldOfStudy: application.education?.fieldOfStudy || '',
        institution: application.education?.institution || '',
        graduationYear: application.education?.graduationYear || '',
        priorExperience: application.teachingExperience?.priorExperience || '',
        targetStudentLevel: application.teachingExperience?.targetStudentLevel || '',
        primaryTeachingStyles: application.teachingExperience?.primaryTeachingStyles || [],
        certifications: Array.isArray(application.coursesExpertise?.certifications)
          ? application.coursesExpertise.certifications
          : [],
        resume: application.documents?.resume || { url: '', originalName: '', size: 0, mimeType: '' },
        idDocumentRef: application.documents?.idDocumentRef || ''
      });
    }
    setIsEditingQualifications(false);
  };

  // Open modal to add a brand new certification
  const handleOpenAddCertModal = () => {
    setCertModal({
      isOpen: true,
      index: null,
      name: '',
      issuingOrganization: '',
      issueDate: new Date().toISOString().split('T')[0],
      expirationDate: '',
      doesNotExpire: true,
      credentialId: '',
      credentialUrl: '',
      certificateFile: { url: '', originalName: '', size: 0, mimeType: '' },
      isUploading: false,
      error: ''
    });
  };

  // Open modal to edit existing certification
  const handleOpenEditCertModal = (index) => {
    const cert = qualForm.certifications[index];
    if (!cert) return;
    setCertModal({
      isOpen: true,
      index,
      name: cert.name || '',
      issuingOrganization: cert.issuingOrganization || '',
      issueDate: cert.issueDate || '',
      expirationDate: cert.expirationDate || '',
      doesNotExpire: cert.doesNotExpire ?? true,
      credentialId: cert.credentialId || '',
      credentialUrl: cert.credentialUrl || '',
      certificateFile: cert.certificateFile || { url: '', originalName: '', size: 0, mimeType: '' },
      isUploading: false,
      error: ''
    });
  };

  // Upload certificate file (PDF, PNG, JPG, WEBP)
  const handleCertFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    const isImg = /\.(jpe?g|png|webp)$/i.test(file.name) || file.type.startsWith('image/');
    if (!isPdf && !isImg) {
      toast.error('Only PDF, JPG, PNG, and WEBP certificate files are allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Certificate file size must be less than 10MB.');
      return;
    }

    setCertModal((prev) => ({ ...prev, isUploading: true, error: '' }));
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/instructor/application/upload/certificate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.certificateFile) {
        setCertModal((prev) => ({
          ...prev,
          certificateFile: data.certificateFile,
          isUploading: false
        }));
        toast.success('Certificate document uploaded successfully!');
      } else {
        setCertModal((prev) => ({
          ...prev,
          isUploading: false,
          error: data.message || 'Failed to upload certificate document.'
        }));
        toast.error(data.message || 'Failed to upload certificate document.');
      }
    } catch (err) {
      console.error('Error uploading certificate file:', err);
      setCertModal((prev) => ({
        ...prev,
        isUploading: false,
        error: 'Failed to upload certificate document.'
      }));
      toast.error('Failed to upload certificate document.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Remove certificate file from cert form
  const handleRemoveCertFile = async () => {
    const fileUrl = certModal.certificateFile?.url;
    if (fileUrl) {
      try {
        const token = sessionStorage.getItem('upskillr_token');
        await fetch(`${API_BASE}/instructor/application/upload/certificate`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ url: fileUrl })
        });
      } catch (e) {}
    }
    setCertModal((prev) => ({
      ...prev,
      certificateFile: { url: '', originalName: '', size: 0, mimeType: '' }
    }));
  };

  // Save certificate into qualForm.certifications
  const handleSaveCertModal = () => {
    if (!certModal.name.trim() || !certModal.issuingOrganization.trim()) {
      setCertModal((prev) => ({
        ...prev,
        error: 'Certification Name and Issuing Organization are required.'
      }));
      toast.error('Please enter the certification name and issuing organization.');
      return;
    }

    const updatedCert = {
      name: certModal.name.trim(),
      issuingOrganization: certModal.issuingOrganization.trim(),
      issueDate: certModal.issueDate,
      expirationDate: certModal.expirationDate,
      doesNotExpire: certModal.doesNotExpire,
      credentialId: certModal.credentialId.trim(),
      credentialUrl: certModal.credentialUrl.trim(),
      certificateFile: certModal.certificateFile || { url: '', originalName: '', size: 0, mimeType: '' }
    };

    const currentList = [...(qualForm.certifications || [])];
    if (certModal.index !== null && certModal.index >= 0) {
      currentList[certModal.index] = updatedCert;
    } else {
      currentList.push(updatedCert);
    }

    setQualForm((prev) => ({
      ...prev,
      certifications: currentList
    }));

    setCertModal({
      isOpen: false,
      index: null,
      name: '',
      issuingOrganization: '',
      issueDate: '',
      expirationDate: '',
      doesNotExpire: true,
      credentialId: '',
      credentialUrl: '',
      certificateFile: { url: '', originalName: '', size: 0, mimeType: '' },
      isUploading: false,
      error: ''
    });
    toast.success('Certification saved. Click "Save Qualifications" to persist all changes.');
  };

  // Remove a certification from qualForm.certifications
  const handleRemoveCertification = (indexToRemove) => {
    const updated = (qualForm.certifications || []).filter((_, idx) => idx !== indexToRemove);
    setQualForm((prev) => ({
      ...prev,
      certifications: updated
    }));
    toast.info('Certification removed. Click "Save Qualifications" to persist changes.');
  };

  // Upload / Replace Resume
  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['.pdf', '.doc', '.docx'];
    const isDoc = allowed.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!isDoc) {
      toast.error('Only PDF, DOC, and DOCX resume files are allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Resume file size must be less than 10MB.');
      return;
    }

    setResumeUploading(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/instructor/application/upload/resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.resume) {
        setQualForm((prev) => ({
          ...prev,
          resume: data.resume
        }));
        toast.success('Resume uploaded successfully!');
      } else {
        toast.error(data.message || 'Failed to upload resume.');
      }
    } catch (err) {
      console.error('Error uploading resume:', err);
      toast.error('Failed to upload resume.');
    } finally {
      setResumeUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Remove Resume
  const handleRemoveResume = async () => {
    try {
      const token = sessionStorage.getItem('upskillr_token');
      await fetch(`${API_BASE}/instructor/application/upload/resume`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setQualForm((prev) => ({
        ...prev,
        resume: { url: '', originalName: '', size: 0, mimeType: '' }
      }));
      toast.success('Resume removed.');
    } catch (err) {
      console.error('Error removing resume:', err);
      toast.error('Failed to remove resume.');
    }
  };

  // Profile photo upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataPayload = new FormData();
    formDataPayload.append('file', file);

    try {
      const token = sessionStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/auth/profile/upload/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataPayload
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Profile photo updated successfully!');
        const newAvatar = data.user?.avatar || data.photoUrl || '';
        setProfile((prev) => ({ ...prev, avatar: newAvatar }));

        const storedUser = sessionStorage.getItem('upskillr_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.avatar = newAvatar;
            sessionStorage.setItem('upskillr_user', JSON.stringify(parsed));
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

  // Profile photo removal
  const handlePhotoRemove = async () => {
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/auth/profile/upload/photo`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Profile photo removed.');
        setProfile((prev) => ({ ...prev, avatar: '' }));

        const storedUser = sessionStorage.getItem('upskillr_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.avatar = '';
            parsed.photoUrl = '';
            parsed.profilePhoto = '';
            sessionStorage.setItem('upskillr_user', JSON.stringify(parsed));
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

  // Multi-step Password Update Handlers (Mirrors Forgot Password Flow)
  // Step 1: Request Password Reset OTP
  const handleRequestPasswordOtp = async (e) => {
    if (e) e.preventDefault();
    if (!profile.email) {
      toast.error('No email address associated with this profile.');
      return;
    }

    setRequestingOtp(true);
    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email.trim().toLowerCase() })
      });

      const data = await response.json();

      if (response.status === 429) {
        toast.error(data.message || 'Too many requests. Please wait before retrying.');
        if (data.retryAfter) {
          setOtpCooldown(data.retryAfter);
        }
        return;
      }

      if (!response.ok && !data.success) {
        throw new Error(data.message || 'Unable to process reset request.');
      }

      toast.success(`Verification code sent to ${profile.email}!`);
      setPasswordStep(2);
      setOtpCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    } catch (err) {
      toast.error(err.message || 'Failed to request verification code.');
    } finally {
      setRequestingOtp(false);
    }
  };

  // OTP Input Handlers (paste, individual typing, backspace, arrow keys)
  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');

    if (!cleaned) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      const startIdx = chars.length === 6 ? 0 : index;
      chars.forEach((char, offset) => {
        if (startIdx + offset < 6) {
          newDigits[startIdx + offset] = char;
        }
      });
      setOtpDigits(newDigits);
      const nextIdx = Math.min(startIdx + chars.length, 5);
      otpInputsRef.current[nextIdx]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    if (index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otpDigits[index]) {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      } else if (index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        otpInputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setOtpDigits(newDigits);

    const focusIndex = Math.min(pastedData.length, 5);
    otpInputsRef.current[focusIndex]?.focus();
  };

  // Step 2: Resend Verification Code
  const handleResendOtp = async () => {
    if (otpCooldown > 0 || resendingOtp) return;

    setOtpDigits(['', '', '', '', '', '']);
    otpInputsRef.current[0]?.focus();
    setResendingOtp(true);

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email.trim().toLowerCase() })
      });

      const data = await response.json();

      if (response.status === 429) {
        toast.error(data.message || 'Please wait before requesting another code.');
        if (data.retryAfter) {
          setOtpCooldown(data.retryAfter);
        }
        return;
      }

      toast.success(data.message || `Verification code resent to ${profile.email}`);
      setOtpCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputsRef.current[0]?.focus();
    } catch (err) {
      toast.error(err?.message || 'Failed to resend verification code.');
    } finally {
      setResendingOtp(false);
    }
  };

  // Step 2: Submit Reset Password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      toast.error('Please enter the full 6-digit verification code.');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setUpdatingPassword(true);

    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: profile.email.trim().toLowerCase(),
          otp: fullOtp,
          newPassword,
          confirmPassword
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setOtpDigits(['', '', '', '', '', '']);
        otpInputsRef.current[0]?.focus();
        throw new Error(data.message || 'Failed to reset password.');
      }

      setPasswordStep(3);
      toast.success('Password updated successfully!');
      setProfile((prev) => ({
        ...prev,
        passwordChangedAt: new Date().toISOString()
      }));

      // Redirect to login after 2.5 seconds since backend invalidated old sessions/cookies
      setTimeout(() => {
        sessionStorage.removeItem('upskillr_token');
        sessionStorage.removeItem('upskillr_user');
        window.location.href = '/login';
      }, 2500);
    } catch (err) {
      toast.error(err.message || 'Password update failed. Please check your verification code.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleResetPasswordCancel = () => {
    setPasswordStep(1);
    setOtpDigits(['', '', '', '', '', '']);
    setNewPassword('');
    setConfirmPassword('');
    setOtpCooldown(0);
  };

  // Open Document Modal (handles Cloudinary PDFs safely)
  const handleOpenDocPreview = (url, title) => {
    if (!url) return;
    setPreviewModal({
      isOpen: true,
      url,
      title: title || 'Document Preview'
    });
  };

  const handleCloseDocPreview = () => {
    setPreviewModal({ isOpen: false, url: '', title: '' });
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Not available';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Not available';
    }
  };

  // Helper to get reliable document preview URL
  const getDocumentPreviewUrl = (url) => {
    if (!url) return '';
    // If it's a Cloudinary PDF, convert to .png extension for direct, unblocked high-res rendering
    if (url.includes('cloudinary.com') && /\.pdf(\?.*)?$/i.test(url)) {
      return url.replace(/\.pdf(\?.*)?$/i, '.png$1');
    }
    return url;
  };

  if (loading) {
    return (
      <div className="instructor-profile-page">
        <div className="profile-header">
          <h1 className="page-title">Instructor Profile & Settings</h1>
          <p className="page-subtitle">Loading your instructor details...</p>
        </div>
        <div className="profile-card profile-loading-state">
          <div className="profile-spinner"></div>
          <p>Loading instructor profile & qualifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="instructor-profile-page">
      {/* Top Header */}
      <div className="profile-header">
        <h1 className="page-title">Instructor Profile & Settings</h1>
        <p className="page-subtitle">
          Manage your personal details, verified credentials, and studio preferences.
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="profile-card">
        {/* Profile Avatar Header Row (Matches Reference Screenshot) */}
        <div className="profile-avatar-row">
          <Avatar image={profile.avatar} name={profile.fullName} size="large" />
          <div className="avatar-meta">
            <div className="avatar-title-wrap">
              <h2>{profile.fullName}</h2>
              {profile.isVerified && (
                <span className="verified-badge-pill" title="Verified Instructor Account">
                  <Shield size={12} />
                  <span>Verified</span>
                </span>
              )}
            </div>
            <p className="avatar-email-row">
              <Mail size={14} />
              <span>{profile.email}</span>
            </p>
            <div className="avatar-upload-actions">
              <label className="btn btn-outline btn-upload-photo" title="Upload new profile photo">
                <Camera size={14} />
                <span>Upload Photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
              </label>
              {profile.avatar && (
                <button
                  type="button"
                  className="btn btn-outline btn-remove-photo"
                  onClick={handlePhotoRemove}
                  title="Remove profile photo"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cohesive Sub-Tab Bar */}
        <div className="profile-subtab-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'profile'}
            className={`profile-subtab-btn ${activeSubTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('profile')}
          >
            <User size={16} />
            <span>Active Profile</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'qualifications'}
            className={`profile-subtab-btn ${activeSubTab === 'qualifications' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('qualifications')}
          >
            <Award size={16} />
            <span>Qualifications & Experience</span>
            {application && <span className="tab-pill-verified">Verified</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'settings'}
            className={`profile-subtab-btn ${activeSubTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('settings')}
          >
            <Lock size={16} />
            <span>Account & Security</span>
          </button>
        </div>

        {/* ──────── TAB 1: ACTIVE EDITABLE PROFILE ──────── */}
        {activeSubTab === 'profile' && (
          <form className="profile-form" onSubmit={handleSaveProfile}>
            <div className="form-section-intro">
              <h3 className="section-title">Personal Profile Details</h3>
              <p className="section-subtitle">
                This public information appears across your published courses, student inquiries, and instructor cards.
              </p>
            </div>

            <div className="wizard-form-grid">
              {/* Full Name */}
              <div className="form-group span-2">
                <label className="form-label" htmlFor="profile-fullname">
                  Full Name <span className="required-star">*</span>
                </label>
                <input
                  id="profile-fullname"
                  type="text"
                  className="form-input"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  placeholder="e.g. Joy Arthur"
                  required
                />
              </div>

              {/* Email Address (Read-Only) */}
              <div className="form-group span-2">
                <label className="form-label" htmlFor="profile-email">
                  Email Address (Read-only)
                </label>
                <input
                  id="profile-email"
                  type="email"
                  className="form-input read-only-input"
                  value={profile.email}
                  disabled
                  readOnly
                />
                <span className="field-hint">
                  Your email address serves as your primary login credential and cannot be modified directly.
                </span>
              </div>

              {/* Specialization / Expertise (Designation) */}
              <div className="form-group span-2">
                <label className="form-label" htmlFor="profile-specialization">
                  Specialization / Expertise
                </label>
                <input
                  id="profile-specialization"
                  type="text"
                  className="form-input"
                  value={profile.designation}
                  onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                  placeholder="e.g. Senior Software Engineer"
                />
                <span className="field-hint">
                  Displayed as your professional headline under your name on course pages.
                </span>
              </div>

              {/* Key Skills Tags Editor */}
              <div className="form-group span-2">
                <label className="form-label">
                  Key Skills & Specialties
                </label>
                <div className="skills-tag-container">
                  {profile.keySkills.length > 0 ? (
                    profile.keySkills.map((skill, index) => (
                      <span key={index} className="skill-chip">
                        <span>{skill}</span>
                        <button
                          type="button"
                          className="skill-chip-remove"
                          onClick={() => handleRemoveSkill(skill)}
                          title={`Remove ${skill}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="skills-empty-text">No skills added yet. Add your specialties below.</span>
                  )}
                </div>

                <div className="skill-add-row">
                  <input
                    type="text"
                    className="form-input skill-add-input"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Type a skill (e.g. Python, Machine Learning) and press Enter"
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-add-skill"
                    onClick={handleAddSkill}
                  >
                    <Plus size={14} />
                    <span>Add Skill</span>
                  </button>
                </div>
              </div>

              {/* Instructor Bio */}
              <div className="form-group span-2">
                <label className="form-label" htmlFor="profile-bio">
                  Instructor Bio
                </label>
                <textarea
                  id="profile-bio"
                  className="form-textarea"
                  rows={4}
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Share your experience, pedagogical philosophy, and what students will learn from you..."
                />
                <div className="textarea-footer">
                  <span className="field-hint">
                    A well-crafted biography builds trust and improves student enrollment rates.
                  </span>
                  <span className="char-count">{profile.bio.length} characters</span>
                </div>
              </div>
            </div>

            {/* Save Button (Matches Reference Screenshot) */}
            <div className="profile-form-actions">
              <button
                type="submit"
                className="btn btn-primary btn-save-profile"
                disabled={savingProfile}
              >
                <Save size={16} />
                <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ──────── TAB 2: VERIFIED QUALIFICATIONS & APPLICATION SNAPSHOT ──────── */}
        {activeSubTab === 'qualifications' && (
          <div className="qualifications-view">
            {application ? (
              <>
                <div className="application-snapshot-banner">
                  <div className="snapshot-banner-icon">
                    <CheckCircle2 size={22} />
                  </div>
                  <div className="snapshot-banner-text">
                    <h4>Qualifications, Experience & Credentials</h4>
                    <p>
                      Submitted on {formatDate(application.submittedAt || application.createdAt)}. You can update your
                      professional role, degrees, and teaching background below.
                    </p>
                  </div>
                  <div className="snapshot-banner-actions">
                    {!isEditingQualifications ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-edit-qualifications"
                        onClick={() => setIsEditingQualifications(true)}
                      >
                        <Edit3 size={15} />
                        <span>Edit Qualifications</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline btn-cancel-qualifications"
                        onClick={handleCancelQualificationsEdit}
                      >
                        <X size={15} />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* EDIT MODE */}
                {isEditingQualifications ? (
                  <form className="qualifications-edit-form" onSubmit={handleSaveQualifications}>
                    {/* Professional Info Edit */}
                    <div className="qualification-card span-2">
                      <div className="qualification-card-header">
                        <div className="card-header-icon">
                          <Briefcase size={18} />
                        </div>
                        <h3>Edit Professional Experience</h3>
                      </div>
                      <div className="qualification-card-body">
                        <div className="wizard-form-grid">
                          <div className="form-group">
                            <label className="form-label">Current Role / Title</label>
                            <input
                              type="text"
                              className="form-input"
                              value={qualForm.currentRole}
                              onChange={(e) => setQualForm({ ...qualForm, currentRole: e.target.value })}
                              placeholder="e.g. Senior Software Engineer"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Organization / Company</label>
                            <input
                              type="text"
                              className="form-input"
                              value={qualForm.organization}
                              onChange={(e) => setQualForm({ ...qualForm, organization: e.target.value })}
                              placeholder="e.g. Lexis AI"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Years of Experience</label>
                            <input
                              type="text"
                              className="form-input"
                              value={qualForm.yearsOfExperience}
                              onChange={(e) => setQualForm({ ...qualForm, yearsOfExperience: e.target.value })}
                              placeholder="e.g. 5+ Years"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">LinkedIn Profile URL</label>
                            <input
                              type="url"
                              className="form-input"
                              value={qualForm.linkedinUrl}
                              onChange={(e) => setQualForm({ ...qualForm, linkedinUrl: e.target.value })}
                              placeholder="https://linkedin.com/in/username"
                            />
                          </div>

                          <div className="form-group span-2">
                            <label className="form-label">Portfolio / Website URL</label>
                            <input
                              type="url"
                              className="form-input"
                              value={qualForm.websiteUrl}
                              onChange={(e) => setQualForm({ ...qualForm, websiteUrl: e.target.value })}
                              placeholder="https://yourportfolio.com"
                            />
                          </div>

                          <div className="form-group span-2">
                            <label className="form-label">Specialist Skills</label>
                            <div className="skills-tag-container">
                              {qualForm.keySkills.length > 0 ? (
                                qualForm.keySkills.map((sk, idx) => (
                                  <span key={idx} className="skill-chip">
                                    <span>{sk}</span>
                                    <button
                                      type="button"
                                      className="skill-chip-remove"
                                      onClick={() => handleRemoveQualSkill(sk)}
                                    >
                                      <X size={12} />
                                    </button>
                                  </span>
                                ))
                              ) : (
                                <span className="skills-empty-text">No skills added</span>
                              )}
                            </div>
                            <div className="skill-add-row">
                              <input
                                type="text"
                                className="form-input skill-add-input"
                                value={newQualSkillInput}
                                onChange={(e) => setNewQualSkillInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddQualSkill();
                                  }
                                }}
                                placeholder="Add skill and press Enter"
                              />
                              <button
                                type="button"
                                className="btn btn-outline btn-add-skill"
                                onClick={handleAddQualSkill}
                              >
                                <Plus size={14} />
                                <span>Add</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Education Edit */}
                    <div className="qualification-card span-2">
                      <div className="qualification-card-header">
                        <div className="card-header-icon">
                          <GraduationCap size={18} />
                        </div>
                        <h3>Edit Education & Academic Credentials</h3>
                      </div>
                      <div className="qualification-card-body">
                        <div className="wizard-form-grid">
                          <div className="form-group">
                            <label className="form-label">Degree</label>
                            <input
                              type="text"
                              className="form-input"
                              value={qualForm.degree}
                              onChange={(e) => setQualForm({ ...qualForm, degree: e.target.value })}
                              placeholder="e.g. Master's Degree"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Field of Study</label>
                            <input
                              type="text"
                              className="form-input"
                              value={qualForm.fieldOfStudy}
                              onChange={(e) => setQualForm({ ...qualForm, fieldOfStudy: e.target.value })}
                              placeholder="e.g. Computer Engineering"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Institution / University</label>
                            <input
                              type="text"
                              className="form-input"
                              value={qualForm.institution}
                              onChange={(e) => setQualForm({ ...qualForm, institution: e.target.value })}
                              placeholder="e.g. National Institute of Technology"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Graduation Year</label>
                            <input
                              type="text"
                              className="form-input"
                              value={qualForm.graduationYear}
                              onChange={(e) => setQualForm({ ...qualForm, graduationYear: e.target.value })}
                              placeholder="e.g. 2020"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Teaching Experience Edit */}
                    <div className="qualification-card span-2">
                      <div className="qualification-card-header">
                        <div className="card-header-icon">
                          <UserCheck size={18} />
                        </div>
                        <h3>Edit Teaching Experience</h3>
                      </div>
                      <div className="qualification-card-body">
                        <div className="wizard-form-grid">
                          <div className="form-group">
                            <label className="form-label">Prior Teaching Experience</label>
                            <input
                              type="text"
                              className="form-input"
                              value={qualForm.priorExperience}
                              onChange={(e) => setQualForm({ ...qualForm, priorExperience: e.target.value })}
                              placeholder="e.g. Yes, online & offline"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Target Student Level</label>
                            <input
                              type="text"
                              className="form-input"
                              value={qualForm.targetStudentLevel}
                              onChange={(e) => setQualForm({ ...qualForm, targetStudentLevel: e.target.value })}
                              placeholder="e.g. All Levels, Intermediate"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 4 Edit: Certifications & Accreditations */}
                    <div className="qualification-card span-2">
                      <div className="qualification-card-header">
                        <div className="card-header-icon">
                          <Award size={18} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3>Certifications & Accreditations</h3>
                          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Add, update, or remove verified certifications and attach verification files.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline btn-add-cert"
                          onClick={handleOpenAddCertModal}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Plus size={15} />
                          <span>Add Certificate</span>
                        </button>
                      </div>
                      <div className="qualification-card-body">
                        {qualForm.certifications && qualForm.certifications.length > 0 ? (
                          <div className="cert-manage-list">
                            {qualForm.certifications.map((cert, idx) => (
                              <div key={idx} className="cert-manage-card">
                                <div className="cert-manage-info">
                                  <div className="cert-manage-header-row">
                                    <h4 className="cert-item-name">{cert.name}</h4>
                                    <span className="cert-item-org">{cert.issuingOrganization}</span>
                                  </div>
                                  <div className="cert-meta-row">
                                    {cert.issueDate && (
                                      <span className="cert-meta-item">
                                        Issued: {formatDate(cert.issueDate)}
                                      </span>
                                    )}
                                    {cert.credentialId && (
                                      <span className="cert-meta-item">
                                        ID: <strong>{cert.credentialId}</strong>
                                      </span>
                                    )}
                                    {cert.certificateFile?.url ? (
                                      <span className="cert-meta-item cert-badge-attached">
                                        <FileCheck size={13} style={{ color: '#10b981' }} />
                                        <span>Document Attached</span>
                                      </span>
                                    ) : (
                                      <span className="cert-meta-item cert-badge-missing">
                                        <AlertCircle size={13} style={{ color: '#f59e0b' }} />
                                        <span>No file attached</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="cert-manage-actions">
                                  {(cert.certificateFile?.url || cert.credentialUrl) && (
                                    <button
                                      type="button"
                                      className="btn btn-outline cert-action-sm"
                                      onClick={() => handleOpenDocPreview(cert.certificateFile?.url || cert.credentialUrl, cert.name)}
                                      title="Preview Certificate Document"
                                    >
                                      <Eye size={13} />
                                      <span>View</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="btn btn-outline cert-action-sm"
                                    onClick={() => handleOpenEditCertModal(idx)}
                                    title="Edit certificate details or upload document"
                                  >
                                    <Edit3 size={13} />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline cert-action-sm cert-btn-remove"
                                    onClick={() => handleRemoveCertification(idx)}
                                    title="Remove certificate"
                                  >
                                    <Trash2 size={13} />
                                    <span>Remove</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="cert-empty-box">
                            <Award size={28} className="empty-box-icon" />
                            <p>No certifications added yet. Click &quot;Add Certificate&quot; to attach your professional credentials.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card 5 Edit: Manage Resume / CV */}
                    <div className="qualification-card span-2">
                      <div className="qualification-card-header">
                        <div className="card-header-icon">
                          <FileText size={18} />
                        </div>
                        <div>
                          <h3>Curriculum Vitae / Resume</h3>
                          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Update, replace, or remove your professional CV document (PDF, DOC, DOCX up to 10MB).
                          </p>
                        </div>
                      </div>
                      <div className="qualification-card-body">
                        <input
                          type="file"
                          ref={resumeFileInputRef}
                          accept=".pdf,.doc,.docx"
                          style={{ display: 'none' }}
                          onChange={handleResumeUpload}
                        />

                        {qualForm.resume?.url ? (
                          <div className="resume-manage-box">
                            <div className="resume-file-info">
                              <span className="doc-icon"><FileText size={18} /></span>
                              <div className="doc-info-col">
                                <span className="doc-title">{qualForm.resume.originalName || 'Instructor_Resume.pdf'}</span>
                                <span className="doc-subtitle">
                                  {qualForm.resume.size ? formatFileSize(qualForm.resume.size) : 'Uploaded Document'}
                                </span>
                              </div>
                            </div>
                            <div className="resume-actions-group">
                              <button
                                type="button"
                                className="btn btn-outline doc-action-btn"
                                onClick={() => handleOpenDocPreview(qualForm.resume.url, qualForm.resume.originalName || 'Instructor Resume')}
                              >
                                <Eye size={14} />
                                <span>View Document</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline doc-action-btn"
                                onClick={() => resumeFileInputRef.current?.click()}
                                disabled={resumeUploading}
                              >
                                <Upload size={14} />
                                <span>{resumeUploading ? 'Uploading...' : 'Replace Resume'}</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline doc-action-btn cert-btn-remove"
                                onClick={handleRemoveResume}
                              >
                                <Trash2 size={14} />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="resume-upload-dropzone">
                            <FileText size={32} className="dropzone-icon" />
                            <h4>No Resume Currently Attached</h4>
                            <p>Upload your latest curriculum vitae or resume in PDF or Word document format.</p>
                            <button
                              type="button"
                              className="btn btn-primary btn-upload-resume"
                              onClick={() => resumeFileInputRef.current?.click()}
                              disabled={resumeUploading}
                            >
                              <Upload size={15} />
                              <span>{resumeUploading ? 'Uploading Resume...' : 'Upload Resume Document'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card 6 Edit: Government ID / Identity Verification */}
                    <div className="qualification-card span-2">
                      <div className="qualification-card-header">
                        <div className="card-header-icon">
                          <Shield size={18} />
                        </div>
                        <div>
                          <h3>Identity Verification & Government ID</h3>
                          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Manage your Government ID / Passport identification reference for administrative verification.
                          </p>
                        </div>
                      </div>
                      <div className="qualification-card-body">
                        <div className="wizard-form-grid">
                          <div className="form-group span-2">
                            <label className="form-label">Government ID / Passport Reference Number</label>
                            <input
                              type="text"
                              className="form-input"
                              value={qualForm.idDocumentRef}
                              onChange={(e) => setQualForm({ ...qualForm, idDocumentRef: e.target.value })}
                              placeholder="e.g. ID-987654321 or Passport Document Number"
                            />
                            <span className="field-hint" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                              This reference is archived with UpSkillr administrative security records to maintain instructor compliance.
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Save Actions */}
                    <div className="profile-form-actions">
                      <button
                        type="submit"
                        className="btn btn-primary btn-save-profile"
                        disabled={savingQualifications}
                      >
                        <Save size={16} />
                        <span>{savingQualifications ? 'Saving...' : 'Save Qualifications'}</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={handleCancelQualificationsEdit}
                        style={{ marginLeft: '10px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  /* VIEW MODE */
                  <div className="qualifications-grid">
                    {/* Card 1: Professional Information */}
                    <div className="qualification-card">
                      <div className="qualification-card-header">
                        <div className="card-header-icon">
                          <Briefcase size={18} />
                        </div>
                        <h3>Professional Experience</h3>
                      </div>
                      <div className="qualification-card-body">
                        <div className="data-row">
                          <span className="data-label">Current Role:</span>
                          <span className="data-value">{application.professionalInfo?.currentRole || 'Not specified'}</span>
                        </div>
                        <div className="data-row">
                          <span className="data-label">Organization:</span>
                          <span className="data-value">{application.professionalInfo?.organization || 'Not specified'}</span>
                        </div>
                        <div className="data-row">
                          <span className="data-label">Experience:</span>
                          <span className="data-value">{application.professionalInfo?.yearsOfExperience || 'Not specified'}</span>
                        </div>
                        {application.professionalInfo?.linkedinUrl && (
                          <div className="data-row">
                            <span className="data-label">LinkedIn:</span>
                            <a
                              href={application.professionalInfo.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="external-link"
                            >
                              <span>View Profile</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        )}
                        {application.professionalInfo?.websiteUrl && (
                          <div className="data-row">
                            <span className="data-label">Portfolio:</span>
                            <a
                              href={application.professionalInfo.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="external-link"
                            >
                              <span>Visit Website</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        )}
                        <div className="data-row-block">
                          <span className="data-label">Application Key Skills:</span>
                          <div className="skills-chips-row">
                            {application.professionalInfo?.keySkills?.length > 0 ? (
                              application.professionalInfo.keySkills.map((sk, idx) => (
                                <span key={idx} className="read-only-skill-chip">{sk}</span>
                              ))
                            ) : (
                              <span className="data-empty">None recorded</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Education & Academic Credentials */}
                    <div className="qualification-card">
                      <div className="qualification-card-header">
                        <div className="card-header-icon">
                          <GraduationCap size={18} />
                        </div>
                        <h3>Education & Degrees</h3>
                      </div>
                      <div className="qualification-card-body">
                        <div className="data-row">
                          <span className="data-label">Degree:</span>
                          <span className="data-value">{application.education?.degree || 'Not specified'}</span>
                        </div>
                        <div className="data-row">
                          <span className="data-label">Field of Study:</span>
                          <span className="data-value">{application.education?.fieldOfStudy || 'Not specified'}</span>
                        </div>
                        <div className="data-row">
                          <span className="data-label">Institution:</span>
                          <span className="data-value">{application.education?.institution || 'Not specified'}</span>
                        </div>
                        <div className="data-row">
                          <span className="data-label">Graduation Year:</span>
                          <span className="data-value">{application.education?.graduationYear || 'Not specified'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Teaching Methodology */}
                    <div className="qualification-card">
                      <div className="qualification-card-header">
                        <div className="card-header-icon">
                          <UserCheck size={18} />
                        </div>
                        <h3>Teaching Experience</h3>
                      </div>
                      <div className="qualification-card-body">
                        <div className="data-row">
                          <span className="data-label">Prior Experience:</span>
                          <span className="data-value">{application.teachingExperience?.priorExperience || 'Not specified'}</span>
                        </div>
                        <div className="data-row">
                          <span className="data-label">Target Level:</span>
                          <span className="data-value">{application.teachingExperience?.targetStudentLevel || 'All Levels'}</span>
                        </div>
                        <div className="data-row-block">
                          <span className="data-label">Primary Teaching Styles:</span>
                          <div className="skills-chips-row">
                            {application.teachingExperience?.primaryTeachingStyles?.length > 0 ? (
                              application.teachingExperience.primaryTeachingStyles.map((style, idx) => (
                                <span key={idx} className="read-only-skill-chip">{style}</span>
                              ))
                            ) : (
                              <span className="data-empty">
                                {application.teachingExperience?.primaryTeachingStyle || 'Interactive & Hands-on'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 4: Verified Certifications */}
                    <div className="qualification-card span-2">
                      <div className="qualification-card-header">
                        <div className="card-header-icon">
                          <Award size={18} />
                        </div>
                        <h3>Verified Certifications & Accreditations</h3>
                      </div>
                      <div className="qualification-card-body">
                        {application.coursesExpertise?.certifications?.length > 0 ? (
                          <div className="certifications-list">
                            {application.coursesExpertise.certifications.map((cert, idx) => {
                              const docTargetUrl = cert.certificateFile?.url || cert.credentialUrl;
                              return (
                                <div key={idx} className="cert-item-card">
                                  <div className="cert-item-main">
                                    <h4 className="cert-item-name">{cert.name}</h4>
                                    <p className="cert-item-org">{cert.issuingOrganization}</p>
                                    <div className="cert-meta-row">
                                      {cert.issueDate && (
                                        <span className="cert-meta-item">
                                          Issued: {formatDate(cert.issueDate)}
                                        </span>
                                      )}
                                      {cert.credentialId && (
                                        <span className="cert-meta-item">
                                          ID: <strong>{cert.credentialId}</strong>
                                        </span>
                                      )}
                                      {cert.certificateFile?.originalName && (
                                        <span className="cert-meta-item cert-badge-attached">
                                          <FileCheck size={12} style={{ color: '#10b981' }} />
                                          <span>{cert.certificateFile.originalName}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="cert-actions-wrap" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {docTargetUrl && (
                                      <button
                                        type="button"
                                        className="btn btn-outline doc-action-btn"
                                        onClick={() => handleOpenDocPreview(docTargetUrl, cert.name)}
                                        title="View certificate document directly in modal"
                                      >
                                        <Eye size={14} />
                                        <span>View Document</span>
                                      </button>
                                    )}
                                    {cert.credentialUrl && (
                                      <a
                                        href={cert.credentialUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-outline cert-verify-btn"
                                        title="Verify credential on issuing website"
                                      >
                                        <span>Verify URL</span>
                                        <ExternalLink size={12} />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="data-empty">No professional certifications were attached to your application.</p>
                        )}
                      </div>
                    </div>

                    {/* Card 5: Submitted Verification Document Record */}
                    <div className="qualification-card span-2">
                      <div className="qualification-card-header">
                        <div className="card-header-icon">
                          <FileText size={18} />
                        </div>
                        <h3>Application Document History</h3>
                      </div>
                      <div className="qualification-card-body">
                        <div className="documents-summary-row">
                          <div className="document-status-item">
                            <span className="doc-icon"><Shield size={16} /></span>
                            <div className="doc-info-col">
                              <span className="doc-title">Identity Verification</span>
                              <span className="doc-subtitle">
                                {application.documents?.idDocumentRef
                                  ? `Govt ID: ${application.documents.idDocumentRef} • Verified by admin`
                                  : 'Government ID record verified by admin'}
                              </span>
                            </div>
                            <span className="badge-verified">Verified</span>
                          </div>

                          {application.documents?.resume?.url ? (
                            <div className="document-status-item">
                              <span className="doc-icon"><FileText size={16} /></span>
                              <div className="doc-info-col">
                                <span className="doc-title">
                                  {application.documents.resume.originalName || 'Curriculum Vitae / Resume'}
                                </span>
                                <span className="doc-subtitle">
                                  {application.documents.resume.size
                                    ? formatFileSize(application.documents.resume.size)
                                    : 'Verified document'}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="btn btn-outline doc-action-btn"
                                onClick={() =>
                                  handleOpenDocPreview(
                                    application.documents.resume.url,
                                    application.documents.resume.originalName || 'Instructor Resume'
                                  )
                                }
                                title="View resume document"
                              >
                                <Eye size={14} />
                                <span>View Document</span>
                              </button>
                            </div>
                          ) : (
                            <div className="document-status-item document-status-empty">
                              <span className="doc-icon"><FileText size={16} /></span>
                              <div className="doc-info-col">
                                <span className="doc-title">Resume / CV</span>
                                <span className="doc-subtitle">No resume document attached</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="qualifications-empty-card">
                <AlertCircle size={32} className="empty-icon" />
                <h3>No Application Snapshot Available</h3>
                <p>
                  No submitted onboarding application was found associated with this account.
                  If you registered directly or via legacy onboarding, you can update your active profile in the "Active Profile" tab.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ──────── TAB 3: ACCOUNT & SECURITY SETTINGS ──────── */}
        {activeSubTab === 'settings' && (
          <div className="settings-view">
            {/* Account Overview Card */}
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="card-header-icon">
                  <Shield size={18} />
                </div>
                <div>
                  <h3>Account Credentials & Identity</h3>
                  <p className="settings-card-sub">Overview of your authentication provider and verification state.</p>
                </div>
              </div>

              <div className="settings-card-body">
                <div className="settings-meta-grid">
                  <div className="meta-box">
                    <span className="meta-box-label">Primary Login Email</span>
                    <span className="meta-box-val">{profile.email}</span>
                  </div>

                  <div className="meta-box">
                    <span className="meta-box-label">Email Verification</span>
                    <span className="meta-box-val">
                      {profile.isVerified ? (
                        <span className="badge-verified"><CheckCircle2 size={13} /> Verified</span>
                      ) : (
                        <span className="badge-pending">Unverified</span>
                      )}
                    </span>
                  </div>

                  <div className="meta-box">
                    <span className="meta-box-label">Sign-In Method</span>
                    <span className="meta-box-val">
                      {profile.authProvider === 'google' && 'Google Single Sign-On'}
                      {profile.authProvider === 'github' && 'GitHub Single Sign-On'}
                      {profile.authProvider === 'local' && 'Email & Password'}
                    </span>
                  </div>

                  <div className="meta-box">
                    <span className="meta-box-label">Account Role</span>
                    <span className="meta-box-val role-instructor">Instructor Studio</span>
                  </div>

                  <div className="meta-box">
                    <span className="meta-box-label">Member Since</span>
                    <span className="meta-box-val">{formatDate(profile.createdAt)}</span>
                  </div>

                  <div className="meta-box">
                    <span className="meta-box-label">Password Last Changed</span>
                    <span className="meta-box-val">{formatDate(profile.passwordChangedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Password Management Card */}
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="card-header-icon">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3>Security & Password</h3>
                  <p className="settings-card-sub">Change your account password or review login security.</p>
                </div>
              </div>

              <div className="settings-card-body">
                {profile.authProvider === 'local' ? (
                  <div className="password-update-container">
                    {/* STEP 1: REQUEST VERIFICATION CODE */}
                    {passwordStep === 1 && (
                      <div className="password-step1-wrap">
                        <div className="password-prompt-box">
                          <div className="prompt-icon-badge">
                            <Mail size={22} />
                          </div>
                          <div className="prompt-text-col">
                            <h4 className="prompt-title">Email Verification Required</h4>
                            <p className="prompt-desc">
                              To update your account password securely, UpSkillr will send a 6-digit one-time passcode to your registered email address:
                            </p>
                            <span className="prompt-email-badge">{profile.email}</span>
                          </div>
                        </div>

                        <div className="password-form-actions" style={{ marginTop: '1.25rem' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-update-password"
                            onClick={handleRequestPasswordOtp}
                            disabled={requestingOtp}
                          >
                            <KeyRound size={16} />
                            <span>{requestingOtp ? 'Sending Code...' : 'Send Verification Code'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP 2: ENTER OTP & NEW PASSWORD */}
                    {passwordStep === 2 && (
                      <form className="password-change-form" onSubmit={handleResetPasswordSubmit}>
                        <div className="otp-step-notice">
                          <div className="otp-notice-icon">
                            <KeyRound size={20} />
                          </div>
                          <div>
                            <p className="otp-notice-title">
                              Enter the 6-digit code sent to <strong>{profile.email}</strong>
                            </p>
                            <p className="otp-notice-sub">Please check your Inbox and Spam/Junk folder.</p>
                          </div>
                        </div>

                        {/* 6-Digit Passcode Input Group */}
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label" style={{ fontWeight: 600 }}>
                            6-Digit Verification Code <span className="required-star">*</span>
                          </label>
                          <div className="otp-digit-group-row" onPaste={handleOtpPaste}>
                            {otpDigits.map((digit, index) => (
                              <input
                                key={index}
                                ref={(el) => (otpInputsRef.current[index] = el)}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                className="otp-box-input"
                                value={digit}
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                onPaste={handleOtpPaste}
                                onFocus={(e) => e.target.select()}
                                required
                                autoFocus={index === 0}
                                aria-label={`Digit ${index + 1} of 6`}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="password-form-grid">
                          <div className="form-group">
                            <label className="form-label" htmlFor="reset-new-password">
                              New Password <span className="required-star">*</span>
                            </label>
                            <div className="input-wrapper-relative">
                              <input
                                id="reset-new-password"
                                type={showNewPassword ? 'text' : 'password'}
                                className="form-input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="At least 8 characters"
                                required
                                autoComplete="new-password"
                              />
                              <button
                                type="button"
                                className="input-toggle-eye-btn"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                tabIndex={-1}
                                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                              >
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label" htmlFor="reset-confirm-password">
                              Confirm New Password <span className="required-star">*</span>
                            </label>
                            <div className="input-wrapper-relative">
                              <input
                                id="reset-confirm-password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="form-input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter new password"
                                required
                                autoComplete="new-password"
                              />
                              <button
                                type="button"
                                className="input-toggle-eye-btn"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                tabIndex={-1}
                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                              >
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Live Validation Checklist */}
                        <div className="password-checklist-row">
                          <span style={{ color: newPassword.length >= 8 ? 'var(--brand-primary, #10b981)' : 'var(--text-secondary)' }}>
                            {newPassword.length >= 8 ? '✓' : '•'} At least 8 characters
                          </span>
                          <span style={{ color: (newPassword && newPassword === confirmPassword) ? 'var(--brand-primary, #10b981)' : 'var(--text-secondary)' }}>
                            {(newPassword && newPassword === confirmPassword) ? '✓' : '•'} Passwords match
                          </span>
                        </div>

                        <div className="password-step2-actions">
                          <button
                            type="submit"
                            className="btn btn-primary btn-update-password"
                            disabled={updatingPassword || otpDigits.join('').length !== 6 || newPassword.length < 8 || newPassword !== confirmPassword}
                          >
                            <Lock size={15} />
                            <span>{updatingPassword ? 'Updating Password...' : 'Update Password'}</span>
                          </button>

                          <button
                            type="button"
                            className="btn-resend-otp"
                            onClick={handleResendOtp}
                            disabled={otpCooldown > 0 || resendingOtp}
                          >
                            <Clock size={14} />
                            <span>
                              {resendingOtp
                                ? 'Sending...'
                                : otpCooldown > 0
                                  ? `Resend code in ${otpCooldown}s`
                                  : 'Resend Code'}
                            </span>
                          </button>

                          <button
                            type="button"
                            className="btn-cancel-otp"
                            onClick={handleResetPasswordCancel}
                            disabled={updatingPassword}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}

                    {/* STEP 3: SUCCESS STATE */}
                    {passwordStep === 3 && (
                      <div className="password-success-box">
                        <div className="success-icon-badge">
                          <CheckCircle2 size={36} />
                        </div>
                        <h4 className="success-title">Password Updated Successfully!</h4>
                        <p className="success-desc">
                          Your account password has been updated. Since existing sessions have been refreshed, redirecting you to sign in with your new password...
                        </p>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            sessionStorage.removeItem('upskillr_token');
                            sessionStorage.removeItem('upskillr_user');
                            window.location.href = '/login';
                          }}
                        >
                          <span>Sign In with New Password</span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="oauth-sso-notice">
                    <Shield size={20} className="notice-icon" />
                    <div>
                      <h4>Single Sign-On Managed Account</h4>
                      <p>
                        Your account is linked with{' '}
                        <strong>
                          {profile.authProvider === 'google' ? 'Google' : 'GitHub'} Single Sign-On
                        </strong>
                        . Password changes and multi-factor authentication are safely handled by your{' '}
                        {profile.authProvider === 'google' ? 'Google' : 'GitHub'} account security settings.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ──────── CERTIFICATION ADD/EDIT MODAL ──────── */}
      {certModal.isOpen && (
        <div className="cert-modal-overlay" onClick={() => setCertModal((prev) => ({ ...prev, isOpen: false }))}>
          <div className="cert-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="cert-modal-header">
              <div className="cert-modal-title">
                <Award size={18} />
                <span>{certModal.index !== null ? 'Edit Certification' : 'Add New Certification'}</span>
              </div>
              <button
                type="button"
                className="cert-modal-close"
                onClick={() => setCertModal((prev) => ({ ...prev, isOpen: false }))}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="cert-modal-body">
              {certModal.error && (
                <div className="cert-modal-error">
                  <AlertCircle size={15} />
                  <span>{certModal.error}</span>
                </div>
              )}

              <div className="cert-modal-grid">
                <div className="form-group span-2">
                  <label className="form-label">
                    Certification Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={certModal.name}
                    onChange={(e) => setCertModal({ ...certModal, name: e.target.value, error: '' })}
                    placeholder="e.g. AWS Certified Solutions Architect, Full Stack Specialist"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Issuing Organization <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={certModal.issuingOrganization}
                    onChange={(e) => setCertModal({ ...certModal, issuingOrganization: e.target.value, error: '' })}
                    placeholder="e.g. Amazon Web Services, Coursera, Udemy"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Issue Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={certModal.issueDate}
                    onChange={(e) => setCertModal({ ...certModal, issueDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Credential ID</label>
                  <input
                    type="text"
                    className="form-input"
                    value={certModal.credentialId}
                    onChange={(e) => setCertModal({ ...certModal, credentialId: e.target.value })}
                    placeholder="e.g. CJH-62-997"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Credential URL</label>
                  <input
                    type="url"
                    className="form-input"
                    value={certModal.credentialUrl}
                    onChange={(e) => setCertModal({ ...certModal, credentialUrl: e.target.value })}
                    placeholder="https://verify.organization.com/cert/123"
                  />
                </div>

                {/* Certificate Document Upload */}
                <div className="form-group span-2">
                  <label className="form-label">Certificate Document (PDF / Image)</label>
                  <input
                    type="file"
                    ref={certFileInputRef}
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleCertFileUpload}
                  />

                  {certModal.certificateFile?.url ? (
                    <div className="cert-file-preview-card">
                      <div className="cert-file-info">
                        <FileCheck size={20} style={{ color: 'var(--brand-primary)' }} />
                        <div className="doc-info-col">
                          <span className="doc-title">{certModal.certificateFile.originalName || 'Certificate Document'}</span>
                          <span className="doc-subtitle">
                            {certModal.certificateFile.size ? formatFileSize(certModal.certificateFile.size) : 'Uploaded Document'}
                          </span>
                        </div>
                      </div>
                      <div className="cert-file-actions">
                        <button
                          type="button"
                          className="btn btn-outline cert-action-sm"
                          onClick={() => handleOpenDocPreview(certModal.certificateFile.url, certModal.name || 'Certificate Document')}
                        >
                          <Eye size={13} />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline cert-action-sm"
                          onClick={() => certFileInputRef.current?.click()}
                          disabled={certModal.isUploading}
                        >
                          <Upload size={13} />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline cert-action-sm cert-btn-remove"
                          onClick={handleRemoveCertFile}
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline cert-upload-drop-btn"
                      onClick={() => certFileInputRef.current?.click()}
                      disabled={certModal.isUploading}
                    >
                      <Upload size={16} />
                      <span>{certModal.isUploading ? 'Uploading Certificate Document...' : 'Upload Certificate File (PDF, PNG, JPG)'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="cert-modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setCertModal((prev) => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveCertModal}
              >
                <Check size={15} />
                <span>Save Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────── DOCUMENT PREVIEW MODAL ──────── */}
      {previewModal.isOpen && (
        <div className="doc-preview-modal-overlay" onClick={handleCloseDocPreview}>
          <div className="doc-preview-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="doc-preview-modal-header">
              <div className="doc-preview-modal-title">
                <FileText size={18} />
                <span>{previewModal.title}</span>
              </div>
              <div className="doc-preview-modal-actions">
                <a
                  href={previewModal.url.includes('cloudinary.com') ? getDocumentPreviewUrl(previewModal.url) : previewModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-modal-action"
                  title="Open full document in new tab"
                >
                  <ExternalLink size={14} />
                  <span>Open Full</span>
                </a>
                <a
                  href={previewModal.url.startsWith('http') && previewModal.url.includes('cloudinary.com')
                    ? `${API_BASE}/instructor/application/preview-proxy?url=${encodeURIComponent(previewModal.url)}`
                    : previewModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={previewModal.title || 'document'}
                  className="btn btn-outline btn-modal-action"
                  title="Download document"
                >
                  <Download size={14} />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  className="doc-preview-modal-close"
                  onClick={handleCloseDocPreview}
                  title="Close Preview"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="doc-preview-modal-body">
              {(!previewModal.url.startsWith('http') || previewModal.url.includes('cloudinary.com') || /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(previewModal.url)) ? (
                <img
                  src={getDocumentPreviewUrl(previewModal.url)}
                  alt={previewModal.title}
                  className="doc-preview-image"
                  onError={(e) => {
                    // Fallback to proxy if direct image fails
                    e.target.onerror = null;
                    if (previewModal.url.includes('cloudinary.com')) {
                      e.target.src = `${API_BASE}/instructor/application/preview-proxy?url=${encodeURIComponent(previewModal.url)}`;
                    }
                  }}
                />
              ) : (
                <iframe
                  src={previewModal.url}
                  title={previewModal.title}
                  className="doc-preview-iframe"
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
