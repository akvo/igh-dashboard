'use client';

const TabSwitcher = ({
  tabs = [],
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center bg-[#F2F2F4] h-9 p-0.5 gap-0.5 ${className}`}>
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
            className={`inline-flex items-center justify-center whitespace-nowrap border-none cursor-pointer transition-all duration-200 text-sm
              ${tabLabel ? 'gap-2' : 'gap-0'}
              ${iconOnly ? 'w-8 h-8' : 'px-5 h-8'}
              ${isActive
                ? 'bg-white text-black font-medium shadow-sm rounded'
                : 'bg-transparent text-gray-400 font-normal hover:bg-white/50'
              }`}
          >
            {TabIcon && (
              <TabIcon
                className={`w-[18px] h-[18px] ${isActive ? 'text-black' : 'text-gray-400'}`}
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
