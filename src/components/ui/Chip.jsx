'use client';

const variantClasses = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-orange-50 text-orange-700',
  success: 'bg-green-100 text-green-900',
  warning: 'bg-yellow-100 text-yellow-900',
  error: 'bg-orange-100 text-orange-900',
  info: 'bg-blue-100 text-blue-900',
  early: 'bg-orange-500 text-white',
  late: 'bg-orange-100 text-orange-800',
  'on-time': 'bg-green-500 text-white',
  delayed: 'bg-yellow-500 text-yellow-900',
  cancelled: 'bg-orange-600 text-white',
  rescheduled: 'bg-blue-500 text-blue-900',
  'pre-clinical': 'bg-orange-800 text-white',
  'phase-1': 'bg-orange-500 text-white',
  'phase-2': 'bg-orange-200 text-orange-900',
  'phase-3': 'bg-purple-200 text-purple-800',
  'phase-4': 'bg-yellow-500 text-yellow-900',
  approved: 'bg-purple-400 text-white',
  active: 'bg-orange-500 text-white',
  inactive: 'bg-cream-300 text-black border border-gray-200',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[11px] gap-1',
  md: 'px-3 py-1 text-xs gap-1.5',
  lg: 'px-4 py-1.5 text-sm gap-2',
};

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
  const variantClass = selected ? variantClasses.active : (variantClasses[variant] || variantClasses.default);
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <span
      className={`inline-flex items-center justify-center font-medium rounded-full whitespace-nowrap transition-all duration-200
        ${sizeClass} ${variantClass}
        ${onClick ? 'cursor-pointer hover:brightness-95' : 'cursor-default'}
        ${disabled ? 'opacity-50' : 'opacity-100'}
        ${className}`}
      onClick={() => onClick && !disabled && onClick()}
    >
      {children}
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onRemove && !disabled) onRemove();
          }}
          className="inline-flex items-center justify-center ml-1 p-0 border-none bg-transparent cursor-pointer text-current opacity-70"
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

export const ChipGroup = ({ children, className = '' }) => {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {children}
    </div>
  );
};

export default Chip;
