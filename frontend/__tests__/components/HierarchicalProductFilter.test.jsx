// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HierarchicalProductFilter, {
  deriveGroupState,
  partitionOptions,
} from '../../src/components/filters/HierarchicalProductFilter';

// Four VCP children + two flat products. By-name: value === label.
const VCP = [
  'Biological vector control products',
  'Chemical vector control products',
  'Vector control products',
  'Vector control products Reservoir targeted vaccines',
];
const OPTIONS = ['Drugs', 'Vaccines', ...VCP];

describe('deriveGroupState', () => {
  it('unchecked when none selected', () => {
    expect(deriveGroupState(VCP, [])).toBe('unchecked');
  });
  it('checked when all available children selected', () => {
    expect(deriveGroupState(VCP, [...VCP])).toBe('checked');
  });
  it('indeterminate for a subset', () => {
    expect(deriveGroupState(VCP, [VCP[0]])).toBe('indeterminate');
  });
  it('checked is relative to AVAILABLE children only', () => {
    // Only two children available; both selected -> checked.
    expect(deriveGroupState([VCP[0], VCP[1]], [VCP[0], VCP[1]])).toBe('checked');
  });
});

describe('partitionOptions', () => {
  it('splits flat options from group members', () => {
    const norm = OPTIONS.map((o) => ({ value: o, label: o }));
    const { flat, children } = partitionOptions(norm, VCP);
    expect(flat.map((o) => o.value)).toEqual(['Drugs', 'Vaccines']);
    expect(children.map((o) => o.value)).toEqual(VCP);
  });
});

function renderOpen(props) {
  const onChange = vi.fn();
  const utils = render(
    <HierarchicalProductFilter
      options={OPTIONS}
      groupMembers={VCP}
      onChange={onChange}
      {...props}
    />,
  );
  // open the menu (the trigger is the first button)
  fireEvent.click(utils.container.querySelector('button'));
  return { onChange, ...utils };
}

describe('HierarchicalProductFilter — interactions', () => {
  it('toggling a flat product adds it', () => {
    const { onChange } = renderOpen({ selected: [] });
    fireEvent.click(screen.getByLabelText('Drugs'));
    expect(onChange).toHaveBeenCalledWith(['Drugs']);
  });

  it('toggling the VCP parent (unchecked) selects all children', () => {
    const { onChange } = renderOpen({ selected: [] });
    // The parent row is the FIRST element labelled with the group name.
    fireEvent.click(screen.getAllByLabelText('Vector control products')[0]);
    expect(onChange).toHaveBeenCalledWith(VCP);
  });

  it('toggling the VCP parent (checked) deselects all children', () => {
    const { onChange } = renderOpen({ selected: [...VCP] });
    fireEvent.click(screen.getAllByLabelText('Vector control products')[0]);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('toggling the VCP parent (indeterminate) selects all remaining children', () => {
    const { onChange } = renderOpen({ selected: [VCP[1]] });
    fireEvent.click(screen.getAllByLabelText('Vector control products')[0]);
    // Starting from one child selected, clicking the parent fills in the
    // rest; order is existing-selected first, then the remaining members.
    expect(onChange).toHaveBeenCalledWith([VCP[1], VCP[0], VCP[2], VCP[3]]);
  });

  it('expanding then toggling one child adds just that child', () => {
    const { onChange } = renderOpen({ selected: [] });
    fireEvent.click(screen.getByLabelText('Expand Vector control products'));
    fireEvent.click(screen.getByLabelText('Chemical vector control products'));
    expect(onChange).toHaveBeenCalledWith(['Chemical vector control products']);
  });

  it('renders the group only when a child is present in options', () => {
    render(
      <HierarchicalProductFilter
        options={['Drugs', 'Vaccines']}
        groupMembers={VCP}
        selected={[]}
      />,
    );
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(screen.queryByLabelText('Expand Vector control products')).toBeNull();
  });

  it('works in by-key mode (value !== label)', () => {
    const onChange = vi.fn();
    const keyOptions = [
      { value: '30', label: 'Drugs' },
      { value: '35', label: 'Chemical vector control products' },
      { value: '58', label: 'Vector control products' },
    ];
    render(
      <HierarchicalProductFilter
        options={keyOptions}
        groupMembers={['35', '58']}
        selected={[]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getAllByRole('button')[0]);
    fireEvent.click(screen.getAllByLabelText('Vector control products')[0]); // parent
    expect(onChange).toHaveBeenCalledWith(['35', '58']);
  });
});

describe('HierarchicalProductFilter — auto-scroll on expand', () => {
  it('scrolls the expanded sub-options into view', () => {
    // jsdom does not implement scrollIntoView; install a spy and restore it.
    const original = Element.prototype.scrollIntoView;
    const spy = vi.fn();
    Element.prototype.scrollIntoView = spy;
    try {
      renderOpen({ selected: [] });
      fireEvent.click(screen.getByLabelText('Expand Vector control products'));
      expect(spy).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it('does not scroll when the group collapses', () => {
    const original = Element.prototype.scrollIntoView;
    const spy = vi.fn();
    Element.prototype.scrollIntoView = spy;
    try {
      renderOpen({ selected: [] });
      const toggle = screen.getByLabelText('Expand Vector control products');
      fireEvent.click(toggle); // expand → scrolls
      spy.mockClear();
      fireEvent.click(toggle); // collapse → must not scroll
      expect(spy).not.toHaveBeenCalled();
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });
});
