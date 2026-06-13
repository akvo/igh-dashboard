// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Stub the route hook and the filter-preserving href builder. The
// builder stub appends a sentinel query so we can assert filters are
// carried through each segment's href.
vi.mock('next/navigation', () => ({ usePathname: vi.fn() }));
vi.mock('@/lib/useFilterPreservingHref', () => ({
  useFilterPreservingHref: () => (href) => `${href}?gha=A`,
}));

import { usePathname } from 'next/navigation';
import ViewToggle from '@/components/pipeline-explorer/ViewToggle';

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const visual = () => screen.getByRole('link', { name: /Visual Insights/ });
const table = () => screen.getByRole('link', { name: /Table Builder/ });

describe('ViewToggle', () => {
  it('renders both views as filter-preserving links', () => {
    usePathname.mockReturnValue('/pipeline-explorer');
    render(<ViewToggle />);
    expect(visual().getAttribute('href')).toBe('/pipeline-explorer?gha=A');
    expect(table().getAttribute('href')).toBe('/pipeline-explorer/table-builder?gha=A');
  });

  it('marks Visual Insights active on the base route', () => {
    usePathname.mockReturnValue('/pipeline-explorer');
    render(<ViewToggle />);
    expect(visual().className).toContain('bg-[#262626]');
    expect(table().className).not.toContain('bg-[#262626]');
  });

  it('marks Table Builder active on the table-builder route', () => {
    usePathname.mockReturnValue('/pipeline-explorer/table-builder');
    render(<ViewToggle />);
    expect(table().className).toContain('bg-[#262626]');
    expect(visual().className).not.toContain('bg-[#262626]');
  });
});
