// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { KpiStatCards } from '@/components/pipeline-explorer/visual-insights/shared/KpiStatCards';

describe('KpiStatCards', () => {
  it('renders the total card and one card per GHA', () => {
    render(<KpiStatCards cards={[
      { title: 'Total candidates', value: 759, percentage: null },
      { title: "Women's health", value: 120, percentage: 15.8, color: '#54A5C4' },
    ]} />);
    expect(screen.getByText('Total candidates')).toBeInTheDocument();
    expect(screen.getByText('759')).toBeInTheDocument();
    expect(screen.getByText("Women's health")).toBeInTheDocument();
  });

  it('renders no info icon when a card has no tooltip', () => {
    // percentage null => no MiniDonut svg either, so the tree has no <svg> at all.
    const { container } = render(<KpiStatCards cards={[
      { title: 'Total candidates', value: 759, percentage: null },
    ]} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('reveals the tooltip text on hovering the info icon', () => {
    const tip = 'The number of active candidates in development that match the current filters.';
    const { container } = render(<KpiStatCards cards={[
      { title: 'Total candidates', value: 759, percentage: null, tooltip: tip },
    ]} />);
    expect(screen.queryByText(tip)).not.toBeInTheDocument();
    const icon = container.querySelector('svg');
    expect(icon).toBeTruthy();
    fireEvent.mouseEnter(icon);
    expect(screen.getByText(tip)).toBeInTheDocument();
  });

  it('positions the tooltip fixed so it escapes the clipped scroll container', () => {
    // Regression guard: the popover must use fixed positioning, not an absolute
    // box that the Pipeline Explorer `overflow-x-hidden` container clips against
    // the sidebar.
    const tip = 'Some tooltip text';
    const { container } = render(<KpiStatCards cards={[
      { title: 'Total candidates', value: 759, percentage: null, tooltip: tip },
    ]} />);
    fireEvent.mouseEnter(container.querySelector('svg'));
    expect(screen.getByText(tip).className).toContain('fixed');
  });
});
