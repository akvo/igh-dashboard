'use client';

import { forwardRef, useState } from 'react';

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  className = '',
  as: Component = 'button',
  ...props
}, ref) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };

  const variantStyles = {
    primary: {
      backgroundColor: isHovered ? '#FE906D' : '#fe7449',
      color: '#ffffff',
    },
    secondary: {
      backgroundColor: isHovered ? '#F2F2F4' : '#f3f4f6',
      color: '#111827',
    },
    outline: {
      backgroundColor: isHovered ? '#fff1ed' : 'transparent',
      color: '#fe7449',
      border: '1px solid #fe7449',
    },
    ghost: {
      backgroundColor: isHovered ? '#f3f4f6' : 'transparent',
      color: '#4b5563',
    },
    link: {
      backgroundColor: 'transparent',
      color: '#fe7449',
      textDecoration: isHovered ? 'underline' : 'none',
    },
    danger: {
      backgroundColor: isHovered ? '#dc2626' : '#ef4444',
      color: '#ffffff',
    },
  };

  const sizeStyles = {
    sm: { height: '32px', padding: '0 12px', fontSize: '14px', borderRadius: '6px', gap: '6px' },
    md: { height: '40px', padding: '0 16px', fontSize: '14px', borderRadius: '8px', gap: '8px' },
    lg: { height: '48px', padding: '0 24px', fontSize: '16px', borderRadius: '8px', gap: '8px' },
    icon: { height: '40px', width: '40px', padding: '0', borderRadius: '8px' },
  };

  const combinedStyles = {
    ...baseStyles,
    ...variantStyles[variant],
    ...sizeStyles[size],
  };

  return (
    <Component
      ref={ref}
      disabled={disabled || loading}
      style={combinedStyles}
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {loading && (
        <svg
          className="button-spinner"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          style={{ marginRight: '8px', width: '16px', height: '16px' }}
        >
          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && leftIcon && <span style={{ display: 'flex', flexShrink: 0 }}>{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span style={{ display: 'flex', flexShrink: 0 }}>{rightIcon}</span>}
    </Component>
  );
});

Button.displayName = 'Button';

// Text Link Button (for Explore links)
export const TextLink = forwardRef(({
  children,
  href,
  onClick,
  showArrow = true,
  className = '',
  ...props
}, ref) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <a
      ref={ref}
      href={href || '#'}
      onClick={onClick ? handleClick : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        color: '#fe7449',
        fontSize: '14px',
        textDecoration: isHovered ? 'underline' : 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={className}
      {...props}
    >
      <span>{children}</span>
      {showArrow && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginLeft: '4px', flexShrink: 0 }}
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      )}
    </a>
  );
});

TextLink.displayName = 'TextLink';

export default Button;
