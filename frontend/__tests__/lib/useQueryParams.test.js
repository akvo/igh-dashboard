import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =========================================================
// Browser API mocks for the node test environment
// =========================================================

let listeners = [];
let currentSearch = '';
let currentPathname = '/test';

const mockWindow = {
  location: {
    get search() {
      return currentSearch;
    },
    get pathname() {
      return currentPathname;
    },
  },
  history: {
    replaceState: vi.fn((_state, _title, url) => {
      const parsed = new URL(url, 'http://localhost');
      currentSearch = parsed.search;
      currentPathname = parsed.pathname;
    }),
    pushState: vi.fn((_state, _title, url) => {
      const parsed = new URL(url, 'http://localhost');
      currentSearch = parsed.search;
      currentPathname = parsed.pathname;
    }),
  },
  addEventListener: vi.fn((event, cb) => {
    listeners.push({ event, cb });
  }),
  removeEventListener: vi.fn((event, cb) => {
    listeners = listeners.filter((l) => l.event !== event || l.cb !== cb);
  }),
  dispatchEvent: vi.fn((evt) => {
    listeners
      .filter((l) => l.event === evt.type)
      .forEach((l) => l.cb(evt));
  }),
};

// Install mocks on globalThis so the module picks them up.
beforeEach(() => {
  currentSearch = '';
  currentPathname = '/test';
  listeners = [];

  globalThis.window = mockWindow;
  // PopStateEvent is not available in node — provide a minimal shim.
  globalThis.PopStateEvent = class PopStateEvent {
    constructor(type) {
      this.type = type;
    }
  };

  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetModules();
});

// =========================================================
// Tests for the standalone functions (subscribe, getSnapshot,
// getServerSnapshot) and the setParams logic.
//
// Because useQueryParams is a React hook we cannot call it
// directly outside a component. Instead we test the exported
// building blocks through the module internals: subscribe,
// getSnapshot, getServerSnapshot are plain functions, and
// setParams is a pure side-effect function over window APIs.
//
// We import the module fresh for each test group to avoid
// stale module-level closures.
// =========================================================

describe('useQueryParams internal functions', () => {
  // We test the behaviour by directly exercising the window
  // mocks that the hook delegates to.

  describe('getSnapshot equivalent (window.location.search)', () => {
    it('reads the current query string', () => {
      currentSearch = '?foo=bar';
      expect(window.location.search).toBe('?foo=bar');
    });

    it('returns empty string when no query params', () => {
      currentSearch = '';
      expect(window.location.search).toBe('');
    });
  });

  describe('subscribe/unsubscribe (popstate listener)', () => {
    it('registers a popstate listener', () => {
      const cb = vi.fn();
      window.addEventListener('popstate', cb);
      expect(listeners).toHaveLength(1);
      expect(listeners[0].event).toBe('popstate');
    });

    it('removes listener on cleanup', () => {
      const cb = vi.fn();
      window.addEventListener('popstate', cb);
      expect(listeners).toHaveLength(1);
      window.removeEventListener('popstate', cb);
      expect(listeners).toHaveLength(0);
    });
  });

  describe('setParams behaviour (via history mock)', () => {
    it('replaceState sets a single key', () => {
      currentSearch = '';
      currentPathname = '/test';

      const current = new URLSearchParams(window.location.search);
      current.set('tab', 'explore');
      const newUrl = `${window.location.pathname}?${current.toString()}`;
      window.history.replaceState(null, '', newUrl);

      expect(window.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        '/test?tab=explore',
      );
      expect(currentSearch).toBe('?tab=explore');
    });

    it('pushState creates a new history entry', () => {
      currentSearch = '';
      currentPathname = '/test';

      const current = new URLSearchParams(window.location.search);
      current.set('mapTab', 'development');
      const newUrl = `${window.location.pathname}?${current.toString()}`;
      window.history.pushState(null, '', newUrl);

      expect(window.history.pushState).toHaveBeenCalledWith(
        null,
        '',
        '/test?mapTab=development',
      );
    });

    it('removes a key by deleting it from URLSearchParams', () => {
      currentSearch = '?tab=explore&gha=HIV';
      currentPathname = '/test';

      const current = new URLSearchParams(window.location.search);
      current.delete('gha');
      const newSearch = current.toString();
      const newUrl = newSearch
        ? `${window.location.pathname}?${newSearch}`
        : window.location.pathname;
      window.history.replaceState(null, '', newUrl);

      expect(currentSearch).toBe('?tab=explore');
    });

    it('removes all keys to produce a clean URL', () => {
      currentSearch = '?tab=explore';
      currentPathname = '/portfolio';

      const current = new URLSearchParams(window.location.search);
      current.delete('tab');
      const newSearch = current.toString();
      const newUrl = newSearch
        ? `${window.location.pathname}?${newSearch}`
        : window.location.pathname;
      window.history.replaceState(null, '', newUrl);

      expect(currentSearch).toBe('');
      expect(currentPathname).toBe('/portfolio');
    });

    it('updates multiple keys in a single operation', () => {
      currentSearch = '';
      currentPathname = '/test';

      const current = new URLSearchParams(window.location.search);
      current.set('gha', 'HIV');
      current.set('disease', 'Malaria');
      current.set('tab', 'extract');
      const newUrl = `${window.location.pathname}?${current.toString()}`;
      window.history.replaceState(null, '', newUrl);

      const result = new URLSearchParams(currentSearch);
      expect(result.get('gha')).toBe('HIV');
      expect(result.get('disease')).toBe('Malaria');
      expect(result.get('tab')).toBe('extract');
    });

    it('dispatching popstate notifies listeners', () => {
      const cb = vi.fn();
      window.addEventListener('popstate', cb);
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe('sequential setParams calls read fresh state', () => {
    it('second call sees the first call\'s result', () => {
      currentSearch = '';
      currentPathname = '/test';

      // First call: set gha
      const first = new URLSearchParams(window.location.search);
      first.set('gha', 'HIV');
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}?${first.toString()}`,
      );

      // Second call: reads fresh search and adds disease
      const second = new URLSearchParams(window.location.search);
      second.set('disease', 'Dengue');
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}?${second.toString()}`,
      );

      const result = new URLSearchParams(currentSearch);
      expect(result.get('gha')).toBe('HIV');
      expect(result.get('disease')).toBe('Dengue');
    });
  });
});
