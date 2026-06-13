'use client';

// =========================================================
// VisualInsightsTabs — Visual Insights host
// =========================================================
//
// The host for the Pipeline Explorer Visual Insights view. It owns
// two pieces of URL-backed state so they survive reload and sharing:
//
//   - the active tab (which of the four chart views is showing), and
//   - the slide-in panel (which entity record, if any, is open).
//
// Each tab component raises slide-in requests through a single
// onExplore(type, key) callback; this host translates those into the
// 'slide'/'slideKey' URL params and renders the matching slide-in.

import { useCallback } from 'react';

import { useUrlState } from '@/lib/useUrlState';
import { stringSerializer, numberSerializer } from '@/lib/url-serializers';
import { TabNav } from '@/components/ui';
import {
  CandidateSlideIn,
  ProductSlideIn,
  TrialSlideIn,
} from '@/components/slideins';

import CandidatesTab from './CandidatesTab';
import ApprovedProductsTab from './ApprovedProductsTab';
import ClinicalTrialsTab from './ClinicalTrialsTab';
import TechnologyTypesTab from './TechnologyTypesTab';

// Tab order and labels. The `value` is what lands in the URL; the
// `label` is what TabNav renders.
const TABS = [
  { label: 'Candidates', value: 'candidates' },
  { label: 'Approved Products', value: 'approved' },
  { label: 'Clinical Trials', value: 'trials' },
  { label: 'Technology types', value: 'technology' },
];

export default function VisualInsightsTabs() {
  const [activeTab, setActiveTab] = useUrlState(
    'tab',
    'candidates',
    stringSerializer,
  );

  // Slide-in state. 'slide' holds the entity type ('candidate' |
  // 'product' | 'trial'); 'slideKey' holds its numeric id. Both are
  // null when no panel is open.
  const [slideInOpen, setSlideInOpen] = useUrlState('slide', null, stringSerializer);
  const [slideInKey, setSlideInKey] = useUrlState('slideKey', null, numberSerializer);

  const closeSlideIn = useCallback(() => {
    setSlideInOpen(null);
    setSlideInKey(null);
  }, [setSlideInOpen, setSlideInKey]);

  const onExplore = useCallback(
    (type, key) => {
      setSlideInOpen(type);
      setSlideInKey(key);
    },
    [setSlideInOpen, setSlideInKey],
  );

  return (
    <div>
      <TabNav
        tabs={TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {activeTab === 'candidates' && <CandidatesTab onExplore={onExplore} />}
      {activeTab === 'approved' && <ApprovedProductsTab onExplore={onExplore} />}
      {activeTab === 'trials' && <ClinicalTrialsTab onExplore={onExplore} />}
      {activeTab === 'technology' && <TechnologyTypesTab onExplore={onExplore} />}

      {/* Slide-in panels — only one can be open at a time */}
      {slideInOpen === 'candidate' && slideInKey != null && (
        <CandidateSlideIn candidateKey={slideInKey} onClose={closeSlideIn} />
      )}
      {slideInOpen === 'product' && slideInKey != null && (
        <ProductSlideIn candidateKey={slideInKey} onClose={closeSlideIn} />
      )}
      {slideInOpen === 'trial' && slideInKey != null && (
        <TrialSlideIn trialId={slideInKey} onClose={closeSlideIn} />
      )}
    </div>
  );
}
