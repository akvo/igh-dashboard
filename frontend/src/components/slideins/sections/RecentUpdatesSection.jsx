'use client';

export function RecentUpdatesSection({ text }) {
  if (!text) return null;
  // The source field is one free-text block with no reliable per-entry
  // delimiter, so render as paragraphs split on blank lines. The
  // bulleted-list look from the mock is a design fiction; the spec's
  // unresolvable-data doc flags this for the data team.
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Recent updates</h2>
      </div>
      <div className="si-updates-card">
        <ul className="si-updates-list">
          {paragraphs.map((p, i) => (
            <li key={i} className="si-updates-item">
              <span className="si-update-marker" aria-hidden="true" />
              <span style={{ flex: 1 }}>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
