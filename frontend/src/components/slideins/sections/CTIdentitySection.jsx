'use client';

export function CTIdentitySection({ disease, registryId, registryUrl, title, description }) {
  return (
    <div className="si-section">
      <div className="si-ct-id-row">
        {disease && <span className="si-chip si-chip-peach">{disease}</span>}
        {registryId && (
          <a
            className="si-ct-registry"
            href={registryUrl || '#'}
            target={registryUrl ? '_blank' : undefined}
            rel="noreferrer"
          >
            <span className="si-ct-registry-label">CT Registry ID</span>
            <span className="si-ct-registry-id">{registryId}</span>
          </a>
        )}
      </div>
      <h1 className="si-title">{title || 'Untitled trial'}</h1>
      {description && <p className="si-sub">{description}</p>}
    </div>
  );
}
