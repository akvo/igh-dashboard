// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Stub the hierarchy hook so the adapter has a deterministic tree and
// no Apollo provider is needed.
vi.mock('@/graphql/hooks/useDiseaseHierarchy', () => ({
  useDiseaseHierarchy: () => ({
    hierarchy: [
      { primary_disease: 'Diarrhoeal diseases', secondary_disease: 'Cholera', global_health_area: 'Neglected disease' },
      { primary_disease: 'Diarrhoeal diseases', secondary_disease: 'Shigella', global_health_area: 'Neglected disease' },
      { primary_disease: 'Dengue', secondary_disease: 'Dengue', global_health_area: 'Neglected disease' },
    ],
    loading: false,
  }),
}));

import HierarchicalCategoryFilter from '@/components/ui/data-table/HierarchicalCategoryFilter';

describe('HierarchicalCategoryFilter', () => {
  it('emits a hierarchical entry when a child is selected', () => {
    const onChange = vi.fn();
    render(<HierarchicalCategoryFilter value={null} onChange={onChange} />);
    // Open the dropdown, expand the parent, check a child.
    fireEvent.click(screen.getByText('All'));
    fireEvent.click(screen.getByLabelText('Expand Diarrhoeal diseases'));
    fireEvent.click(screen.getByLabelText('Cholera'));
    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'hierarchical',
      primary: [],
      secondary: ['Cholera'],
    });
  });

  it('emits a primary-only entry when a childless parent is selected', () => {
    const onChange = vi.fn();
    render(<HierarchicalCategoryFilter value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('All'));
    // "Dengue" is a leaf primary (no children), so checking it selects
    // the parent directly.
    fireEvent.click(screen.getByLabelText('Dengue'));
    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'hierarchical',
      primary: ['Dengue'],
      secondary: [],
    });
  });

  it('emits null when the selection is cleared to empty', () => {
    const onChange = vi.fn();
    render(
      <HierarchicalCategoryFilter
        value={{ kind: 'hierarchical', primary: ['Dengue'], secondary: [] }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText('Clear disease selection'));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
