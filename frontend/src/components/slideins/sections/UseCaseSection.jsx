'use client';

export function UseCaseSection({ indicationType, indication }) {
  if (!indicationType && !indication) return null;
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Use case</h2>
      </div>
      <div className="si-def-list">
        {indicationType && (
          <div>
            <p className="si-def-label">Indication type</p>
            <p className="si-def-value">{indicationType}</p>
          </div>
        )}
        {indication && (
          <div>
            <p className="si-def-label">Indication</p>
            <p className="si-def-value">{indication}</p>
          </div>
        )}
      </div>
    </div>
  );
}
