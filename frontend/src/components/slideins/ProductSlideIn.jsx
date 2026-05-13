'use client';

import { useSlideInProduct } from '@/graphql/hooks';
import { SlideInPanel } from './SlideInPanel';
import { IdentitySection } from './sections/IdentitySection';
import { AtAGlanceSection } from './sections/AtAGlanceSection';
import { RegulatorySection } from './sections/RegulatorySection';
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

export function ProductSlideIn({ candidateKey, onClose }) {
  const { slideIn, loading, error } = useSlideInProduct(candidateKey);

  if (loading) {
    return (
      <SlideInPanel eyebrow="Key approved product information" onClose={onClose}>
        <div style={{ padding: '24px 0', color: 'var(--ink-3)' }}>Loading…</div>
      </SlideInPanel>
    );
  }
  if (error || !slideIn) {
    return (
      <SlideInPanel eyebrow="Key approved product information" onClose={onClose}>
        <div style={{ padding: '24px 0', color: 'var(--ink-3)' }}>
          {error ? 'Failed to load product.' : 'Product not found.'}
        </div>
      </SlideInPanel>
    );
  }

  const { candidate, product, diseases } = slideIn;
  const diseaseLabel = diseases.secondary
    ? `${diseases.primary} — ${diseases.secondary}`
    : diseases.primary;

  return (
    <SlideInPanel eyebrow="Key approved product information" onClose={onClose}>
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
      <RegulatorySection regulatory={slideIn.regulatory} />
      <DevHistorySection history={slideIn.pipelineHistory} />
      <RecentUpdatesSection text={candidate.recent_updates} />
      <UseCaseSection
        indicationType={candidate.indication_type}
        indication={candidate.indication}
      />
      <TechnicalSection moa={candidate.mechanism_of_action} target={candidate.target} />
      <KeyFeaturesSection keyFeatures={candidate.key_features} />
      <DevelopersSection developers={slideIn.developers} />
      <TrialsSection trials={slideIn.trials} />
      <WhoPrioritiesSection priorities={slideIn.priorities} />
      <KeyResourcesSection publications={slideIn.publications} />
    </SlideInPanel>
  );
}
