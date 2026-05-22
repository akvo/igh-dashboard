'use client';

import { NoInfo } from '../NoInfo';

export function AtAGlanceSection({ data }) {
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">At a glance</h2>
      </div>
      <div className="si-glance-card">
        <div style={{ gridColumn: '1 / -1' }}>
          <p className="si-glance-label">Disease area</p>
          <p className="si-glance-value">{data.diseases ? data.diseases : <NoInfo />}</p>
        </div>
        <div>
          <p className="si-glance-label">Product type</p>
          <p className="si-glance-value">{data.productType ? data.productType : <NoInfo />}</p>
        </div>
        <div>
          <p className="si-glance-label">Sub-product</p>
          <p className="si-glance-value">{data.subProduct ? data.subProduct : <NoInfo />}</p>
        </div>
        <div>
          <p className="si-glance-label">Technology type</p>
          <p className="si-glance-value">{data.technology ? data.technology : <NoInfo />}</p>
        </div>
        <div>
          <p className="si-glance-label">Current R&D stage</p>
          <p className="si-glance-value">{data.currentStage ? data.currentStage : <NoInfo />}</p>
        </div>
      </div>
    </div>
  );
}
