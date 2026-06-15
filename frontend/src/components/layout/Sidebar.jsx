'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFilterPreservingHref } from '@/lib/useFilterPreservingHref';
import {
  HomeIcon,
  RefreshIcon,
  ListIcon,
  GridIcon,
  HelpIcon,
  SearchIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from '../icons';
import SidebarFilterBox from './SidebarFilterBox';
import { matchesItemHref } from './menuActive';

const defaultMenuItems = [
  {
    section: 'GENERAL',
    items: [
      { id: 'home', label: 'Home', icon: HomeIcon, href: '/' },
      { id: 'pipeline-overview', label: 'Pipeline Overview', icon: GridIcon, href: '/pipeline-overview' },
      {
        id: 'pipeline-explorer',
        label: 'Pipeline Explorer',
        icon: SearchIcon,
        href: '/pipeline-explorer',
        // Single entry that stays highlighted across both child routes
        // (/pipeline-explorer and /pipeline-explorer/table-builder).
        match: 'prefix',
      },
      { id: 'pipeline-trends', label: 'Pipeline trends', icon: RefreshIcon, href: '/pipeline-trends' },
      { id: 'who-priority-alignment', label: 'WHO Priority alignment', icon: ListIcon, href: '/who-priority-alignment' },
    ],
  },
];

export default function Sidebar({
  menuItems = defaultMenuItems,
  activeId,
  onNavigate,
  defaultExpanded = true,
  showSearch = true,
  showHelp = true,
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const helpRef = useRef(null);

  useEffect(() => {
    if (!showHelpPopup) return;
    const handleClickOutside = (e) => {
      if (helpRef.current && !helpRef.current.contains(e.target)) {
        setShowHelpPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHelpPopup]);

  const handleItemClick = (item) => {
    if (onNavigate) {
      onNavigate(item);
    }
  };

  // =========================================================
  // Active-state detection
  // =========================================================
  //
  // Active state derives from the current pathname so each page no
  // longer needs to pass the right `activeId`. The prop stays as an
  // optional override for Storybook stories that don't have a
  // pathname context.

  const pathname = usePathname();
  const isItemActive = (item) => {
    if (activeId !== undefined) return activeId === item.id;
    if (!pathname) return false;
    return matchesItemHref(item.href, { pathname, match: item.match });
  };

  // Filter-preserving href builder: carries the global filter keys across
  // every route and sibling/page-specific params within the same top-level
  // path segment.
  const buildHref = useFilterPreservingHref();

  return (
    <aside
      style={{ height: 'calc(100vh - 74px)', position: 'sticky', top: '74px' }}
      className={`hidden lg:flex flex-col transition-all duration-300 bg-sidebar-bg ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
    >
      {/* Search
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
 */}

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
                const isActive = isItemActive(item);

                return (
                  <li key={item.id}>
                    <Link
                      href={buildHref(item.href)}
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

      {/* Global filter box */}
      <SidebarFilterBox isExpanded={isExpanded} />

      {/* Footer */}
      <div className="p-3 border-t border-black-12">
        <div className="flex items-center justify-between">
          {isExpanded ? (
            <>
              {showHelp && (
                <div
                  ref={helpRef}
                  className="relative"
                >
                  <button
                    onClick={() => setShowHelpPopup((prev) => !prev)}
                    className="group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-sidebar-hover bg-transparent border-0 cursor-pointer"
                  >
                    <HelpIcon className="w-5 h-5 text-sidebar-icon group-hover:text-orange-500 transition-colors" strokeWidth={2.5} />
                    <span className="text-sm text-sidebar-text group-hover:text-black transition-colors">Help</span>
                  </button>
                  {showHelpPopup && (
                    <div
                      className="absolute bg-white rounded-lg shadow-lg z-50"
                      style={{
                        bottom: '100%',
                        left: 0,
                        marginBottom: 12,
                        width: 280,
                        padding: '20px',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                      }}
                    >
                      {/* Arrow */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: -8,
                          left: 24,
                          width: 16,
                          height: 16,
                          backgroundColor: '#fff',
                          transform: 'rotate(45deg)',
                          boxShadow: '4px 4px 8px rgba(0,0,0,0.05)',
                        }}
                      />
                      <h4 className="text-base font-bold text-black m-0 mb-2">Contact information</h4>
                      <p className="text-[0.9375rem] leading-relaxed text-gray-600 m-0 mb-4">
                        For questions or help requests regarding the data and platform - reach out to the igh team via{' '}
                        <a href="mailto:info@impactgh.org" className="underline text-gray-600">info@impactgh.org</a>.
                      </p>
                      <a
                        href="mailto:info@impactgh.org"
                        className="flex items-center justify-center gap-2 w-full py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-black no-underline hover:bg-gray-50 transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="M22 4L12 13L2 4" />
                        </svg>
                        Send email
                      </a>
                    </div>
                  )}
                </div>
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
            <div className="flex flex-col items-center gap-2">
              {showHelp && (
                <div
                  ref={helpRef}
                  className="relative"
                >
                  <button
                    onClick={() => setShowHelpPopup((prev) => !prev)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-sidebar-hover transition-colors bg-transparent border-0 cursor-pointer"
                    title="Help"
                  >
                    <HelpIcon className="w-5 h-5 text-sidebar-icon hover:text-orange-500 transition-colors" strokeWidth={2.5} />
                  </button>
                  {showHelpPopup && (
                    <div
                      className="absolute bg-white rounded-lg shadow-lg z-50"
                      style={{
                        bottom: '100%',
                        left: 0,
                        marginBottom: 12,
                        width: 280,
                        padding: '20px',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          bottom: -8,
                          left: 16,
                          width: 16,
                          height: 16,
                          backgroundColor: '#fff',
                          transform: 'rotate(45deg)',
                          boxShadow: '4px 4px 8px rgba(0,0,0,0.05)',
                        }}
                      />
                      <h4 className="text-base font-bold text-black m-0 mb-2">Contact information</h4>
                      <p className="text-[0.9375rem] leading-relaxed text-gray-600 m-0 mb-4">
                        For questions or help requests regarding the data and platform - reach out to the igh team via{' '}
                        <a href="mailto:info@impactgh.org" className="underline text-gray-600">info@impactgh.org</a>.
                      </p>
                      <a
                        href="mailto:info@impactgh.org"
                        className="flex items-center justify-center gap-2 w-full py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-black no-underline hover:bg-gray-50 transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="M22 4L12 13L2 4" />
                        </svg>
                        Send email
                      </a>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => setIsExpanded(true)}
                className="w-full p-2 rounded-lg text-sidebar-icon hover:bg-sidebar-hover hover:text-black transition-colors flex justify-center"
                title="Expand sidebar"
              >
                <ChevronsRightIcon className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
