// =============================================================================
// Vitest setup — Web Storage shim for DOM-environment tests
// =============================================================================
//
// Why this exists:
//
// Node 22 introduced an experimental built-in Web Storage API, and from Node 24
// onward `globalThis.localStorage` is defined out of the box. But it is only
// *functional* when the process is started with `--localstorage-file=<path>`;
// without that flag, reading the global emits
//
//     ExperimentalWarning: localStorage is not available because
//     --localstorage-file was not provided.
//
// and yields `undefined`.
//
// Vitest's jsdom environment aliases `window` to `globalThis`, so Node's inert
// `localStorage` accessor *shadows* the working one jsdom would otherwise
// provide. The net effect: under Node >= 22, both `localStorage` and
// `window.localStorage` read as `undefined` inside jsdom tests. Under Node 20
// the global did not exist, jsdom's implementation was used, and the same tests
// passed — which is exactly the version-dependent failure we observed (green on
// v20, red on v26).
//
// The application code is already defensive (it guards `typeof localStorage ===
// 'undefined'`), so the app degrades gracefully either way. The brittleness is
// confined to unit tests that legitimately exercise Web Storage behaviour. We
// fix it at the seam where it breaks: provide a small, spec-faithful in-memory
// Storage on the global whenever we are in a DOM-like environment and a working
// `localStorage` is not already present.
//
// Design notes:
//   - We only act in a DOM environment (`window` defined). Node-environment
//     test files load this setup too, but skip it entirely.
//   - We probe whether storage actually *works* (not merely whether it is
//     defined), so on Node 20 — where jsdom already supplies a functional
//     localStorage — this is a complete no-op and we never clobber it.
//   - We expose the implementation as the global `Storage` class and back
//     `localStorage`/`sessionStorage` with instances of it, so tests that reach
//     for `Storage.prototype` (e.g. simulating a quota error by overriding
//     `Storage.prototype.setItem`) still affect our instances.

// A minimal, synchronous, in-memory implementation of the Web Storage API
// surface the codebase and its tests rely on: getItem / setItem / removeItem /
// clear / key / length. Keys and values are coerced to strings, matching the
// real API, and missing keys read back as `null`.
class MemoryStorage {
  #data = new Map();

  get length() {
    return this.#data.size;
  }

  key(index) {
    return Array.from(this.#data.keys())[index] ?? null;
  }

  getItem(name) {
    const k = String(name);
    return this.#data.has(k) ? this.#data.get(k) : null;
  }

  setItem(name, value) {
    this.#data.set(String(name), String(value));
  }

  removeItem(name) {
    this.#data.delete(String(name));
  }

  clear() {
    this.#data.clear();
  }
}

// Does the ambient `localStorage` actually function? A round-trip is the only
// reliable check: Node's stub is *defined* but throws/returns undefined in use.
function storageWorks() {
  try {
    if (typeof localStorage === 'undefined' || localStorage === null) return false;
    const probe = '__vitest_storage_probe__';
    localStorage.setItem(probe, '1');
    const ok = localStorage.getItem(probe) === '1';
    localStorage.removeItem(probe);
    return ok;
  } catch {
    return false;
  }
}

// Only DOM-environment test files need Web Storage. Node-environment files skip
// this; so does Node 20, where jsdom's own storage already works.
if (typeof window !== 'undefined' && !storageWorks()) {
  // Replace the (inert) global Storage class so `Storage.prototype` hooks in
  // tests target our instances.
  globalThis.Storage = MemoryStorage;

  // The Node-provided property is a configurable accessor, so define over it
  // rather than assign (assignment would route through Node's no-op setter).
  for (const name of ['localStorage', 'sessionStorage']) {
    Object.defineProperty(globalThis, name, {
      value: new MemoryStorage(),
      writable: true,
      configurable: true,
    });
  }
}
