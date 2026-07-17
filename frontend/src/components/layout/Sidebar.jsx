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
import GuidedTour from '../guided-tour/GuidedTour';
import { matchesItemHref } from './menuActive';
import { t } from '@/content';

const defaultMenuItems = [
  {
    section: t('layout.sidebar.section_general'),
    items: [
      { id: 'home', label: t('layout.sidebar.nav_home'), icon: HomeIcon, href: '/' },
      { id: 'pipeline-overview', label: t('layout.sidebar.nav_pipeline_overview'), icon: GridIcon, href: '/pipeline-overview' },
      {
        id: 'pipeline-explorer',
        label: t('layout.sidebar.nav_pipeline_explorer'),
        icon: SearchIcon,
        href: '/pipeline-explorer',
        // Single entry that stays highlighted across both child routes
        // (/pipeline-explorer and /pipeline-explorer/table-builder).
        match: 'prefix',
      },
      { id: 'pipeline-trends', label: t('layout.sidebar.nav_pipeline_trends'), icon: RefreshIcon, href: '/pipeline-trends' },
      { id: 'who-priority-alignment', label: t('layout.sidebar.nav_who_priority'), icon: ListIcon, href: '/who-priority-alignment' },
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
  const [showTour, setShowTour] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('guidedTourActive') === 'true';
    }
    return false;
  });
  const handleStartTour = () => {
    sessionStorage.setItem('guidedTourActive', 'true');
    setShowTour(true);
  };
  const handleCloseTour = () => {
    sessionStorage.removeItem('guidedTourActive');
    sessionStorage.removeItem('guidedTourStep');
    setShowTour(false);
  };
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
      style={{ height: 'calc(100vh - 90px)', position: 'sticky', top: '90px' }}
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
      <nav data-tour="sidebar-nav" className="flex-1 overflow-y-auto px-3 py-2">
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
      <div data-tour="filter-box">
        <SidebarFilterBox isExpanded={isExpanded} />
      </div>

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
                    <span className="text-sm text-sidebar-text group-hover:text-black transition-colors">{t('layout.sidebar.help_button')}</span>
                  </button>
                  {showHelpPopup && (
                    <div
                      className="absolute bg-white rounded-lg shadow-lg z-[1100]"
                      style={{
                        bottom: '100%',
                        left: 0,
                        marginBottom: 12,
                        width: 320,
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
                      <h4 className="text-base font-bold text-black m-0 mb-1">{t('layout.sidebar.help_title')}</h4>
                      <p className="text-sm text-gray-500 m-0 mb-4">
                        {t('layout.sidebar.help_intro')}
                      </p>

                      <div className="mb-3">
                        <p className="text-sm m-0 mb-1">
                          <span style={{ marginRight: 6 }}>&#x1F5FA;</span>
                          <strong>{t('layout.sidebar.help_tour_title')}</strong>{' '}
                          <span className="text-gray-500">
                            {t('layout.sidebar.help_tour_description')}
                          </span>
                        </p>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm m-0 mb-1">
                          <span style={{ marginRight: 6 }}>&#x2709;</span>
                          <strong>{t('layout.sidebar.help_contact_title')}</strong>{' '}
                          <span className="text-gray-500">
                            {t('layout.sidebar.help_contact_description')}
                          </span>
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <a
                          href="mailto:info@impactgh.org"
                          className="flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-black no-underline hover:bg-gray-50 transition-colors"
                          style={{ flex: 1 }}
                        >
                          {t('layout.sidebar.help_send_email')}
                        </a>
                        <button
                          onClick={() => {
                            setShowHelpPopup(false);
                            handleStartTour();
                          }}
                          className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-black transition-colors"
                          style={{ flex: 1, border: 'none', background: '#fe7449', cursor: 'pointer' }}
                        >
                          {t('layout.sidebar.help_start_tour')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button
                data-tour="sidebar-collapse"
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
                      className="absolute bg-white rounded-lg shadow-lg z-[1100]"
                      style={{
                        bottom: '100%',
                        left: 0,
                        marginBottom: 12,
                        width: 320,
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
                      <h4 className="text-base font-bold text-black m-0 mb-1">{t('layout.sidebar.help_title')}</h4>
                      <p className="text-sm text-gray-500 m-0 mb-4">
                        {t('layout.sidebar.help_intro')}
                      </p>

                      <div className="mb-3">
                        <p className="text-sm m-0 mb-1">
                          <span style={{ marginRight: 6 }}>&#x1F5FA;</span>
                          <strong>{t('layout.sidebar.help_tour_title')}</strong>{' '}
                          <span className="text-gray-500">
                            {t('layout.sidebar.help_tour_description')}
                          </span>
                        </p>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm m-0 mb-1">
                          <span style={{ marginRight: 6 }}>&#x2709;</span>
                          <strong>{t('layout.sidebar.help_contact_title')}</strong>{' '}
                          <span className="text-gray-500">
                            {t('layout.sidebar.help_contact_description')}
                          </span>
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <a
                          href="mailto:info@impactgh.org"
                          className="flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-black no-underline hover:bg-gray-50 transition-colors"
                          style={{ flex: 1 }}
                        >
                          {t('layout.sidebar.help_send_email')}
                        </a>
                        <button
                          onClick={() => {
                            setShowHelpPopup(false);
                            handleStartTour();
                          }}
                          className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-black transition-colors"
                          style={{ flex: 1, border: 'none', background: '#fe7449', cursor: 'pointer' }}
                        >
                          {t('layout.sidebar.help_start_tour')}
                        </button>
                      </div>
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
      <GuidedTour active={showTour} onClose={handleCloseTour} />
    </aside>
  );
}
