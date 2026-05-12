'use client';

export function RegulatorySection({ regulatory }) {
  if (!regulatory) return null;
  const { approval_status, who_prequalification, approving_authorities } = regulatory;
  const authorities = (approving_authorities || []).join(' + ') || '—';
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Regulatory science</h2>
      </div>
      <div className="si-reg-card">
        <div>
          <p className="si-reg-label">Approval status</p>
          <span className="si-reg-status-pill">
            <span className="sdot" />
            {approval_status || '—'}
          </span>
        </div>
        <div>
          <p className="si-reg-label">Approving authority</p>
          <p className="si-reg-value">{authorities}</p>
        </div>
        <div>
          <p className="si-reg-label">WHO prequalification</p>
          <p className="si-reg-value">{who_prequalification || '—'}</p>
        </div>
      </div>
    </div>
  );
}
