'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon } from '../icons';

const Dropdown = ({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'All',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
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
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find((opt) =>
    typeof opt === 'object' ? opt.value === value : opt === value
  );

  const displayValue = selectedOption
    ? typeof selectedOption === 'object'
      ? selectedOption.label
      : selectedOption
    : placeholder;

  const handleSelect = (option) => {
    const val = typeof option === 'object' ? option.value : option;
    if (onChange) onChange(val);
    setIsOpen(false);
  };

  const menu = isOpen && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed bg-white rounded-lg shadow-lg z-[9999] max-h-60 overflow-y-auto"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px`, width: `${menuPosition.width}px` }}
        >
          {options.map((option, index) => {
            const optValue = typeof option === 'object' ? option.value : option;
            const optLabel = typeof option === 'object' ? option.label : option;
            const isSelected = optValue === value;

            return (
              <button
                key={optValue}
                type="button"
                onClick={() => handleSelect(option)}
                className={`block w-full px-4 py-2.5 text-sm text-left border-none cursor-pointer transition-colors
                  ${isSelected ? 'text-orange-500 bg-orange-50' : 'text-black bg-transparent hover:bg-gray-50'}
                  ${index < options.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                {optLabel}
              </button>
            );
          })}
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
        className="flex items-center justify-between w-full px-4 py-3 text-base font-normal text-black bg-gray-100 border-none rounded-lg cursor-pointer text-left"
      >
        <span>{displayValue}</span>
        <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {menu}
    </div>
  );
};

export default Dropdown;
