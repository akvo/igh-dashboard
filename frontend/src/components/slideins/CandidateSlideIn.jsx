'use client';

import { useSlideInCandidate } from '@/graphql/hooks';
import { SlideInPanel } from './SlideInPanel';
import { IdentitySection } from './sections/IdentitySection';
import { AtAGlanceSection } from './sections/AtAGlanceSection';
import { DevHistorySection } from './sections/DevHistorySection';
import { RecentUpdatesSection } from './sections/RecentUpdatesSection';
import { UseCaseSection } from './sections/UseCaseSection';
import { TechnicalSection } from './sections/TechnicalSection';
import { KeyFeaturesSection } from './sections/KeyFeaturesSection';
import { DevelopersSection } from './sections/DevelopersSection';
import { TrialsSection } from './sections/TrialsSection';
import { WhoPrioritiesSection } from './sections/WhoPrioritiesSection';
import { KeyResourcesSection } from './sections/KeyResourcesSection';

function deriveSubProduct(slideIn) {
  const indicationType = slideIn?.candidate?.indication_type;
  const ages = slideIn?.ageGroups || [];
  if (!indicationType && !ages.length) return null;
  if (!ages.length) return indicationType;
  return `${indicationType || ''} (${ages.join(', ')})`.trim();
}

export function CandidateSlideIn({ candidateKey, onClose }) {
  const { slideIn, loading, error } = useSlideInCandidate(candidateKey);

  if (loading) {
    return (
      <SlideInPanel eyebrow="Key candidate information" onClose={onClose}>
        <div style={{ padding: '24px 0', color: 'var(--ink-3)' }}>Loading…</div>
      </SlideInPanel>
    );
  }
  if (error || !slideIn) {
    return (
      <SlideInPanel eyebrow="Key candidate information" onClose={onClose}>
        <div style={{ padding: '24px 0', color: 'var(--ink-3)' }}>
          {error ? 'Failed to load candidate.' : 'Candidate not found.'}
        </div>
      </SlideInPanel>
    );
  }

  const { candidate, product, diseases } = slideIn;
  const diseaseLabel = diseases.secondary
    ? `${diseases.primary} — ${diseases.secondary}`
    : diseases.primary;

  return (
    <SlideInPanel eyebrow="Key candidate information" onClose={onClose}>
      <IdentitySection
        productType={product?.product_type}
        name={candidate.candidate_name}
        indicationShort={candidate.indication}
        whoStatus={candidate.indication_type}
      />
      <AtAGlanceSection
        data={{
          diseases: diseaseLabel,
          productType: product?.product_type,
          subProduct: deriveSubProduct(slideIn),
          technology: slideIn.technologyType,
          currentStage: candidate.current_rd_stage,
        }}
      />
      <DevHistorySection history={slideIn.pipelineHistory} candidateKey={candidate.candidate_key} />
      <RecentUpdatesSection text={candidate.recent_updates} />
      <UseCaseSection
        indicationType={candidate.indication_type}
        indication={candidate.indication}
      />
      <TechnicalSection moa={candidate.mechanism_of_action} target={candidate.target} />
      <KeyFeaturesSection keyFeatures={candidate.key_features} />
      <DevelopersSection developers={slideIn.developers} candidateKey={candidate.candidate_key} />
      <TrialsSection trials={slideIn.trials} candidateKey={candidate.candidate_key} />
      <WhoPrioritiesSection priorities={slideIn.priorities} />
      <KeyResourcesSection publications={slideIn.publications} />
    </SlideInPanel>
  );
}
