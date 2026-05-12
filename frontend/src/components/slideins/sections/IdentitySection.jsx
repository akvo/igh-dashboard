'use client';

import './../slidein.css';

export function IdentitySection({ productType, name, indicationShort, whoStatus }) {
  return (
    <div className="si-section">
      {productType && <span className="si-chip si-chip-peach">{productType}</span>}
      <h1 className="si-title">{name}</h1>
      {indicationShort && <p className="si-sub">{indicationShort}</p>}
      {whoStatus && (
        <div className="si-who-badge">
          <span className="dot" aria-hidden="true" />
          <span>{whoStatus}</span>
        </div>
      )}
    </div>
  );
}
