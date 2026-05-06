// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HierarchicalDiseaseFilter, {
  __deriveParentState as deriveParentState,
  __buildTree as buildTree,
} from '../../src/components/filters/HierarchicalDiseaseFilter';

// Three-level fixture: one branching primary (Malaria) with two
// children, one childless primary (Tuberculosis), one branching
// primary used for cross-primary cases (HIV/AIDS).
const HIERARCHY = [
  {
    primary_disease: 'Malaria',
    secondary_disease: 'P. falciparum',
    global_health_area: 'Neglected disease',
  },
  {
    primary_disease: 'Malaria',
    secondary_disease: 'P. vivax',
    global_health_area: 'Neglected disease',
  },
  {
    primary_disease: 'Tuberculosis',
    secondary_disease: 'Tuberculosis',
    global_health_area: 'Neglected disease',
  },
  {
    primary_disease: 'HIV/AIDS',
    secondary_disease: 'HIV-1',
    global_health_area: 'Neglected disease',
  },
  {
    primary_disease: 'HIV/AIDS',
    secondary_disease: 'HIV-2',
    global_health_area: 'Neglected disease',
  },
];

// =========================================================
// Pure helper: deriveParentState
// =========================================================
//
// Test the rendering rules in isolation -- they are the same
// rules the component follows but are easier to assert as a pure
// function. Each case in the spec corresponds to one assertion.

describe('deriveParentState', () => {
  const malariaChildren = ['P. falciparum', 'P. vivax'];

  it('returns "checked" when primary is selected and no children are explicit', () => {
    expect(deriveParentState('Malaria', ['Malaria'], [], malariaChildren)).toBe('checked');
  });

  it('returns "indeterminate" when primary is selected and SOME children are explicit', () => {
    expect(
      deriveParentState('Malaria', ['Malaria'], ['P. falciparum'], malariaChildren),
    ).toBe('indeterminate');
  });

  it('returns "indeterminate" when primary is NOT selected but a child is explicit', () => {
    expect(deriveParentState('Malaria', [], ['P. falciparum'], malariaChildren)).toBe(
      'indeterminate',
    );
  });

  it('returns "unchecked" when nothing is selected', () => {
    expect(deriveParentState('Malaria', [], [], malariaChildren)).toBe('unchecked');
  });
});

// =========================================================
// Pure helper: buildTree
// =========================================================

describe('buildTree', () => {
  it('groups secondaries by primary and skips the self-row sentinel', () => {
    const tree = buildTree(HIERARCHY);
    expect(tree.has('Malaria')).toBe(true);
    expect(tree.has('Tuberculosis')).toBe(true);
    expect(Array.from(tree.get('Malaria').secondaries)).toEqual([
      'P. falciparum',
      'P. vivax',
    ]);
    // Self-row (Tuberculosis -> Tuberculosis) yields no children.
    expect(tree.get('Tuberculosis').secondaries.size).toBe(0);
  });
});

// =========================================================
// Component: toggle transitions
// =========================================================
//
// Each test renders the filter with a starting (primarySelected,
// secondarySelected), clicks the relevant checkbox, and asserts
// onChange was called with the next state. `defaultOpen` skips
// the trigger click so the menu mounts immediately.

function renderOpen(props) {
  const onChange = vi.fn();
  const utils = render(
    <HierarchicalDiseaseFilter
      hierarchy={HIERARCHY}
      onChange={onChange}
      defaultOpen
      {...props}
    />,
  );
  return { onChange, ...utils };
}

describe('HierarchicalDiseaseFilter — toggle transitions', () => {
  it('rule 1: checks primary -> primary added, secondary untouched', () => {
    const { onChange } = renderOpen({
      primarySelected: [],
      secondarySelected: [],
    });

    fireEvent.click(screen.getByLabelText('Malaria'));

    expect(onChange).toHaveBeenCalledWith({
      primarySelected: ['Malaria'],
      secondarySelected: [],
    });
  });

  it('rule 2: unchecks primary -> primary removed AND its children dropped from secondary', () => {
    const { onChange } = renderOpen({
      primarySelected: ['Malaria', 'HIV/AIDS'],
      secondarySelected: ['P. falciparum', 'HIV-1'],
    });

    fireEvent.click(screen.getByLabelText('Malaria'));

    expect(onChange).toHaveBeenCalledWith({
      // HIV/AIDS untouched in primary list. P. falciparum dropped
      // because its parent went away. HIV-1 stays because its
      // parent is still selected.
      primarySelected: ['HIV/AIDS'],
      secondarySelected: ['HIV-1'],
    });
  });

  it('rule 3: unchecks one child while parent implicit -> "expand"; other children added; parent stays', () => {
    const { onChange } = renderOpen({
      primarySelected: ['Malaria'],
      secondarySelected: [],
    });

    // Expand the parent to surface its children.
    fireEvent.click(screen.getByLabelText('Expand Malaria'));
    fireEvent.click(screen.getByLabelText('P. falciparum'));

    expect(onChange).toHaveBeenCalledWith({
      primarySelected: ['Malaria'],
      secondarySelected: ['P. vivax'],
    });
  });

  it('rule 4: unchecks the only explicit child while parent selected -> child removed, parent stays', () => {
    const { onChange } = renderOpen({
      primarySelected: ['Malaria'],
      secondarySelected: ['P. falciparum'],
    });

    fireEvent.click(screen.getByLabelText('Expand Malaria'));
    fireEvent.click(screen.getByLabelText('P. falciparum'));

    // Parent stays in primarySelected; secondary list now empty.
    // The component returns to the "implicit" rendering state on
    // its next render.
    expect(onChange).toHaveBeenCalledWith({
      primarySelected: ['Malaria'],
      secondarySelected: [],
    });
  });

  it('rule 5: re-checks last missing child while parent selected -> collapse to implicit', () => {
    const { onChange } = renderOpen({
      primarySelected: ['Malaria'],
      secondarySelected: ['P. falciparum'],
    });

    fireEvent.click(screen.getByLabelText('Expand Malaria'));
    fireEvent.click(screen.getByLabelText('P. vivax'));

    // Adding P. vivax completes C(Malaria); the explicit list
    // collapses back to empty so the parent returns to implicit.
    expect(onChange).toHaveBeenCalledWith({
      primarySelected: ['Malaria'],
      secondarySelected: [],
    });
  });

  it('rule 6: checks child while parent NOT selected -> child added; parent NOT auto-added', () => {
    const { onChange } = renderOpen({
      primarySelected: [],
      secondarySelected: [],
    });

    fireEvent.click(screen.getByLabelText('Expand Malaria'));
    fireEvent.click(screen.getByLabelText('P. falciparum'));

    expect(onChange).toHaveBeenCalledWith({
      primarySelected: [],
      secondarySelected: ['P. falciparum'],
    });
  });
});

// =========================================================
// Trigger button display
// =========================================================

describe('HierarchicalDiseaseFilter — trigger label', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(
      <HierarchicalDiseaseFilter
        hierarchy={HIERARCHY}
        primarySelected={[]}
        secondarySelected={[]}
        placeholder="All diseases"
      />,
    );
    expect(screen.getByText('All diseases')).toBeDefined();
  });

  it('shows "First +N" when multiple things are selected', () => {
    render(
      <HierarchicalDiseaseFilter
        hierarchy={HIERARCHY}
        primarySelected={['Malaria']}
        secondarySelected={['HIV-1']}
      />,
    );
    expect(screen.getByText(/Malaria \+1/)).toBeDefined();
  });
});

// =========================================================
// Search box
// =========================================================

describe('HierarchicalDiseaseFilter — search', () => {
  it('filters parents by their own name', () => {
    renderOpen({});
    const search = screen.getByPlaceholderText('Search disease');
    fireEvent.change(search, { target: { value: 'Tuber' } });

    expect(screen.queryByLabelText('Malaria')).toBeNull();
    expect(screen.getByLabelText('Tuberculosis')).toBeDefined();
  });

  it('matches a parent when one of its children matches the query', () => {
    renderOpen({});
    const search = screen.getByPlaceholderText('Search disease');
    fireEvent.change(search, { target: { value: 'falciparum' } });

    // Malaria is shown because P. falciparum is one of its
    // children. HIV/AIDS is filtered out.
    expect(screen.getByLabelText('Malaria')).toBeDefined();
    expect(screen.queryByLabelText('HIV/AIDS')).toBeNull();
  });
});
