'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontalIcon } from '../icons';

const ChartMenu = ({
  onDownloadCSV,
  onDownloadPNG,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 140, // Align right edge of menu with button
      });
    }
  }, [isOpen]);

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

  const handleDownloadCSV = () => {
    if (onDownloadCSV) onDownloadCSV();
    setIsOpen(false);
  };

  const handleDownloadPNG = () => {
    if (onDownloadPNG) onDownloadPNG();
    setIsOpen(false);
  };

  const menu = isOpen && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed bg-white rounded-lg shadow-lg z-[9999] min-w-[140px] overflow-hidden border border-gray-200"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
        >
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="block w-full px-4 py-2.5 text-sm text-left text-black bg-transparent border-none cursor-pointer hover:bg-gray-50 transition-colors"
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={handleDownloadPNG}
            className="block w-full px-4 py-2.5 text-sm text-left text-black bg-transparent border-none cursor-pointer hover:bg-gray-50 transition-colors border-t border-gray-100"
          >
            Download PNG
          </button>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`border-none bg-[#F2F2F4] cursor-pointer p-2 hover:bg-gray-200 transition-colors ${className}`}
      >
        <MoreHorizontalIcon className="w-5 h-5 text-gray-400" />
      </button>
      {menu}
    </>
  );
};

export default ChartMenu;
