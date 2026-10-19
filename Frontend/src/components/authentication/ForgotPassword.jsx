import { useState, useEffect, useRef } from 'react';
import Forgot_password from '../../assets/illustrations/forgot_password.svg';
import Forgot_password_dark from '../../assets/illustrations/forgot_password_dark.svg';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  BookOpen,
  Sun,
  Moon
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api/auth';

export default function ForgotPassword() {
  const { theme, toggleTheme, isDarkMode } = useTheme();
  const { toast } = useToast();

  // Multi-step state: 1 = Email Input, 2 = Verify OTP & Set Password, 3 = Success
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const otpInputsRef = useRef([]);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
  };

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Step 1: Request 6-Digit Password Reset OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail })
      });

      const data = await response.json();

      if (response.status === 429) {
        toast.error(data.message || 'Too many requests. Please wait before retrying.');
        if (data.retryAfter) {
          setCooldown(data.retryAfter);
        }
        return;
      }

      if (!response.ok && !data.success) {
        throw new Error(data.message || 'Unable to process reset request.');
      }

      // Public Anti-Enumeration Notice
      const message = data.message || 'If an account is associated with this email, we have sent instructions to reset your password.';
      toast.success(message);
      setStep(2);
      setCooldown(60); // 60 seconds resend cooldown
    } catch (err) {
      toast.error(err.message || 'Failed to request password reset code.');
    } finally {
      setLoading(false);
    }
  };

  // OTP Input Handlers (paste, individual typing, backspace, arrow keys, typeover)
  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');

    if (!cleaned) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    // Handle paste, autofill, or multi-digit input
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

    // Single digit input
    const newDigits = [...otpDigits];
    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    // Auto-advance to next input if filled
    if (index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otpDigits[index]) {
        // Clear current box
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      } else if (index > 0) {
        // If current box is already empty, move to previous box and clear it
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

  // Step 2: Resend Verification Code with Cooldown (Empties entered OTP immediately)
  const handleResendOtp = async () => {
    if (cooldown > 0 || resendLoading) return;

    // Immediately clear previously entered OTP digits and refocus first box
    setOtpDigits(['', '', '', '', '', '']);
    otpInputsRef.current[0]?.focus();

    setResendLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      const data = await response.json();

      if (response.status === 429) {
        toast.error(data.message || 'Please wait before requesting another code.');
        if (data.retryAfter) {
          setCooldown(data.retryAfter);
        }
        return;
      }

      toast.success(data.message || 'If an account is associated with this email, we have sent instructions to reset your password.');
      setCooldown(60);

      // Keep inputs clear for fresh OTP entry
      setOtpDigits(['', '', '', '', '', '']);
      otpInputsRef.current[0]?.focus();
    } catch (err) {
      toast.error(err?.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // Step 2: Submit OTP and New Password
  const handleResetPassword = async (e) => {
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

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: fullOtp,
          newPassword,
          confirmPassword
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Clear OTP inputs on rejection and focus first box so user can re-enter cleanly
        setOtpDigits(['', '', '', '', '', '']);
        otpInputsRef.current[0]?.focus();
        throw new Error(data.message || 'Failed to reset password.');
      }

      // Success Step
      setStep(3);
      toast.success('Password reset successfully!');

      // Redirect to login after 1.8 seconds
      setTimeout(() => {
        navigate('/login');
      }, 1800);
    } catch (err) {
      toast.error(err.message || 'Password reset failed. Please check your verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Password requirements validation state
  const isLengthValid = newPassword.length >= 8;
  const isMatchValid = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div className="login-page">
      {/* Top Header Navigation */}
      <header className="auth-nav">
        <a
          href="/"
          className="navbar-logo"
          aria-label="UpSkillr Home"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
        >
          <div className="logo-icon-wrapper">
            <BookOpen className="logo-icon" size={24} aria-hidden="true" />
          </div>
          <span className="logo-text">UpSkillr</span>
        </a>

        <div className="auth-nav-actions">
          <button
            type="button"
            className="auth-theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          </button>

          <a
            href="/login"
            className="back-to-home-btn"
            onClick={(e) => {
              e.preventDefault();
              navigate('/login');
            }}
            title="Return to Sign In"
          >
            <ArrowLeft size={16} />
            <span>Back to Sign In</span>
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="login-container">
        {/* Left Column: Hero Branding, Security Guarantee & Illustration */}
        <section className="login-left">
          <div className="welcome-badge">
            Account Recovery 🔐
          </div>

          <h1 className="left-heading">
            Reset your <br />
            <span className="highlight-green">account password</span>
          </h1>
          <p className="left-subtitle">
            Securely verify your identity using a one-time passcode sent directly to your email inbox.
          </p>

          <div className="hero-middle-row hero-middle-row-single">
            <div className="auth-illustration-wrapper full-illustration recovery-illustration-wrapper">
              <img
                src={isDarkMode ? Forgot_password_dark : Forgot_password}
                alt="Account recovery illustration"
                className="auth-illustration-img recovery-illustration-img"
                width="800"
                height="645"
                loading="eager"
              />
            </div>
          </div>

          <div className="signin-prompt">
            Remembered your credentials?
            <a
              href="/login"
              className="signin-link"
              onClick={(e) => {
                e.preventDefault();
                navigate('/login');
              }}
            >
              Sign In
            </a>
          </div>
        </section>

        {/* Right Column: Multi-Step Reset Card */}
        <section className="login-right">
          <div className="login-card">
            {step === 1 && (
              <>
                <h2 className="card-title">Forgot Password?</h2>
                <p className="card-subtitle">
                  Enter your registered email address and we'll send you a verification code.
                </p>

                <form className="login-form" onSubmit={handleRequestOtp}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="recovery-email">
                      Email address
                    </label>
                    <div className="input-wrapper">
                      <Mail className="input-left-icon" size={18} aria-hidden="true" />
                      <input
                        id="recovery-email"
                        type="email"
                        name="email"
                        className="form-input"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading || !email.trim()}
                    style={{ marginTop: '0.75rem' }}
                  >
                    {loading ? (
                      <span>Sending Code...</span>
                    ) : (
                      <>
                        <span>Send Verification Code</span>
                        <ArrowRight size={18} aria-hidden="true" />
                      </>
                    )}
                  </button>

                  <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                    <a
                      href="/login"
                      className="signin-link"
                      style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/login');
                      }}
                    >
                      <ArrowLeft size={14} />
                      <span>Return to Sign In</span>
                    </a>
                  </div>
                </form>
              </>
            )}

            {step === 2 && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--brand-soft, rgba(34, 197, 94, 0.12))',
                      border: '2px solid var(--brand-primary, #22c55e)',
                      color: 'var(--brand-accent-text, #16a34a)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.5rem'
                    }}
                  >
                    <KeyRound size={22} />
                  </div>
                  <h2 className="card-title" style={{ fontSize: '1.35rem', margin: 0 }}>
                    Verify & Reset
                  </h2>
                  <p className="card-subtitle" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
                    Enter the 6-digit code sent to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)', marginTop: '0.45rem', marginBottom: 0, lineHeight: 1.4 }}>
                    Please check your <strong>Inbox</strong> and <strong>Spam/Junk</strong> folder.
                  </p>
                </div>

                <form className="login-form" onSubmit={handleResetPassword}>
                  {/* 6-Digit OTP Field Group */}
                  <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                    <label className="form-label" style={{ textAlign: 'center', display: 'block' }}>
                      6-Digit Passcode
                    </label>
                    <div
                      className="otp-digit-group"
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '8px',
                        margin: '0.4rem 0'
                      }}
                      onPaste={handleOtpPaste}
                    >
                      {otpDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => (otpInputsRef.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          className="otp-digit-input"
                          style={{
                            width: '44px',
                            height: '48px',
                            textAlign: 'center',
                            fontSize: '1.4rem',
                            fontWeight: '700',
                            borderRadius: '8px',
                            border: digit ? '2px solid var(--brand-primary)' : '2px solid var(--border)',
                            backgroundColor: 'var(--input-bg)',
                            color: 'var(--input-text)',
                            outline: 'none',
                            fontFamily: 'monospace',
                            transition: 'all 0.2s ease'
                          }}
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

                  {/* New Password */}
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label" htmlFor="new-password">
                      New Password
                    </label>
                    <div className="input-wrapper">
                      <Lock className="input-left-icon" size={18} aria-hidden="true" />
                      <input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        name="newPassword"
                        className="form-input"
                        placeholder="At least 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label" htmlFor="confirm-password">
                      Confirm New Password
                    </label>
                    <div className="input-wrapper">
                      <Lock className="input-left-icon" size={18} aria-hidden="true" />
                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        className="form-input"
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Real-time Checklist */}
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                    <span style={{ color: isLengthValid ? 'var(--brand-primary, #22c55e)' : 'var(--text-secondary)' }}>
                      {isLengthValid ? '✓' : '•'} Min 8 characters
                    </span>
                    <span style={{ color: isMatchValid ? 'var(--brand-primary, #22c55e)' : 'var(--text-secondary)' }}>
                      {isMatchValid ? '✓' : '•'} Passwords match
                    </span>
                  </div>

                  {/* Submit Reset Button */}
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading || otpDigits.join('').length !== 6 || !isLengthValid || !isMatchValid}
                  >
                    {loading ? (
                      <span>Updating Password...</span>
                    ) : (
                      <>
                        <span>Reset Password</span>
                        <ArrowRight size={18} aria-hidden="true" />
                      </>
                    )}
                  </button>

                  {/* Resend Cooldown Section */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '0.85rem',
                      fontSize: '0.82rem'
                    }}
                  >
                    <button
                      type="button"
                      className="resend-btn"
                      onClick={handleResendOtp}
                      disabled={cooldown > 0 || resendLoading}
                      style={{ padding: 0 }}
                    >
                      {resendLoading
                        ? 'Sending...'
                        : cooldown > 0
                          ? `Resend code in ${cooldown}s`
                          : 'Resend Code'}
                    </button>

                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        textDecoration: 'underline'
                      }}
                      onClick={() => {
                        setStep(1);
                        setOtpDigits(['', '', '', '', '', '']);
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                    >
                      Change email
                    </button>
                  </div>
                </form>
              </>
            )}

            {step === 3 && (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--brand-soft, rgba(34, 197, 94, 0.15))',
                    border: '2px solid var(--brand-primary, #22c55e)',
                    color: 'var(--brand-primary, #22c55e)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem'
                  }}
                >
                  <CheckCircle2 size={36} />
                </div>
                <h2 className="card-title" style={{ fontSize: '1.45rem', marginBottom: '0.5rem' }}>
                  Password Reset Complete!
                </h2>
                <p className="card-subtitle" style={{ marginBottom: '1.5rem' }}>
                  Your password has been successfully updated. Redirecting you to the sign-in page...
                </p>

                <button
                  type="button"
                  className="submit-btn"
                  onClick={() => navigate('/login')}
                >
                  <span>Sign In with New Password</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
