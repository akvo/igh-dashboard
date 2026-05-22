'use client';

import { buildCSV, downloadCSV } from '@/lib/csv';
import { DownloadIcon } from '@/components/icons';

function phaseClass(stage) {
  const s = (stage || '').toLowerCase();
  if (s.includes('approved')) return 'si-phase-pill si-phase-approved';
  if (s.includes('discovery')) return 'si-phase-pill si-phase-discovery';
  if (s.includes('phase 1') || s.includes('phase i')) return 'si-phase-pill si-phase-1';
  if (s.includes('phase 2') || s.includes('phase ii')) return 'si-phase-pill si-phase-2';
  if (s.includes('phase 3') || s.includes('phase iii')) return 'si-phase-pill si-phase-3';
  return 'si-phase-pill si-phase-1';
}

const CSV_COLUMNS = [
  { label: 'Year', accessor: (row) => row.year },
  { label: 'R&D stage', accessor: (row) => row.phase_name },
];

/**
 * Development history is a fixed-width "R&D stage" label sitting beside
 * a horizontally scrollable timeline (years on top, phase pills below).
 * Splitting the label out of the scroll viewport — instead of sticking
 * a grid cell to `left: 0` — keeps the label always-visible without the
 * sticky cell visually colliding with pill content as the user scrolls.
 *
 * The aside reserves an invisible year-height spacer above the label so
 * the label vertically aligns with the pill row regardless of how many
 * lines the pill text wraps onto.
 */
export function DevHistorySection({ history, candidateKey }) {
  if (!history?.length) return null;
  const cols = history.length;
  const colTemplate = `repeat(${cols}, minmax(100px, 1fr))`;

  const handleDownload = () => {
    const csv = buildCSV(CSV_COLUMNS, history);
    downloadCSV(csv, `development-history-${candidateKey}`);
  };

  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Development history</h2>
        <button type="button" className="si-btn-csv" onClick={handleDownload}>
          <DownloadIcon size={13} />
          <span>Download CSV</span>
        </button>
      </div>
      <div className="si-timeline-card">
        <div className="si-timeline-aside">
          <div className="si-timeline-aside-spacer" aria-hidden="true">
            &nbsp;
          </div>
          <div className="si-timeline-row-label">R&D stage</div>
        </div>
        <div className="si-timeline-scroll">
          <div
            className="si-timeline-grid"
            style={{ '--si-tl-cols': colTemplate }}
          >
            <div className="si-timeline-row si-timeline-row--years">
              {history.map((h) => (
                <div key={`y-${h.year}`} className="si-timeline-year">
                  {h.year}
                </div>
              ))}
            </div>
            <div className="si-timeline-row si-timeline-row--pills">
              {history.map((h) => (
                <div key={`s-${h.year}`} className="si-timeline-cell">
                  <span className={phaseClass(h.phase_name)}>
                    <span className="si-phase-pill-text">{h.phase_name}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
