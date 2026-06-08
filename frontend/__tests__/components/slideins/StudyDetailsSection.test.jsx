// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudyDetailsSection } from '@/components/slideins/sections/StudyDetailsSection';

describe('StudyDetailsSection — Age field', () => {
  // The core change: multiple age groups render as ONE text node
  // ("Adult, Older Adult"), proving they are plain text rather than
  // separate pill spans. With the old pill markup each value was its
  // own <span>, so this combined string would not exist as one node.
  it('renders multiple age groups as a single comma-joined line, like Sex', () => {
    render(<StudyDetailsSection details={{ age_groups: 'Adult|Older Adult' }} />);
    expect(screen.getByText('Adult, Older Adult')).toBeTruthy();
  });

  it('renders a single age group as plain text', () => {
    render(<StudyDetailsSection details={{ age_groups: 'Child' }} />);
    expect(screen.getByText('Child')).toBeTruthy();
  });
});
