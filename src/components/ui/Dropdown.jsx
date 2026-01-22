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
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  // Update position when opening
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

  // Close dropdown when clicking outside
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
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            width: `${menuPosition.width}px`,
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
            zIndex: 9999,
            maxHeight: '240px',
            overflowY: 'auto',
          }}
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
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 16px',
                  fontSize: '14px',
                  color: isSelected ? '#fe7449' : '#262626',
                  backgroundColor: isSelected ? '#fff1ed' : 'transparent',
                  border: 'none',
                  borderBottom: index < options.length - 1 ? '1px solid #f3f4f6' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
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
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {label && (
        <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '400' }}>
          {label}
        </span>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 16px',
          fontSize: '16px',
          fontWeight: '400',
          color: '#262626',
          backgroundColor: '#F2F2F4',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span>{displayValue}</span>
        <ChevronDownIcon
          style={{
            width: '20px',
            height: '20px',
            color: '#6b7280',
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      {menu}
    </div>
  );
};

export default Dropdown;
