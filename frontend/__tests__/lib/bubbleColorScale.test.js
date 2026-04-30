import { describe, it, expect } from 'vitest';
import { createBubbleColorScale } from '@/lib/bubbleColorScale';

describe('createBubbleColorScale', () => {
  // The palette is ordered light → dark. The scale must map the smallest
  // bubble (rank 0) to palette[0] and the largest (rank total-1) to the
  // last palette entry, regardless of how many bubbles there are.
  const palette = ['#000', '#111', '#222', '#333', '#444', '#555', '#666'];

  it('returns the darkest stop when there is only one bubble', () => {
    const scale = createBubbleColorScale(palette);
    expect(scale({}, 0, 1)).toBe('#666');
  });

  it('maps the smallest rank to the lightest stop and the largest to the darkest', () => {
    const scale = createBubbleColorScale(palette);
    expect(scale({}, 0, 5)).toBe('#000');
    expect(scale({}, 4, 5)).toBe('#666');
  });

  it('spreads small-N bubbles across the full palette range', () => {
    // 3 bubbles across a 7-stop palette → rounds to indices 0, 3, 6.
    // This is the gha-tab case: we want full visual range, not just the
    // darkest 3 stops.
    const scale = createBubbleColorScale(palette);
    expect(scale({}, 0, 3)).toBe('#000');
    expect(scale({}, 1, 3)).toBe('#333');
    expect(scale({}, 2, 3)).toBe('#666');
  });

  it('quantizes large-N bubbles by snapping adjacent ranks to the same stop', () => {
    // 30 bubbles across a 7-stop palette → adjacent ranks share a stop.
    // The diseaseType-tab case: banding is desired, not a bug.
    const scale = createBubbleColorScale(palette);
    expect(scale({}, 0, 30)).toBe('#000');
    expect(scale({}, 29, 30)).toBe('#666');
    // Roughly the middle bubble lands roughly on the middle stop.
    expect(scale({}, 15, 30)).toBe('#333');
  });

  it('ignores the datum argument', () => {
    const scale = createBubbleColorScale(palette);
    expect(scale({ name: 'whatever', value: 99 }, 0, 1)).toBe('#666');
  });

  it('returns a stable function across calls', () => {
    const scale = createBubbleColorScale(palette);
    expect(scale({}, 2, 5)).toBe(scale({}, 2, 5));
  });
});
