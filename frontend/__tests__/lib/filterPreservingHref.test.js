import { describe, it, expect } from 'vitest';
import { buildHref } from '@/lib/filterPreservingHref';

const params = (qs) => new URLSearchParams(qs);

describe('buildHref', () => {
  it('carries global filter keys across different top-level segments', () => {
    const href = buildHref('/who-priority-alignment', {
      pathname: '/portfolio-analysis',
      params: params('gha=A&primary=B'),
    });
    expect(href).toBe('/who-priority-alignment?gha=A&primary=B');
  });

  it('drops non-global params when leaving the group', () => {
    const href = buildHref('/who-priority-alignment', {
      pathname: '/portfolio-analysis',
      params: params('gha=A&extTab=clinical-trials'),
    });
    expect(href).toBe('/who-priority-alignment?gha=A');
  });

  it('carries sibling (non-global) params within the same top-level segment', () => {
    const href = buildHref('/portfolio-analysis/extract', {
      pathname: '/portfolio-analysis',
      params: params('gha=A&extTab=clinical-trials'),
    });
    expect(href).toBe('/portfolio-analysis/extract?gha=A&extTab=clinical-trials');
  });

  it('from the home route carries only global keys', () => {
    const href = buildHref('/portfolio-analysis', {
      pathname: '/',
      params: params('gha=A&mapTab=trials'),
    });
    expect(href).toBe('/portfolio-analysis?gha=A');
  });
});
