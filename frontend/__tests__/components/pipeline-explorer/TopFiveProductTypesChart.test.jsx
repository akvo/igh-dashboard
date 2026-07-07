// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TopFiveProductTypesChart } from '@/components/pipeline-explorer/visual-insights/shared/TopFiveProductTypesChart';

describe('TopFiveProductTypesChart', () => {
  it('renders its title and description', () => {
    render(<TopFiveProductTypesChart
      title="Top 5 product types by candidate count"
      description="Ranks the five product types with the most candidates. Reflects the active filters."
      data={[{ name: 'Vaccine', value: 12 }]}
      loading={false}
    />);
    expect(screen.getByText('Top 5 product types by candidate count')).toBeInTheDocument();
    expect(screen.getByText(/Ranks the five product types with the most candidates/)).toBeInTheDocument();
  });

  it('renders no Lorem ipsum placeholder', () => {
    render(<TopFiveProductTypesChart title="X" description="Y" data={[]} loading={false} />);
    expect(screen.queryByText(/Lorem ipsum/i)).not.toBeInTheDocument();
  });
});
