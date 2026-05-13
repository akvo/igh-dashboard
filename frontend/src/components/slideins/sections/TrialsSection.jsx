'use client';

function phaseClass(phase) {
  const s = (phase || '').toLowerCase();
  if (s.includes('3') || s.includes('iii')) return 'si-phase-pill si-phase-3';
  if (s.includes('2') || s.includes('ii')) return 'si-phase-pill si-phase-2';
  if (s.includes('1') || s.includes('i')) return 'si-phase-pill si-phase-1';
  return 'si-phase-pill si-phase-discovery';
}

function statusClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('completed')) return 'si-status-pill completed';
  if (s.includes('active') || s.includes('recruit')) return 'si-status-pill active';
  return 'si-status-pill unknown';
}

export function TrialsSection({ trials }) {
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Clinical trials</h2>
      </div>
      {!trials?.length ? (
        <div className="si-empty-table">No clinical trial data available yet.</div>
      ) : (
        <div className="si-table-wrap">
          <table className="si-table">
            <thead>
              <tr>
                <th>Title</th>
                <th style={{ width: '78px' }}>Phase</th>
                <th style={{ width: '104px' }}>Status</th>
                <th style={{ width: '84px' }}>URL</th>
              </tr>
            </thead>
            <tbody>
              {trials.map((t) => (
                <tr key={t.trial_id}>
                  <td><div>{t.trial_title || '—'}</div></td>
                  <td>
                    <span className={phaseClass(t.trial_phase)} style={{ maxWidth: '72px' }}>
                      {t.trial_phase || '—'}
                    </span>
                  </td>
                  <td>
                    <span className={statusClass(t.status)}>
                      <span className="sdot" />
                      {t.status || '—'}
                    </span>
                  </td>
                  <td>
                    {t.source_text ? (
                      <a className="si-url-link" href={t.source_text} target="_blank" rel="noreferrer">
                        View
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
