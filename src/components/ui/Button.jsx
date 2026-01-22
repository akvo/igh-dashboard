'use client';

import { forwardRef } from 'react';

const variantClasses = {
  primary: 'bg-orange-500 text-white hover:bg-orange-400',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-100',
  outline: 'bg-transparent text-orange-500 border border-orange-500 hover:bg-orange-50',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
  link: 'bg-transparent text-orange-500 hover:underline',
  danger: 'bg-red-500 text-white hover:bg-red-600',
};

const sizeClasses = {
  sm: 'h-8 px-3 text-sm rounded-md gap-1.5',
  md: 'h-10 px-4 text-sm rounded-lg gap-2',
  lg: 'h-12 px-6 text-base rounded-lg gap-2',
  icon: 'h-10 w-10 p-0 rounded-lg',
};

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
  return (
    <Component
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 border-none
        ${variantClasses[variant] || variantClasses.primary}
        ${sizeClasses[size] || sizeClasses.md}
        ${disabled || loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        ${className}`}
      {...props}
    >
      {loading && (
        <svg
          className="button-spinner mr-2 w-4 h-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && leftIcon && <span className="flex shrink-0">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="flex shrink-0">{rightIcon}</span>}
    </Component>
  );
});

Button.displayName = 'Button';

export const TextLink = forwardRef(({
  children,
  href,
  onClick,
  showArrow = true,
  className = '',
  ...props
}, ref) => {
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
      className={`inline-flex items-center text-orange-500 text-sm no-underline cursor-pointer whitespace-nowrap transition-all duration-200 hover:underline ${className}`}
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
          className="ml-1 shrink-0"
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
