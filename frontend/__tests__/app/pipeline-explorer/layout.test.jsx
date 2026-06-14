// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Stub heavy children so the test focuses on the layout's route-aware
// decisions: which intro to show, and whether the filter bar renders.
vi.mock('next/navigation', () => ({ usePathname: vi.fn() }));
vi.mock('@/components/layout/Sidebar', () => ({ default: () => <div data-testid="sidebar" /> }));
vi.mock('@/components/pipeline-explorer/ViewToggle', () => ({ default: () => <div data-testid="view-toggle" /> }));
vi.mock('@/components/global-filters', () => ({
  useGlobalFilters: () => ({}),
  GlobalFilterBar: () => <div data-testid="global-filter-bar" />,
}));

import { usePathname } from 'next/navigation';
import PipelineExplorerLayout from '@/app/pipeline-explorer/layout';

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Pipeline Explorer layout', () => {
  it('shows the filter bar and the Visual Insights intro on the base route', () => {
    usePathname.mockReturnValue('/pipeline-explorer');
    render(<PipelineExplorerLayout><div>BODY</div></PipelineExplorerLayout>);
    expect(screen.getByTestId('global-filter-bar')).toBeInTheDocument();
    expect(screen.getByText(/two complementary views/i)).toBeInTheDocument();
    expect(screen.queryByText(/Build custom tables/i)).not.toBeInTheDocument();
  });

  it('hides the filter bar and shows the Table Builder intro on the table-builder route', () => {
    usePathname.mockReturnValue('/pipeline-explorer/table-builder');
    render(<PipelineExplorerLayout><div>BODY</div></PipelineExplorerLayout>);
    expect(screen.queryByTestId('global-filter-bar')).not.toBeInTheDocument();
    expect(screen.getByText(/Build custom tables/i)).toBeInTheDocument();
    expect(screen.queryByText(/two complementary views/i)).not.toBeInTheDocument();
  });
});
