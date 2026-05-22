'use client';

const URL_LIKE = /^https?:\/\//i;

function SourceValue({ source }) {
  if (URL_LIKE.test(source)) {
    return (
      <a
        className="si-ppc-source"
        href={source}
        target="_blank"
        rel="noreferrer"
      >
        <span>{source.replace(/^https?:\/\//i, '')}</span>
      </a>
    );
  }
  return <span className="si-ppc-meta-value">{source}</span>;
}

export function WhoPrioritiesSection({ priorities }) {
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Related WHO priorities</h2>
      </div>
      {priorities?.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {priorities.map((p) => {
            const hasMeta = Boolean(p.author) || Boolean(p.source);
            return (
              <article key={p.priority_key} className="si-ppc-card">
                <header className="si-ppc-head">
                  <span className="si-ppc-tag">PPC</span>
                  <h3 className="si-ppc-title">{p.priority_name}</h3>
                </header>
                {hasMeta && (
                  <div className="si-ppc-meta">
                    {p.author && (
                      <>
                        <span className="si-ppc-meta-label">Author</span>
                        <span className="si-ppc-meta-value">{p.author}</span>
                      </>
                    )}
                    {p.source && (
                      <>
                        <span className="si-ppc-meta-label">Source</span>
                        <SourceValue source={p.source} />
                      </>
                    )}
                  </div>
                )}
                {p.intended_use && (
                  <div className="si-ppc-body">
                    <p className="si-ppc-body-label">Intended use</p>
                    <p className="si-ppc-body-text">{p.intended_use}</p>
                  </div>
                )}
              </article>
            );
          })}
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
