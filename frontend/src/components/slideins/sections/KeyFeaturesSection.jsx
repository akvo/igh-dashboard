'use client';

/**
 * The source has a single combined field, so present it as one block.
 * Splitting summary vs challenges is flagged for the data team in the
 * unresolvable-data document.
 */
export function KeyFeaturesSection({ keyFeatures }) {
  if (!keyFeatures) return null;
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Key features & challenges</h2>
      </div>
      <div className="si-def-list">
        <div>
          <p className="si-def-value">{keyFeatures}</p>
        </div>
      </div>
    </div>
  );
}
