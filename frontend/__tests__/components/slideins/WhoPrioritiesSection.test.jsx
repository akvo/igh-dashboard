// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { WhoPrioritiesSection } from '@/components/slideins/sections/WhoPrioritiesSection';

const basePriority = {
  priority_key: 1,
  priority_name: 'PPC: For vaccines to reduce malaria morbidity and mortality',
  intended_use: 'Prevention of P. falciparum and/or P. vivax.',
  author: null,
  source: null,
};

describe('WhoPrioritiesSection', () => {
  it('renders Author and Source rows when both are present and source is a URL', () => {
    render(
      <WhoPrioritiesSection
        priorities={[
          {
            ...basePriority,
            author: 'WHO',
            source: 'https://www.who.int/publications/i/item/9789240057463',
          },
        ]}
      />,
    );
    expect(screen.getByText('Author')).toBeTruthy();
    expect(screen.getByText('WHO')).toBeTruthy();
    const sourceLink = screen.getByRole('link');
    expect(sourceLink.getAttribute('href')).toBe(
      'https://www.who.int/publications/i/item/9789240057463',
    );
    // The visible label drops the scheme.
    expect(sourceLink.textContent).toContain('www.who.int');
    expect(sourceLink.textContent).not.toContain('https://');
  });

  it('renders Source as plain text when it is a citation rather than a URL', () => {
    render(
      <WhoPrioritiesSection
        priorities={[
          {
            ...basePriority,
            author: 'WHO',
            source: 'TRS Annex 4, 2022',
          },
        ]}
      />,
    );
    // No link rendered — the value sits inside a span.
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('TRS Annex 4, 2022')).toBeTruthy();
  });

  it('omits the meta block entirely when author and source are both absent', () => {
    const { container } = render(<WhoPrioritiesSection priorities={[basePriority]} />);
    expect(container.querySelector('.si-ppc-meta')).toBeNull();
    // Body (Intended use) is still rendered.
    expect(screen.getByText('Intended use')).toBeTruthy();
  });

  it('renders the empty-state when there are no priorities', () => {
    render(<WhoPrioritiesSection priorities={[]} />);
    expect(screen.getByText('There are currently no priorities')).toBeTruthy();
  });
});
