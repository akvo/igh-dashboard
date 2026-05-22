// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { NoInfo } from '@/components/slideins/NoInfo';

describe('NoInfo', () => {
  it('renders the lowercase "no information available" placeholder', () => {
    const { container } = render(<NoInfo />);
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span.textContent).toBe('no information available');
  });

  it('applies the muted-italic styling used by DataTable', () => {
    const { container } = render(<NoInfo />);
    const span = container.querySelector('span');
    expect(span.className).toContain('text-gray-400');
    expect(span.className).toContain('italic');
  });
});
