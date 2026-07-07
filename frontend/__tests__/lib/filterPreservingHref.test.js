import { describe, it, expect } from 'vitest';
import { buildHref, buildHrefWithFilters } from '@/lib/filterPreservingHref';

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

describe('buildHrefWithFilters', () => {
  it('preserves global filters and applies overrides', () => {
    const href = buildHrefWithFilters('/pipeline-overview', {
      params: params('product=Vaccines&rdPhase=Phase+1'),
      set: { gha: 'Neglected disease', primary: 'Tuberculosis' },
    });
    const u = new URL(href, 'http://x');
    expect(u.pathname).toBe('/pipeline-overview');
    expect(u.searchParams.get('product')).toBe('Vaccines');
    expect(u.searchParams.get('rdPhase')).toBe('Phase 1');
    expect(u.searchParams.get('gha')).toBe('Neglected disease');
    expect(u.searchParams.get('primary')).toBe('Tuberculosis');
  });

  it('drops non-global params from the source query', () => {
    const href = buildHrefWithFilters('/pipeline-overview', {
      params: params('product=Vaccines&mapTab=trials'),
      set: { primary: 'Malaria' },
    });
    const u = new URL(href, 'http://x');
    expect(u.searchParams.get('product')).toBe('Vaccines');
    expect(u.searchParams.get('mapTab')).toBeNull();
  });

  it('removes listed keys (e.g. stale secondary on a primary click)', () => {
    const href = buildHrefWithFilters('/pipeline-overview', {
      params: params('secondary=P.+vivax&product=Vaccines'),
      set: { primary: 'Tuberculosis' },
      remove: ['secondary'],
    });
    const u = new URL(href, 'http://x');
    expect(u.searchParams.get('secondary')).toBeNull();
    expect(u.searchParams.get('primary')).toBe('Tuberculosis');
    expect(u.searchParams.get('product')).toBe('Vaccines');
  });

  it('returns a bare path when nothing remains', () => {
    expect(buildHrefWithFilters('/pipeline-overview', { params: params('') }))
      .toBe('/pipeline-overview');
  });

  it('an empty/null set value deletes that key', () => {
    const href = buildHrefWithFilters('/pipeline-overview', {
      params: params('gha=HIV'),
      set: { gha: '' },
    });
    expect(href).toBe('/pipeline-overview');
  });
});
