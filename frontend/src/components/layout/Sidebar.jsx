'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useHash } from '@/lib/useHash';
import { useFilterPreservingHref } from '@/lib/useFilterPreservingHref';
import {
  HomeIcon,
  ChartIcon,
  RefreshIcon,
  ListIcon,
  PieChartIcon,
  LayersIcon,
  BoltIcon,
  GridIcon,
  FileIcon,
  HelpIcon,
  SearchIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '../icons';
import SidebarFilterBox from './SidebarFilterBox';
import { matchesItemHref } from './menuActive';

const defaultMenuItems = [
  {
    section: 'GENERAL',
    items: [
      { id: 'home', label: 'Home', icon: HomeIcon, href: '/' },
      {
        id: 'pipeline-explorer',
        label: 'Pipeline Explorer',
        icon: SearchIcon,
        href: '/pipeline-explorer',
        // Single entry that stays highlighted across both child routes
        // (/pipeline-explorer and /pipeline-explorer/table-builder).
        match: 'prefix',
      },
      {
        id: 'portfolio-analysis',
        label: 'Portfolio Analysis',
        icon: ChartIcon,
        // Parent groups carry a "first child" href used only for
        // the icon-only collapsed-mode click target. Clicking the
        // parent in the expanded sidebar toggles the chevron, not
        // the route.
        href: '/portfolio-analysis',
        children: [
          { id: 'portfolio-analysis-explore', label: 'Portfolio Analysis', icon: PieChartIcon, href: '/portfolio-analysis' },
          { id: 'portfolio-analysis-extract', label: 'Extract custom details', icon: ListIcon, href: '/portfolio-analysis/extract' },
          { id: 'portfolio-analysis-aggregated', label: 'Aggregated portfolio', icon: LayersIcon, href: '/portfolio-analysis#aggregated' },
        ],
      },
      { id: 'cross-pipeline-analytics', label: 'Cross-pipeline analytics', icon: RefreshIcon, href: '/cross-pipeline-analytics' },
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

    // Next.js's <Link> updates the URL via history.pushState(), which
    // per spec does NOT fire `hashchange`. Without a synthetic
    // dispatch, useHash() consumers (this Sidebar's own active-state,
    // the Portfolio Analysis page's scroll effect) never react to a
    // same-route hash change — e.g. clicking "Aggregated portfolio"
    // from "Portfolio analysis" updates the URL but no React state.
    //
    // The catch: Next 16 performs that pushState ASYNCHRONOUSLY, after
    // our onClick returns (it wraps navigation in a transition). A
    // microtask — or even setTimeout(0) — therefore fires too early,
    // while `window.location.hash` still holds the OLD value, so
    // useHash() reads stale data. That produced a click-twice bug: the
    // first click's scroll + highlight were lost because the hash the
    // listeners saw hadn't changed yet; only the second click (URL
    // already updated) worked.
    //
    // So we wait for the URL to actually reflect the clicked target
    // before dispatching. We poll across animation frames (Next can
    // take a few hundred ms to settle the navigation) with a timeout
    // guard so we never loop indefinitely on an unexpected href.
    if (typeof window === 'undefined') return;
    const [, targetHash = ''] = item.href.split('#');
    const wantedHash = targetHash ? `#${targetHash}` : '';
    const startedAt = performance.now();
    const dispatchWhenUrlSettles = () => {
      const settled = window.location.hash === wantedHash;
      if (settled || performance.now() - startedAt > 1000) {
        window.dispatchEvent(new Event('hashchange'));
        return;
      }
      requestAnimationFrame(dispatchWhenUrlSettles);
    };
    requestAnimationFrame(dispatchWhenUrlSettles);
  };

  // =========================================================
  // Active-state detection and per-group expand state
  // =========================================================
  //
  // Active state derives from the current pathname so each page no
  // longer needs to pass the right `activeId`. The prop stays as an
  // optional override for Storybook stories that don't have a
  // pathname context.

  const pathname = usePathname();
  const hash = useHash();
  const isItemActive = (item) => {
    if (activeId !== undefined) return activeId === item.id;
    if (!pathname) return false;
    return matchesItemHref(item.href, { pathname, hash, match: item.match });
  };

  const isGroupActive = (group) => {
    if (!group.children) return false;
    if (activeId !== undefined) return group.children.some((c) => c.id === activeId);
    if (!pathname) return false;
    // Group highlighting and expand state are pathname-only — every
    // child in the group counts as "in group" regardless of hash.
    return group.children.some((c) => {
      const childPath = c.href.split('#')[0];
      return pathname === childPath;
    });
  };

  // Per-group expand state.
  //
  // The open state is *derived* from the current route: when the
  // pathname matches one of a group's child routes, the group is
  // open. We do not seed `useState` from `window.location.pathname`
  // because during a Next.js App Router client-side navigation the
  // URL is committed only after the new tree renders — so the
  // freshly-mounted Sidebar would read the *previous* route and
  // either collapse a group we just navigated into or leave one
  // expanded after we've navigated out. `usePathname()` already
  // reflects the in-flight route during the transition, so deriving
  // from it sidesteps the timing race entirely.
  //
  // `userOverride[groupId]` is the user's manual chevron toggle. It
  // wins over the derived default when set, so a user can still
  // close a group while on one of its sub-routes, or open one while
  // browsing elsewhere. It is session-only and remounts with the
  // Sidebar on each page navigation.
  const [userOverride, setUserOverride] = useState({});

  const isGroupOpen = (group) => {
    if (userOverride[group.id] !== undefined) return userOverride[group.id];
    return isGroupActive(group);
  };

  const toggleGroup = (group) => {
    const currentOpen = isGroupOpen(group);
    setUserOverride((prev) => ({ ...prev, [group.id]: !currentOpen }));
  };

  // Filter-preserving href builder: carries the global filter keys across
  // every route and sibling/page-specific params within the same top-level
  // path segment. Hash fragments (e.g. #aggregated) pass through until the
  // separate Portfolio Analysis hash-removal task lands.
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
                const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                const isActive = !hasChildren && isItemActive(item);
                const groupOpen = hasChildren && isGroupOpen(item);
                const isGroupHighlighted = hasChildren && isGroupActive(item);

                if (!hasChildren) {
                  // Leaf item — same rendering as before.
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
                }

                // Icon-only collapsed mode: the parent acts as a
                // direct link to its primary href (typically the
                // first child). No flyout submenu.
                if (!isExpanded) {
                  return (
                    <li key={item.id}>
                      <Link
                        href={buildHref(item.href)}
                        className={`group flex items-center justify-center px-3 py-2.5 rounded-lg transition-colors ${
                          isGroupHighlighted
                            ? 'bg-sidebar-active'
                            : 'hover:bg-sidebar-hover'
                        }`}
                        title={item.label}
                      >
                        <Icon
                          className={`w-5 h-5 flex-shrink-0 transition-colors ${
                            isGroupHighlighted
                              ? 'text-orange-500'
                              : 'text-sidebar-icon group-hover:text-orange-500'
                          }`}
                          strokeWidth={2.5}
                        />
                      </Link>
                    </li>
                  );
                }

                // Expanded group: parent is a button that toggles
                // the chevron-revealed children band. Children
                // render in a tinted strip with white-card active
                // styling for the current sub-route.
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(item)}
                      aria-expanded={groupOpen}
                      className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-sidebar-hover bg-transparent border-0 cursor-pointer"
                    >
                      <Icon
                        className="w-5 h-5 flex-shrink-0 transition-colors text-sidebar-icon group-hover:text-orange-500"
                        strokeWidth={2.5}
                      />
                      <span className="flex-1 text-left text-sm font-normal text-sidebar-text group-hover:text-black transition-colors">
                        {item.label}
                      </span>
                      {groupOpen ? (
                        <ChevronUpIcon className="w-4 h-4 text-sidebar-icon" strokeWidth={2.5} />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4 text-sidebar-icon" strokeWidth={2.5} />
                      )}
                    </button>
                    {groupOpen && (
                      <ul className="bg-black/[0.03] rounded-lg mt-1 mb-1 py-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = isItemActive(child);
                          return (
                            <li key={child.id}>
                              <Link
                                href={buildHref(child.href)}
                                onClick={() => handleItemClick(child)}
                                className={`group flex items-center gap-3 pl-11 pr-3 py-2.5 rounded-lg transition-colors min-w-0 ${
                                  childActive
                                    ? 'bg-white'
                                    : 'hover:bg-sidebar-hover'
                                }`}
                              >
                                <ChildIcon
                                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                                    childActive
                                      ? 'text-orange-500'
                                      : 'text-sidebar-icon group-hover:text-orange-500'
                                  }`}
                                  strokeWidth={2.5}
                                />
                                <span
                                  className={`text-sm transition-colors truncate ${
                                    childActive
                                      ? 'font-semibold text-black'
                                      : 'font-normal text-sidebar-text group-hover:text-black'
                                  }`}
                                  title={child.label}
                                >
                                  {child.label}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
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
