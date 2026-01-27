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
    <header className={`flex items-center justify-between px-4 sm:px-6 lg:px-10 h-[72px] bg-black border-b-2 border-orange-500 ${className}`}>
      <div className="flex items-center gap-3">
        {logo || <DefaultLogo />}
      </div>
      <nav className="hidden md:flex items-center gap-2">
        {navItems.map((item) => (
          <NavItem
            key={item.label}
            label={item.label}
            hasDropdown={item.hasDropdown}
            href={item.href}
            onClick={() => onNavClick && onNavClick(item)}
            items={item.items}
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

const NavItem = ({ label, hasDropdown, href, onClick, items }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({ top: rect.bottom + 4, left: rect.left });
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

  const menu = isOpen && hasDropdown && items && items.length > 0 && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => { setIsOpen(false); setIsHovered(false); }}
          className="fixed min-w-[180px] bg-white rounded-lg shadow-lg z-[9999] overflow-hidden"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
        >
          {items.map((subItem, index) => (
            <a
              key={subItem.label}
              href={subItem.href || '#'}
              onClick={(e) => { if (subItem.onClick) { e.preventDefault(); subItem.onClick(); } }}
              className={`block px-4 py-2.5 text-sm text-black no-underline hover:bg-gray-50 transition-colors ${index < items.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              {subItem.label}
            </a>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <div
      ref={buttonRef}
      className="relative"
      onMouseEnter={() => { setIsHovered(true); if (hasDropdown) setIsOpen(true); }}
      onMouseLeave={() => { setIsHovered(false); setIsOpen(false); }}
    >
      <a
        href={href || '#'}
        onClick={(e) => { if (onClick) { e.preventDefault(); onClick(); } }}
        className={`inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white no-underline tracking-wider uppercase rounded whitespace-nowrap transition-colors ${isHovered ? 'bg-white/[0.08]' : 'bg-transparent'}`}
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
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 bg-white/20 rounded-md flex items-center justify-center">
      <span className="text-[11px] text-white font-semibold">Logo</span>
    </div>
    <span className="text-base font-bold text-white">Impact Global Health</span>
  </div>
);

export default Header;
