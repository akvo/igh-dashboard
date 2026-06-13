// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageHeader from '@/components/layout/PageHeader';

describe('PageHeader description', () => {
  it('renders a single description string as one paragraph', () => {
    render(<PageHeader title="T" description="The only paragraph." />);
    const para = screen.getByText('The only paragraph.');
    expect(para.tagName).toBe('P');
  });

  it('renders an array of descriptions as separate paragraphs', () => {
    render(
      <PageHeader title="T" description={['First paragraph.', 'Second paragraph.']} />,
    );
    const first = screen.getByText('First paragraph.');
    const second = screen.getByText('Second paragraph.');
    expect(first.tagName).toBe('P');
    expect(second.tagName).toBe('P');
    // Distinct <p> elements, not one run-together block.
    expect(first).not.toBe(second);
  });
});
