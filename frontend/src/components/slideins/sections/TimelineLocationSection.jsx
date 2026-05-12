'use client';

function fmtDate(iso) {
  if (!iso) return '—';
  // dim_date.full_date is "YYYY-MM-DD". Format as "MMM YYYY" for the
  // strip; pad with placeholder month for safety.
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[parseInt(m[2], 10) - 1] || '';
  return `${month} ${m[1]}`;
}

export function TimelineLocationSection({ start, primaryCompletion, end, location }) {
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Timeline &amp; location</h2>
      </div>
      <div className="si-timeline-strip">
        <div>
          <span className="si-ts-dot" />
          <p className="si-ts-label">Start</p>
          <p className="si-ts-value">{fmtDate(start)}</p>
        </div>
        <div className="si-ts-bar" />
        <div>
          <span className="si-ts-dot si-ts-dot--mid" />
          <p className="si-ts-label">Primary completion</p>
          <p className="si-ts-value">{fmtDate(primaryCompletion)}</p>
        </div>
        <div className="si-ts-bar" />
        <div>
          <span className="si-ts-dot si-ts-dot--end" />
          <p className="si-ts-label">End</p>
          <p className="si-ts-value">{fmtDate(end)}</p>
        </div>
      </div>
      <div className="si-location-card">
        <div className="si-location-pin" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div>
          <p className="si-location-label">Location</p>
          <p className="si-location-value">{location || '—'}</p>
        </div>
      </div>
    </div>
  );
}
