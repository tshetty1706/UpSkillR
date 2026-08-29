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

import { SearchableSelect } from '../../common/SearchableSelect/SearchableSelect';
import { LogoutModal } from '../../common/LogoutModal/LogoutModal';
import { ALL_COUNTRIES, DEFAULT_COUNTRY, findCountryByNameOrCode } from '../../../utils/countryData';

const API_BASE_URL = 'http://localhost:5000/api/instructor/application';

// Helper to format file size in KB or MB
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Clean Predefined Options
const PROFESSIONAL_TITLE_OPTIONS = [
  'Software Engineer',
  'Software Developer',
  'Senior Software Engineer',
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Web Developer',
  'Mobile App Developer',
  'Data Scientist',
  'Data Analyst',
  'Machine Learning Engineer',
  'AI Engineer',
  'AI/ML Engineer',
  'Cloud Engineer',
  'DevOps Engineer',
  'Cybersecurity Engineer',
  'Data Engineer',
  'Database Engineer',
  'UI/UX Designer',
  'Technical Trainer',
  'Technology Instructor',
  'Professor',
  'Assistant Professor',
  'Lecturer',
  'Researcher',
  'Other'
];

const HIGHEST_DEGREE_OPTIONS = [
  'High School',
  'Diploma',
  'Associate Degree',
  "Bachelor's Degree",
  "Master's Degree",
  'Postgraduate Diploma',
  'Doctorate / PhD',
  'Other'
];

const FIELD_OF_STUDY_OPTIONS = [
  'Computer Science',
  'Computer Engineering',
  'Information Technology',
  'Artificial Intelligence',
  'Machine Learning',
  'Data Science',
  'Data Analytics',
  'Electronics Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Software Engineering',
  'Cybersecurity',
  'Mathematics',
  'Statistics',
  'Physics',
  'Business Administration',
  'Commerce',
  'Finance',
  'Design',
  'Education',
  'Other'
];

const TEACHING_STYLE_OPTIONS = [
  'Live Interactive Classes',
  'Practical / Hands-on Learning',
  'Project-Based Learning',
  'Video Lectures',
  'Workshops',
  'Case Studies',
  'Discussion-Based Learning',
  'Self-Paced Learning',
  'Other'
];

const PRIMARY_CATEGORY_OPTIONS = [
  'Web Development',
  'Data Science & AI',
  'Mobile Development',
  'Cloud Computing & DevOps',
  'UI/UX Design',
  'Cybersecurity',
  'Other'
];

const YEARS_EXPERIENCE_OPTIONS = [
  '1 - 3 Years',
  '3 - 5 Years',
  '5 - 10 Years',
  '10+ Years'
];

const PRIOR_EXPERIENCE_OPTIONS = [
  'Yes, online & offline',
  'Yes, online courses only',
  'Yes, university / classroom bootcamp',
  'No prior formal teaching (First time educator)'
];

const TARGET_LEVEL_OPTIONS = [
  'Beginner to Intermediate',
  'Absolute Beginners',
  'Advanced Professionals',
  'All Levels'
];

const POPULAR_SKILLS = [
  'React',
  'React.js',
  'React Native',
  'Node.js',
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C++',
  'C#',
  'Go',
  'Rust',
  'HTML5 / CSS3',
  'Tailwind CSS',
  'Next.js',
  'Vue.js',
  'Angular',
  'Express.js',
  'MongoDB',
  'PostgreSQL',
  'MySQL',
  'Redis',
  'GraphQL',
  'REST API',
  'Docker',
  'Kubernetes',
  'AWS',
  'Google Cloud',
  'Azure',
  'Git & GitHub',
  'CI/CD',
  'Data Structures & Algorithms',
  'Machine Learning',
  'Deep Learning',
  'TensorFlow',
  'PyTorch',
  'Data Science',
  'Pandas / NumPy',
  'Cybersecurity',
  'UI/UX Design',
  'Figma',
  'System Design',
  'Microservices',
  'Spring Boot',
  'Django',
  'FastAPI',
  'Flutter',
  'Swift',
  'Kotlin'
];

// Helper to compute missing required section validation errors for the Review page
const getSectionValidationErrors = (formData) => {
  const sectionErrors = {
    personalInfo: false,
    professionalInfo: false,
    education: false,
    teachingExperience: false,
    coursesExpertise: false,
    documents: false
  };

  const pInfo = formData.personalInfo || {};
  const profInfo = formData.professionalInfo || {};
  const eduInfo = formData.education || {};
  const teachInfo = formData.teachingExperience || {};
  const courseInfo = formData.coursesExpertise || {};
  const docInfo = formData.documents || {};

  // 1. Personal Information
  const selectedCountry = findCountryByNameOrCode(pInfo.country, pInfo.countryCode);
  const phoneDigits = (pInfo.phone || '').replace(/\D/g, '');
  if (
    !pInfo.fullName?.trim() ||
    !pInfo.email?.trim() ||
    !pInfo.phone?.trim() ||
    phoneDigits.length < selectedCountry.minLength ||
    phoneDigits.length > selectedCountry.maxLength ||
    !pInfo.professionalTitle?.trim() ||
    (pInfo.professionalTitle === 'Other' && !pInfo.professionalTitleOther?.trim())
  ) {
    sectionErrors.personalInfo = true;
  }

  // 2. Professional Information
  if (!profInfo.currentRole?.trim() || !profInfo.yearsOfExperience?.trim()) {
    sectionErrors.professionalInfo = true;
  }

  // 3. Education
  if (
    !eduInfo.degree?.trim() ||
    (eduInfo.degree === 'Other' && !eduInfo.degreeOther?.trim()) ||
    (eduInfo.fieldOfStudy === 'Other' && !eduInfo.fieldOfStudyOther?.trim()) ||
    !eduInfo.institution?.trim()
  ) {
    sectionErrors.education = true;
  }

  // 4. Teaching Experience
  const primaryStyles = teachInfo.primaryTeachingStyles || [];
  if (
    !teachInfo.priorExperience?.trim() ||
    primaryStyles.length === 0 ||
    (primaryStyles.includes('Other') && !teachInfo.primaryTeachingStyleOther?.trim())
  ) {
    sectionErrors.teachingExperience = true;
  }

  // 5. Courses & Expertise
  if (
    !courseInfo.primaryCategory?.trim() ||
    (courseInfo.primaryCategory === 'Other' && !courseInfo.primaryCategoryOther?.trim())
  ) {
    sectionErrors.coursesExpertise = true;
  }

  // 6. Documents
  if (!docInfo.idDocumentRef?.trim() && !docInfo.resume?.url) {
    sectionErrors.documents = true;
  }

  return sectionErrors;
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
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Native OS file picker refs
  const photoInputRef = useRef(null);
  const resumeInputRef = useRef(null);
  const certFileInputRef = useRef(null);

  // Skill Tag Input State & Dropdown Visibility
  const [skillInputValue, setSkillInputValue] = useState('');
  const [isSkillDropdownOpen, setIsSkillDropdownOpen] = useState(false);

  // Certification Modal State
  const [showCertModal, setShowCertModal] = useState(false);
  const [editingCertIndex, setEditingCertIndex] = useState(null);
  const [certUploading, setCertUploading] = useState(false);
  const [certModalError, setCertModalError] = useState('');
  const [certForm, setCertForm] = useState({
    name: '',
    issuingOrganization: '',
    issueDate: '',
    expirationDate: '',
    doesNotExpire: false,
    credentialId: '',
    credentialUrl: '',
    certificateFile: {
      url: '',
      originalName: '',
      size: 0,
      mimeType: ''
    }
  });

  // Main Form Data State
  const [formData, setFormData] = useState({
    personalInfo: {
      fullName: user?.fullName || '',
      email: user?.email || '',
      country: 'India',
      countryCode: '+91',
      phone: '',
      professionalTitle: '',
      professionalTitleOther: '',
      bio: '',
      photoUrl: user?.avatar || ''
    },
    professionalInfo: {
      currentRole: '',
      organization: '',
      yearsOfExperience: '1 - 3 Years',
      linkedinUrl: '',
      websiteUrl: '',
      keySkills: []
    },
    education: {
      degree: '',
      degreeOther: '',
      fieldOfStudy: '',
      fieldOfStudyOther: '',
      institution: '',
      graduationYear: ''
    },
    teachingExperience: {
      priorExperience: 'Yes, online & offline',
      targetStudentLevel: 'Beginner to Intermediate',
      primaryTeachingStyles: [],
      primaryTeachingStyleOther: '',
      sampleVideoUrl: ''
    },
    coursesExpertise: {
      primaryCategory: 'Web Development',
      primaryCategoryOther: '',
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

        let primStyles = [];
        if (Array.isArray(app.teachingExperience?.primaryTeachingStyles)) {
          primStyles = app.teachingExperience.primaryTeachingStyles;
        } else if (app.teachingExperience?.primaryTeachingStyle) {
          primStyles = [app.teachingExperience.primaryTeachingStyle];
        }

        setFormData({
          personalInfo: {
            fullName: app.personalInfo?.fullName || user?.fullName || '',
            email: app.personalInfo?.email || user?.email || '',
            country: app.personalInfo?.country || 'India',
            countryCode: app.personalInfo?.countryCode || '+91',
            phone: app.personalInfo?.phone || '',
            professionalTitle: app.personalInfo?.professionalTitle || '',
            professionalTitleOther: app.personalInfo?.professionalTitleOther || '',
            bio: app.personalInfo?.bio || '',
            photoUrl: app.personalInfo?.photoUrl || user?.avatar || ''
          },
          professionalInfo: {
            currentRole: app.professionalInfo?.currentRole || '',
            organization: app.professionalInfo?.organization || '',
            yearsOfExperience: app.professionalInfo?.yearsOfExperience || '1 - 3 Years',
            linkedinUrl: app.professionalInfo?.linkedinUrl || '',
            websiteUrl: app.professionalInfo?.websiteUrl || '',
            keySkills: parsedSkills
          },
          education: {
            degree: app.education?.degree || '',
            degreeOther: app.education?.degreeOther || '',
            fieldOfStudy: app.education?.fieldOfStudy || '',
            fieldOfStudyOther: app.education?.fieldOfStudyOther || '',
            institution: app.education?.institution || '',
            graduationYear: app.education?.graduationYear || ''
          },
          teachingExperience: {
            priorExperience: app.teachingExperience?.priorExperience || 'Yes, online & offline',
            targetStudentLevel: app.teachingExperience?.targetStudentLevel || 'Beginner to Intermediate',
            primaryTeachingStyles: primStyles,
            primaryTeachingStyleOther: app.teachingExperience?.primaryTeachingStyleOther || '',
            sampleVideoUrl: app.teachingExperience?.sampleVideoUrl || ''
          },
          coursesExpertise: {
            primaryCategory: app.coursesExpertise?.primaryCategory || 'Web Development',
            primaryCategoryOther: app.coursesExpertise?.primaryCategoryOther || '',
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

  // Country Selection Handler
  const handleCountrySelect = (countryName, countryObj) => {
    const selected = countryObj || findCountryByNameOrCode(countryName);
    const country = selected.name;
    const countryCode = selected.callingCode;

    // Truncate phone to new country limit
    const digitsOnly = formData.personalInfo.phone.replace(/\D/g, '');
    const maxLen = selected.maxLength || 10;
    const truncatedPhone = digitsOnly.slice(0, maxLen);

    const updatedPersonalInfo = {
      ...formData.personalInfo,
      country,
      countryCode,
      phone: truncatedPhone
    };

    const updated = {
      ...formData,
      personalInfo: updatedPersonalInfo
    };
    setFormData(updated);
    if (errorMessage) setErrorMessage('');

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      saveToServer(updated, activeStep);
    }, 800);
  };

  // Phone Input Handler — Accepts Digits Only & Enforces Strict Country Max Length
  const handlePhoneInputChange = (e) => {
    const rawVal = e.target.value;
    const digitsOnly = rawVal.replace(/\D/g, '');

    const selectedCountry = findCountryByNameOrCode(
      formData.personalInfo.country,
      formData.personalInfo.countryCode
    );
    const maxLen = selectedCountry.maxLength || 10;

    // Reject extra digits during typing
    const boundedValue = digitsOnly.slice(0, maxLen);

    handleInputChange('personalInfo', 'phone', boundedValue);
  };

  // Primary Teaching Style Checkbox Toggle (Single Checkbox Group - Multiple Selections Allowed)
  const handlePrimaryStyleToggle = (style) => {
    const currentStyles = formData.teachingExperience.primaryTeachingStyles || [];
    let updatedStyles = [];

    if (currentStyles.includes(style)) {
      updatedStyles = currentStyles.filter((s) => s !== style);
    } else {
      updatedStyles = [...currentStyles, style];
    }

    const updatedTeachExp = {
      ...formData.teachingExperience,
      primaryTeachingStyles: updatedStyles,
      primaryTeachingStyleOther: updatedStyles.includes('Other')
        ? formData.teachingExperience.primaryTeachingStyleOther
        : ''
    };

    const updated = {
      ...formData,
      teachingExperience: updatedTeachExp
    };
    setFormData(updated);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      saveToServer(updated, activeStep);
    }, 800);
  };

  // Profile Photo Native Device File Upload Handler
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Profile photo size must be less than 5MB.');
      return;
    }

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

        const storedUser = localStorage.getItem('upskillr_user');
        if (storedUser) {
          try {
            const u = JSON.parse(storedUser);
            u.avatar = data.photoUrl;
            localStorage.setItem('upskillr_user', JSON.stringify(u));
            window.dispatchEvent(new Event('upskillr_user_updated'));
          } catch (err) {}
        }

        setAutoSaveStatus('saved');
        setSuccessMessage('Profile photo updated successfully!');
        setTimeout(() => {
          setSuccessMessage('');
          setAutoSaveStatus('idle');
        }, 3000);
      } else {
        setErrorMessage(data.message || 'Failed to upload photo.');
        setAutoSaveStatus('error');
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      setErrorMessage('Network error while uploading photo.');
      setAutoSaveStatus('error');
    }
  };

  // Remove Photo Handler
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

        const storedUser = localStorage.getItem('upskillr_user');
        if (storedUser) {
          try {
            const u = JSON.parse(storedUser);
            u.avatar = '';
            localStorage.setItem('upskillr_user', JSON.stringify(u));
            window.dispatchEvent(new Event('upskillr_user_updated'));
          } catch (err) {}
        }

        setAutoSaveStatus('saved');
        setSuccessMessage('Profile photo removed.');
        setTimeout(() => {
          setSuccessMessage('');
          setAutoSaveStatus('idle');
        }, 3000);
      }
    } catch (err) {
      setErrorMessage('Failed to remove photo.');
      setAutoSaveStatus('error');
    }
  };

  // Resume File Upload Handler
  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Resume file size must be less than 10MB.');
      return;
    }

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.doc', '.docx'].includes(ext)) {
      setErrorMessage('Please select a valid document format (.pdf, .doc, or .docx).');
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
        setSuccessMessage('Resume document uploaded successfully!');
        setTimeout(() => {
          setSuccessMessage('');
          setAutoSaveStatus('idle');
        }, 3000);
      } else {
        setErrorMessage(data.message || 'Failed to upload resume.');
        setAutoSaveStatus('error');
      }
    } catch (err) {
      console.error('Resume upload error:', err);
      setErrorMessage('Network error while uploading resume.');
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
        setSuccessMessage('Resume document removed.');
        setTimeout(() => {
          setSuccessMessage('');
          setAutoSaveStatus('idle');
        }, 3000);
      }
    } catch (err) {
      setErrorMessage('Failed to remove resume.');
      setAutoSaveStatus('error');
    }
  };

  // Certificate File Upload Handler for Certification Modal
  const handleCertFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setCertModalError('Certificate file size must be less than 10MB.');
      return;
    }

    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExts.includes(ext)) {
      setCertModalError('Please select a valid certificate file (PDF, JPG, PNG, or WEBP).');
      return;
    }

    setCertModalError('');
    setCertUploading(true);

    const formDataPayload = new FormData();
    formDataPayload.append('file', file);

    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE_URL}/upload/certificate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataPayload
      });
      const data = await response.json();

      if (data.success && data.certificateFile) {
        setCertForm((prev) => ({
          ...prev,
          certificateFile: data.certificateFile
        }));
      } else {
        setCertModalError(data.message || 'Failed to upload certificate file.');
      }
    } catch (err) {
      console.error('Certificate file upload error:', err);
      setCertModalError('Network error while uploading certificate file.');
    } finally {
      setCertUploading(false);
    }
  };

  // Remove Certificate File Handler
  const handleRemoveCertFile = () => {
    setCertForm((prev) => ({
      ...prev,
      certificateFile: { url: '', originalName: '', size: 0, mimeType: '' }
    }));
  };

  // Skill Tag Handlers
  const handleAddSkill = (skillText) => {
    const trimmed = skillText.trim();
    if (!trimmed) return;
    const currentSkills = formData.professionalInfo.keySkills || [];
    if (currentSkills.includes(trimmed)) {
      setSkillInputValue('');
      return;
    }
    const updatedSkills = [...currentSkills, trimmed];
    const updated = {
      ...formData,
      professionalInfo: {
        ...formData.professionalInfo,
        keySkills: updatedSkills
      }
    };
    setFormData(updated);
    setSkillInputValue('');
    saveToServer(updated, activeStep);
  };

  const handleRemoveSkill = (indexToRemove) => {
    const currentSkills = formData.professionalInfo.keySkills || [];
    const updatedSkills = currentSkills.filter((_, idx) => idx !== indexToRemove);
    const updated = {
      ...formData,
      professionalInfo: {
        ...formData.professionalInfo,
        keySkills: updatedSkills
      }
    };
    setFormData(updated);
    saveToServer(updated, activeStep);
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

  // Certification Modal Management
  const handleOpenCertModal = (indexToEdit = null) => {
    setCertModalError('');
    if (indexToEdit !== null) {
      const existing = formData.coursesExpertise.certifications[indexToEdit];
      setEditingCertIndex(indexToEdit);
      setCertForm({
        name: existing.name || '',
        issuingOrganization: existing.issuingOrganization || '',
        issueDate: existing.issueDate || '',
        expirationDate: existing.expirationDate || '',
        doesNotExpire: existing.doesNotExpire || false,
        credentialId: existing.credentialId || '',
        credentialUrl: existing.credentialUrl || '',
        certificateFile: existing.certificateFile || { url: '', originalName: '', size: 0, mimeType: '' }
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
        credentialUrl: '',
        certificateFile: { url: '', originalName: '', size: 0, mimeType: '' }
      });
    }
    setShowCertModal(true);
  };

  const handleSaveCert = () => {
    if (!certForm.name.trim() || !certForm.issuingOrganization.trim()) {
      setCertModalError('Fill required information');
      return;
    }
    setCertModalError('');

    const currentCerts = [...(formData.coursesExpertise.certifications || [])];
    if (editingCertIndex !== null) {
      currentCerts[editingCertIndex] = certForm;
    } else {
      currentCerts.push(certForm);
    }

    const updated = {
      ...formData,
      coursesExpertise: {
        ...formData.coursesExpertise,
        certifications: currentCerts
      }
    };
    setFormData(updated);
    setShowCertModal(false);
    saveToServer(updated, activeStep);
  };

  const handleRemoveCert = (indexToRemove) => {
    const currentCerts = (formData.coursesExpertise.certifications || []).filter(
      (_, idx) => idx !== indexToRemove
    );
    const updated = {
      ...formData,
      coursesExpertise: {
        ...formData.coursesExpertise,
        certifications: currentCerts
      }
    };
    setFormData(updated);
    saveToServer(updated, activeStep);
  };

  // Step Navigation Handlers
  const handleSaveAndContinue = () => {
    setErrorMessage('');
    const next = Math.min(activeStep + 1, 7);
    setActiveStep(next);
    saveToServer(formData, next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setErrorMessage('');
    const prev = Math.max(activeStep - 1, 1);
    setActiveStep(prev);
    saveToServer(formData, prev);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit Application Handler
  const handleSubmitApplication = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    const sectionErrors = getSectionValidationErrors(formData);
    const hasSectionErrors = Object.values(sectionErrors).some(Boolean);

    if (hasSectionErrors) {
      setErrorMessage('Please complete all missing required fields before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('upskillr_token');

      // Save final data state first
      await fetch(API_BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...formData, currentSection: 7 })
      });

      // Submit application
      const response = await fetch(`${API_BASE_URL}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        if (data.user) {
          localStorage.setItem('upskillr_user', JSON.stringify(data.user));
          window.dispatchEvent(new Event('upskillr_user_updated'));
        }
        setSuccessMessage('Application submitted successfully! Redirecting to Instructor Studio...');
        setTimeout(() => {
          navigate('/instructor/dashboard');
        }, 1500);
      } else {
        setErrorMessage(data.message || 'Failed to submit application.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setErrorMessage('Network error while submitting application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="app-loading-screen">
        <RefreshCw className="spinner-icon" size={36} />
        <span>Loading your application progress...</span>
      </div>
    );
  }

  const steps = [
    { id: 1, name: 'Personal Info', icon: User },
    { id: 2, name: 'Professional Info', icon: Briefcase },
    { id: 3, name: 'Education', icon: GraduationCap },
    { id: 4, name: 'Teaching Experience', icon: Video },
    { id: 5, name: 'Courses & Expertise', icon: Award },
    { id: 6, name: 'Documents', icon: FileText },
    { id: 7, name: 'Review & Submit', icon: CheckCircle2 }
  ];

  const photoFullUrl = formData.personalInfo.photoUrl
    ? formData.personalInfo.photoUrl.startsWith('http')
      ? formData.personalInfo.photoUrl
      : `http://localhost:5000${formData.personalInfo.photoUrl}`
    : '';

  const currentSelectedCountry = findCountryByNameOrCode(
    formData.personalInfo.country,
    formData.personalInfo.countryCode
  );

  const sectionErrors = getSectionValidationErrors(formData);
  const hasReviewErrors = Object.values(sectionErrors).some(Boolean);

  // Compute filtered skill suggestions for the Key Technical Skills dropdown
  const currentSelectedSkills = formData.professionalInfo.keySkills || [];
  const filteredSkillSuggestions = POPULAR_SKILLS.filter(
    (skill) =>
      !currentSelectedSkills.includes(skill) &&
      (!skillInputValue || skill.toLowerCase().includes(skillInputValue.toLowerCase()))
  );

  return (
    <div className="instructor-application-page">
      {/* Top Application Header Navigation */}
      <header className="app-header-nav">
        <div className="app-header-container">
          <a
            href="/"
            className="app-brand"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
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

            <button type="button" className="btn-save-exit" onClick={() => setShowLogoutModal(true)}>
              <LogOut size={16} />
              <span>Save & Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
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

        {/* Right Column: Active Form Workspace Section */}
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

              {/* Country & Phone Number Fields */}
              <div className="form-grid-2col" style={{ marginTop: '1rem' }}>
                <div className="form-group-field">
                  <label className="field-label">Country <span className="required-star">*</span></label>
                  <SearchableSelect
                    value={formData.personalInfo.country}
                    onChange={(val, opt) => handleCountrySelect(val, opt)}
                    options={ALL_COUNTRIES}
                    placeholder="Search country..."
                    allowCustom={false}
                    getOptionValue={(c) => c.name}
                    getOptionLabel={(c) => c.name}
                  />
                </div>

                <div className="form-group-field">
                  <label className="field-label">Phone Number <span className="required-star">*</span></label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div
                      style={{
                        padding: '10px 14px',
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md, 8px)',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        minWidth: '70px',
                        textAlign: 'center',
                        fontSize: '0.95rem'
                      }}
                    >
                      {formData.personalInfo.countryCode || '+91'}
                    </div>
                    <input
                      type="tel"
                      className="field-input"
                      placeholder={`e.g. ${'9'.repeat(currentSelectedCountry.maxLength)}`}
                      value={formData.personalInfo.phone}
                      onChange={handlePhoneInputChange}
                      maxLength={currentSelectedCountry.maxLength}
                      required
                    />
                  </div>
                  {formData.personalInfo.phone &&
                    formData.personalInfo.phone.replace(/\D/g, '').length !== currentSelectedCountry.maxLength && (
                      <span className="field-hint" style={{ color: '#ef4444', marginTop: '4px' }}>
                        {currentSelectedCountry.name} phone numbers must contain {currentSelectedCountry.maxLength} digits.
                      </span>
                    )}
                </div>
              </div>

              {/* Professional Title Searchable Select + Specify Other */}
              <div className="form-group-field" style={{ marginTop: '1rem' }}>
                <label className="field-label">Professional Title <span className="required-star">*</span></label>
                <SearchableSelect
                  value={formData.personalInfo.professionalTitle}
                  onChange={(val) => {
                    const updatedPersonalInfo = {
                      ...formData.personalInfo,
                      professionalTitle: val,
                      professionalTitleOther: val === 'Other' ? formData.personalInfo.professionalTitleOther : ''
                    };
                    const updated = { ...formData, personalInfo: updatedPersonalInfo };
                    setFormData(updated);
                    saveToServer(updated, activeStep);
                  }}
                  options={PROFESSIONAL_TITLE_OPTIONS}
                  placeholder="Select Professional Title..."
                  allowCustom={false}
                />
              </div>

              {formData.personalInfo.professionalTitle === 'Other' && (
                <div className="form-group-field" style={{ marginTop: '0.75rem' }}>
                  <label className="field-label">Please specify:</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. Blockchain Research Specialist"
                    value={formData.personalInfo.professionalTitleOther}
                    onChange={(e) => handleInputChange('personalInfo', 'professionalTitleOther', e.target.value)}
                  />
                </div>
              )}

              <div className="form-group-field" style={{ marginTop: '1rem' }}>
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
                  <SearchableSelect
                    value={formData.professionalInfo.yearsOfExperience}
                    onChange={(val) => handleInputChange('professionalInfo', 'yearsOfExperience', val)}
                    options={YEARS_EXPERIENCE_OPTIONS}
                    placeholder="Select experience..."
                    allowCustom={false}
                  />
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

              {/* Key Technical Skills & Expertise Tag Input with Autocomplete Suggestions Dropdown */}
              <div className="form-group-field" style={{ position: 'relative' }}>
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
                    onChange={(e) => {
                      setSkillInputValue(e.target.value);
                      setIsSkillDropdownOpen(true);
                    }}
                    onFocus={() => setIsSkillDropdownOpen(true)}
                    onKeyDown={handleSkillKeyDown}
                    onBlur={() => {
                      setTimeout(() => setIsSkillDropdownOpen(false), 200);
                      if (skillInputValue.trim()) {
                        handleAddSkill(skillInputValue);
                      }
                    }}
                  />
                </div>

                {isSkillDropdownOpen && filteredSkillSuggestions.length > 0 && (
                  <div className="skills-dropdown-menu">
                    {filteredSkillSuggestions.map((skill, i) => (
                      <div
                        key={i}
                        className="skills-dropdown-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleAddSkill(skill);
                          setIsSkillDropdownOpen(false);
                        }}
                      >
                        <span>{skill}</span>
                      </div>
                    ))}
                  </div>
                )}

                <span className="field-hint">
                  Press Enter or comma to create a skill tag, or select from suggestions dropdown.
                </span>
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
                  <label className="field-label">Highest Degree <span className="required-star">*</span></label>
                  <SearchableSelect
                    value={formData.education.degree}
                    onChange={(val) => {
                      const updatedEdu = {
                        ...formData.education,
                        degree: val,
                        degreeOther: val === 'Other' ? formData.education.degreeOther : ''
                      };
                      const updated = { ...formData, education: updatedEdu };
                      setFormData(updated);
                      saveToServer(updated, activeStep);
                    }}
                    options={HIGHEST_DEGREE_OPTIONS}
                    placeholder="Select degree..."
                    allowCustom={false}
                  />
                </div>

                <div className="form-group-field">
                  <label className="field-label">Field of Study</label>
                  <SearchableSelect
                    value={formData.education.fieldOfStudy}
                    onChange={(val) => {
                      const updatedEdu = {
                        ...formData.education,
                        fieldOfStudy: val,
                        fieldOfStudyOther: val === 'Other' ? formData.education.fieldOfStudyOther : ''
                      };
                      const updated = { ...formData, education: updatedEdu };
                      setFormData(updated);
                      saveToServer(updated, activeStep);
                    }}
                    options={FIELD_OF_STUDY_OPTIONS}
                    placeholder="Select field of study..."
                    allowCustom={false}
                  />
                </div>
              </div>

              {formData.education.degree === 'Other' && (
                <div className="form-group-field" style={{ marginTop: '0.75rem' }}>
                  <label className="field-label">Please specify your degree:</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. Master of Computer Applications"
                    value={formData.education.degreeOther}
                    onChange={(e) => handleInputChange('education', 'degreeOther', e.target.value)}
                  />
                </div>
              )}

              {formData.education.fieldOfStudy === 'Other' && (
                <div className="form-group-field" style={{ marginTop: '0.75rem' }}>
                  <label className="field-label">Please specify your field of study:</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. Quantum Computing"
                    value={formData.education.fieldOfStudyOther}
                    onChange={(e) => handleInputChange('education', 'fieldOfStudyOther', e.target.value)}
                  />
                </div>
              )}

              <div className="form-grid-2col" style={{ marginTop: '1rem' }}>
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
                  <SearchableSelect
                    value={formData.teachingExperience.priorExperience}
                    onChange={(val) => handleInputChange('teachingExperience', 'priorExperience', val)}
                    options={PRIOR_EXPERIENCE_OPTIONS}
                    placeholder="Select prior experience..."
                    allowCustom={false}
                  />
                </div>

                <div className="form-group-field">
                  <label className="field-label">Target Student Level</label>
                  <SearchableSelect
                    value={formData.teachingExperience.targetStudentLevel}
                    onChange={(val) => handleInputChange('teachingExperience', 'targetStudentLevel', val)}
                    options={TARGET_LEVEL_OPTIONS}
                    placeholder="Select target level..."
                    allowCustom={false}
                  />
                </div>
              </div>

              {/* SINGLE Primary Teaching Style Checkbox Group */}
              <div className="form-group-field" style={{ marginTop: '1.5rem' }}>
                <label className="field-label">Primary Teaching Style <span className="required-star">*</span> (Select all that apply)</label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '10px',
                    marginTop: '8px'
                  }}
                >
                  {TEACHING_STYLE_OPTIONS.map((style, idx) => {
                    const isChecked = (formData.teachingExperience.primaryTeachingStyles || []).includes(style);
                    return (
                      <label
                        key={idx}
                        className="checkbox-label-row"
                        style={{
                          padding: '10px 12px',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md, 8px)',
                          backgroundColor: isChecked ? 'var(--brand-soft, rgba(16, 185, 129, 0.15))' : 'var(--background)',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handlePrimaryStyleToggle(style)}
                        />
                        <span style={{ fontWeight: isChecked ? 600 : 400, color: 'var(--text-primary)' }}>{style}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {(formData.teachingExperience.primaryTeachingStyles || []).includes('Other') && (
                <div className="form-group-field" style={{ marginTop: '0.75rem' }}>
                  <label className="field-label">Please describe your primary teaching style:</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="Describe your custom primary teaching style..."
                    value={formData.teachingExperience.primaryTeachingStyleOther}
                    onChange={(e) => handleInputChange('teachingExperience', 'primaryTeachingStyleOther', e.target.value)}
                  />
                </div>
              )}

              <div className="form-group-field" style={{ marginTop: '1rem' }}>
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
                <h1 className="section-title">Courses & Expertise</h1>
                <p className="section-subtitle">Outline your primary teaching domain and add your relevant certifications.</p>
              </div>

              <div className="form-group-field">
                <label className="field-label">Primary Teaching Category <span className="required-star">*</span></label>
                <SearchableSelect
                  value={formData.coursesExpertise.primaryCategory}
                  onChange={(val) => {
                    const updatedCoursesExp = {
                      ...formData.coursesExpertise,
                      primaryCategory: val,
                      primaryCategoryOther: val === 'Other' ? formData.coursesExpertise.primaryCategoryOther : ''
                    };
                    const updated = { ...formData, coursesExpertise: updatedCoursesExp };
                    setFormData(updated);
                    saveToServer(updated, activeStep);
                  }}
                  options={PRIMARY_CATEGORY_OPTIONS}
                  placeholder="Select primary category..."
                  allowCustom={false}
                />
              </div>

              {formData.coursesExpertise.primaryCategory === 'Other' && (
                <div className="form-group-field" style={{ marginTop: '0.75rem' }}>
                  <label className="field-label">Please specify your primary teaching category:</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. Industry-focused software development"
                    value={formData.coursesExpertise.primaryCategoryOther}
                    onChange={(e) => handleInputChange('coursesExpertise', 'primaryCategoryOther', e.target.value)}
                  />
                </div>
              )}

              {/* Structured Certifications Section with Certificate Upload */}
              <div className="certifications-section-container" style={{ marginTop: '1.5rem' }}>
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

                        {/* Uploaded Certificate File Card */}
                        {cert.certificateFile?.url && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              marginTop: '8px',
                              padding: '8px 12px',
                              backgroundColor: 'var(--background)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-md, 6px)'
                            }}
                          >
                            <FileText size={16} style={{ color: 'var(--brand-primary)' }} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {cert.certificateFile.originalName || 'Certificate Document'}
                            </span>
                            <a
                              href={
                                cert.certificateFile.url.startsWith('http')
                                  ? cert.certificateFile.url
                                  : `http://localhost:5000${cert.certificateFile.url}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                marginLeft: 'auto',
                                fontSize: '0.8rem',
                                color: 'var(--brand-primary)',
                                textDecoration: 'underline',
                                fontWeight: 600
                              }}
                            >
                              View Certificate
                            </a>
                          </div>
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
                <label className="field-label">Additional Notes for Reviewers</label>
                <textarea
                  className="field-textarea"
                  placeholder="Any additional details or special requests..."
                  value={formData.documents.additionalNotes}
                  onChange={(e) => handleInputChange('documents', 'additionalNotes', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 7: Review & Submit (Single "Required information missing" Warning Per Incomplete Section) */}
          {activeStep === 7 && (
            <div className="form-section-content">
              <div className="form-section-header">
                <span className="section-badge">Section 7 of 7</span>
                <h1 className="section-title">Review & Submit Application</h1>
                <p className="section-subtitle">Please review your information before final submission.</p>
              </div>

              <div className="review-sections-list">
                {/* 1. Personal Information Summary */}
                <div className="review-section-card">
                  <div className="review-card-header">
                    <span className="review-card-title">
                      <User size={18} style={{ color: 'var(--brand-primary)' }} />
                      Personal Information
                    </span>
                    <button type="button" className="review-edit-btn" onClick={() => setActiveStep(1)}>Edit</button>
                  </div>
                  <div className="review-card-grid">
                    <div className="review-field-item">
                      <span className="review-field-label">Full Name</span>
                      <span className="review-field-val">{formData.personalInfo.fullName || 'Not provided'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Email</span>
                      <span className="review-field-val">{formData.personalInfo.email || 'Not provided'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Country</span>
                      <span className="review-field-val">{formData.personalInfo.country} ({formData.personalInfo.countryCode})</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Phone</span>
                      <span className="review-field-val">
                        {formData.personalInfo.phone
                          ? `${formData.personalInfo.countryCode} ${formData.personalInfo.phone}`
                          : 'Not provided'}
                      </span>
                    </div>
                    <div className="review-field-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="review-field-label">Professional Title</span>
                      <span className="review-field-val">
                        {formData.personalInfo.professionalTitle === 'Other'
                          ? formData.personalInfo.professionalTitleOther || 'Not specified'
                          : formData.personalInfo.professionalTitle || 'Not provided'}
                      </span>
                    </div>
                  </div>
                  {sectionErrors.personalInfo && (
                    <div className="review-section-warning">
                      <AlertCircle size={15} />
                      <span>Required information missing</span>
                    </div>
                  )}
                </div>

                {/* 2. Professional Information Summary */}
                <div className="review-section-card">
                  <div className="review-card-header">
                    <span className="review-card-title">
                      <Briefcase size={18} style={{ color: 'var(--brand-primary)' }} />
                      Professional Information
                    </span>
                    <button type="button" className="review-edit-btn" onClick={() => setActiveStep(2)}>Edit</button>
                  </div>
                  <div className="review-card-grid">
                    <div className="review-field-item">
                      <span className="review-field-label">Current Role</span>
                      <span className="review-field-val">{formData.professionalInfo.currentRole || 'Not provided'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Organization</span>
                      <span className="review-field-val">{formData.professionalInfo.organization || '—'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Experience</span>
                      <span className="review-field-val">{formData.professionalInfo.yearsOfExperience || 'Not provided'}</span>
                    </div>
                    <div className="review-field-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="review-field-label">Key Skills</span>
                      <span className="review-field-val">
                        {(formData.professionalInfo.keySkills || []).join(', ') || '—'}
                      </span>
                    </div>
                  </div>
                  {sectionErrors.professionalInfo && (
                    <div className="review-section-warning">
                      <AlertCircle size={15} />
                      <span>Required information missing</span>
                    </div>
                  )}
                </div>

                {/* 3. Education Summary */}
                <div className="review-section-card">
                  <div className="review-card-header">
                    <span className="review-card-title">
                      <GraduationCap size={18} style={{ color: 'var(--brand-primary)' }} />
                      Education
                    </span>
                    <button type="button" className="review-edit-btn" onClick={() => setActiveStep(3)}>Edit</button>
                  </div>
                  <div className="review-card-grid">
                    <div className="review-field-item">
                      <span className="review-field-label">Highest Degree</span>
                      <span className="review-field-val">
                        {formData.education.degree === 'Other'
                          ? formData.education.degreeOther || 'Not specified'
                          : formData.education.degree || 'Not provided'}
                      </span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Field of Study</span>
                      <span className="review-field-val">
                        {formData.education.fieldOfStudy === 'Other'
                          ? formData.education.fieldOfStudyOther || 'Not specified'
                          : formData.education.fieldOfStudy || 'Not provided'}
                      </span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Institution</span>
                      <span className="review-field-val">{formData.education.institution || 'Not provided'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Graduation Year</span>
                      <span className="review-field-val">{formData.education.graduationYear || '—'}</span>
                    </div>
                  </div>
                  {sectionErrors.education && (
                    <div className="review-section-warning">
                      <AlertCircle size={15} />
                      <span>Required information missing</span>
                    </div>
                  )}
                </div>

                {/* 4. Teaching Experience Summary */}
                <div className="review-section-card">
                  <div className="review-card-header">
                    <span className="review-card-title">
                      <Video size={18} style={{ color: 'var(--brand-primary)' }} />
                      Teaching Experience
                    </span>
                    <button type="button" className="review-edit-btn" onClick={() => setActiveStep(4)}>Edit</button>
                  </div>
                  <div className="review-card-grid">
                    <div className="review-field-item">
                      <span className="review-field-label">Prior Experience</span>
                      <span className="review-field-val">{formData.teachingExperience.priorExperience || 'Not provided'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Target Level</span>
                      <span className="review-field-val">{formData.teachingExperience.targetStudentLevel || '—'}</span>
                    </div>
                    <div className="review-field-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="review-field-label">Primary Teaching Style</span>
                      <span className="review-field-val">
                        {(formData.teachingExperience.primaryTeachingStyles || []).join(', ') || 'Not provided'}
                        {formData.teachingExperience.primaryTeachingStyleOther
                          ? ` (${formData.teachingExperience.primaryTeachingStyleOther})`
                          : ''}
                      </span>
                    </div>
                  </div>
                  {sectionErrors.teachingExperience && (
                    <div className="review-section-warning">
                      <AlertCircle size={15} />
                      <span>Required information missing</span>
                    </div>
                  )}
                </div>

                {/* 5. Courses & Expertise Summary */}
                <div className="review-section-card">
                  <div className="review-card-header">
                    <span className="review-card-title">
                      <Award size={18} style={{ color: 'var(--brand-primary)' }} />
                      Courses & Expertise
                    </span>
                    <button type="button" className="review-edit-btn" onClick={() => setActiveStep(5)}>Edit</button>
                  </div>
                  <div className="review-card-grid">
                    <div className="review-field-item">
                      <span className="review-field-label">Primary Category</span>
                      <span className="review-field-val">
                        {formData.coursesExpertise.primaryCategory === 'Other'
                          ? formData.coursesExpertise.primaryCategoryOther || 'Not specified'
                          : formData.coursesExpertise.primaryCategory || 'Not provided'}
                      </span>
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
                  {sectionErrors.coursesExpertise && (
                    <div className="review-section-warning">
                      <AlertCircle size={15} />
                      <span>Required information missing</span>
                    </div>
                  )}
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
                      <span className="review-field-val">{formData.documents.idDocumentRef || 'Not provided'}</span>
                    </div>
                    <div className="review-field-item">
                      <span className="review-field-label">Resume</span>
                      <span className="review-field-val">
                        {formData.documents.resume?.url
                          ? formData.documents.resume.originalName || 'Attached Document'
                          : 'Not provided'}
                      </span>
                    </div>
                  </div>
                  {sectionErrors.documents && (
                    <div className="review-section-warning">
                      <AlertCircle size={15} />
                      <span>Required information missing</span>
                    </div>
                  )}
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
                disabled={submitting || hasReviewErrors}
                title={hasReviewErrors ? 'Please complete all missing required fields above' : ''}
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

            {/* In-place Modal Validation Warning */}
            {certModalError && (
              <div className="cert-modal-warning">
                <AlertCircle size={14} />
                <span>{certModalError}</span>
              </div>
            )}

            <div className="form-group-field">
              <label className="field-label">Certification Name <span className="required-star">*</span></label>
              <input
                type="text"
                className="field-input"
                placeholder="e.g. AWS Certified Developer"
                value={certForm.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setCertForm({ ...certForm, name: val });
                  if (val.trim() && certForm.issuingOrganization.trim()) {
                    setCertModalError('');
                  }
                }}
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
                onChange={(e) => {
                  const val = e.target.value;
                  setCertForm({ ...certForm, issuingOrganization: val });
                  if (val.trim() && certForm.name.trim()) {
                    setCertModalError('');
                  }
                }}
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

            {/* Native Certificate File Upload Field */}
            <div className="form-group-field" style={{ marginTop: '1rem' }}>
              <label className="field-label">Certificate File</label>
              <input
                type="file"
                ref={certFileInputRef}
                accept="application/pdf,image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleCertFileUpload}
              />

              {certForm.certificateFile?.url ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md, 8px)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={20} style={{ color: 'var(--brand-primary)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {certForm.certificateFile.originalName || 'Certificate Document'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatFileSize(certForm.certificateFile.size)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <a
                      href={
                        certForm.certificateFile.url.startsWith('http')
                          ? certForm.certificateFile.url
                          : `http://localhost:5000${certForm.certificateFile.url}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="btn-upload-action"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', textDecoration: 'none' }}
                    >
                      <ExternalLink size={13} />
                      <span>View</span>
                    </a>

                    <button
                      type="button"
                      className="btn-upload-action"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                      onClick={() => certFileInputRef.current?.click()}
                      disabled={certUploading}
                    >
                      <Upload size={13} />
                      <span>Replace</span>
                    </button>

                    <button
                      type="button"
                      className="btn-remove-action"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
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
                  className="btn-upload-action"
                  style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                  onClick={() => certFileInputRef.current?.click()}
                  disabled={certUploading}
                >
                  <Upload size={16} />
                  <span>{certUploading ? 'Uploading Certificate...' : 'Upload Certificate'}</span>
                </button>
              )}
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

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={onLogout}
      />
    </div>
  );
};
