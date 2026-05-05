// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import DiseaseListPanel from '../../src/components/ui/DiseaseListPanel';

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
});
