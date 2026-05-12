'use client';

export function WhoPrioritiesSection({ priorities }) {
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Related WHO priorities</h2>
      </div>
      {priorities?.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {priorities.map((p) => (
            <article key={p.priority_key} className="si-ppc-card">
              <header className="si-ppc-head">
                <span className="si-ppc-tag">PPC</span>
                <h3 className="si-ppc-title">{p.priority_name}</h3>
              </header>
              {p.intended_use && (
                <div className="si-ppc-body">
                  <p className="si-ppc-body-label">Intended use</p>
                  <p className="si-ppc-body-text">{p.intended_use}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="si-empty-state">
          <div>
            <p className="si-empty-title">There are currently no priorities</p>
            <p className="si-empty-body">
              When this candidate is linked to a WHO priority area, related
              guidance and roadmap items will appear here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
