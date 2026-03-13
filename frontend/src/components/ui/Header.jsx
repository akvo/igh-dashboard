'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon } from '../icons';

const ArrowIcon = ({ className = '' }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const ExternalIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ml-2">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const Header = ({
  logo,
  navItems = [],
  onNavClick,
  className = '',
}) => {
  const [activeMenu, setActiveMenu] = useState(null);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-[1000] ${className}`}
      style={{ backgroundColor: '#000', color: '#fff', minHeight: 90, padding: '0 24px', overflow: 'visible' }}
    >
      <div
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center" style={{ gap: 5 }}>
          {logo || <DefaultLogo />}
        </div>
        <nav className="hidden lg:flex items-center" style={{ height: 90 }}>
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
              isOpen={activeMenu === item.label}
              onToggle={(lbl) => setActiveMenu((prev) => prev === lbl ? null : lbl)}
              onClose={() => setActiveMenu(null)}
            />
          ))}
        </nav>
        {/* Mobile menu button */}
        <button className="lg:hidden border-none bg-transparent cursor-pointer p-2" style={{ height: 32, width: 32 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  );
};

const NavItem = ({ label, hasDropdown, href, onClick, items, description, featured, isOpen, onToggle, onClose }) => {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const isMegaMenu = featured || (items && items.some(i => i.description));

  const handleToggle = (e) => {
    if (hasDropdown) {
      e.preventDefault();
      onToggle(label);
    }
  };

  const menu = isOpen && hasDropdown && ((items && items.length > 0) || featured) && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed left-0 right-0 z-[9999] bg-white overflow-y-auto"
          style={{
            top: 90,
            color: '#262626',
            boxShadow: '0 8px 16px rgba(0,0,0,.1)',
            maxHeight: 'calc(100vh - 90px)',
            padding: isMegaMenu ? '32px 0' : 0,
          }}
        >
          {isMegaMenu ? (
            <div className="mx-auto w-full" style={{ maxWidth: 'calc(1260px + 48px)', padding: '0 24px' }}>
              {/* Attention bar */}
              {description && (
                <div
                  className="flex items-center"
                  style={{ backgroundColor: '#feede7', padding: 24, marginBottom: 32 }}
                >
                  <a
                    href="/"
                    className="no-underline inline-flex items-center flex-nowrap shrink-0"
                    style={{ fontWeight: 700, textTransform: 'uppercase', maxWidth: 250, padding: '10px 20px 10px 0', color: '#262626', fontSize: '0.875rem' }}
                  >
                    <span className="inline-block shrink-0" style={{ width: 12, height: 12, backgroundColor: '#fe7449', marginRight: 8 }} />
                    {`VISIT ${label.toUpperCase()}`}
                    <span style={{ marginLeft: 8 }}><ArrowIcon /></span>
                  </a>
                  <p className="flex-1 m-0" style={{ fontSize: '0.9375rem' }}>{description}</p>
                </div>
              )}

              {/* Content area */}
              <div className="flex justify-between">
                {/* Highlights box (featured sidebar) */}
                {featured && (
                  featured.items ? (
                    <div
                      className="shrink-0"
                      style={{ backgroundColor: '#262626', color: '#fff', flex: items && items.length > 0 ? '0 0 400px' : '1', padding: 32, marginRight: items && items.length > 0 ? 32 : 0, height: 'max-content' }}
                    >
                      <h3 style={{ fontFamily: 'var(--font-align), serif', fontSize: '1.2rem', fontWeight: 700, marginBottom: 20, color: '#fff' }}>
                        {featured.title}
                      </h3>
                      <div className="flex flex-col" style={{ gap: 24 }}>
                        {featured.items.map((hub) => (
                          <div key={hub.label}>
                            <a
                              href={hub.href || '#'}
                              onClick={() => onClose()}
                              className="no-underline inline-flex items-center"
                              style={{ fontFamily: 'var(--font-public-sans), sans-serif', fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fe7449" xmlns="http://www.w3.org/2000/svg" className="shrink-0" style={{ marginRight: 4 }}><path d="M5 13.0003L10.9997 12.1426V11.8574L5 10.9997V5H19V10.9997L13.0003 11.8574V12.1426L19 13.0003V19H5V13.0003Z" /></svg>
                              {hub.label}
                              <ArrowIcon className="ml-2" />
                            </a>
                            {hub.description && (
                              <p className="m-0" style={{ fontSize: '0.875rem', color: '#999' }}>{hub.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="shrink-0"
                      style={{ backgroundColor: '#262626', color: '#fff', flex: '0 0 400px', padding: 32, marginRight: 32, height: 'max-content' }}
                    >
                      <div style={{ marginBottom: 24 }}>
                        <a
                          href={featured.href}
                          target={featured.external ? '_blank' : undefined}
                          rel={featured.external ? 'noopener noreferrer' : undefined}
                          className="no-underline inline-flex items-center"
                          style={{ fontFamily: 'var(--font-public-sans), sans-serif', fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}
                        >
                          {featured.showIcon && <svg width="18" height="18" viewBox="0 0 24 24" fill="#fe7449" xmlns="http://www.w3.org/2000/svg" className="shrink-0" style={{ marginRight: 4 }}><path d="M5 13.0003L10.9997 12.1426V11.8574L5 10.9997V5H19V10.9997L13.0003 11.8574V12.1426L19 13.0003V19H5V13.0003Z" /></svg>}
                          {featured.title}
                          <ArrowIcon className="ml-2" />
                        </a>
                        <p className="m-0" style={{ fontSize: '0.875rem', color: '#999' }}>{featured.description}</p>
                      </div>
                    </div>
                  )
                )}

                {/* Preview links grid */}
                {items && items.length > 0 && <div
                  className="grid"
                  style={{ flex: 1, gap: '24px 32px', gridTemplateColumns: featured ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', alignContent: 'start' }}
                >
                  {items.map((subItem) => (
                    <div key={subItem.label}>
                      <a
                        href={subItem.href || '#'}
                        target={subItem.external ? '_blank' : undefined}
                        rel={subItem.external ? 'noopener noreferrer' : undefined}
                        onClick={(e) => { if (subItem.onClick) { e.preventDefault(); subItem.onClick(); } onClose(); }}
                        className="no-underline inline-flex items-center"
                        style={{ fontFamily: 'var(--font-public-sans), sans-serif', fontSize: '1rem', fontWeight: 700, color: '#262626', marginBottom: 8 }}
                      >
                        {subItem.label}
                        <ArrowIcon className="ml-2" />
                      </a>
                      {subItem.description && (
                        <p className="m-0" style={{ fontSize: '0.875rem', color: '#666' }}>{subItem.description}</p>
                      )}
                    </div>
                  ))}
                </div>}
              </div>
            </div>
          ) : (
            items && items.length > 0 && items.map((subItem, index) => (
              <a
                key={subItem.label}
                href={subItem.href || '#'}
                onClick={(e) => { if (subItem.onClick) { e.preventDefault(); subItem.onClick(); } onClose(); }}
                className={`block px-6 py-3 text-base no-underline hover:bg-gray-50 transition-colors ${index < items.length - 1 ? 'border-b border-gray-100' : ''}`}
                style={{ color: '#262626' }}
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
    <div
      ref={buttonRef}
      className="relative flex items-center"
      style={{ height: '100%', backgroundColor: isOpen ? '#262626' : 'transparent' }}
    >
      <a
        href={href || '#'}
        onClick={(e) => {
          handleToggle(e);
          if (!hasDropdown && onClick && !href) { e.preventDefault(); onClick(); }
        }}
        className="inline-flex items-center no-underline select-none cursor-pointer"
        style={{
          gap: 5,
          height: '100%',
          padding: 24,
          color: '#fff',
          textDecoration: isOpen ? 'underline' : 'none',
          fontSize: '1rem',
          fontWeight: 500,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
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
  <a href="/" className="flex items-center" style={{ height: 60, width: 240 }}>
    <img src="/logo-white.svg" alt="Impact Global Health" style={{ height: 60 }} />
  </a>
);

export default Header;
