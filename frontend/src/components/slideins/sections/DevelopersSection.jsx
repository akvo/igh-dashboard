'use client';

import { buildCSV, downloadCSV } from '@/lib/csv';
import { DownloadIcon } from '@/components/icons';
import { NoInfo } from '../NoInfo';

const CSV_COLUMNS = [
  { label: 'Name', accessor: (row) => row.name },
  // Missing org_type exports as an empty cell. The on-screen
  // `<NoInfo />` placeholder is a UI affordance only; downstream
  // CSV consumers expect blanks.
  { label: 'Developer profile', accessor: (row) => row.org_type ?? '' },
];

export function DevelopersSection({ developers, candidateKey }) {
  if (!developers?.length) return null;

  const handleDownload = () => {
    const csv = buildCSV(CSV_COLUMNS, developers);
    downloadCSV(csv, `developers-${candidateKey}`);
  };

  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Developers</h2>
        <button type="button" className="si-btn-csv" onClick={handleDownload}>
          <DownloadIcon size={13} />
          <span>Download CSV</span>
        </button>
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
                <td style={{ color: 'var(--ink-2)' }}>{d.org_type ? d.org_type : <NoInfo />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
