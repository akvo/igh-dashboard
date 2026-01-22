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
    <header
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        height: '72px',
        backgroundColor: '#262626',
        borderBottom: '2px solid #fe7449',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {logo || <DefaultLogo />}
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  // Close on outside click
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
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            minWidth: '180px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          {items.map((subItem, index) => (
            <DropdownItem
              key={subItem.label}
              label={subItem.label}
              href={subItem.href}
              onClick={subItem.onClick}
              isLast={index === items.length - 1}
            />
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <div
      ref={buttonRef}
      style={{ position: 'relative' }}
      onMouseEnter={() => { setIsHovered(true); if (hasDropdown) setIsOpen(true); }}
      onMouseLeave={() => { setIsHovered(false); setIsOpen(false); }}
    >
      <a
        href={href || '#'}
        onClick={(e) => {
          if (onClick) {
            e.preventDefault();
            onClick();
          }
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#ffffff',
          textDecoration: 'none',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          borderRadius: '4px',
          backgroundColor: isHovered ? 'rgba(255,255,255,0.08)' : 'transparent',
          transition: 'background-color 0.2s ease',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
        {hasDropdown && (
          <ChevronDownIcon
            style={{
              width: '14px',
              height: '14px',
              color: '#ffffff',
              transition: 'transform 0.2s ease',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        )}
      </a>
      {menu}
    </div>
  );
};

const DropdownItem = ({ label, href, onClick, isLast }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href={href || '#'}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'block',
        padding: '10px 16px',
        fontSize: '14px',
        color: '#262626',
        textDecoration: 'none',
        backgroundColor: isHovered ? '#f9fafb' : 'transparent',
        borderBottom: !isLast ? '1px solid #f3f4f6' : 'none',
        transition: 'background-color 0.15s ease',
      }}
    >
      {label}
    </a>
  );
};

const DefaultLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div
      style={{
        width: '40px',
        height: '40px',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: '600' }}>Logo</span>
    </div>
    <span style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff' }}>
      Impact Global Health
    </span>
  </div>
);

export default Header;
