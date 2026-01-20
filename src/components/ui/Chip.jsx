'use client';

import { useState } from 'react';

const Chip = ({
  children,
  variant = 'default',
  size = 'md',
  onClick,
  onRemove,
  removable = false,
  selected = false,
  disabled = false,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '500',
    borderRadius: '9999px',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
    cursor: onClick ? 'pointer' : 'default',
    opacity: disabled ? 0.5 : 1,
  };

  const sizeStyles = {
    sm: { padding: '2px 8px', fontSize: '11px', gap: '4px' },
    md: { padding: '4px 12px', fontSize: '12px', gap: '6px' },
    lg: { padding: '6px 16px', fontSize: '14px', gap: '8px' },
  };

  // Predefined color variants
  const colorVariants = {
    default: { backgroundColor: '#f3f4f6', color: '#374151' },
    primary: { backgroundColor: '#fff1ed', color: '#b45234' },
    success: { backgroundColor: '#dcf2e4', color: '#3b5a47' },
    warning: { backgroundColor: '#fae8cb', color: '#654c24' },
    error: { backgroundColor: '#ffd4c7', color: '#6b311f' },
    info: { backgroundColor: '#deeef4', color: '#3e545d' },

    // R&D Stage variants
    early: { backgroundColor: '#fe7449', color: '#ffffff' },
    late: { backgroundColor: '#ffd4c7', color: '#8c4028' },
    'on-time': { backgroundColor: '#8dd6a9', color: '#ffffff' },
    delayed: { backgroundColor: '#f0b456', color: '#654c24' },
    cancelled: { backgroundColor: '#e76a42', color: '#ffffff' },
    rescheduled: { backgroundColor: '#94c9dd', color: '#3e545d' },

    // Phase variants
    'pre-clinical': { backgroundColor: '#8c4028', color: '#ffffff' },
    'phase-1': { backgroundColor: '#fe7449', color: '#ffffff' },
    'phase-2': { backgroundColor: '#fdba74', color: '#6b311f' },
    'phase-3': { backgroundColor: '#ddd6fe', color: '#5b21b6' },
    'phase-4': { backgroundColor: '#f0b456', color: '#654c24' },
    approved: { backgroundColor: '#a78bfa', color: '#ffffff' },

    // Selection state (for filter chips)
    active: { backgroundColor: '#fe7449', color: '#ffffff' },
    inactive: { backgroundColor: '#fcf9f2', color: '#262626', border: '1px solid #e5e7eb' },
  };

  const getVariantStyle = () => {
    if (selected) {
      return colorVariants.active;
    }
    return colorVariants[variant] || colorVariants.default;
  };

  const variantStyle = getVariantStyle();

  const hoverStyle = onClick && isHovered ? {
    filter: 'brightness(0.95)',
  } : {};

  const combinedStyles = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyle,
    ...hoverStyle,
  };

  const handleClick = () => {
    if (onClick && !disabled) {
      onClick();
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove && !disabled) {
      onRemove();
    }
  };

  return (
    <span
      style={combinedStyles}
      className={className}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {removable && (
        <button
          onClick={handleRemove}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: '4px',
            padding: '0',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: 'inherit',
            opacity: 0.7,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </span>
  );
};

// ChipGroup for filter chips
export const ChipGroup = ({ children, className = '' }) => {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }} className={className}>
      {children}
    </div>
  );
};

export default Chip;
