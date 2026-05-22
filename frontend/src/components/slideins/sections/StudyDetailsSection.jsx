'use client';

import { NoInfo } from '../NoInfo';

function splitTags(text) {
  if (!text) return [];
  // age_groups arrives pipe-delimited; interventions arrives with
  // a "TYPE: name" prefix per item. Strip the type prefix to keep
  // tags readable.
  return text
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const colon = s.indexOf(':');
      return colon > -1 ? s.slice(colon + 1).trim() : s;
    });
}

function splitConditions(text) {
  if (!text) return [];
  return text
    .split(/[;,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function StudyDetailsSection({ details }) {
  const ages = splitTags(details.age_groups);
  const interventions = splitTags(details.interventions);
  const conditions = splitConditions(details.conditions);
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Study details</h2>
      </div>

      <div className="si-details-card">
        <div className="si-details-grid">
          <div>
            <p className="si-def-label">Sponsor</p>
            <p className="si-def-value">{details.sponsor ? details.sponsor : <NoInfo />}</p>
          </div>
          <div>
            <p className="si-def-label">Collaborator</p>
            <p className="si-def-value">{details.collaborator ? details.collaborator : <NoInfo />}</p>
          </div>
          <div>
            <p className="si-def-label">Funder type</p>
            <p className="si-def-value">{details.funder_type ? details.funder_type : <NoInfo />}</p>
          </div>
        </div>
      </div>

      <div className="si-details-card" style={{ marginTop: 10 }}>
        <div className="si-details-grid two-col">
          <div>
            <p className="si-def-label">Sex</p>
            <p className="si-def-value">{details.sex ? details.sex : <NoInfo />}</p>
          </div>
          <div>
            <p className="si-def-label">Age</p>
            <div className="si-tag-row">
              {ages.length ? (
                ages.map((a, i) => <span key={i} className="si-receptor-tag">{a}</span>)
              ) : (
                <NoInfo />
              )}
            </div>
          </div>
          <div>
            <p className="si-def-label">Allocation</p>
            <p className="si-def-value">{details.allocation ? details.allocation : <NoInfo />}</p>
          </div>
          <div>
            <p className="si-def-label">Intervention model</p>
            <p className="si-def-value">{details.intervention_model ? details.intervention_model : <NoInfo />}</p>
          </div>
          <div>
            <p className="si-def-label">Masking</p>
            <p className="si-def-value">{details.masking ? details.masking : <NoInfo />}</p>
          </div>
          <div>
            <p className="si-def-label">Primary purpose</p>
            <p className="si-def-value">{details.primary_purpose ? details.primary_purpose : <NoInfo />}</p>
          </div>
        </div>
      </div>

      <div className="si-def-list" style={{ marginTop: 16 }}>
        <div>
          <p className="si-def-label">Interventions</p>
          <div className="si-tag-row">
            {interventions.length ? (
              interventions.map((t, i) => <span key={i} className="si-receptor-tag">{t}</span>)
            ) : (
              <NoInfo />
            )}
          </div>
        </div>
        <div>
          <p className="si-def-label">Conditions</p>
          <div className="si-tag-row">
            {conditions.length ? (
              conditions.map((t, i) => <span key={i} className="si-receptor-tag">{t}</span>)
            ) : (
              <NoInfo />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
