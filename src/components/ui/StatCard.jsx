'use client';

import { useState } from 'react';
import { InfoIcon } from '../icons';

const StatCard = ({
  title,
  value,
  description,
  buttonText,
  onButtonClick,
  buttonHref,
  tooltip,
  className = '',
}) => {
  const [isInfoHovered, setIsInfoHovered] = useState(false);

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4 ${className}`}>
      {/* Header */}
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
              <div className="absolute top-7 right-0 bg-black text-white text-xs px-3 py-2 rounded-md whitespace-nowrap z-10">
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Value */}
      <div>
        <div className="text-[40px] font-extrabold text-black leading-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {description && (
          <p className="text-sm text-gray-500 mt-2">{description}</p>
        )}
      </div>

      {/* Button */}
      {buttonText && (
        <a
          href={buttonHref || '#'}
          onClick={(e) => {
            if (onButtonClick) {
              e.preventDefault();
              onButtonClick();
            }
          }}
          className="block w-full py-3 px-4 text-sm font-medium text-gray-600 bg-transparent border border-gray-200 rounded-lg cursor-pointer text-center no-underline mt-2 hover:bg-gray-50 transition-colors"
        >
          {buttonText}
        </a>
      )}
    </div>
  );
};

export default StatCard;
