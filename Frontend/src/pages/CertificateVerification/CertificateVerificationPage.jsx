import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Calendar,
  User,
  BookOpen,
  Copy,
  Check,
  Download,
  Printer,
  ExternalLink,
  ArrowRight,
  Search,
  Share2
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import './CertificateVerificationPage.css';

export const CertificateVerificationPage = ({ certificateId: initialCertId, user }) => {
  const [certIdInput, setCertIdInput] = useState(initialCertId || '');
  const [activeCertId, setActiveCertId] = useState(initialCertId || '');
  const [loading, setLoading] = useState(true);
  const [certData, setCertData] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null); // 'not_found' | 'server_error' | null
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (activeCertId) {
      verifyCertificate(activeCertId);
    }
  }, [activeCertId]);

  const verifyCertificate = async (idToVerify) => {
    setLoading(true);
    setErrorStatus(null);
    setCertData(null);
    try {
      const cleanId = encodeURIComponent(idToVerify.trim().toUpperCase());
      const res = await fetch(`${API_BASE}/certificates/verify/${cleanId}`);
      const data = await res.json();

      if (res.status === 404 || data.status === 'not_found') {
        setErrorStatus('not_found');
      } else if (data.success && data.certificate) {
        setCertData(data.certificate);
      } else {
        setErrorStatus('not_found');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setErrorStatus('server_error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (certIdInput.trim()) {
      const formatted = certIdInput.trim().toUpperCase();
      setActiveCertId(formatted);
      window.history.pushState({}, '', `/verify-certificate/${formatted}`);
    }
  };

  const handleCopyId = () => {
    if (certData?.certificateId) {
      navigator.clipboard.writeText(certData.certificateId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!certData?.certificateImageUrl) return;
    const link = document.createElement('a');
    link.href = certData.certificateImageUrl;
    link.download = `UpSkillR_Certificate_${certData.certificateId}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExploreCourses = () => {
    window.history.pushState({}, '', '/explore');
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/explore' } }));
  };

  return (
    <div className="verify-page-wrapper">
      {/* Hero Header */}
      <header className="verify-hero-header">
        <div className="verify-hero-content">
          <div className="verify-shield-badge">
            <ShieldCheck size={28} className="shield-icon" />
          </div>
          <h1 className="verify-hero-title">Official Certificate Verification</h1>
          <p className="verify-hero-subtitle">
            Validate the authenticity and credentials of any course completion certificate issued by UpSkillR.
          </p>

          {/* Quick Search Bar */}
          <form className="verify-search-form" onSubmit={handleSearchSubmit}>
            <div className="search-input-wrap">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                value={certIdInput}
                onChange={(e) => setCertIdInput(e.target.value.toUpperCase())}
                placeholder="Enter Certificate ID (e.g. UPSK-2026-000842)"
                className="verify-search-input"
              />
            </div>
            <button type="submit" className="btn-verify-search">
              Verify Certificate
            </button>
          </form>
        </div>
      </header>

      {/* Main Verification Card Area */}
      <main className="verify-main-container">
        {loading ? (
          <div className="verify-card loading-card">
            <div className="verify-spinner" />
            <h3 className="loading-heading">Verifying Certificate Credentials...</h3>
            <p className="loading-subtext">Connecting to UpSkillR cryptographic validation registry...</p>
          </div>
        ) : errorStatus === 'not_found' ? (
          <div className="verify-card not-found-card">
            <div className="status-symbol-circle error-circle">
              <XCircle size={44} />
            </div>
            <h2 className="status-lead error-lead">Certificate Not Found</h2>
            <p className="status-desc">
              We could not locate an authentic certificate with ID <strong className="id-highlight">{activeCertId}</strong>.
            </p>
            <div className="not-found-guidance">
              <h4>Please verify the following:</h4>
              <ul>
                <li>Ensure the certificate ID matches the format <code>UPSK-YYYY-XXXXXX</code> exactly.</li>
                <li>Check for typos or transposed characters.</li>
                <li>If the course was completed recently, allow a moment for cloud registry synchronization.</li>
              </ul>
            </div>
            <div className="verify-action-buttons">
              <button
                type="button"
                className="btn-primary-action"
                onClick={() => {
                  setCertIdInput('');
                  document.querySelector('.verify-search-input')?.focus();
                }}
              >
                Try Another ID
              </button>
              <button
                type="button"
                className="btn-secondary-action"
                onClick={handleExploreCourses}
              >
                Browse UpSkillR Courses
              </button>
            </div>
          </div>
        ) : certData?.verificationStatus === 'revoked' ? (
          <div className="verify-card revoked-card">
            <div className="status-symbol-circle warn-circle">
              <AlertTriangle size={44} />
            </div>
            <h2 className="status-lead warn-lead">Certificate Revoked</h2>
            <p className="status-desc">
              Certificate <strong className="id-highlight">{certData.certificateId}</strong> has been officially revoked and is no longer valid.
            </p>
          </div>
        ) : certData ? (
          /* VALID CERTIFICATE RECORD */
          <div className="verify-card valid-card">
            {/* Top Seal */}
            <div className="valid-top-badge">
              <div className="valid-badge-icon">
                <CheckCircle2 size={24} />
              </div>
              <div className="valid-badge-text">
                <span className="badge-tag">OFFICIALLY VERIFIED</span>
                <span className="badge-sub">Authentic UpSkillR Completion Credential</span>
              </div>
            </div>

            {/* Certificate Details Grid */}
            <div className="cert-data-grid">
              {/* Recipient */}
              <div className="cert-field-card recipient-card">
                <div className="field-icon-wrap">
                  <User size={20} />
                </div>
                <div className="field-meta">
                  <span className="field-label">Awarded To</span>
                  <h3 className="recipient-name-heading">{certData.studentName}</h3>
                </div>
              </div>

              {/* Course */}
              <div className="cert-field-card course-card">
                <div className="field-icon-wrap">
                  <BookOpen size={20} />
                </div>
                <div className="field-meta">
                  <span className="field-label">Course Completed</span>
                  <h3 className="course-title-heading">{certData.courseName}</h3>
                </div>
              </div>

              {/* Instructor */}
              <div className="cert-field-card instructor-card">
                <div className="field-icon-wrap">
                  <Award size={20} />
                </div>
                <div className="field-meta">
                  <span className="field-label">Instructor</span>
                  <span className="field-val-bold">{certData.instructorName}</span>
                  {certData.instructorDesignation && (
                    <span className="field-val-sub">{certData.instructorDesignation}</span>
                  )}
                </div>
              </div>

              {/* Date & ID */}
              <div className="cert-field-card meta-date-card">
                <div className="field-icon-wrap">
                  <Calendar size={20} />
                </div>
                <div className="field-meta">
                  <span className="field-label">Date of Completion</span>
                  <span className="field-val-bold">
                    {new Date(certData.completionDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Certificate ID Box */}
              <div className="cert-field-card id-card">
                <div className="field-meta">
                  <span className="field-label">Certificate ID</span>
                  <div className="id-copy-row">
                    <code className="cert-id-code">{certData.certificateId}</code>
                    <button
                      type="button"
                      className="btn-copy-id"
                      onClick={handleCopyId}
                      title="Copy Certificate ID"
                    >
                      {copied ? <Check size={15} className="copied-icon" /> : <Copy size={15} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Verification Status */}
              <div className="cert-field-card status-card">
                <div className="field-meta">
                  <span className="field-label">Registry Status</span>
                  <div className="status-pill-row">
                    <span className="status-live-dot" />
                    <strong className="status-live-text">Valid & Active</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* High-Resolution Certificate Document Display */}
            {certData.certificateImageUrl && (
              <div className="certificate-visual-section">
                <div className="visual-header-row">
                  <h4 className="visual-title">High-Resolution Certificate Document</h4>
                  <div className="visual-action-btns">
                    <button
                      type="button"
                      className="btn-visual-download"
                      onClick={handleDownload}
                    >
                      <Download size={15} />
                      <span>Download PNG</span>
                    </button>
                  </div>
                </div>

                <div className="cert-image-frame">
                  <img
                    src={certData.certificateImageUrl}
                    alt={`Certificate for ${certData.studentName} - ${certData.courseName}`}
                    className="verified-cert-img"
                  />
                </div>
              </div>
            )}

            {/* Verification Footer Links */}
            <div className="verify-card-footer">
              <span className="footer-registry-text">
                This credential is cryptographically tied to UpSkillR's persistent registry and cannot be falsified.
              </span>
              <button
                type="button"
                className="btn-explore-upskillr"
                onClick={handleExploreCourses}
              >
                <span>Explore UpSkillR Courses</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default CertificateVerificationPage;
