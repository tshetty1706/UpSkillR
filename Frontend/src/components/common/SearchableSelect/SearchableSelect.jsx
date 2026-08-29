import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import './SearchableSelect.css';

export const SearchableSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select or type...',
  allowCustom = true,
  className = '',
  disabled = false,
  renderOption = null,
  getOptionValue = (opt) => (typeof opt === 'string' ? opt : opt.value || opt.name),
  getOptionLabel = (opt) => (typeof opt === 'string' ? opt : opt.label || opt.name)
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync internal search input with value when changed externally
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(value || '');
    }
  }, [value, isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        if (allowCustom) {
          onChange(searchTerm);
        } else {
          setSearchTerm(value || '');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [containerRef, searchTerm, value, allowCustom, onChange]);

  // Filter options based on search query
  const filteredOptions = options.filter((opt) => {
    const label = getOptionLabel(opt);
    const val = getOptionValue(opt);
    const searchStr = (opt.searchStr || `${label} ${val}`).toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const handleSelectOption = (option) => {
    const val = getOptionValue(option);
    const label = getOptionLabel(option);
    onChange(val, option);
    setSearchTerm(val || label);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);
    setHighlightedIndex(0);
    if (allowCustom) {
      onChange(val);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
      }
    } else if (e.key === 'Enter') {
      if (isOpen && filteredOptions.length > 0) {
        e.preventDefault();
        handleSelectOption(filteredOptions[highlightedIndex]);
      } else if (allowCustom) {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm(value || '');
    }
  };

  const handleFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div
      className={`searchable-select-container ${isOpen ? 'is-open' : ''} ${
        disabled ? 'is-disabled' : ''
      } ${className}`}
      ref={containerRef}
    >
      <div className="searchable-select-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="searchable-select-input"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
        <div className="searchable-select-actions">
          {searchTerm && !disabled && (
            <button
              type="button"
              className="searchable-select-clear-btn"
              onClick={handleClear}
              tabIndex={-1}
              aria-label="Clear value"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            className="searchable-select-toggle-btn"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            tabIndex={-1}
            aria-label="Toggle options dropdown"
          >
            <ChevronDown size={16} className={`chevron-icon ${isOpen ? 'rotated' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="searchable-select-dropdown" role="listbox">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => {
              const val = getOptionValue(opt);
              const label = getOptionLabel(opt);
              const isSelected = value === val || value === label;
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={idx}
                  className={`searchable-select-option ${
                    isSelected ? 'is-selected' : ''
                  } ${isHighlighted ? 'is-highlighted' : ''}`}
                  onClick={() => handleSelectOption(opt)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="option-content">
                    {renderOption ? renderOption(opt) : label}
                  </div>
                  {isSelected && <Check size={16} className="option-check" />}
                </div>
              );
            })
          ) : (
            <div className="searchable-select-empty">
              {allowCustom ? (
                <span>No exact matches. Press Enter or click away to use <strong>"{searchTerm}"</strong></span>
              ) : (
                <span>No matching options found</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
