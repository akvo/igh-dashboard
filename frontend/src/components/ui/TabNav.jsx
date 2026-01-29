'use client';

const TabNav = ({
  tabs = [],
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-6 border-b border-gray-200 ${className}`}>
      {tabs.map((tab) => {
        const tabValue = typeof tab === 'object' ? tab.value : tab;
        const tabLabel = typeof tab === 'object' ? tab.label : tab;
        const isActive = tabValue === activeTab;

        return (
          <button
            key={tabValue}
            type="button"
            onClick={() => onChange && onChange(tabValue)}
            className={`relative pb-3 text-sm font-medium border-none bg-transparent cursor-pointer whitespace-nowrap transition-colors
              ${isActive ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {tabLabel}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-black rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TabNav;
