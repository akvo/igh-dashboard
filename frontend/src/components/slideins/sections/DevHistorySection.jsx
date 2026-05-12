'use client';

function phaseClass(stage) {
  const s = (stage || '').toLowerCase();
  if (s.includes('approved')) return 'si-phase-pill si-phase-approved';
  if (s.includes('discovery')) return 'si-phase-pill si-phase-discovery';
  if (s.includes('phase 1') || s.includes('phase i')) return 'si-phase-pill si-phase-1';
  if (s.includes('phase 2') || s.includes('phase ii')) return 'si-phase-pill si-phase-2';
  if (s.includes('phase 3') || s.includes('phase iii')) return 'si-phase-pill si-phase-3';
  return 'si-phase-pill si-phase-1';
}

export function DevHistorySection({ history }) {
  if (!history?.length) return null;
  const cols = history.length;
  const gridCols = `110px repeat(${cols}, 1fr)`;
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Development history</h2>
      </div>
      <div className="si-timeline-card">
        <div className="si-timeline-grid" style={{ gridTemplateColumns: gridCols }}>
          <div />
          {history.map((h) => (
            <div key={`y-${h.year}`} className="si-timeline-year">{h.year}</div>
          ))}
          <div className="si-timeline-row-label">R&D stage</div>
          {history.map((h) => (
            <div key={`s-${h.year}`} style={{ display: 'flex', justifyContent: 'center' }}>
              <span className={phaseClass(h.phase_name)}>{h.phase_name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
