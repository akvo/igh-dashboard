// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

// Stub the host so this test checks only that the route mounts it; the
// host's own behaviour is covered by VisualInsightsTabs.test.jsx.
vi.mock('@/components/pipeline-explorer/visual-insights/VisualInsightsTabs', () => ({ default: () => <div>VISUAL INSIGHTS TABS</div> }));

import PipelineExplorerPage from '@/app/pipeline-explorer/page';

describe('Pipeline Explorer Visual Insights route', () => {
  it('renders the VisualInsightsTabs host', () => {
    render(<PipelineExplorerPage />);
    expect(screen.getByText('VISUAL INSIGHTS TABS')).toBeInTheDocument();
  });
});
