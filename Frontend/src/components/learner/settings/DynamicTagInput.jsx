import React, { useState } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import './DynamicTagInput.css';

export const DynamicTagInput = ({
  tags = [],
  onChange,
  placeholder = 'Add a learning interest...',
  maxTagLength = 40,
  maxTags = 25,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleAddTag = (e) => {
    if (disabled) return;
    if (e) e.preventDefault();
    setErrorMessage('');

    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (trimmed.length > maxTagLength) {
      setErrorMessage(`Interests cannot exceed ${maxTagLength} characters.`);
      return;
    }

    if (tags.length >= maxTags) {
      setErrorMessage(`Maximum of ${maxTags} learning interests reached.`);
      return;
    }

    // Case-insensitive duplicate check
    const isDuplicate = tags.some(
      (t) => t.toLowerCase() === trimmed.toLowerCase()
    );

    if (isDuplicate) {
      setErrorMessage(`"${trimmed}" is already in your learning interests.`);
      return;
    }

    const updated = [...tags, trimmed];
    if (onChange) {
      onChange(updated);
    }
    setInputValue('');
  };

  const handleRemoveTag = (indexToRemove) => {
    if (disabled) return;
    setErrorMessage('');
    const updated = tags.filter((_, idx) => idx !== indexToRemove);
    if (onChange) {
      onChange(updated);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag if backspacing on empty input
      handleRemoveTag(tags.length - 1);
    }
  };

  return (
    <div className={`dynamic-tag-input-container ${disabled ? 'is-disabled' : ''}`}>
      {/* Input row with text input and + Add button (only when editing) */}
      {!disabled && (
        <div className="tag-input-action-row">
          <input
            type="text"
            className="tag-text-field"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            onKeyDown={handleKeyDown}
            maxLength={maxTagLength + 5}
            aria-label="Add learning interest"
          />
          <button
            type="button"
            className="tag-add-btn"
            onClick={handleAddTag}
            disabled={!inputValue.trim()}
            title="Add interest"
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>
      )}

      {/* Validation warning */}
      {!disabled && errorMessage && (
        <div className="tag-input-error-msg" role="alert">
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tags Stack */}
      <div className="dynamic-tags-list" aria-label="Learning interests tags">
        {tags.length === 0 ? (
          <span className="no-tags-prompt">
            {disabled
              ? 'No learning interests added.'
              : 'No interests added yet. Type an interest above and click Add (+).'}
          </span>
        ) : (
          tags.map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              className={`dynamic-interest-chip ${disabled ? 'readonly-chip' : ''}`}
            >
              <span className="tag-label-text">{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  className="tag-remove-btn"
                  onClick={() => handleRemoveTag(idx)}
                  aria-label={`Remove ${tag}`}
                  title={`Remove ${tag}`}
                >
                  <X size={13} />
                </button>
              )}
            </span>
          ))
        )}
      </div>
    </div>
  );
};

export default DynamicTagInput;
