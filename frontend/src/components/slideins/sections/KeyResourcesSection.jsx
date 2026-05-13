'use client';

export function KeyResourcesSection({ publications }) {
  if (!publications?.length) return null;
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Key resources</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {publications.map((p) => (
          <div key={p.publication_id} className="si-pub-card">
            <p className="si-pub-title">{p.title}</p>
            {p.url && (
              <a className="si-pub-action" href={p.url} target="_blank" rel="noreferrer">
                Explore →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
