'use client';

import { useEffect } from 'react';
import './slidein.css';

/**
 * Shared slide-in chrome: backdrop, animated panel, header, body, footer.
 *
 * The three slide-ins share an identical shell — only the body content
 * differs — so each one renders a <SlideInPanel> with its sections as
 * children. The panel closes on Escape, backdrop click, or footer
 * button.
 */
export function SlideInPanel({ eyebrow, onClose, children }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="si-root">
      <div
        className="si-backdrop"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />
      <aside
        className="si-panel"
        role="dialog"
        aria-modal="true"
        aria-label={eyebrow}
      >
        <header className="si-panel-header">
          <span className="si-eyebrow">{eyebrow}</span>
          <button
            type="button"
            className="si-icon-btn"
            aria-label="Close"
            onClick={onClose}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="si-panel-body">{children}</div>
        <footer className="si-panel-footer">
          <button type="button" className="si-btn-close" onClick={onClose}>
            Close
          </button>
        </footer>
      </aside>
    </div>
  );
}
