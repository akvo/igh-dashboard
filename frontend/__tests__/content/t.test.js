import { describe, it, expect, beforeEach, vi } from 'vitest';

// Reset module cache between tests so we can mock the generated file
// per case without leaking state.
beforeEach(() => {
  vi.resetModules();
});

describe('t()', () => {
  it('resolves a nested dotted path', async () => {
    vi.doMock('@/content/content.generated.js', () => ({
      default: { home: { hero: { title: 'Hello' } } },
    }));
    const { t } = await import('@/content/index.js');
    expect(t('home.hero.title')).toBe('Hello');
  });

  it('resolves a top-level key', async () => {
    vi.doMock('@/content/content.generated.js', () => ({
      default: { greeting: 'Hi' },
    }));
    const { t } = await import('@/content/index.js');
    expect(t('greeting')).toBe('Hi');
  });

  it('throws on a missing key', async () => {
    vi.doMock('@/content/content.generated.js', () => ({
      default: { home: { hero: { title: 'Hello' } } },
    }));
    const { t } = await import('@/content/index.js');
    expect(() => t('home.hero.subtitle')).toThrow(
      /missing content key.*home\.hero\.subtitle/i,
    );
  });

  it('throws on a path that traverses through a string', async () => {
    vi.doMock('@/content/content.generated.js', () => ({
      default: { home: { hero: 'just a string' } },
    }));
    const { t } = await import('@/content/index.js');
    expect(() => t('home.hero.title')).toThrow(
      /missing content key.*home\.hero\.title/i,
    );
  });
});
