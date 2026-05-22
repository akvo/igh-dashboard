// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DevelopersSection } from '@/components/slideins/sections/DevelopersSection';

const developers = [
  { name: 'Suzhou Abogen Biosciences Co. Ltd', org_type: 'For Profit SME' },
  { name: 'Academy of Military Science', org_type: null },
];

describe('DevelopersSection', () => {
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

  it('renders org_type values and the NoInfo placeholder for missing rows', () => {
    render(<DevelopersSection developers={developers} candidateKey={8640} />);
    expect(screen.getByText('For Profit SME')).toBeTruthy();
    expect(screen.getByText('no information available')).toBeTruthy();
  });

  it('writes a CSV with the visible columns and empty cell for missing org_type', () => {
    render(<DevelopersSection developers={developers} candidateKey={8640} />);
    fireEvent.click(screen.getByRole('button', { name: /download csv/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const [blob] = createObjectURL.mock.calls[0];
    return blob.text().then((text) => {
      const lines = text.trim().split('\n');
      expect(lines[0]).toBe('Name,Developer profile');
      expect(lines).toContain('Suzhou Abogen Biosciences Co. Ltd,For Profit SME');
      // Missing org_type exports as empty cell, not the placeholder text.
      expect(lines).toContain('Academy of Military Science,');
    });
  });

  it('returns null when developers is empty', () => {
    const { container } = render(<DevelopersSection developers={[]} candidateKey={8640} />);
    expect(container.firstChild).toBeNull();
  });
});
