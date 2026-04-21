'use client';

const TabSwitcher = ({
  tabs = [],
  activeTab,
  onChange,
  size = 'default',
  className = '',
}) => {
  const isLarge = size === 'large';
  return (
    <div className={`inline-flex items-center bg-[#F2F2F4] ${isLarge ? 'h-12 p-1 gap-1' : 'h-9 p-0.5 gap-0.5'} ${className}`}>
      {tabs.map((tab) => {
        const tabValue = typeof tab === 'object' ? tab.value : tab;
        const tabLabel = typeof tab === 'object' ? tab.label : tab;
        const TabIcon = typeof tab === 'object' ? tab.icon : null;
        const isActive = tabValue === activeTab;
        const iconOnly = TabIcon && !tabLabel;

        return (
          <button
            key={tabValue}
            type="button"
            onClick={() => onChange && onChange(tabValue)}
            className={`inline-flex items-center justify-center whitespace-nowrap border-none cursor-pointer transition-all duration-200
              ${tabLabel ? 'gap-2' : 'gap-0'}
              ${isLarge
                ? `${iconOnly ? 'w-10 h-10' : 'px-8 h-10'} text-base`
                : `${iconOnly ? 'w-8 h-8' : 'px-5 h-8'} text-sm`
              }
              ${isActive
                ? `bg-[#262626] text-white font-medium shadow-sm hover:bg-[#262626]/88 ${isLarge ? '' : 'rounded'}`
                : 'bg-transparent text-gray-400 font-normal hover:bg-white/50'
              }`}
          >
            {TabIcon && (
              <TabIcon
                className={`${isLarge ? 'w-5 h-5' : 'w-[18px] h-[18px]'} ${isActive ? 'text-white' : 'text-gray-400'}`}
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
