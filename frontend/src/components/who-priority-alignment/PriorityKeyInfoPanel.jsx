'use client';

import { useEffect } from 'react';
import { CloseIcon } from '@/components/icons';
import { t } from '@/content';

// =========================================================
// PriorityKeyInfoPanel — Key information WHO priority slide-in.
// =========================================================
// Mirrors PriorityListPanel's chrome (right-anchored, backdrop,
// Escape / backdrop / close-X dismissal). Renders one priority's
// editorial record: PPC tag, title, intended-use subtitle,
// `Published <date>` line, then labelled sections (Intended use /
// Target population / Efficacy / Safety) followed by a Read more
// link (opens `source` in a new tab) and a Close button.
//
// Q16 — for now `Read more` only renders when `source` matches the
// URL pattern. If `source` is non-empty but a citation, the button is
// hidden. Designer to confirm whether we should instead surface the
// citation text.
//
// Q20 — italic subtitle reads `indication` (the analyst's "new
// indication" field, already in the gold DB under that column per
// the silver→gold transformation). The labelled "Intended use"
// section sources `intended_use` separately. When `indication` is
// null/empty the subtitle falls back to `intended_use` to avoid an
// empty hero block.

const URL_LIKE = /^https?:\/\//;

function formatPublicationDate(publication_date) {
  if (!publication_date) return null;
  const parsed = new Date(publication_date);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function Section({ label, body }) {
  if (!body) return null;
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-bold text-black">{label}</h3>
      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{body}</p>
    </div>
  );
}

export default function PriorityKeyInfoPanel({ isOpen, onClose, priority, loading }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const publishedLine = priority ? formatPublicationDate(priority.publication_date) : null;
  const readMoreHref = priority && URL_LIKE.test(priority.source || '') ? priority.source : null;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed top-[90px] right-0 h-[calc(100%-90px)] w-full max-w-lg bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Key information WHO priority"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {t('who_priority.panel.heading')}
          </p>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer bg-transparent border-0"
            aria-label="Close panel"
          >
            <CloseIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex flex-col h-[calc(100%-57px-72px)] overflow-y-auto px-6 py-6 gap-6">
          {loading ? (
            <>
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
              <div className="h-20 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-20 w-full bg-gray-100 rounded animate-pulse" />
            </>
          ) : !priority ? (
            <p className="text-sm text-gray-500">{t('who_priority.panel.no_priority_loaded')}</p>
          ) : (
            <>
              <span
                className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 self-start"
                aria-label="Preferred Product Characteristics"
              >
                PPC
              </span>
              <h2 className="text-2xl font-bold text-black leading-tight">
                {priority.priority_name}
              </h2>
              {(priority.indication || priority.intended_use) && (
                <p className="text-sm text-gray-600 italic">
                  {priority.indication || priority.intended_use}
                </p>
              )}
              {publishedLine && (
                <p className="text-xs text-gray-500">Published {publishedLine}</p>
              )}

              <Section label={t('who_priority.panel.sections.intended_use')} body={priority.intended_use} />
              <Section label={t('who_priority.panel.sections.target_population')} body={priority.target_population} />
              <Section label={t('who_priority.panel.sections.efficacy')} body={priority.efficacy} />
              <Section label={t('who_priority.panel.sections.safety')} body={priority.safety} />
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200">
          {readMoreHref ? (
            <a
              href={readMoreHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 no-underline transition-colors"
            >
              {t('who_priority.panel.read_more')}
            </a>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-black bg-white border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {t('who_priority.panel.close')}
          </button>
        </div>
      </div>
    </>
  );
}
