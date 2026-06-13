import { describe, it, expect } from 'vitest';
import { matchesItemHref } from '@/components/layout/menuActive';

describe('matchesItemHref', () => {
  it('matches a plain leaf by exact pathname', () => {
    expect(matchesItemHref('/cross-pipeline-analytics', {
      pathname: '/cross-pipeline-analytics', hash: '',
    })).toBe(true);
    expect(matchesItemHref('/cross-pipeline-analytics', {
      pathname: '/who-priority-alignment', hash: '',
    })).toBe(false);
  });

  it('treats empty hash as #explore on portfolio-analysis', () => {
    expect(matchesItemHref('/portfolio-analysis', {
      pathname: '/portfolio-analysis', hash: '',
    })).toBe(true);
    expect(matchesItemHref('/portfolio-analysis#aggregated', {
      pathname: '/portfolio-analysis', hash: '',
    })).toBe(false);
    expect(matchesItemHref('/portfolio-analysis#aggregated', {
      pathname: '/portfolio-analysis', hash: 'aggregated',
    })).toBe(true);
  });

  it('matches a path-differentiated child route exactly', () => {
    // /portfolio-analysis/extract is a sibling path (not a hash
    // sub-section), so it must match on its own pathname and fall
    // through the portfolio-analysis hash special-case untouched.
    expect(matchesItemHref('/portfolio-analysis/extract', {
      pathname: '/portfolio-analysis/extract', hash: '',
    })).toBe(true);
    expect(matchesItemHref('/portfolio-analysis/extract', {
      pathname: '/portfolio-analysis', hash: '',
    })).toBe(false);
  });

  it('prefix mode matches the entry path and its sub-routes', () => {
    expect(matchesItemHref('/pipeline-explorer', {
      pathname: '/pipeline-explorer', hash: '', match: 'prefix',
    })).toBe(true);
    expect(matchesItemHref('/pipeline-explorer', {
      pathname: '/pipeline-explorer/table-builder', hash: '', match: 'prefix',
    })).toBe(true);
  });

  it('prefix mode does not match a different sibling segment', () => {
    expect(matchesItemHref('/pipeline-explorer', {
      pathname: '/pipeline-explorer-archive', hash: '', match: 'prefix',
    })).toBe(false);
    expect(matchesItemHref('/pipeline-explorer', {
      pathname: '/portfolio-analysis', hash: '', match: 'prefix',
    })).toBe(false);
  });
});
