'use client';

import useMediaQuery from '@/lib/useMediaQuery';
import MobileUnavailable from './MobileUnavailable';

// =========================================================
// Viewport gate
// =========================================================
//
// Renders <MobileUnavailable /> when the viewport is narrower than
// 1024px, otherwise renders children. The 1023.98px value matches
// Tailwind's `lg` breakpoint, which the `Header` already uses to swap
// between its desktop nav and its mobile hamburger — so the Header's
// own breakpoint and this gate flip at the same width.
//
// The breakpoint is intentionally not parameterised: it is tied to the
// dashboard's layout assumptions, not a knob we want to tune per caller.

export default function ResponsiveGate({ children }) {
  const isNarrow = useMediaQuery('(max-width: 1023.98px)');
  if (isNarrow) return <MobileUnavailable />;
  return children;
}
