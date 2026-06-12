// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
