// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TopFiveProductTypesChart } from '@/components/pipeline-explorer/visual-insights/shared/TopFiveProductTypesChart';

describe('TopFiveProductTypesChart', () => {
  it('renders its title', () => {
    render(<TopFiveProductTypesChart
      title="Top 5 product types by candidate count"
      data={[{ name: 'Vaccine', value: 35 }]}
      loading={false}
    />);
    expect(screen.getByText('Top 5 product types by candidate count')).toBeInTheDocument();
  });
});
