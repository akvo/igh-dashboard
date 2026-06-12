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
vi.mock('@/components/slideins', () => ({ CandidateSlideIn: () => null, ProductSlideIn: () => null, TrialSlideIn: () => null }));

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
});
