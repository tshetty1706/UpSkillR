import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  Award,
  AlertCircle,
  Lightbulb,
  Check,
  FileText,
  GraduationCap,
  Sparkles,
  HelpCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { DynamicTagInput } from '../Common/DynamicTagInput';
import { DynamicListInput } from '../Common/DynamicListInput';
import './Step3Overview.css';

export const Step3Overview = ({
  overviewData,
  onChange,
  onNext,
  onBack,
  onOpenPreview
}) => {
  const [errors, setErrors] = useState({});
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!overviewData.fullDescription || !overviewData.fullDescription.trim()) {
      newErrors.fullDescription = 'Full course description is required.';
    } else if (overviewData.fullDescription.trim().length < 30) {
      newErrors.fullDescription = 'Please provide a more detailed description (at least 30 characters).';
    }

    if (!overviewData.prerequisites || overviewData.prerequisites.length === 0) {
      newErrors.prerequisites = 'Please specify at least one prerequisite (or add "No prior experience required").';
    }

    const validOutcomes = (overviewData.learningOutcomes || []).filter((o) => o && o.trim());
    if (validOutcomes.length === 0) {
      newErrors.learningOutcomes = 'Please add at least one learning outcome ("What You\'ll Learn").';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const handleAddFaq = () => {
    const faqs = overviewData.faqs || [];
    onChange({
      ...overviewData,
      faqs: [...faqs, { question: '', answer: '' }]
    });
  };

  const handleFaqChange = (index, field, value) => {
    const faqs = [...(overviewData.faqs || [])];
    faqs[index] = { ...faqs[index], [field]: value };
    onChange({ ...overviewData, faqs });
  };

  const handleRemoveFaq = (index) => {
    const faqs = (overviewData.faqs || []).filter((_, idx) => idx !== index);
    onChange({ ...overviewData, faqs });
  };

  return (
    <div className="step-overview-layout">
      {/* Left Form Column */}
      <div className="step-overview-form-col">
        <div className="step-overview-header">
          <span className="step-badge-tag">CREATE A COURSE</span>
          <h1 className="step-overview-heading">
            Shape Your <span className="accent-highlight">Course Overview</span>
          </h1>
          <p className="step-overview-subheading">
            Help learners understand what they'll gain from your course. A clear overview increases enrolments and sets the right expectations.
          </p>
        </div>

        <div className="overview-form-card">
          {/* Section 1: Full Course Description */}
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="full-description" className="form-label">
                Full Course Description <span className="required-star">*</span>
              </label>
              <span className="char-count">
                {overviewData.fullDescription?.length || 0}/2000
              </span>
            </div>
            <p className="field-subnote">
              Write a detailed description about your course, including what it covers, who it is for, and why it's valuable.
            </p>

            <textarea
              id="full-description"
              rows={6}
              maxLength={2000}
              className={`form-textarea overview-desc-area ${errors.fullDescription ? 'input-error' : ''}`}
              placeholder="Write a detailed description about your course, including what it covers, who it is for, and why it's valuable..."
              value={overviewData.fullDescription || ''}
              onChange={(e) => {
                onChange({ ...overviewData, fullDescription: e.target.value });
                if (errors.fullDescription) setErrors({ ...errors, fullDescription: null });
              }}
            />
            {errors.fullDescription && (
              <span className="error-message">
                <AlertCircle size={14} /> {errors.fullDescription}
              </span>
            )}
          </div>

          {/* Prerequisites */}
          <div className="form-group">
            <label className="form-label">
              Prerequisites <span className="required-star">*</span>
            </label>
            <p className="field-subnote">
              Mention the skills, knowledge, or tools learners should have before taking this course.
            </p>
            <DynamicTagInput
              tags={overviewData.prerequisites || []}
              onChange={(prerequisites) => {
                onChange({ ...overviewData, prerequisites });
                if (errors.prerequisites) setErrors({ ...errors, prerequisites: null });
              }}
              placeholder="Add a prerequisite and press Enter..."
              maxTags={8}
            />
            {errors.prerequisites && (
              <span className="error-message">
                <AlertCircle size={14} /> {errors.prerequisites}
              </span>
            )}
          </div>

          {/* What You'll Learn */}
          <div className="form-group">
            <label className="form-label">
              What You'll Learn <span className="required-star">*</span>
            </label>
            <p className="field-subnote">
              Add 4–8 key learning outcomes. Be specific and learner-focused.
            </p>
            <DynamicListInput
              items={overviewData.learningOutcomes || ['', '', '']}
              onChange={(learningOutcomes) => {
                onChange({ ...overviewData, learningOutcomes });
                if (errors.learningOutcomes) setErrors({ ...errors, learningOutcomes: null });
              }}
              placeholder="e.g. Build real-world projects from scratch"
            />
            {errors.learningOutcomes && (
              <span className="error-message">
                <AlertCircle size={14} /> {errors.learningOutcomes}
              </span>
            )}
          </div>

          {/* Skills You'll Gain */}
          <div className="form-group">
            <label className="form-label">Skills You'll Gain</label>
            <p className="field-subnote">
              Add relevant skills that learners will develop after completing this course.
            </p>
            <DynamicTagInput
              tags={overviewData.skills || []}
              onChange={(skills) => onChange({ ...overviewData, skills })}
              placeholder="Add a skill and press Enter (e.g. React, UI/UX)..."
              maxTags={12}
            />
          </div>

          {/* Tech Stack / Tools */}
          <div className="form-group">
            <label className="form-label">Tech Stack / Tools</label>
            <p className="field-subnote">
              Mention the tools, frameworks, or technologies used in this course.
            </p>
            <DynamicTagInput
              tags={overviewData.techStack || []}
              onChange={(techStack) => onChange({ ...overviewData, techStack })}
              placeholder="Add a tool and press Enter (e.g. VS Code, Vite, Git)..."
              maxTags={12}
            />
          </div>

          {/* Certificate Toggle */}
          <div className="certificate-toggle-box">
            <div className="cert-left-meta">
              <label className="cert-switch">
                <input
                  type="checkbox"
                  checked={overviewData.certificate !== false}
                  onChange={(e) => onChange({ ...overviewData, certificate: e.target.checked })}
                />
                <span className="cert-slider" />
              </label>
              <div className="cert-icon-wrap">
                <Award size={24} className="accent-green" />
              </div>
            </div>
            <div className="cert-text-wrap">
              <h4 className="cert-title">
                {overviewData.certificate !== false
                  ? 'Yes, learners will receive a certificate'
                  : 'No certificate awarded for this course'}
              </h4>
              <p className="cert-desc">
                {overviewData.certificate !== false
                  ? 'A verified UpSkillr course completion certificate will be awarded upon finishing all lessons.'
                  : 'Learners will not be issued a certificate upon completion.'}
              </p>
            </div>
          </div>

          {/* Syllabus Preview Banner */}
          <div className="syllabus-preview-banner">
            <div className="syllabus-banner-icon">
              <FileText size={22} />
            </div>
            <div className="syllabus-banner-text">
              <h4>Syllabus will be generated later</h4>
              <p>
                Once you add modules and lessons in the Curriculum step, a detailed syllabus will be created and shown here automatically.
              </p>
            </div>
          </div>

          {/* Optional Enhancement Accordion */}
          <div className="optional-accordion-section">
            <button
              type="button"
              className="accordion-toggle-btn"
              onClick={() => setShowOptionalFields(!showOptionalFields)}
            >
              <span>Optional Profile, Audience & FAQ Enhancements</span>
              {showOptionalFields ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showOptionalFields && (
              <div className="optional-fields-container">
                {/* Instructor Message */}
                <div className="form-group">
                  <label className="form-label">Personal Message to Learners</label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    placeholder="A brief personal greeting or encouragement for prospective learners..."
                    value={overviewData.instructorMessage || ''}
                    onChange={(e) => onChange({ ...overviewData, instructorMessage: e.target.value })}
                  />
                </div>

                {/* FAQs */}
                <div className="form-group">
                  <div className="label-row">
                    <label className="form-label">Frequently Asked Questions (FAQs)</label>
                    <button
                      type="button"
                      className="add-faq-btn"
                      onClick={handleAddFaq}
                    >
                      <Plus size={14} />
                      <span>Add FAQ</span>
                    </button>
                  </div>
                  {(overviewData.faqs || []).map((faq, fIdx) => (
                    <div key={fIdx} className="faq-edit-row">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Question"
                        value={faq.question}
                        onChange={(e) => handleFaqChange(fIdx, 'question', e.target.value)}
                      />
                      <textarea
                        rows={2}
                        className="form-textarea"
                        placeholder="Answer"
                        value={faq.answer}
                        onChange={(e) => handleFaqChange(fIdx, 'answer', e.target.value)}
                      />
                      <button
                        type="button"
                        className="delete-faq-btn"
                        onClick={() => handleRemoveFaq(fIdx)}
                        title="Delete FAQ"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="step-actions-footer">
          <button type="button" className="btn-secondary-action" onClick={onBack}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <div className="footer-right-actions">
            <button
              type="button"
              className="btn-preview-action"
              onClick={onOpenPreview}
              title="Check how learners will see your overview"
            >
              <Eye size={16} />
              <span>Preview Overview</span>
            </button>
            <button type="button" className="btn-primary-action" onClick={handleNext}>
              <span>Next Step</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar Guidance Column (matching Image 4) */}
      <aside className="step-overview-sidebar-col">
        {/* Illustration & Quote Card */}
        <div className="illustration-quote-card">
          <div className="vector-illustration-box">
            <div className="stacked-books-mockup">
              <span className="book-spine spine-plan">Plan</span>
              <span className="book-spine spine-create">Create</span>
              <span className="book-spine spine-teach">Teach</span>
              <span className="book-spine spine-inspire">Inspire</span>
            </div>
            <div className="avatar-working-graphic">
              <div className="graphic-lightbulb">💡</div>
              <div className="graphic-laptop">💻</div>
            </div>
          </div>
          <p className="illustration-quote">
            "A well-written overview helps the right learners find you."
          </p>
          <span className="quote-author">— UpSkillr</span>
        </div>

        {/* Tips Card */}
        <div className="guidance-card tips-card-bordered">
          <div className="guidance-card-header">
            <Lightbulb size={20} className="guidance-icon" />
            <h3>Tips for a great course overview</h3>
          </div>
          <ul className="guidance-check-list">
            <li>
              <Check size={16} className="tip-check-icon" />
              <span>Be clear and specific about what the course covers</span>
            </li>
            <li>
              <Check size={16} className="tip-check-icon" />
              <span>Highlight the key benefits for learners</span>
            </li>
            <li>
              <Check size={16} className="tip-check-icon" />
              <span>Mention any prerequisites (if needed)</span>
            </li>
            <li>
              <Check size={16} className="tip-check-icon" />
              <span>Use simple and easy-to-understand language</span>
            </li>
            <li>
              <Check size={16} className="tip-check-icon" />
              <span>Add relevant skills and tools</span>
            </li>
            <li>
              <Check size={16} className="tip-check-icon" />
              <span>Keep it honest and realistic</span>
            </li>
            <li>
              <Check size={16} className="tip-check-icon" />
              <span>A clear overview builds trust and increases enrolments</span>
            </li>
          </ul>
        </div>

        {/* Inspirational Card */}
        <div className="inspirational-quote-card">
          <div className="inspirational-icon">
            <GraduationCap size={24} />
          </div>
          <p className="inspirational-text">
            "Education is not just about learning skills, it's about creating opportunities."
          </p>
          <span className="inspirational-subtext">
            Start building a brighter future for learners around the world.
          </span>
          <div className="inspirational-bar" />
        </div>

        {/* Hand-drawn Doodles */}
        <div className="doodle-sidebar-note">
          <span>Share Your Knowledge Empower Many ✦</span>
        </div>
      </aside>
    </div>
  );
};
