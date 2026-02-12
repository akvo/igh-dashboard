'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, SearchIcon } from '../icons';

const Dropdown = ({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'All',
  className = '',
  multiSelect = false,
  showSearch = false,
  showClearText = false,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // For multi-select, value is an array
  const selectedValues = multiSelect ? (Array.isArray(value) ? value : []) : value;

  const getDisplayValue = () => {
    if (multiSelect) {
      const count = selectedValues.length;
      if (count === 0) {
        return placeholder;
      }
      return (
        <>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border border-orange-500 bg-orange-500 rounded flex items-center justify-center">
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            {placeholder}
          </span>
          <span className="text-orange-500 ml-1">({count})</span>
        </>
      );
    }

    const selectedOption = options.find((opt) =>
      typeof opt === 'object' ? opt.value === value : opt === value
    );

    return selectedOption
      ? typeof selectedOption === 'object'
        ? selectedOption.label
        : selectedOption
      : placeholder;
  };

  const handleSelect = (option) => {
    const val = typeof option === 'object' ? option.value : option;

    if (multiSelect) {
      const newValues = selectedValues.includes(val)
        ? selectedValues.filter((v) => v !== val)
        : [...selectedValues, val];
      if (onChange) onChange(newValues);
    } else {
      if (onChange) onChange(val);
      setIsOpen(false);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (multiSelect) {
      if (onChange) onChange([]);
    } else {
      if (onChange) onChange('');
    }
  };

  const filteredOptions = options.filter((option) => {
    if (!searchQuery) return true;
    const label = typeof option === 'object' ? option.label : option;
    return label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const menu = isOpen && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed bg-white rounded-lg shadow-lg z-[9999] max-h-72 overflow-hidden border border-gray-200"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px`, minWidth: `${menuPosition.width}px` }}
        >
          {showSearch && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search item"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          <div className="overflow-y-auto max-h-56">
            {filteredOptions.map((option, index) => {
              const optValue = typeof option === 'object' ? option.value : option;
              const optLabel = typeof option === 'object' ? option.label : option;
              const isSelected = multiSelect
                ? selectedValues.includes(optValue)
                : optValue === value;

              return (
                <button
                  key={optValue}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left border-none cursor-pointer transition-colors
                    ${isSelected && !multiSelect ? 'text-orange-500 bg-orange-50' : 'text-black bg-transparent hover:bg-gray-50'}
                    ${index < filteredOptions.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  {multiSelect && (
                    <span className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                  )}
                  {optLabel}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <span className="text-sm text-gray-500 font-normal">{label}</span>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full text-sm font-normal text-black cursor-pointer text-left transition-colors
          ${compact ? 'px-3 py-2 h-[36px]' : 'px-4 py-2.5 h-[44px]'}
          ${isOpen ? 'bg-white border-2 border-orange-500' : 'bg-gray-100'}`}
      >
        <span className="flex items-center">{getDisplayValue()}</span>
        <div className="flex items-center gap-2">
          {showClearText && multiSelect && selectedValues.length > 0 && (
            <span
              onClick={handleClear}
              className="text-orange-500 text-sm font-medium cursor-pointer hover:underline"
            >
              Clear
            </span>
          )}
          <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {menu}
    </div>
  );
};

export default Dropdown;
