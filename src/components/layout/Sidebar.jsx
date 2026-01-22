'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  HomeIcon,
  ChartIcon,
  RefreshIcon,
  ListIcon,
  BoltIcon,
  GridIcon,
  FileIcon,
  HelpIcon,
  SearchIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from '../icons';

const defaultMenuItems = [
  {
    section: 'GENERAL',
    items: [
      { id: 'home', label: 'Home', icon: HomeIcon, href: '/' },
      { id: 'portfolio', label: 'Portfolio Analysis', icon: ChartIcon, href: '/portfolio' },
      { id: 'cross-pipeline', label: 'Cross-Pipeline Analytics', icon: RefreshIcon, href: '/cross-pipeline' },
      { id: 'who-priority', label: 'WHO Priority alignment', icon: ListIcon, href: '/who-priority' },
      { id: 'ai-search', label: 'AI Data Search', icon: BoltIcon, href: '/ai-search' },
    ],
  },
  {
    section: 'OTHER',
    items: [
      { id: 'case-studies', label: 'Case studies', icon: GridIcon, href: '/case-studies' },
      { id: 'methodology', label: 'Methodology', icon: FileIcon, href: '/methodology' },
    ],
  },
];

export default function Sidebar({
  menuItems = defaultMenuItems,
  activeId = 'home',
  onNavigate,
  defaultExpanded = true,
  showSearch = true,
  showHelp = true,
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [searchQuery, setSearchQuery] = useState('');

  const handleItemClick = (item) => {
    if (onNavigate) {
      onNavigate(item);
    }
  };

  return (
    <aside
      style={{ height: 'calc(100vh - 74px)', position: 'sticky', top: '74px' }}
      className={`hidden lg:flex flex-col transition-all duration-300 bg-sidebar-bg ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
    >
      {/* Search */}
      {showSearch && (
        <div className="p-3">
          {isExpanded ? (
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-icon" strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-cream-100 border border-black-12 rounded-lg focus:outline-none focus:border-orange-500 placeholder:text-sidebar-text"
              />
            </div>
          ) : (
            <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-sidebar-hover transition-colors">
              <SearchIcon className="w-5 h-5 text-sidebar-icon" strokeWidth={2.5} />
            </button>
          )}
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {menuItems.map((section, sectionIndex) => (
          <div key={section.section} className={sectionIndex > 0 ? 'mt-6' : ''}>
            {isExpanded && (
              <p className="px-3 mb-2 text-xs font-medium uppercase tracking-wider text-sidebar-section">
                {section.section}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeId === item.id;

                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => handleItemClick(item)}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-sidebar-active'
                          : 'hover:bg-sidebar-hover'
                      } ${!isExpanded ? 'justify-center' : ''}`}
                      title={!isExpanded ? item.label : undefined}
                    >
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 transition-colors ${
                          isActive ? 'text-orange-500' : 'text-sidebar-icon group-hover:text-orange-500'
                        }`}
                        strokeWidth={2.5}
                      />
                      {isExpanded && (
                        <span
                          className={`text-sm transition-colors ${
                            isActive
                              ? 'font-semibold text-black'
                              : 'font-normal text-sidebar-text group-hover:text-black'
                          }`}
                        >
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-black-12">
        <div className="flex items-center justify-between">
          {isExpanded ? (
            <>
              {showHelp && (
                <Link
                  href="/help"
                  className="group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-sidebar-hover"
                >
                  <HelpIcon className="w-5 h-5 text-sidebar-icon group-hover:text-orange-500 transition-colors" strokeWidth={2.5} />
                  <span className="text-sm text-sidebar-text group-hover:text-black transition-colors">Help</span>
                </Link>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 rounded-lg text-sidebar-icon hover:bg-sidebar-hover hover:text-black transition-colors"
                title="Collapse sidebar"
              >
                <ChevronsLeftIcon className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full p-2 rounded-lg text-sidebar-icon hover:bg-sidebar-hover hover:text-black transition-colors flex justify-center"
              title="Expand sidebar"
            >
              <ChevronsRightIcon className="w-5 h-5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
