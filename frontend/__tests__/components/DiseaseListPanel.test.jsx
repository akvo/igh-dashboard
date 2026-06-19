// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DiseaseListPanel, { diseaseExploreHref } from '../../src/components/ui/DiseaseListPanel';

// Fixture covers both leaf shapes:
//   - Tuberculosis: childless primary (the self-row sentinel
//     primary === secondary marks it as childless).
//   - Malaria: branching primary with two children, used to
//     exercise the sub-disease leaf rendering inside an expanded
//     parent.
const HIERARCHY = [
  {
    primary_disease: 'Tuberculosis',
    secondary_disease: 'Tuberculosis',
    global_health_area: 'Neglected disease',
  },
  {
    primary_disease: 'Malaria',
    secondary_disease: 'P. falciparum',
    global_health_area: 'Neglected disease',
  },
  {
    primary_disease: 'Malaria',
    secondary_disease: 'P. vivax',
    global_health_area: 'Neglected disease',
  },
];

describe('DiseaseListPanel leaf rows', () => {
  it('renders a childless primary as a single button containing the name and Explore hint', () => {
    render(
      <DiseaseListPanel
        isOpen={true}
        onClose={() => {}}
        hierarchy={HIERARCHY}
      />,
    );

    const button = screen.getByRole('button', { name: /Tuberculosis/ });
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent).toContain('Tuberculosis');
    expect(button.textContent).toContain('Explore');
  });

  it('renders an expanded sub-disease as a single button containing the name and Explore hint', () => {
    render(
      <DiseaseListPanel
        isOpen={true}
        onClose={() => {}}
        hierarchy={HIERARCHY}
      />,
    );

    // Expand Malaria via its +/- toggle button (aria-label="Expand").
    const expandButtons = screen.getAllByRole('button', { name: 'Expand' });
    fireEvent.click(expandButtons[0]);

    const childButton = screen.getByRole('button', { name: /P\. falciparum/ });
    expect(childButton.tagName).toBe('BUTTON');
    expect(childButton.textContent).toContain('P. falciparum');
    expect(childButton.textContent).toContain('Explore');
  });

  it('does not include "Explore" inside the parent-with-children name button', () => {
    render(
      <DiseaseListPanel
        isOpen={true}
        onClose={() => {}}
        hierarchy={HIERARCHY}
      />,
    );

    // Querying by exact name avoids matching the +/- toggle button
    // (which has accessible name "Expand"/"Collapse") and any
    // descendant leaf rows.
    const malariaButton = screen.getByRole('button', { name: 'Malaria' });
    expect(malariaButton.textContent).not.toContain('Explore');
  });
});

describe('diseaseExploreHref', () => {
  const params = (qs) => new URLSearchParams(qs);

  it('preserves other global filters and imposes the clicked primary, clearing stale secondary', () => {
    const href = diseaseExploreHref(
      'primary', 'Tuberculosis', null, 'Neglected disease',
      params('product=Vaccines&rdPhase=Phase+1&secondary=Stale'),
    );
    const u = new URL(href, 'http://x');
    expect(u.pathname).toBe('/pipeline-overview');
    expect(u.searchParams.get('product')).toBe('Vaccines');     // preserved
    expect(u.searchParams.get('rdPhase')).toBe('Phase 1');       // preserved
    expect(u.searchParams.get('gha')).toBe('Neglected disease'); // imposed
    expect(u.searchParams.get('primary')).toBe('Tuberculosis');  // imposed
    expect(u.searchParams.get('secondary')).toBeNull();          // cleared
  });

  it('sets both primary and secondary for a sub-disease click', () => {
    const href = diseaseExploreHref(
      'secondary', 'P. vivax', 'Malaria', 'Neglected disease',
      params('product=Vaccines'),
    );
    const u = new URL(href, 'http://x');
    expect(u.searchParams.get('primary')).toBe('Malaria');
    expect(u.searchParams.get('secondary')).toBe('P. vivax');
    expect(u.searchParams.get('product')).toBe('Vaccines');
  });

  it('"Find out more" (no disease) preserves only the active global filters', () => {
    const href = diseaseExploreHref('', '', null, null, params('product=Vaccines&rdPhase=Phase+1'));
    const u = new URL(href, 'http://x');
    expect(u.pathname).toBe('/pipeline-overview');
    expect(u.searchParams.get('product')).toBe('Vaccines');
    expect(u.searchParams.get('rdPhase')).toBe('Phase 1');
    expect(u.searchParams.get('primary')).toBeNull();
  });
});
