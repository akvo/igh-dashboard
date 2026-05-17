'use client';

import { useEffect } from 'react';
import { CloseIcon } from '../icons';

// =========================================================
// PriorityListPanel
// =========================================================
// Right-anchored slide-in showing every priority that matches the
// current filter. Cloned from DiseaseListPanel's structure (backdrop,
// translate-x animation, Escape-to-close, scrollable body) but with
// plain text rows instead of expandable disease tree.
//
// Inputs:
//   isOpen       — controls the slide-in animation
//   onClose      — dismiss (Escape, backdrop click, close button)
//   priorities   — full filtered priority list to render

export default function PriorityListPanel({ isOpen, onClose, priorities = [] }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="List of Priorities"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-black">List of Priorities</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer bg-transparent border-0"
            aria-label="Close panel"
          >
            <CloseIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-73px)] p-6">
          {priorities.length === 0 ? (
            <p className="text-sm text-gray-500">No priorities match the current selection.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {priorities.map((p) => (
                <li key={p.priority_key} className="text-sm text-gray-700">
                  {p.priority_name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
