import React, { useState, useEffect } from 'react';
import { ArrowRight, Lightbulb, AlertCircle, BookOpen, Layers, Globe, Sparkles } from 'lucide-react';
import { DynamicTagInput } from '../Common/DynamicTagInput';
import './Step1BasicInfo.css';

export const Step1BasicInfo = ({
  data,
  onChange,
  onNext,
  onCancel
}) => {
  const [metaOptions, setMetaOptions] = useState({
    categories: [
      'Web Development',
      'Data Science',
      'Design',
      'Business',
      'Marketing',
      'Artificial Intelligence',
      'Cybersecurity'
    ],
    skillLevels: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
    languages: ['English', 'Spanish', 'French', 'German', 'Hindi', 'Japanese']
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchMetaOptions();
  }, []);

  const fetchMetaOptions = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/courses/meta/options');
      const json = await res.json();
      if (json.success) {
        setMetaOptions({
          categories: json.categories || metaOptions.categories,
          skillLevels: json.skillLevels || metaOptions.skillLevels,
          languages: json.languages || metaOptions.languages
        });
      }
    } catch (e) {
      // Fall back to predefined lists
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!data.title || !data.title.trim()) {
      newErrors.title = 'Course title is required.';
    } else if (data.title.trim().length < 5) {
      newErrors.title = 'Title should be at least 5 characters.';
    }

    if (!data.category || !data.category.trim()) {
      newErrors.category = 'Please select a course category.';
    }

    if (!data.shortDescription || !data.shortDescription.trim()) {
      newErrors.shortDescription = 'Short description is required.';
    } else if (data.shortDescription.trim().length < 15) {
      newErrors.shortDescription = 'Short description should be at least 15 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextClick = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div className="step-basic-info-layout">
      {/* Main Form Column */}
      <div className="step-form-column">
        <div className="step-header">
          <span className="step-badge-tag">CREATE A COURSE</span>
          <h1 className="step-main-heading">
            Basic <span className="accent-highlight">Information</span>
          </h1>
          <p className="step-subheading">
            Provide the core details that help learners discover, identify, and understand your course.
          </p>
        </div>

        <div className="step-card-form">
          {/* Course Title */}
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="course-title" className="form-label">
                Course Title <span className="required-star">*</span>
              </label>
              <span className="char-count">{data.title?.length || 0}/100</span>
            </div>
            <input
              id="course-title"
              type="text"
              maxLength={100}
              className={`form-input ${errors.title ? 'input-error' : ''}`}
              placeholder="e.g. Master React & Redux Toolkit From Scratch"
              value={data.title || ''}
              onChange={(e) => {
                onChange({ ...data, title: e.target.value });
                if (errors.title) setErrors({ ...errors, title: null });
              }}
            />
            {errors.title ? (
              <span className="error-message">
                <AlertCircle size={14} /> {errors.title}
              </span>
            ) : (
              <span className="field-hint">
                <Sparkles size={13} className="hint-icon" />
                Use a clear, specific title so learners immediately understand what they will learn.
              </span>
            )}
          </div>

          {/* Category & Language Row */}
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="course-category" className="form-label">
                Category / Subject Area <span className="required-star">*</span>
              </label>
              <select
                id="course-category"
                className={`form-select ${errors.category ? 'input-error' : ''}`}
                value={data.category || ''}
                onChange={(e) => {
                  onChange({ ...data, category: e.target.value });
                  if (errors.category) setErrors({ ...errors, category: null });
                }}
              >
                <option value="">Select a category</option>
                {metaOptions.categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && (
                <span className="error-message">
                  <AlertCircle size={14} /> {errors.category}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="course-language" className="form-label">
                Language <span className="required-star">*</span>
              </label>
              <select
                id="course-language"
                className="form-select"
                value={data.language || 'English'}
                onChange={(e) => onChange({ ...data, language: e.target.value })}
              >
                {metaOptions.languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Course Level */}
          <div className="form-group">
            <label className="form-label">
              Course Level <span className="required-star">*</span>
            </label>
            <div className="level-pills-grid">
              {metaOptions.skillLevels.map((lvl) => {
                const isSelected = (data.skillLevel || 'Beginner') === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    className={`level-pill-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => onChange({ ...data, skillLevel: lvl })}
                  >
                    <Layers size={16} />
                    <span>{lvl}</span>
                  </button>
                );
              })}
            </div>
            <span className="field-hint">
              Setting the realistic difficulty helps match learners with the right background.
            </span>
          </div>

          {/* Short Description */}
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="short-desc" className="form-label">
                Short Description <span className="required-star">*</span>
              </label>
              <span className="char-count">{data.shortDescription?.length || 0}/250</span>
            </div>
            <textarea
              id="short-desc"
              rows={3}
              maxLength={250}
              className={`form-textarea ${errors.shortDescription ? 'input-error' : ''}`}
              placeholder="Provide a concise 1-2 sentence overview of what learners will accomplish in this course."
              value={data.shortDescription || ''}
              onChange={(e) => {
                onChange({ ...data, shortDescription: e.target.value });
                if (errors.shortDescription) setErrors({ ...errors, shortDescription: null });
              }}
            />
            {errors.shortDescription ? (
              <span className="error-message">
                <AlertCircle size={14} /> {errors.shortDescription}
              </span>
            ) : (
              <span className="field-hint">
                Explain the practical value of your course in one or two sentences.
              </span>
            )}
          </div>

          {/* Tags / Keywords */}
          <div className="form-group">
            <label className="form-label">Tags / Keywords</label>
            <DynamicTagInput
              tags={data.tags || []}
              onChange={(tags) => onChange({ ...data, tags })}
              placeholder="e.g. React, WebDev, Hooks (Press Enter to add)"
              maxTags={10}
              helperText="Tags increase search reach and help in course recommendations."
            />
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="step-actions-footer">
          <button type="button" className="btn-secondary-action" onClick={onCancel}>
            Exit / Discard
          </button>
          <button type="button" className="btn-primary-action" onClick={handleNextClick}>
            <span>Next Step</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Right Sidebar Guidance Column */}
      <aside className="step-sidebar-column">
        <div className="guidance-card">
          <div className="guidance-card-header">
            <Lightbulb size={20} className="guidance-icon" />
            <h3>Tips for Basic Information</h3>
          </div>
          <ul className="guidance-tips-list">
            <li>
              <strong>Clear & Searchable Title:</strong> Titles with relevant tech keywords get up to 40% higher discovery.
            </li>
            <li>
              <strong>Accurate Category:</strong> Placing your course in the exact subject area ensures it appears in the right learner feeds.
            </li>
            <li>
              <strong>Honest Skill Level:</strong> Beginner courses should require minimal prerequisites; advanced courses can dive straight into complex concepts.
            </li>
            <li>
              <strong>Compelling Short Description:</strong> This summary appears on search cards across the platform.
            </li>
          </ul>
        </div>

        {/* Live Mini Preview */}
        <div className="live-mini-preview-card">
          <span className="preview-pill-tag">Search Card Preview</span>
          <div className="mini-card-mockup">
            <div className="mini-card-badge-row">
              <span className="mini-category-tag">{data.category || 'Category'}</span>
              <span className="mini-level-tag">{data.skillLevel || 'Beginner'}</span>
            </div>
            <h4 className="mini-card-title">{data.title || 'Your Course Title Here'}</h4>
            <p className="mini-card-desc">
              {data.shortDescription || 'Your short description will appear here on learner browsing cards.'}
            </p>
            <div className="mini-card-meta">
              <span>{data.language || 'English'}</span>
              <span>•</span>
              <span>0 Learners</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
