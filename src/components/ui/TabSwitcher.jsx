'use client';

import { useState } from 'react';

const TabSwitcher = ({
  tabs = [],
  activeTab,
  onChange,
  className = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: '#F2F2F4',
        borderRadius: '10px',
        padding: '4px',
        gap: '4px',
      }}
    >
      {tabs.map((tab, index) => {
        const tabValue = typeof tab === 'object' ? tab.value : tab;
        const tabLabel = typeof tab === 'object' ? tab.label : tab;
        const TabIcon = typeof tab === 'object' ? tab.icon : null;
        const isActive = tabValue === activeTab;
        const isHovered = hoveredIndex === index && !isActive;
        const iconOnly = TabIcon && !tabLabel;

        return (
          <button
            key={tabValue}
            type="button"
            onClick={() => onChange && onChange(tabValue)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: tabLabel ? '8px' : '0',
              padding: iconOnly ? '10px' : '10px 20px',
              fontSize: '14px',
              fontWeight: isActive ? '500' : '400',
              color: isActive ? '#262626' : '#9ca3af',
              backgroundColor: isActive ? '#ffffff' : isHovered ? 'rgba(255,255,255,0.5)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {TabIcon && (
              <TabIcon
                style={{
                  width: '18px',
                  height: '18px',
                  color: isActive ? '#262626' : '#9ca3af',
                }}
                strokeWidth={2}
              />
            )}
            {tabLabel && <span>{tabLabel}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default TabSwitcher;
