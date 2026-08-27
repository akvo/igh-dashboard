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
  showSearch = true,
  showClearText = false,
  compact = false,
  showAllOption = false,
  variant = 'outlined',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Use actual menu height when available, otherwise estimate
      const menuHeight = menuRef.current
        ? menuRef.current.offsetHeight
        : 288;
      const spaceBelow = window.innerHeight - rect.bottom;
      const fitsBelow = spaceBelow >= menuHeight + 4;
      const top = fitsBelow
        ? rect.bottom + 4
        : Math.max(4, rect.top - menuHeight - 4);
      // Align left edge to button left, but clamp so menu doesn't overflow viewport
      const menuWidth = Math.max(rect.width, 200);
      const left = Math.min(rect.left, window.innerWidth - menuWidth - 8);
      setMenuPosition({ top, left, width: menuWidth });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      // Reposition after portal renders so actual menu height is available
      const raf = requestAnimationFrame(updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        cancelAnimationFrame(raf);
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

  const hasValue = multiSelect
    ? selectedValues.length > 0 && (selectedValues.length < options.length || options.length <= 1)
    : !!value;

  const getDisplayValue = () => {
    if (multiSelect) {
      const count = selectedValues.length;
      if (count === 0 || (count === options.length && options.length > 1)) {
        return <span className="text-gray-400">{placeholder}</span>;
      }
      const selectedLabels = selectedValues.map((val) => {
        const opt = options.find((o) =>
          typeof o === 'object' ? o.value === val : o === val
        );
        return opt ? (typeof opt === 'object' ? opt.label : opt) : val;
      });
      const displayText = count === 1
        ? selectedLabels[0]
        : `${selectedLabels[0]} +${count - 1}`;
      return <span className="truncate text-black">{displayText}</span>;
    }

    const selectedOption = options.find((opt) =>
      typeof opt === 'object' ? opt.value === value : opt === value
    );

    if (!selectedOption) return <span className="text-gray-400">{placeholder}</span>;

    const selectedLabel = typeof selectedOption === 'object' ? selectedOption.label : selectedOption;
    return <span className="truncate text-black">{selectedLabel}</span>;
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
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px`, width: `${menuPosition.width}px` }}
        >
          {showSearch && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search item"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 focus:outline-none focus:border-[#E76A42]"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            </div>
          )}
          <div className="overflow-y-auto max-h-56">
            {showAllOption && multiSelect && (
              <button
                type="button"
                onClick={() => { if (onChange) onChange([]); }}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left border-none cursor-pointer transition-colors
                  ${selectedValues.length === 0 ? 'text-orange-500 bg-orange-50' : 'text-black bg-transparent hover:bg-gray-50'}
                  border-b border-gray-100`}
              >
                <span className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${
                  selectedValues.length === 0 ? 'border-orange-500 bg-orange-500' : 'border-gray-300 bg-white'
                }`}>
                  {selectedValues.length === 0 && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                All
              </button>
            )}
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
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) setSearchQuery(''); }}
        className={`flex items-center justify-between text-sm font-normal text-black cursor-pointer text-left transition-colors
          ${compact ? 'gap-2 px-3 h-9 w-[180px] max-w-full' : 'w-full px-4 py-2.5 h-[44px]'}
          ${variant === 'outlined'
            ? `border ${isOpen ? 'bg-white border-orange-500' : 'bg-white border-black-24'}`
            : isOpen ? 'bg-white border-2 border-orange-500' : 'bg-[#F2F2F4]'}`}
      >
        <span className="flex items-center overflow-hidden min-w-0 flex-1">
          {getDisplayValue()}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {hasValue && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer p-0"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
          )}
          <ChevronDownIcon className={`w-5 h-5 ${variant === 'outlined' ? 'text-black-64' : 'text-gray-500'} transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {menu}
    </div>
  );
};

export default Dropdown;
