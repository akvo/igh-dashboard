'use client';

export function AtAGlanceSection({ data }) {
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">At a glance</h2>
      </div>
      <div className="si-glance-card">
        <div style={{ gridColumn: '1 / -1' }}>
          <p className="si-glance-label">Disease area</p>
          <p className="si-glance-value">{data.diseases || '—'}</p>
        </div>
        <div>
          <p className="si-glance-label">Product type</p>
          <p className="si-glance-value">{data.productType || '—'}</p>
        </div>
        <div>
          <p className="si-glance-label">Sub-product</p>
          <p className="si-glance-value">{data.subProduct || '—'}</p>
        </div>
        <div>
          <p className="si-glance-label">Technology type</p>
          <p className="si-glance-value">{data.technology || '—'}</p>
        </div>
        <div>
          <p className="si-glance-label">Current R&D stage</p>
          <p className="si-glance-value">{data.currentStage || '—'}</p>
        </div>
      </div>
    </div>
  );
}
