import React, { useState, useEffect, useRef } from 'react';
import Login_Page from '../../assets/illustrations/Login_Page.svg';
import { useTheme } from '../../context/ThemeContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Sun,
  Moon,
  RotateCcw,
  TrendingUp,
  Smartphone,
  BookOpen,
  MailCheck
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api/auth';

export default function Login() {
  const { theme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mandatory Login OTP Verification State
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpChallengeId, setOtpChallengeId] = useState(null);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const otpInputsRef = useRef([]);

  const dismissAlert = () => {
    setAuthAlert(null);
    sessionStorage.removeItem('upskillr_auth_error_code');
    sessionStorage.removeItem('upskillr_auth_error_provider');
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const navigate = (path) => {
    dismissAlert();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
  };

  const [authAlert, setAuthAlert] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const providerParam = urlParams.get('provider');
    if (!errorParam) return null;

    if (errorParam === 'no_account') {
      const providerName = providerParam === 'github' ? 'GitHub' : 'Google';
      return {
        type: 'error',
        message: `No UpSkillR account exists for this ${providerName} account. Please create an account first.`,
        actionText: 'Create an account',
        actionPath: '/signup'
      };
    }
    if (errorParam === 'invalid_oauth_state') {
      return {
        type: 'error',
        message: 'OAuth session expired or invalid. Please try signing in again.',
        actionText: null,
        actionPath: null
      };
    }
    if (errorParam === 'provider_not_linked') {
      const providerName = providerParam === 'github' ? 'GitHub' : 'Google';
      return {
        type: 'warning',
        message: `An account with this email already exists using email/password login. Please sign in with your password.`,
        actionText: null,
        actionPath: null
      };
    }
    if (errorParam === 'account_exists') {
      return {
        type: 'info',
        message: 'An account with this email already exists. Please sign in.',
        actionText: null,
        actionPath: null
      };
    }
    if (errorParam === 'google_oauth_failed') {
      return {
        type: 'error',
        message: 'Google OAuth authentication failed. Please try again.',
        actionText: null,
        actionPath: null
      };
    }
    if (errorParam === 'github_oauth_failed' || errorParam === 'github_token_failed') {
      return {
        type: 'error',
        message: 'GitHub OAuth authentication failed. Please try again.',
        actionText: null,
        actionPath: null
      };
    }
    return {
      type: 'error',
      message: 'Authentication failed. Please try again.',
      actionText: null,
      actionPath: null
    };
  });

  // Handle URL search params on mount & cleanup so errors don't linger on page transitions
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    const errorParam = urlParams.get('error');

    // Immediately clean URL search params so browser back/refresh won't re-trigger error state
    if (token || userParam || errorParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    sessionStorage.removeItem('upskillr_auth_error_code');
    sessionStorage.removeItem('upskillr_auth_error_provider');

    if (token && userParam) {
      try {
        let user;
        try {
          user = JSON.parse(decodeURIComponent(userParam));
        } catch (e1) {
          user = JSON.parse(userParam);
        }
        sessionStorage.setItem('upskillr_token', token);
        sessionStorage.setItem('upskillr_user', JSON.stringify(user));
        localStorage.removeItem('upskillr_token');
        localStorage.removeItem('upskillr_user');

        if (user.role === 'instructor') {
          if (user.applicationStatus === 'submitted') {
            navigate('/instructor/dashboard');
          } else {
            navigate('/instructor/application');
          }
        } else {
          navigate('/learner/dashboard');
        }
      } catch (e) {
        console.error('Failed to parse user data from OAuth callback', e);
      }
    }

    const handlePopState = () => {
      dismissAlert();
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      sessionStorage.removeItem('upskillr_auth_error_code');
      sessionStorage.removeItem('upskillr_auth_error_provider');
    };
  }, []);

  // 30-Second Countdown Timer for Login OTP
  useEffect(() => {
    let timer;
    if (showOtpStep && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showOtpStep, countdown]);

  const handleInputChange = (e) => {
    if (authAlert) setAuthAlert(null);
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Clean 6-digit input helpers
  const handleOtpChange = (index, value) => {
    if (authAlert) setAuthAlert(null);
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
    if (authAlert) setAuthAlert(null);
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

  const handleManualLogin = async (e) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      setAuthAlert({ type: 'error', message: 'Please enter your email address.' });
      return;
    }
    if (!formData.password) {
      setAuthAlert({ type: 'error', message: 'Please enter your password.' });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.isUnverified) {
          setAuthAlert({
            type: 'warning',
            message: data.message || 'Please verify your email address before logging in.',
            actionText: 'Verify Email (Sign Up)',
            actionPath: '/signup'
          });
          return;
        }
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }

      // Mandatory Login OTP Verification Trigger - Never completes login on credentials alone
      if (data.requiresOtp) {
        setShowOtpStep(true);
        setOtpEmail(data.email || formData.email);
        setOtpChallengeId(data.challengeId);
        setCountdown(data.expiresInSeconds || 30);
        setCanResend(false);
        setOtpDigits(['', '', '', '', '', '']);
        setAuthAlert({
          type: 'info',
          message: `Verification code sent to ${data.email || formData.email}. Enter the 6-digit code below to complete sign in.`
        });
        setTimeout(() => {
          otpInputsRef.current[0]?.focus();
        }, 100);
        return;
      }

      // Fallback in case tokens were provided
      if (data.token) {
        sessionStorage.setItem('upskillr_token', data.token);
        sessionStorage.setItem('upskillr_user', JSON.stringify(data.user));
      }
      localStorage.removeItem('upskillr_token');
      localStorage.removeItem('upskillr_user');

      const isInstructor = data.user?.role === 'instructor';
      if (isInstructor) {
        if (data.user?.applicationStatus === 'submitted') {
          navigate('/instructor/dashboard');
        } else {
          navigate('/instructor/application');
        }
      } else {
        const redirectPath = sessionStorage.getItem('upskillr_redirect_after_login');
        if (redirectPath) {
          sessionStorage.removeItem('upskillr_redirect_after_login');
          navigate(redirectPath);
        } else {
          navigate('/learner/dashboard');
        }
      }
    } catch (err) {
      const errorMsg = err.message || 'Could not complete login. Check backend connection.';
      setAuthAlert({ type: 'error', message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setAuthAlert({ type: 'error', message: 'Please enter the complete 6-digit verification code.' });
      return;
    }

    setOtpLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/verify-login-otp`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: otpEmail,
          otp: fullOtp,
          challengeId: otpChallengeId
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'OTP Verification failed.');
      }

      // Save token and user details to sessionStorage for active session only
      if (data.token) {
        sessionStorage.setItem('upskillr_token', data.token);
        sessionStorage.setItem('upskillr_user', JSON.stringify(data.user));
      }
      localStorage.removeItem('upskillr_token');
      localStorage.removeItem('upskillr_user');

      const isInstructor = data.user?.role === 'instructor';
      if (isInstructor) {
        if (data.user?.applicationStatus === 'submitted') {
          navigate('/instructor/dashboard');
        } else {
          navigate('/instructor/application');
        }
      } else {
        const redirectPath = sessionStorage.getItem('upskillr_redirect_after_login');
        if (redirectPath) {
          sessionStorage.removeItem('upskillr_redirect_after_login');
          navigate(redirectPath);
        } else {
          navigate('/learner/dashboard');
        }
      }
    } catch (err) {
      const otpErrorMsg = err.message || 'Invalid or expired verification code.';
      setAuthAlert({ type: 'error', message: otpErrorMsg });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendLoginOtp = async () => {
    if (!canResend || resendLoading) return;

    setResendLoading(true);
    setOtpDigits(['', '', '', '', '', '']);
    otpInputsRef.current[0]?.focus();

    try {
      const response = await fetch(`${API_BASE_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, purpose: 'login' })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to resend code.');
      }

      setOtpChallengeId(data.challengeId);
      setCountdown(data.expiresInSeconds || 30);
      setCanResend(false);
      setAuthAlert({
        type: 'info',
        message: 'A fresh 6-digit verification code has been sent to your email.'
      });
    } catch (err) {
      setAuthAlert({ type: 'error', message: err.message || 'Failed to resend verification code.' });
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowOtpStep(false);
    setOtpDigits(['', '', '', '', '', '']);
    setCountdown(30);
    setCanResend(false);
    dismissAlert();
  };

  const handleGoogleOAuth = () => {
    dismissAlert();
    window.location.href = `${API_BASE_URL}/google?action=login`;
  };

  const handleGithubOAuth = () => {
    dismissAlert();
    window.location.href = `${API_BASE_URL}/github?action=login`;
  };

  const handleMicrosoftOAuth = () => {
    setAuthAlert({ type: 'info', message: 'Microsoft OAuth login will be configured soon.' });
  };

  return (
    <div className="login-page">
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
      <main className="login-container">
        {/* Left Column: Hero Branding, Feature List & Character Illustration */}
        <section className="login-left">
          <div className="welcome-badge">
            Welcome back! 👋
          </div>

          <h1 className="left-heading">
            Sign in to continue <br />
            <span className="highlight-green">your learning journey</span>
          </h1>
          <p className="left-subtitle">
            Access your courses, track progress, and achieve your goals with UpSkillr.
          </p>

          {/* Middle Row: Feature List on left, Illustration on right */}
          <div className="hero-middle-row">
            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon-box">
                  <RotateCcw size={16} />
                </div>
                <div className="feature-info">
                  <span className="feature-title">Continue learning</span>
                  <span className="feature-desc">Pick up where you left off</span>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-box">
                  <TrendingUp size={16} />
                </div>
                <div className="feature-info">
                  <span className="feature-title">Track your progress</span>
                  <span className="feature-desc">Monitor achievements and skills</span>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-box">
                  <Smartphone size={16} />
                </div>
                <div className="feature-info">
                  <span className="feature-title">Learn anytime, anywhere</span>
                  <span className="feature-desc">Access on any device, anytime</span>
                </div>
              </div>
            </div>
            <div className="auth-illustration-wrapper">
              <img
                src={Login_Page}
                alt="Sign in to UpSkillr illustration"
                className="auth-illustration-img"
              />
            </div>
          </div>

          <div className="signin-prompt">
            Don't have an account?
            <a
              href="/signup"
              className="signin-link"
              onClick={(e) => { e.preventDefault(); navigate('/signup'); }}
            >
              Sign up
            </a>
          </div>
        </section>

        {/* Right Column: Login Form Card */}
        <section className="login-right">
          <div className="login-card">
            <h2 className="card-title">{showOtpStep ? 'Verify Sign In' : 'Sign In'}</h2>
            <p className="card-subtitle">
              {showOtpStep ? (
                <>Enter the 6-digit code sent to <strong style={{ color: 'var(--text-primary)' }}>{otpEmail}</strong></>
              ) : (
                'Enter your credentials to access your account'
              )}
            </p>

            {/* In-page OAuth & Authentication Feedback Alert Banner */}
            {authAlert && (
              <div
                className={`auth-status-banner ${authAlert.type}`}
                role="alert"
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  fontSize: '0.86rem',
                  lineHeight: '1.45',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  backgroundColor: authAlert.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : (authAlert.type === 'warning' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)'),
                  border: `1px solid ${authAlert.type === 'error' ? 'rgba(239, 68, 68, 0.35)' : (authAlert.type === 'warning' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(59, 130, 246, 0.35)')}`,
                  color: authAlert.type === 'error' ? '#ef4444' : (authAlert.type === 'warning' ? '#f59e0b' : '#3b82f6')
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontWeight: 500 }}>{authAlert.message}</span>
                  <button
                    type="button"
                    onClick={dismissAlert}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      padding: '0 2px',
                      fontSize: '1rem',
                      lineHeight: '1',
                      opacity: 0.8
                    }}
                    aria-label="Dismiss alert"
                  >
                    ✕
                  </button>
                </div>
                {authAlert.actionText && authAlert.actionPath && (
                  <a
                    href={authAlert.actionPath}
                    onClick={(e) => {
                      e.preventDefault();
                      dismissAlert();
                      navigate(authAlert.actionPath);
                    }}
                    style={{
                      color: 'inherit',
                      fontWeight: 600,
                      textDecoration: 'underline',
                      alignSelf: 'flex-start'
                    }}
                  >
                    {authAlert.actionText} →
                  </a>
                )}
              </div>
            )}

            {/* MANDATORY LOGIN OTP STEP */}
            {showOtpStep ? (
              <div className="otp-box">
                <div className="otp-icon-circle">
                  <MailCheck size={24} />
                </div>

                <form className="login-form" onSubmit={handleVerifyLoginOtp} style={{ width: '100%', alignItems: 'center' }}>
                  {/* 6-Digit Individual OTP Input Boxes */}
                  <div
                    className="otp-digit-group"
                    onPaste={handleOtpPaste}
                    style={{ margin: '0.4rem 0' }}
                  >
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputsRef.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        className="otp-digit-input"
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onFocus={(e) => e.target.select()}
                        required
                        autoFocus={index === 0}
                        aria-label={`Digit ${index + 1} of 6`}
                      />
                    ))}
                  </div>

                  {/* 30-Second Countdown Timer Display */}
                  <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: countdown > 0 ? 'var(--text-secondary)' : '#ef4444', fontWeight: 500 }}>
                    {countdown > 0 ? (
                      <span>Code expires in <strong style={{ color: 'var(--brand-primary)' }}>00:{countdown < 10 ? `0${countdown}` : countdown}</strong></span>
                    ) : (
                      <span>Code expired. Please request a new code.</span>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button type="submit" className="submit-btn" disabled={otpLoading} style={{ marginTop: '0.75rem' }}>
                    {otpLoading ? (
                      <span>Verifying Code...</span>
                    ) : (
                      <>
                        <span>Verify & Sign In</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                {/* Resend OTP Action */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.4rem' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Didn't receive code?</span>
                  <button
                    type="button"
                    className="resend-btn"
                    onClick={handleResendLoginOtp}
                    disabled={!canResend || resendLoading}
                  >
                    {resendLoading ? 'Sending...' : (canResend ? 'Resend Code' : `Resend in ${countdown}s`)}
                  </button>
                </div>

                {/* Return to Password Form */}
                <div style={{ marginTop: '0.85rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    className="signin-link"
                    style={{ fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--brand-primary)' }}
                    onClick={handleBackToLogin}
                  >
                    <ArrowLeft size={14} /> Back to Sign In
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Manual Login Form */}
                <form className="login-form" onSubmit={handleManualLogin}>
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
                    placeholder="Enter your password"
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

              {/* Remember Me & Forgot Password Row */}
              <div className="form-options">
                <label className="remember-label">
                  <input
                    type="checkbox"
                    className="remember-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="/forgot-password"
                  className="forgot-link"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/forgot-password');
                  }}
                >
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* OAuth Section */}
            <div className="oauth-divider">
              <span>Or continue with</span>
            </div>

            {/* 2-Column OAuth Buttons: Google, GitHub */}
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
              By signing in, you agree to our{' '}
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