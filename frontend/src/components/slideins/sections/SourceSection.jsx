'use client';

function urlLabel(url) {
  if (!url) return 'Source';
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('clinicaltrials.gov')) return 'ClinicalTrials.gov';
    return host;
  } catch {
    return 'Source';
  }
}

export function SourceSection({ url }) {
  if (!url) return null;
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Source</h2>
      </div>
      <a className="si-source-card" href={url} target="_blank" rel="noreferrer">
        <div className="si-source-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="si-source-label">{urlLabel(url)}</p>
          <p className="si-source-url">{url}</p>
        </div>
      </a>
    </div>
  );
}
