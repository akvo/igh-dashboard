// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DevHistorySection } from '@/components/slideins/sections/DevHistorySection';

const history = [
  { year: 2019, phase_name: 'Phase II' },
  { year: 2023, phase_name: 'Phase II' },
  { year: 2025, phase_name: 'Phase II' },
];

describe('DevHistorySection', () => {
  let createObjectURL;
  let revokeObjectURL;
  let anchorClickSpy;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:fake');
    revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });
    anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    anchorClickSpy.mockRestore();
  });

  it('renders the Download CSV button when history is non-empty', () => {
    render(<DevHistorySection history={history} candidateKey={8640} />);
    expect(screen.getByRole('button', { name: /download csv/i })).toBeTruthy();
  });

  it('produces a CSV blob with the visible columns when the button is clicked', () => {
    render(<DevHistorySection history={history} candidateKey={8640} />);
    fireEvent.click(screen.getByRole('button', { name: /download csv/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const [blob] = createObjectURL.mock.calls[0];
    return blob.text().then((text) => {
      const lines = text.trim().split('\n');
      expect(lines[0]).toBe('Year,R&D stage');
      expect(lines).toContain('2019,Phase II');
      expect(lines).toContain('2025,Phase II');
    });
  });

  it('returns null when history is empty', () => {
    const { container } = render(<DevHistorySection history={[]} candidateKey={8640} />);
    expect(container.firstChild).toBeNull();
  });
});
