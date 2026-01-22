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
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [isInfoHovered, setIsInfoHovered] = useState(false);

  return (
    <div
      className={className}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#262626', margin: 0 }}>
          {title}
        </h3>
        {tooltip && (
          <div style={{ position: 'relative' }}>
            <InfoIcon
              style={{
                width: '20px',
                height: '20px',
                color: '#9ca3af',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setIsInfoHovered(true)}
              onMouseLeave={() => setIsInfoHovered(false)}
            />
            {isInfoHovered && (
              <div
                style={{
                  position: 'absolute',
                  top: '28px',
                  right: 0,
                  backgroundColor: '#262626',
                  color: '#ffffff',
                  fontSize: '12px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                }}
              >
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Value */}
      <div>
        <div style={{ fontSize: '40px', fontWeight: '800', color: '#262626', lineHeight: 1.2 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {description && (
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px', margin: '8px 0 0 0' }}>
            {description}
          </p>
        )}
      </div>

      {/* Button */}
      {(buttonText) && (
        <a
          href={buttonHref || '#'}
          onClick={(e) => {
            if (onButtonClick) {
              e.preventDefault();
              onButtonClick();
            }
          }}
          style={{
            display: 'block',
            width: '100%',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#6b7280',
            backgroundColor: isButtonHovered ? '#f9fafb' : 'transparent',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            textAlign: 'center',
            textDecoration: 'none',
            marginTop: '8px',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
        >
          {buttonText}
        </a>
      )}
    </div>
  );
};

export default StatCard;
