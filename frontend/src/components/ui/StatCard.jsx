'use client';

import { useState } from 'react';
import { InfoIcon } from '../icons';

// =========================================================
// StatCard — single-value summary card.
// =========================================================
// Two variants:
//   - 'number' (default): 48px bold value formatted with toLocaleString.
//   - 'text': renders `value` as readable paragraph copy.
// The text variant exists so cards that surface long-form metadata
// (e.g. a priority's target_population) keep the same chrome as the
// number cards without overloading the `value` prop.

const StatCard = ({
  title,
  value,
  description,
  buttonText,
  onButtonClick,
  buttonHref,
  tooltip,
  variant = 'number',
  loading = false,
  className = '',
}) => {
  const [isInfoHovered, setIsInfoHovered] = useState(false);

  return (
    <div className={`bg-white border border-gray-200 p-4 flex flex-col gap-4 ${className}`}>
      <div className="flex items-start justify-between">
        <h3 className="text-base font-semibold text-black">{title}</h3>
        {tooltip && (
          <div className="relative">
            <InfoIcon
              className="w-5 h-5 text-gray-400 cursor-pointer"
              onMouseEnter={() => setIsInfoHovered(true)}
              onMouseLeave={() => setIsInfoHovered(false)}
            />
            {isInfoHovered && (
              <div className="absolute top-7 right-0 bg-black text-white text-xs leading-relaxed px-3 py-2 rounded-md z-10 w-64">
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        {loading ? (
          variant === 'text' ? (
            <div className="flex flex-col gap-2">
              <div className="h-3 w-11/12 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-9/12 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-10/12 bg-gray-200 rounded animate-pulse" />
            </div>
          ) : (
            <div className="h-12 w-32 bg-gray-200 rounded animate-pulse" />
          )
        ) : variant === 'text' ? (
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {value}
          </p>
        ) : (
          <div
            className="text-[48px] font-extrabold text-black leading-tight"
            style={{ fontFamily: 'var(--font-align), system-ui, sans-serif' }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
        )}
        {description && (
          <p className="text-sm text-gray-500 mt-2">{description}</p>
        )}
      </div>

      {buttonText && (
        <a
          href={buttonHref || '#'}
          onClick={(e) => {
            if (onButtonClick) {
              e.preventDefault();
              onButtonClick();
            }
          }}
          className="block w-full py-3 px-4 text-sm font-medium text-black bg-white border border-black-24 cursor-pointer text-center no-underline mt-2 hover:bg-gray-50 transition-colors"
        >
          {buttonText}
        </a>
      )}
    </div>
  );
};

export default StatCard;
