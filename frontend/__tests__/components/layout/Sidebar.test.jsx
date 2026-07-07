// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Sidebar depends on the live route + a few hooks; stub them so we can
// render it in isolation. SidebarFilterBox pulls in the global-filters
// context, which we don't need here, so stub it to nothing.
vi.mock('next/navigation', () => ({ usePathname: vi.fn() }));
vi.mock('@/lib/useFilterPreservingHref', () => ({
  useFilterPreservingHref: () => (href) => href,
}));
vi.mock('@/components/layout/SidebarFilterBox', () => ({ default: () => null }));

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const pipelineExplorerLink = () =>
  screen.getByRole('link', { name: 'Pipeline Explorer' });

describe('Sidebar — Pipeline Explorer entry', () => {
  it('renders the Pipeline Explorer entry', () => {
    usePathname.mockReturnValue('/');
    render(<Sidebar />);
    expect(pipelineExplorerLink()).toBeTruthy();
  });

  it('highlights the entry on /pipeline-explorer', () => {
    usePathname.mockReturnValue('/pipeline-explorer');
    render(<Sidebar />);
    expect(pipelineExplorerLink().className).toContain('bg-sidebar-active');
  });

  it('highlights the entry on /pipeline-explorer/table-builder', () => {
    usePathname.mockReturnValue('/pipeline-explorer/table-builder');
    render(<Sidebar />);
    expect(pipelineExplorerLink().className).toContain('bg-sidebar-active');
  });

  it('does not highlight the entry on an unrelated route', () => {
    usePathname.mockReturnValue('/who-priority-alignment');
    render(<Sidebar />);
    expect(pipelineExplorerLink().className).not.toContain('bg-sidebar-active');
  });
});

const pipelineOverviewLink = () =>
  screen.getByRole('link', { name: 'Pipeline Overview' });

describe('Sidebar — Pipeline Overview entry', () => {
  it('renders the Pipeline Overview entry', () => {
    usePathname.mockReturnValue('/');
    render(<Sidebar />);
    expect(pipelineOverviewLink()).toBeTruthy();
  });

  it('orders Pipeline Overview before Pipeline Explorer', () => {
    usePathname.mockReturnValue('/');
    render(<Sidebar />);
    const overview = screen.getByRole('link', { name: 'Pipeline Overview' });
    const explorer = screen.getByRole('link', { name: 'Pipeline Explorer' });
    // DOCUMENT_POSITION_FOLLOWING set => explorer comes after overview.
    const rel = overview.compareDocumentPosition(explorer);
    expect(rel & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('highlights the entry on /pipeline-overview', () => {
    usePathname.mockReturnValue('/pipeline-overview');
    render(<Sidebar />);
    expect(pipelineOverviewLink().className).toContain('bg-sidebar-active');
  });

  it('does not highlight the entry on /pipeline-explorer', () => {
    usePathname.mockReturnValue('/pipeline-explorer');
    render(<Sidebar />);
    expect(pipelineOverviewLink().className).not.toContain('bg-sidebar-active');
  });
});
