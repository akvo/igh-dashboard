'use client';

import { NoInfo } from '../NoInfo';

function fmtDate(iso) {
  if (!iso) return null;
  // dim_date.full_date is "YYYY-MM-DD". Format as "MMM YYYY" for the
  // strip; pad with placeholder month for safety.
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[parseInt(m[2], 10) - 1] || '';
  return `${month} ${m[1]}`;
}

/**
 * Timeline & location matches the original design template at
 * igh-design/slide ins/slidein-3-clinical-trial.html: each milestone is
 * a column with a dot above its label and value, and the three columns
 * are separated by short connecting bars at the dot's vertical level.
 * The grid lays this out as `1fr 24px 1fr 24px 1fr` with align-items:
 * start so the bars sit at the top alongside the dots.
 */
export function TimelineLocationSection({ start, primaryCompletion, end, location }) {
  const startLabel = fmtDate(start);
  const midLabel = fmtDate(primaryCompletion);
  const endLabel = fmtDate(end);
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Timeline &amp; location</h2>
      </div>
      <div className="si-timeline-strip">
        <div className="si-ts-item">
          <span className="si-ts-dot si-ts-dot--start" aria-hidden="true" />
          <p className="si-ts-label">Start</p>
          <p className="si-ts-value">{startLabel ?? <NoInfo />}</p>
        </div>
        <div className="si-ts-bar" aria-hidden="true" />
        <div className="si-ts-item">
          <span className="si-ts-dot si-ts-dot--mid" aria-hidden="true" />
          <p className="si-ts-label">Primary completion</p>
          <p className="si-ts-value">{midLabel ?? <NoInfo />}</p>
        </div>
        <div className="si-ts-bar" aria-hidden="true" />
        <div className="si-ts-item">
          <span className="si-ts-dot si-ts-dot--end" aria-hidden="true" />
          <p className="si-ts-label">End</p>
          <p className="si-ts-value">{endLabel ?? <NoInfo />}</p>
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
          <p className="si-location-value">{location ? location : <NoInfo />}</p>
        </div>
      </div>
    </div>
  );
}
