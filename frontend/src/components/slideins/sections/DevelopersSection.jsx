'use client';

export function DevelopersSection({ developers }) {
  if (!developers?.length) return null;
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Developers</h2>
      </div>
      <div className="si-table-wrap">
        <table className="si-table">
          <thead>
            <tr>
              <th style={{ width: '48%' }}>Name</th>
              <th>Developer profile</th>
            </tr>
          </thead>
          <tbody>
            {developers.map((d, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{d.name}</td>
                <td style={{ color: 'var(--ink-2)' }}>{d.org_type || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
