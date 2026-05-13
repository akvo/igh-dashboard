'use client';

export function TechnicalSection({ moa, target }) {
  const paragraphs = (moa || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paragraphs.length && !target) return null;
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Technical profile</h2>
      </div>
      <div className="si-def-list">
        {paragraphs.length > 0 && (
          <div>
            <p className="si-def-label">Mechanism of action</p>
            <div className="si-def-value">
              {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        )}
        <div>
          <p className="si-def-label">Target receptor</p>
          <p className="si-def-value">{target || '—'}</p>
        </div>
      </div>
    </div>
  );
}
