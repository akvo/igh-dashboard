import { describe, it, expect } from 'vitest';
import { matchesItemHref } from '@/components/layout/menuActive';

describe('matchesItemHref', () => {
  it('matches a plain leaf by exact pathname', () => {
    expect(matchesItemHref('/pipeline-trends', {
      pathname: '/pipeline-trends',
    })).toBe(true);
    expect(matchesItemHref('/pipeline-trends', {
      pathname: '/who-priority-alignment',
    })).toBe(false);
  });

  it('matches a path-differentiated child route exactly', () => {
    expect(matchesItemHref('/pipeline-explorer/table-builder', {
      pathname: '/pipeline-explorer/table-builder',
    })).toBe(true);
    expect(matchesItemHref('/pipeline-explorer/table-builder', {
      pathname: '/pipeline-explorer',
    })).toBe(false);
  });

  it('prefix mode matches the entry path and its sub-routes', () => {
    expect(matchesItemHref('/pipeline-explorer', {
      pathname: '/pipeline-explorer', match: 'prefix',
    })).toBe(true);
    expect(matchesItemHref('/pipeline-explorer', {
      pathname: '/pipeline-explorer/table-builder', match: 'prefix',
    })).toBe(true);
  });

  it('prefix mode does not match a different sibling segment', () => {
    expect(matchesItemHref('/pipeline-explorer', {
      pathname: '/pipeline-explorer-archive', match: 'prefix',
    })).toBe(false);
    expect(matchesItemHref('/pipeline-explorer', {
      pathname: '/pipeline-trends', match: 'prefix',
    })).toBe(false);
  });
});
