// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrialsSection } from '@/components/slideins/sections/TrialsSection';

const trials = [
  {
    trial_id: 1,
    trial_title: 'Safety & Immunogenicity of PfSPZ',
    trial_phase: 'Phase II',
    status: 'Completed',
    source_text: 'https://clinicaltrials.gov/study/NCT00000001',
  },
  {
    trial_id: 2,
    trial_title: 'PfSPZ Trial in Children',
    trial_phase: 'Phase I',
    status: '',
    source_text: null,
  },
];

describe('TrialsSection', () => {
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

  it('shows the Download CSV button when trials is non-empty', () => {
    render(<TrialsSection trials={trials} candidateKey={8640} />);
    expect(screen.getByRole('button', { name: /download csv/i })).toBeTruthy();
  });

  it('hides the Download CSV button when trials is empty (matches design)', () => {
    render(<TrialsSection trials={[]} candidateKey={8640} />);
    expect(screen.queryByRole('button', { name: /download csv/i })).toBeNull();
    expect(screen.getByText(/no clinical trial data available yet/i)).toBeTruthy();
  });

  it('writes a CSV with the visible columns', () => {
    render(<TrialsSection trials={trials} candidateKey={8640} />);
    fireEvent.click(screen.getByRole('button', { name: /download csv/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const [blob] = createObjectURL.mock.calls[0];
    return blob.text().then((text) => {
      const lines = text.trim().split('\n');
      expect(lines[0]).toBe('Title,Phase,Status,URL');
      // RFC-4180 escaping kicks in if a title contains a comma — neither
      // of our fixtures does, so we assert plain rows.
      expect(lines).toContain(
        'Safety & Immunogenicity of PfSPZ,Phase II,Completed,https://clinicaltrials.gov/study/NCT00000001',
      );
      // Missing status and URL export as empty cells, not the placeholder text.
      expect(lines).toContain('PfSPZ Trial in Children,Phase I,,');
    });
  });
});
