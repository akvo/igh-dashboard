// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TopFiveDiseasesChart } from '@/components/pipeline-explorer/visual-insights/shared/TopFiveDiseasesChart';

describe('TopFiveDiseasesChart', () => {
  it('renders its title', () => {
    render(<TopFiveDiseasesChart
      title="Top 5 diseases by candidate count"
      data={[{ name: 'Malaria', value: 42, gha: 'Neglected diseases' }]}
      loading={false}
    />);
    expect(screen.getByText('Top 5 diseases by candidate count')).toBeInTheDocument();
    // The GHA legend is distinctive DOM this chart renders (mapped from
    // GHA_COLORS) and the product-types chart deliberately omits, so asserting a
    // legend label is a meaningful smoke test.
    expect(screen.getAllByText('Neglected diseases').length).toBeGreaterThan(0);
  });
});
