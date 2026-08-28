import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import Signin_page from '../../assets/illustrations/Signin_page.svg';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  ArrowLeft,
  Sun,
  Moon,
  GraduationCap,
  Presentation,
  ShieldAlert,
  CheckCircle2,
  MailCheck,
  KeyRound,
  BookOpen
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api/auth';

export default function SignUp() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [role, setRole] = useState('learner'); // 'learner' or 'instructor'
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Email Verification OTP State
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
  };

  // Handle URL search params on mount (for OAuth callbacks, errors, or role pre-selection)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    const errorParam = urlParams.get('error');
    const providerParam = urlParams.get('provider');
    const roleParam = urlParams.get('role');

    if (roleParam === 'instructor' || roleParam === 'learner') {
      setRole(roleParam);
    }

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('upskillr_token', token);
        localStorage.setItem('upskillr_user', JSON.stringify(user));
        const successMsg = `Successfully signed in via ${providerParam ? providerParam.toUpperCase() : 'OAuth'}! Welcome, ${user.fullName}.`;
        setSuccessMessage(successMsg);
        toast.success(successMsg);
        setTimeout(() => {
          if (user.role === 'instructor') {
            navigate('/instructor');
          } else {
            navigate('/learner');
          }
        }, 1000);
      } catch (e) {
        console.error('Failed to parse user data from OAuth callback');
      }
    } else if (errorParam) {
      let oauthErrorMsg = 'Authentication failed. Please try again.';
      if (errorParam === 'google_oauth_failed') {
        oauthErrorMsg = 'Google OAuth authentication failed. Please try again.';
      } else if (errorParam === 'github_oauth_failed') {
        oauthErrorMsg = 'GitHub OAuth authentication failed. Please try again.';
      }
      setErrorMessage(oauthErrorMsg);
      toast.error(oauthErrorMsg);
    }
  }, [toast]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleManualSignUp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!formData.password) {
      setErrorMessage('Please enter a password.');
      return;
    }
    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: role
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Registration failed.');
      }

      // Backend always sends OTP email before saving to MongoDB.
      // Show the OTP verification step so the user can verify and complete registration.
      setUnverifiedEmail(formData.email);
      setShowOtpStep(true);
      const codeSentMsg = `Verification code sent to ${formData.email}. Enter the 6-digit code to complete registration.`;
      setSuccessMessage(codeSentMsg);
      toast.success(codeSentMsg);
    } catch (err) {
      const regErrorMsg = err.message || 'Registration failed. Please try again.';
      setErrorMessage(regErrorMsg);
      toast.error(regErrorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!otpCode.trim() || otpCode.length < 6) {
      setErrorMessage('Please enter a valid 6-digit OTP code.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: unverifiedEmail,
          otp: otpCode.trim()
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'OTP Verification failed.');
      }

      if (data.token) {
        localStorage.setItem('upskillr_token', data.token);
        localStorage.setItem('upskillr_user', JSON.stringify(data.user));
      }

      const isInstructor = data.user?.role === 'instructor';
      const welcomeMsg = `Email verified successfully! Welcome to UpSkillr, ${data.user?.fullName}!`;
      setSuccessMessage(welcomeMsg);
      toast.success(welcomeMsg);
      setShowOtpStep(false);

      setTimeout(() => {
        if (isInstructor) {
          navigate('/instructor');
        } else {
          navigate('/learner');
        }
      }, 1000);
    } catch (err) {
      const otpErrorMsg = err.message || 'Invalid or expired OTP code.';
      setErrorMessage(otpErrorMsg);
      toast.error(otpErrorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setResendLoading(true);

    try {
      // Backend route is /send-otp (not /resend-otp)
      const response = await fetch(`${API_BASE_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unverifiedEmail })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to resend verification code.');
      }

      const resentMsg = data.message || 'A new verification code has been sent to your email.';
      setSuccessMessage(resentMsg);
      toast.success(resentMsg);
    } catch (err) {
      const resendErrorMsg = err.message || 'Could not resend code. Please try again.';
      setErrorMessage(resendErrorMsg);
      toast.error(resendErrorMsg);
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleOAuth = () => {
    window.location.href = `${API_BASE_URL}/google?role=${role}`;
  };

  const handleGithubOAuth = () => {
    window.location.href = `${API_BASE_URL}/github?role=${role}`;
  };

  return (
    <div className="signup-page">
      {/* Top Header Navigation */}
      <header className="auth-nav">
        <a
          href="/"
          className="navbar-logo"
          aria-label="UpSkillr Home"
          onClick={(e) => { e.preventDefault(); navigate('/'); }}
        >
          <div className="logo-icon-wrapper">
            <BookOpen className="logo-icon" size={24} aria-hidden="true" />
          </div>
          <span className="logo-text">UpSkillr</span>
        </a>

        <div className="auth-nav-actions">
          <a
            href="/"
            className="back-to-home-btn"
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
            title="Return to UpSkillr Home"
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="signup-container">
        {/* Left Column: Hero Branding & Illustration */}
        <section className="signup-left">
          <div className="welcome-badge">
            Join UpSkillr today! 🚀
          </div>

          <h1 className="left-heading">Create your account</h1>
          <p className="left-subtitle">
            Start learning and building real skills with expert-led courses.
          </p>



          <div className="signin-prompt">
            Already have an account?
            <a
              href="/login"
              className="signin-link"
              onClick={(e) => { e.preventDefault(); navigate('/login'); }}
            >
              Sign in
            </a>
          </div>

          <div className="signup-illustration-wrapper">
            <img
              src={Signin_page}
              alt="Create account illustration"
              className="signup-illustration-img"
            />
          </div>
        </section>

        {/* Right Column: Form Card */}
        <section className="signup-right">
          <div className="signup-card">
            {/* Alert Messages */}
            {errorMessage && (
              <div className="alert-box error">
                <ShieldAlert size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="alert-box success">
                <CheckCircle2 size={18} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* STEP 2: Resend OTP Verification Step */}
            {showOtpStep ? (
              <div className="otp-box">
                <div className="otp-icon-circle">
                  <MailCheck size={24} />
                </div>
                <h2 className="card-title" style={{ fontSize: '1.35rem' }}>Verify Your Email</h2>
                <p className="card-subtitle" style={{ marginBottom: '0.4rem' }}>
                  We sent a 6-digit code to <strong>{unverifiedEmail}</strong>
                </p>

                <form className="signup-form" onSubmit={handleVerifyOtp} style={{ width: '100%', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="otp-input-field"
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />

                  <button type="submit" className="submit-btn" disabled={otpLoading} style={{ marginTop: '0.5rem' }}>
                    {otpLoading ? (
                      <span>Verifying Code...</span>
                    ) : (
                      <>
                        <span>Verify Email</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Didn't get code?</span>
                  <button type="button" className="resend-btn" onClick={handleResendOtp} disabled={resendLoading}>
                    {resendLoading ? 'Sending...' : 'Resend Code'}
                  </button>
                </div>

                <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                  <a
                    href="/login"
                    className="signin-link"
                    style={{ fontSize: '0.85rem' }}
                    onClick={(e) => { e.preventDefault(); navigate('/login'); }}
                  >
                    Proceed to Login Page →
                  </a>
                </div>
              </div>
            ) : (
              /* STEP 1: Registration Form */
              <>
                <h2 className="card-title">Create Account</h2>
                <p className="card-subtitle">Choose your role to get started</p>

                {/* Role Selection Grid */}
                <div className="auth-role-selector-grid">
                  <div
                    className={`auth-role-card ${role === 'learner' ? 'active' : 'inactive'}`}
                    onClick={() => setRole('learner')}
                  >
                    <div className="auth-role-icon-box">
                      <GraduationCap size={18} />
                    </div>
                    <div className="auth-role-info">
                      <span className="auth-role-title">I'm a Learner</span>
                      <span className="auth-role-desc">Learn new skills</span>
                    </div>
                    {role === 'learner' && (
                      <div className="auth-role-checkmark">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  <div
                    className={`auth-role-card ${role === 'instructor' ? 'active' : 'inactive'}`}
                    onClick={() => setRole('instructor')}
                  >
                    <div className="auth-role-icon-box">
                      <Presentation size={18} />
                    </div>
                    <div className="auth-role-info">
                      <span className="auth-role-title">I'm an Instructor</span>
                      <span className="auth-role-desc">Teach & inspire</span>
                    </div>
                    {role === 'instructor' && (
                      <div className="auth-role-checkmark">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual Registration Form */}
                <form className="signup-form" onSubmit={handleManualSignUp}>
                  {/* Full Name */}
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <div className="input-wrapper">
                      <User className="input-left-icon" size={16} />
                      <input
                        type="text"
                        name="fullName"
                        className="form-input"
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="form-group">
                    <label className="form-label">Email address</label>
                    <div className="input-wrapper">
                      <Mail className="input-left-icon" size={16} />
                      <input
                        type="email"
                        name="email"
                        className="form-input"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Password & Confirm Password Row */}
                  <div className="form-row-2col">
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <div className="input-wrapper">
                        <Lock className="input-left-icon" size={16} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          className="form-input"
                          placeholder="Min. 8 chars"
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Confirm</label>
                      <div className="input-wrapper">
                        <Lock className="input-left-icon" size={16} />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          className="form-input"
                          placeholder="Repeat password"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? (
                      <span>Creating Account...</span>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                {/* OAuth Section */}
                <div className="oauth-divider">
                  <span>Or continue with</span>
                </div>

                <div className="oauth-grid">
                  {/* Google OAuth Button */}
                  <button type="button" className="oauth-btn" onClick={handleGoogleOAuth}>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.37 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.2.0 10.05.0 12s.47 3.8 1.29 5.42l3.99-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24.0 12 .0 7.37.0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                    </svg>
                    <span>Google</span>
                  </button>

                  {/* GitHub OAuth Button */}
                  <button type="button" className="oauth-btn" onClick={handleGithubOAuth}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    <span>GitHub</span>
                  </button>
                </div>

                {/* Legal Notice */}
                <p className="legal-notice">
                  By creating an account, you agree to our{' '}
                  <a href="/terms" onClick={(e) => e.preventDefault()}>Terms of Service</a>{' '}
                  and{' '}
                  <a href="/privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.
                </p>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}