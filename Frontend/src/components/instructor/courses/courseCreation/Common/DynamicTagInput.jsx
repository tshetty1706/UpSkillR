import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import './DynamicTagInput.css';

export const DynamicTagInput = ({
  tags = [],
  onChange,
  placeholder = 'Add an item and press Enter...',
  maxTags = 15,
  helperText = ''
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const trimmed = inputValue.trim().replace(/^,|,$/g, '');
    if (!trimmed) return;
    if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue('');
      return;
    }
    if (tags.length >= maxTags) return;

    onChange([...tags, trimmed]);
    setInputValue('');
  };

  const removeTag = (idxToRemove) => {
    onChange(tags.filter((_, idx) => idx !== idxToRemove));
  };

  return (
    <div className="dynamic-tag-input-container">
      <div className="dynamic-tag-input-box">
        <input
          type="text"
          className="dynamic-tag-input-field"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length >= maxTags ? `Max ${maxTags} items reached` : placeholder}
          disabled={tags.length >= maxTags}
        />
        {inputValue.trim() && (
          <button
            type="button"
            className="dynamic-tag-add-btn"
            onClick={addTag}
            title="Add item"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {tags.length > 0 && (
        <div className="dynamic-tags-list">
          {tags.map((tag, idx) => (
            <span key={idx} className="dynamic-tag-chip">
              <span className="dynamic-tag-text">{tag}</span>
              <button
                type="button"
                className="dynamic-tag-remove-btn"
                onClick={() => removeTag(idx)}
                title={`Remove ${tag}`}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      {helperText && <span className="dynamic-tag-helper">{helperText}</span>}
    </div>
  );
};
