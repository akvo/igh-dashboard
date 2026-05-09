'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// =========================================================
// usePortalPopover — anchored, viewport-aware portal positioning
// =========================================================
//
// Popovers anchored to elements *inside* a scroll container with
// `overflow: auto` get clipped if rendered as in-flow children. Render
// them via `createPortal(..., document.body)` instead, with
// `position: fixed` and coords computed from the trigger's bounding
// rect.
//
// What this hook returns:
//   triggerRef  — assign to the button that opens the popover
//   popoverRef  — assign to the popover root for outside-click detection
//   open        — whether the popover is open
//   setOpen     — open/close
//   coords      — { top, left } for the popover, in viewport pixels.
//                 The popover should set `position: fixed` and consume
//                 these. Recomputed on open and on scroll/resize.
//   align       — 'left' (anchored to trigger.left) | 'right'
//                 (anchored to trigger.right). Choose based on which
//                 side has more room: leftroom < popoverWidth flips to
//                 left-anchored.
//
// The popover's max width is consulted via the `popoverWidth` arg
// (default 200) so we can detect overflow accurately. If the popover
// doesn't fit on either side cleanly we still pick the side with more
// room — the user just sees a slight overlap rather than full clipping.

export function usePortalPopover({ popoverWidth = 200 } = {}) {
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [align, setAlign] = useState('left');

  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewportW = window.innerWidth;
    // Default: anchor left edge to trigger's left, drop below trigger.
    let left = rect.left;
    let nextAlign = 'left';
    // If the popover would overflow the right edge of the viewport,
    // anchor its right edge to the trigger's right instead.
    if (left + popoverWidth > viewportW - 8) {
      left = rect.right - popoverWidth;
      nextAlign = 'right';
    }
    // Don't let it fall off the left edge either.
    if (left < 8) left = 8;
    setCoords({ top: rect.bottom + 4, left });
    setAlign(nextAlign);
  }, [popoverWidth]);

  // Recompute on open and whenever the viewport changes geometry.
  useEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  // Outside-click closes. mousedown so we beat React onClick handlers
  // that might re-open the popover on the trigger itself.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e) => {
      if (popoverRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  return { triggerRef, popoverRef, open, setOpen, coords, align };
}
