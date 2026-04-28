// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { migrateLegacyDiseaseUrl } from '../../src/lib/migrateLegacyDiseaseUrl';

function mockLocation(search) {
  // jsdom's window.location is read-only by default; replace the
  // whole object for each test.
  Object.defineProperty(window, 'location', {
    value: {
      search,
      pathname: '/portfolio-analysis',
    },
    writable: true,
  });
  // Capture replaceState calls so tests can assert the rewritten URL.
  window.history.replaceState = vi.fn();
}

describe('migrateLegacyDiseaseUrl', () => {
  beforeEach(() => {
    mockLocation('');
  });

  it('rewrites ?disease=Malaria to ?primary=Malaria', () => {
    mockLocation('?disease=Malaria');
    const setPrimary = vi.fn();

    migrateLegacyDiseaseUrl({ setPrimary });

    expect(setPrimary).toHaveBeenCalledWith(['Malaria']);
    expect(window.history.replaceState).toHaveBeenCalledWith(
      {},
      '',
      '/portfolio-analysis?primary=Malaria',
    );
  });

  it('preserves other params (gha=, product=) during the rewrite', () => {
    mockLocation('?gha=Malaria&disease=HIV%2FAIDS&product=Drugs');
    const setPrimary = vi.fn();

    migrateLegacyDiseaseUrl({ setPrimary });

    expect(setPrimary).toHaveBeenCalledWith(['HIV/AIDS']);
    const replaced = window.history.replaceState.mock.calls[0][2];
    expect(replaced).toContain('gha=Malaria');
    expect(replaced).toContain('product=Drugs');
    expect(replaced).toContain('primary=HIV%2FAIDS');
    expect(replaced).not.toContain('disease=');
  });

  it('does nothing when only ?primary= is present (already migrated)', () => {
    mockLocation('?primary=Malaria');
    const setPrimary = vi.fn();

    migrateLegacyDiseaseUrl({ setPrimary });

    expect(setPrimary).not.toHaveBeenCalled();
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });

  it('does nothing when both keys are present (newer URL wins)', () => {
    // Defensive: if a user crafts a URL with both `disease` and
    // `primary`, trust the newer key.
    mockLocation('?disease=Malaria&primary=HIV%2FAIDS');
    const setPrimary = vi.fn();

    migrateLegacyDiseaseUrl({ setPrimary });

    expect(setPrimary).not.toHaveBeenCalled();
  });

  it('handles a comma-separated legacy disease list', () => {
    mockLocation('?disease=Malaria%2CHIV%2FAIDS');
    const setPrimary = vi.fn();

    migrateLegacyDiseaseUrl({ setPrimary });

    expect(setPrimary).toHaveBeenCalledWith(['Malaria', 'HIV/AIDS']);
  });

  it('drops the param entirely if the legacy value was empty', () => {
    mockLocation('?disease=&gha=Malaria');
    const setPrimary = vi.fn();

    migrateLegacyDiseaseUrl({ setPrimary });

    expect(setPrimary).not.toHaveBeenCalled();
    const replaced = window.history.replaceState.mock.calls[0][2];
    expect(replaced).not.toContain('disease=');
    expect(replaced).not.toContain('primary=');
    expect(replaced).toContain('gha=Malaria');
  });
});
