'use client';

import { useSlideInTrial } from '@/graphql/hooks';
import { SlideInPanel } from './SlideInPanel';
import { CTIdentitySection } from './sections/CTIdentitySection';
import { StudyOverviewSection } from './sections/StudyOverviewSection';
import { StudyDetailsSection } from './sections/StudyDetailsSection';
import { TimelineLocationSection } from './sections/TimelineLocationSection';
import { SourceSection } from './sections/SourceSection';

export function TrialSlideIn({ trialId, onClose }) {
  const { slideIn, loading, error } = useSlideInTrial(trialId);

  if (loading) {
    return (
      <SlideInPanel eyebrow="Key clinical trial information" onClose={onClose}>
        <div style={{ padding: '24px 0', color: 'var(--ink-3)' }}>Loading…</div>
      </SlideInPanel>
    );
  }
  if (error || !slideIn) {
    return (
      <SlideInPanel eyebrow="Key clinical trial information" onClose={onClose}>
        <div style={{ padding: '24px 0', color: 'var(--ink-3)' }}>
          {error ? 'Failed to load trial.' : 'Trial not found.'}
        </div>
      </SlideInPanel>
    );
  }

  const { trial, disease } = slideIn;

  return (
    <SlideInPanel eyebrow="Key clinical trial information" onClose={onClose}>
      <CTIdentitySection
        disease={disease?.disease_label}
        registryId={trial.trial_name}
        registryUrl={trial.source_text}
        title={trial.trial_title}
        description={trial.description}
      />
      <StudyOverviewSection
        phase={trial.trial_phase}
        status={trial.status}
        studyType={trial.study_type}
        enrollment={trial.enrollment_count}
      />
      <StudyDetailsSection details={trial} />
      <TimelineLocationSection
        start={trial.start_date}
        primaryCompletion={trial.primary_completion_date}
        end={trial.end_date}
        location={trial.locations}
      />
      <SourceSection url={trial.source_text} />
    </SlideInPanel>
  );
}
