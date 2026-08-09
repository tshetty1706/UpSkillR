import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  Sun,
  Moon,
  GraduationCap,
  Presentation,
  ShieldAlert,
  CheckCircle2,
  MailCheck,
  KeyRound
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api/auth';

export default function SignUp() {
  const [theme, setTheme] = useState('dark'); // 'light' or 'dark'
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

  // Handle URL search params on mount (for OAuth callbacks or errors)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    const errorParam = urlParams.get('error');
    const providerParam = urlParams.get('provider');

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('upskillr_token', token);
        localStorage.setItem('upskillr_user', JSON.stringify(user));
        setSuccessMessage(`Successfully signed in via ${providerParam ? providerParam.toUpperCase() : 'OAuth'}! Welcome, ${user.fullName}.`);
      } catch (e) {
        console.error('Failed to parse user data from OAuth callback');
      }
    } else if (errorParam) {
      if (errorParam === 'google_oauth_failed') {
        setErrorMessage('Google OAuth authentication failed. Please try again.');
      } else if (errorParam === 'github_oauth_failed') {
        setErrorMessage('GitHub OAuth authentication failed. Please try again.');
      }
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

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
    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
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
          role
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Registration failed.');
      }

      if (data.token) {
        localStorage.setItem('upskillr_token', data.token);
        localStorage.setItem('upskillr_user', JSON.stringify(data.user));
      }

      setUnverifiedEmail(formData.email.toLowerCase());
      setShowOtpStep(true);
      setSuccessMessage(data.message || 'Account created! Enter the 6-digit verification code sent to your email.');
    } catch (err) {
      setErrorMessage(err.message || 'Could not complete registration. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage('Please enter a valid 6-digit verification code.');
      return;
    }

    setOtpLoading(true);

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
        throw new Error(data.message || 'OTP verification failed.');
      }

      if (data.token) {
        localStorage.setItem('upskillr_token', data.token);
        localStorage.setItem('upskillr_user', JSON.stringify(data.user));
      }

      setSuccessMessage('Email verified successfully! Welcome to UpSkillr.');
      setShowOtpStep(false);
      setFormData({ fullName: '', email: '', password: '', confirmPassword: '' });
      setOtpCode('');
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or expired OTP code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setResendLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unverifiedEmail })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to resend verification code.');
      }

      setSuccessMessage(data.message || 'A new verification code has been sent to your email.');
    } catch (err) {
      setErrorMessage(err.message || 'Could not resend code. Please try again.');
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
    <div className={`signup-page ${theme}-mode`}>
      {/* Top Header Navigation */}
      <header className="signup-nav">
        <a href="/" className="brand-logo">
          <div className="logo-icon-bg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span>UpSkillr</span>
        </a>

        <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Light/Dark Theme">
          {theme === 'light' ? (
            <>
              <Moon size={16} />
              <span>Dark Mode</span>
            </>
          ) : (
            <>
              <Sun size={16} />
              <span>Light Mode</span>
            </>
          )}
        </button>
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

          {/* SVG Vector Illustration */}
          <div className="illustration-wrapper">
            <svg className="illustration-svg" viewBox="0 0 500 380" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="140" cy="180" r="120" fill={theme === 'dark' ? '#092015' : '#e6f4ea'} opacity="0.7" />
              <path d="M 120 120 Q 200 70 280 120" stroke="#22c55e" strokeWidth="2" strokeDasharray="5 5" opacity="0.6" />
              <path d="M 280 120 Q 360 170 340 240" stroke="#22c55e" strokeWidth="2" strokeDasharray="5 5" opacity="0.6" />
              
              <g transform="translate(190, 60)">
                <circle cx="24" cy="24" r="24" fill={theme === 'dark' ? '#12181d' : '#ffffff'} stroke="#22c55e" strokeWidth="2" />
                <path d="M 14 20 L 24 15 L 34 20 L 24 25 Z M 17 22 L 17 28 C 17 31 31 31 31 28 L 31 22" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
              </g>

              <g transform="translate(300, 110)">
                <circle cx="24" cy="24" r="24" fill={theme === 'dark' ? '#12181d' : '#ffffff'} stroke="#22c55e" strokeWidth="2" />
                <path d="M 16 18 C 19 16 24 18 24 18 C 24 18 29 16 32 18 V 30 C 29 28 24 30 24 30 C 24 30 19 28 16 30 Z" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
              </g>

              <g transform="translate(320, 220)">
                <circle cx="24" cy="24" r="24" fill={theme === 'dark' ? '#12181d' : '#ffffff'} stroke="#22c55e" strokeWidth="2" />
                <path d="M 16 30 L 20 24 L 25 27 L 32 17" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </g>

              <line x1="20" y1="330" x2="480" y2="330" stroke={theme === 'dark' ? '#1e2933' : '#e2e8f0'} strokeWidth="3" strokeLinecap="round" />
              <rect x="250" y="270" width="100" height="50" rx="4" fill={theme === 'dark' ? '#1e2933' : '#cbd5e1'} stroke={theme === 'dark' ? '#334155' : '#94a3b8'} strokeWidth="2" />
              <rect x="258" y="276" width="84" height="38" rx="2" fill={theme === 'dark' ? '#0f172a' : '#ffffff'} />
              <polygon points="230,325 370,325 360,320 240,320" fill={theme === 'dark' ? '#334155' : '#94a3b8'} />

              <path d="M 400 300 H 420 L 415 325 H 405 Z" fill={theme === 'dark' ? '#15803d' : '#86efac'} />
              <path d="M 405 285 Q 400 295 410 300 Q 420 290 415 280 Q 410 270 405 285 Z" fill="#22c55e" />

              <circle cx="160" cy="155" r="18" fill="#1e293b" />
              <circle cx="160" cy="180" r="22" fill="#fbcfe8" />
              <path d="M 142 172 Q 160 160 178 172 Q 170 190 142 172 Z" fill="#1e293b" />
              <circle cx="152" cy="182" r="2" fill="#1e293b" />
              <circle cx="166" cy="182" r="2" fill="#1e293b" />
              <path d="M 155 190 Q 160 194 165 190" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
              <path d="M 130 230 C 130 205 190 205 190 230 L 195 320 H 125 Z" fill="#22c55e" />
              <path d="M 135 235 L 105 280 L 140 285" stroke="#fbcfe8" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 180 235 L 230 275 L 240 270" stroke="#fbcfe8" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="90" y="275" width="55" height="40" rx="3" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" transform="rotate(-10 115 295)" />
              <line x1="98" y1="285" x2="135" y2="280" stroke="#cbd5e1" strokeWidth="2" />
              <line x1="96" y1="295" x2="133" y2="290" stroke="#cbd5e1" strokeWidth="2" />
            </svg>
          </div>

          <div className="signin-prompt">
            Already have an account?
            <a href="/login" className="signin-link">Sign in</a>
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
                  <MailCheck size={28} />
                </div>
                <h2 className="card-title" style={{ fontSize: '1.45rem' }}>Verify Your Email</h2>
                <p className="card-subtitle" style={{ marginBottom: '0.5rem' }}>
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

                  <button type="submit" className="submit-btn" disabled={otpLoading} style={{ marginTop: '1rem' }}>
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

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Didn't get code?</span>
                  <button type="button" className="resend-btn" onClick={handleResendOtp} disabled={resendLoading}>
                    {resendLoading ? 'Sending...' : 'Resend Code'}
                  </button>
                </div>
              </div>
            ) : (
              /* STEP 1: Registration Form */
              <>
                <h2 className="card-title">Create Account</h2>
                <p className="card-subtitle">Choose your role to get started</p>

                {/* Role Selection Grid */}
                <div className="role-selector-grid">
                  <div
                    className={`role-card ${role === 'learner' ? 'active' : 'inactive'}`}
                    onClick={() => setRole('learner')}
                  >
                    <div className="role-icon-box">
                      <GraduationCap size={22} />
                    </div>
                    <div className="role-info">
                      <span className="role-title">I'm a Learner</span>
                      <span className="role-desc">Learn new skills</span>
                    </div>
                    {role === 'learner' && (
                      <div className="role-checkmark">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  <div
                    className={`role-card ${role === 'instructor' ? 'active' : 'inactive'}`}
                    onClick={() => setRole('instructor')}
                  >
                    <div className="role-icon-box">
                      <Presentation size={22} />
                    </div>
                    <div className="role-info">
                      <span className="role-title">I'm an Instructor</span>
                      <span className="role-desc">Teach & inspire</span>
                    </div>
                    {role === 'instructor' && (
                      <div className="role-checkmark">
                        <Check size={12} strokeWidth={3} />
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
                      <User className="input-left-icon" size={18} />
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
                      <Mail className="input-left-icon" size={18} />
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

                  {/* Password */}
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div className="input-wrapper">
                      <Lock className="input-left-icon" size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        className="form-input"
                        placeholder="Min. 8 characters"
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
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <div className="input-wrapper">
                      <Lock className="input-left-icon" size={18} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        className="form-input"
                        placeholder="Confirm your password"
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
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
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
