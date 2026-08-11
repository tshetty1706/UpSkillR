import React, { useState, useEffect } from 'react';
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
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  TrendingUp,
  Smartphone,
  BookOpen
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
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
  };

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
        setSuccessMessage(`Successfully signed in via ${providerParam ? providerParam.toUpperCase() : 'OAuth'}! Welcome back, ${user.fullName}.`);
      } catch (e) {
        console.error('Failed to parse user data from OAuth callback');
      }
    } else if (errorParam) {
      if (errorParam === 'google_oauth_failed') {
        setErrorMessage('Google OAuth authentication failed. Please try again.');
      } else if (errorParam === 'github_oauth_failed') {
        setErrorMessage('GitHub OAuth authentication failed. Please try again.');
      } else if (errorParam === 'github_token_failed') {
        setErrorMessage('Failed to retrieve GitHub access token.');
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleManualLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!formData.password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }

      // Save token and user details to localStorage
      if (data.token) {
        localStorage.setItem('upskillr_token', data.token);
        localStorage.setItem('upskillr_user', JSON.stringify(data.user));
      }

      setSuccessMessage(`Welcome back, ${data.user.fullName}! Sign in successful.`);
    } catch (err) {
      setErrorMessage(err.message || 'Could not complete login. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = () => {
    window.location.href = `${API_BASE_URL}/google`;
  };

  const handleGithubOAuth = () => {
    window.location.href = `${API_BASE_URL}/github`;
  };

  const handleMicrosoftOAuth = () => {
    alert('Microsoft OAuth login will be configured soon.');
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
            <h2 className="card-title">Sign In</h2>
            <p className="card-subtitle">Enter your credentials to access your account</p>

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
                <a href="/forgot-password" className="forgot-link" onClick={(e) => e.preventDefault()}>
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
          </div>
        </section>
      </main>
    </div>
  );
}