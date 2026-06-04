'use client';

import { NoInfo } from '../NoInfo';

function phaseClass(phase) {
  const s = (phase || '').toLowerCase();
  if (s.includes('3') || s.includes('iii')) return 'si-phase-pill si-phase-3';
  if (s.includes('2') || s.includes('ii')) return 'si-phase-pill si-phase-2';
  if (s.includes('1') || s.includes('i')) return 'si-phase-pill si-phase-1';
  return 'si-phase-pill si-phase-discovery';
}

function statusClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('completed')) return 'si-status-pill completed';
  if (s.includes('active') || s.includes('recruit')) return 'si-status-pill active';
  return 'si-status-pill unknown';
}

export function StudyOverviewSection({ phase, status, studyType, enrollment }) {
  return (
    <div className="si-section">
      <div className="si-section-head">
        <h2 className="si-section-title">Study overview</h2>
      </div>
      <div className="si-glance-card">
        <div>
          <p className="si-glance-label">Phase</p>
          <p className="si-glance-value">{phase ? phase : <NoInfo />}</p>
        </div>
        <div>
          <p className="si-glance-label">Status</p>
          <p className="si-glance-value">{status ? status : <NoInfo />}</p>
        </div>
        <div>
          <p className="si-glance-label">Study type</p>
          <p className="si-glance-value">{studyType ? studyType : <NoInfo />}</p>
        </div>
        <div>
          <p className="si-glance-label">Enrolment</p>
          <p className="si-glance-value">
            {enrollment != null ? String(enrollment) : <NoInfo />}
          </p>
        </div>
      </div>
    </div>
  );
}
