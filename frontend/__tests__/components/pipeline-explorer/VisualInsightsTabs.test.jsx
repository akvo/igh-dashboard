// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// Mock the four tab components and the slide-ins so this test is about
// tab/slide-in ROUTING, not the internals of any tab or panel.
vi.mock('@/components/pipeline-explorer/visual-insights/CandidatesTab', () => ({ default: () => <div>CANDIDATES TAB</div> }));
vi.mock('@/components/pipeline-explorer/visual-insights/ApprovedProductsTab', () => ({ default: () => <div>APPROVED TAB</div> }));
vi.mock('@/components/pipeline-explorer/visual-insights/ClinicalTrialsTab', () => ({ default: () => <div>TRIALS TAB</div> }));
vi.mock('@/components/pipeline-explorer/visual-insights/TechnologyTypesTab', () => ({ default: () => <div>TECH TAB</div> }));
// Render the slide-ins as identifiable markers that echo the key prop, so
// we can assert the host maps slide/slideKey to the right panel AND passes
// the right prop (candidateKey vs trialId) to each.
vi.mock('@/components/slideins', () => ({
  CandidateSlideIn: ({ candidateKey }) => <div>CANDIDATE SLIDEIN {candidateKey}</div>,
  ProductSlideIn: ({ candidateKey }) => <div>PRODUCT SLIDEIN {candidateKey}</div>,
  TrialSlideIn: ({ trialId }) => <div>TRIAL SLIDEIN {trialId}</div>,
}));

import VisualInsightsTabs from '@/components/pipeline-explorer/visual-insights/VisualInsightsTabs';

// The active tab lives in the URL (useUrlState). Reset the query string
// between tests so each starts on the default tab.
beforeEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('VisualInsightsTabs', () => {
  it('defaults to the Candidates tab and switches on click', async () => {
    render(<VisualInsightsTabs />);
    expect(screen.getByText('CANDIDATES TAB')).toBeInTheDocument();

    // TabNav writes to the URL; the resulting popstate notification is
    // deferred to a macrotask, so the switch is observed asynchronously.
    fireEvent.click(screen.getByText('Clinical Trials'));
    expect(await screen.findByText('TRIALS TAB')).toBeInTheDocument();
  });

  // Seed the slide/slideKey params BEFORE render to prove the host mounts the
  // matching slide-in straight from the URL (share/reload path), not just in
  // response to an onExplore call.
  it('renders the trial slide-in from the slide/slideKey url params', () => {
    window.history.replaceState(null, '', '/?slide=trial&slideKey=42');
    render(<VisualInsightsTabs />);
    expect(screen.getByText(/TRIAL SLIDEIN 42/)).toBeInTheDocument();
  });

  // The product slide-in receives candidateKey (not trialId); this locks in
  // the prop divergence between the trial and product/candidate panels.
  it('renders the product slide-in (candidateKey) from url params', () => {
    window.history.replaceState(null, '', '/?slide=product&slideKey=7');
    render(<VisualInsightsTabs />);
    expect(screen.getByText(/PRODUCT SLIDEIN 7/)).toBeInTheDocument();
  });
});
