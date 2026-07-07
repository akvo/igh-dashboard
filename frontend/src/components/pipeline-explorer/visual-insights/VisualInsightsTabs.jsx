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

import { useCallback, useEffect, useRef, useState } from 'react';

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

  // Measure the GlobalFilterBar height so the tabs stick right below it.
  const [filterBarHeight, setFilterBarHeight] = useState(0);
  const tabRef = useRef(null);

  useEffect(() => {
    const scrollContainer = tabRef.current?.closest('main');
    if (!scrollContainer) return;
    const filterBar = scrollContainer.querySelector('.sticky.top-0');
    if (!filterBar) return;
    const update = () => setFilterBarHeight(filterBar.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(filterBar);
    return () => ro.disconnect();
  }, []);

  return (
    <div>
      <div
        ref={tabRef}
        className="sticky z-[19] bg-cream-200 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-2"
        style={{ top: filterBarHeight }}
      >
        <TabNav
          tabs={TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="mb-4"
        />
      </div>

      <div className="relative z-0">
        {activeTab === 'candidates' && <CandidatesTab onExplore={onExplore} />}
        {activeTab === 'approved' && <ApprovedProductsTab onExplore={onExplore} />}
        {activeTab === 'trials' && <ClinicalTrialsTab onExplore={onExplore} />}
        {activeTab === 'technology' && <TechnologyTypesTab onExplore={onExplore} />}
      </div>

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
