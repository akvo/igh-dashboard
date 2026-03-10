'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon } from '../icons';

const Header = ({
  logo,
  navItems = [],
  onNavClick,
  className = '',
}) => {
  return (
    <header className={`flex items-center justify-between px-6 sm:px-10 lg:px-16 h-[72px] ${className}`} style={{ backgroundColor: '#000' }}>
      <div className="flex items-center gap-3">
        {logo || <DefaultLogo />}
      </div>
      <nav className="hidden md:flex items-center gap-4">
        {navItems.map((item) => (
          <NavItem
            key={item.label}
            label={item.label}
            hasDropdown={item.hasDropdown}
            href={item.href}
            onClick={() => onNavClick && onNavClick(item)}
            items={item.items}
            description={item.description}
            featured={item.featured}
          />
        ))}
      </nav>
      {/* Mobile menu button */}
      <button className="md:hidden border-none bg-transparent cursor-pointer p-2">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </header>
  );
};

const NavItem = ({ label, hasDropdown, href, onClick, items, description, featured }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const header = buttonRef.current.closest('header');
      const headerRect = header ? header.getBoundingClientRect() : buttonRef.current.getBoundingClientRect();
      const btnRect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({ top: headerRect.bottom, left: btnRect.left });
    }
  }, []);

  useEffect(() => {
    if (isOpen) updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isMegaMenu = featured || (items && items.some(i => i.description));

  const handleToggle = (e) => {
    if (hasDropdown) {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  const menu = isOpen && hasDropdown && items && items.length > 0 && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          className={`fixed z-[9999] bg-white ${isMegaMenu ? 'left-0 right-0' : 'min-w-[180px]'}`}
          style={isMegaMenu
            ? { top: `${menuPosition.top}px`, boxShadow: '0 8px 16px rgba(0,0,0,.1)' }
            : { top: `${menuPosition.top}px`, left: `${menuPosition.left}px`, boxShadow: '0 8px 16px rgba(0,0,0,.1)' }
          }
        >
          {isMegaMenu ? (
            <div className="pt-4 pb-6">
              {description && (
                <div>
                  <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-6" style={{ backgroundColor: '#feede7' }}>
                    <a href="/" className="text-xs font-bold text-black no-underline tracking-wider uppercase inline-flex items-center gap-2 shrink-0">
                      <span className="w-3 h-3 bg-orange-500 inline-block" />
                      {`VISIT ${label.toUpperCase()}`}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                    </a>
                    <p className="text-sm text-gray-700">{description}</p>
                  </div>
                </div>
              )}
              <div className="max-w-6xl mx-auto flex items-start mt-4">
                {featured && (
                  featured.items ? (
                    <div className="w-80 shrink-0 bg-black px-6 py-6">
                      <h3 className="text-sm font-bold text-white mb-4">{featured.title}</h3>
                      <div className="flex flex-col gap-4">
                        {featured.items.map((hub) => (
                          <a
                            key={hub.label}
                            href={hub.href || '#'}
                            onClick={() => setIsOpen(false)}
                            className="group block no-underline"
                          >
                            <span className="text-sm font-semibold text-white group-hover:text-orange-500 inline-flex items-center gap-1">
                              {hub.label}
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                              </svg>
                            </span>
                            {hub.description && (
                              <span className="block text-xs text-gray-400 mt-1">{hub.description}</span>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="w-72 shrink-0 bg-black px-6 py-6">
                      <h3 className="text-sm font-bold text-white mb-3">{featured.title}</h3>
                      <a
                        href={featured.href}
                        target={featured.external ? '_blank' : undefined}
                        rel={featured.external ? 'noopener noreferrer' : undefined}
                        className="text-sm font-semibold text-white no-underline hover:text-orange-500 inline-flex items-center gap-1 mb-3"
                      >
                        {featured.title}
                        {featured.external && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        )}
                      </a>
                      <p className="text-xs text-gray-400">{featured.description}</p>
                    </div>
                  )
                )}
                <div className={`flex-1 grid ${featured ? 'grid-cols-2' : 'grid-cols-3'} gap-x-8 gap-y-6 px-6 pb-6`}>
                  {items.map((subItem) => (
                    <a
                      key={subItem.label}
                      href={subItem.href || '#'}
                      target={subItem.external ? '_blank' : undefined}
                      rel={subItem.external ? 'noopener noreferrer' : undefined}
                      onClick={(e) => { if (subItem.onClick) { e.preventDefault(); subItem.onClick(); } setIsOpen(false); }}
                      className={`group block no-underline ${subItem.highlight ? 'p-4' : ''}`}
                      style={subItem.highlight ? { backgroundColor: '#feede7' } : undefined}
                    >
                      <span className="text-sm font-bold text-black group-hover:text-orange-500 inline-flex items-center gap-1">
                        {subItem.label}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </span>
                      {subItem.description && (
                        <span className="block text-sm text-gray-600 mt-1">{subItem.description}</span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            items.map((subItem, index) => (
              <a
                key={subItem.label}
                href={subItem.href || '#'}
                onClick={(e) => { if (subItem.onClick) { e.preventDefault(); subItem.onClick(); } setIsOpen(false); }}
                className={`block px-4 py-2.5 text-sm text-black no-underline hover:bg-gray-50 transition-colors ${index < items.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                {subItem.label}
              </a>
            ))
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={buttonRef} className="relative">
      <a
        href={href || '#'}
        onClick={(e) => {
          handleToggle(e);
          if (!hasDropdown && onClick) { e.preventDefault(); onClick(); }
        }}
        className={`inline-flex items-center gap-1 px-4 py-2 text-[15px] font-medium text-white no-underline tracking-wider uppercase rounded whitespace-nowrap transition-colors cursor-pointer ${isOpen ? 'bg-white/[0.08]' : 'hover:bg-white/[0.08] bg-transparent'}`}
      >
        {label}
        {hasDropdown && (
          <ChevronDownIcon className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </a>
      {menu}
    </div>
  );
};

const DefaultLogo = () => (
  <a href="/" className="flex items-center">
    <img src="/logo-white.svg" alt="Impact Global Health" height={40} />
  </a>
);

export default Header;
