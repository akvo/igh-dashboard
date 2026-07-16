'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import tourSteps from './tourConfig';
import { t } from '@/content';

/** Extract the pathname part of a route (strip query string). */
const routePathname = (route) => (route ? route.split('?')[0] : route);

/**
 * Find the nearest scrollable ancestor of an element.
 * Falls back to documentElement.
 */
function getScrollParent(el) {
  let node = el.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return document.documentElement;
}

/* ------------------------------------------------------------------ */
/*  Confirmation dialog                                               */
/* ------------------------------------------------------------------ */
function ConfirmDialog({ onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '32px 36px 28px',
          maxWidth: 400,
          width: '90%',
          position: 'relative',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
      >
        <button
          onClick={onCancel}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 22,
            color: '#666',
            lineHeight: 1,
          }}
        >
          &times;
        </button>
        <p
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: '#111',
            margin: '0 0 28px',
            lineHeight: 1.4,
            paddingRight: 24,
          }}
        >
          {t('guided_tour.confirm_prompt')}
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px 0',
              border: '1.5px solid #ccc',
              borderRadius: 8,
              background: '#fff',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              color: '#111',
            }}
          >
            {t('guided_tour.confirm_no')}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px 0',
              border: 'none',
              borderRadius: 8,
              background: '#fe7449',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              color: '#111',
            }}
          >
            {t('guided_tour.confirm_start')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Spotlight overlay                                                 */
/* ------------------------------------------------------------------ */
function Spotlight({ rect }) {
  if (!rect) return null;
  const pad = 8;
  const r = {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
  return (
    <svg
      style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' }}
      width="100%"
      height="100%"
    >
      <defs>
        <mask id="tour-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <rect
            x={r.left}
            y={r.top}
            width={r.width}
            height={r.height}
            rx="8"
            fill="black"
          />
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="rgba(0,0,0,0.45)"
        mask="url(#tour-mask)"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress bar                                                      */
/* ------------------------------------------------------------------ */
function ProgressBar({ current, total }) {
  const pct = ((current + 1) / total) * 100;
  return (
    <div
      style={{
        width: '100%',
        height: 4,
        background: '#eee',
        borderRadius: 2,
        marginBottom: 8,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: '#fe7449',
          borderRadius: 2,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step tooltip                                                      */
/* ------------------------------------------------------------------ */
function StepTooltip({ step, stepIndex, totalSteps, targetRect, onNext, onClose }) {
  const tooltipRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!targetRect || !tooltipRef.current) return;
    const tt = tooltipRef.current.getBoundingClientRect();
    const gap = 16;
    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tt.height / 2;
        left = targetRect.right + gap;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tt.height / 2;
        left = targetRect.left - tt.width - gap;
        break;
      case 'bottom':
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2 - tt.width / 2;
        break;
      case 'top':
        top = targetRect.top - tt.height - gap;
        left = targetRect.left + targetRect.width / 2 - tt.width / 2;
        break;
      default:
        top = targetRect.bottom + gap;
        left = targetRect.left;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (left + tt.width > vw - 12) left = vw - tt.width - 12;
    if (left < 12) left = 12;
    if (top + tt.height > vh - 12) top = vh - tt.height - 12;
    if (top < 12) top = 12;

    setPos({ top, left });
  }, [targetRect, step.position]);

  const isLast = stepIndex === totalSteps - 1;

  return (
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        background: '#fff',
        borderRadius: 10,
        padding: '20px 22px 18px',
        width: 320,
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
        transition: 'top 0.3s ease, left 0.3s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 12, color: '#999', fontWeight: 500 }}>
          Step {stepIndex + 1} {t('guided_tour.step_of')} {totalSteps}
        </span>
        <button
          onClick={onClose}
          aria-label="Close tour"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            color: '#999',
            lineHeight: 1,
            padding: 0,
          }}
        >
          &times;
        </button>
      </div>
      <ProgressBar current={stepIndex} total={totalSteps} />
      <h4
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: '#111',
          margin: '0 0 6px',
        }}
      >
        {t(step.titleKey)}
      </h4>
      <p
        style={{
          fontSize: 13,
          color: '#555',
          lineHeight: 1.5,
          margin: '0 0 16px',
          whiteSpace: 'pre-line',
        }}
      >
        {t(step.descKey)}
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onNext}
          style={{
            background: '#fe7449',
            border: 'none',
            borderRadius: 6,
            padding: '8px 20px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            color: '#111',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {isLast ? t('guided_tour.finish') : t('guided_tour.next')} &rarr;
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Click-blocking overlay that still allows scrolling                */
/* ------------------------------------------------------------------ */
function ClickBlocker() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Block clicks/taps but forward wheel events to the correct
    // scroll container so the user can still scroll during the tour.
    // Some pages scroll inside <main overflow-y-auto>, others scroll
    // at the document level — detect which one is scrollable.
    const handleWheel = (e) => {
      e.preventDefault();
      const main = document.querySelector('main');
      if (main) {
        const { overflowY } = getComputedStyle(main);
        if (overflowY === 'auto' || overflowY === 'scroll') {
          main.scrollBy({ top: e.deltaY, left: e.deltaX });
          return;
        }
      }
      window.scrollBy({ top: e.deltaY, left: e.deltaX });
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', inset: 0, zIndex: 9997 }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main GuidedTour component                                         */
/* ------------------------------------------------------------------ */
export default function GuidedTour({ active, onClose }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  // Build the current full path (pathname + query) for route comparison
  const currentSearch = searchParams.toString();
  const currentFullPath = currentSearch ? `${pathname}?${currentSearch}` : pathname;
  // Restore tour state from sessionStorage so cross-page navigation
  // doesn't lose progress.
  const [phase, setPhase] = useState(() => {
    if (typeof window !== 'undefined' && active) {
      const saved = sessionStorage.getItem('guidedTourStep');
      if (saved != null) return 'touring';
    }
    return 'confirm';
  });
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window !== 'undefined' && active) {
      const saved = sessionStorage.getItem('guidedTourStep');
      return saved != null ? Number(saved) : 0;
    }
    return 0;
  });
  const [targetRect, setTargetRect] = useState(null);
  // Track whether we're waiting for a page navigation to complete
  const [navigating, setNavigating] = useState(false);
  const totalSteps = tourSteps.length;

  // Persist current step to sessionStorage
  useEffect(() => {
    if (phase === 'touring') {
      sessionStorage.setItem('guidedTourStep', String(currentStep));
    }
  }, [phase, currentStep]);

  // Reset only when tour is freshly activated (not on page navigations).
  // We use a ref to detect the actual false→true transition.
  const prevActive = useRef(active);
  useEffect(() => {
    if (active && !prevActive.current) {
      // Fresh activation — check if we're resuming from sessionStorage
      const saved = sessionStorage.getItem('guidedTourStep');
      if (saved != null) {
        setPhase('touring');
        setCurrentStep(Number(saved));
      } else {
        setPhase('confirm');
        setCurrentStep(0);
      }
      setTargetRect(null);
      setNavigating(false);
    }
    prevActive.current = active;
  }, [active]);

  // When navigating, wait for the page to be ready then clear the flag.
  // For cross-page navigations, pathname changes trigger this.
  // For same-page query changes, currentStep changing + navigating flag
  // triggers this immediately (the pushState already happened synchronously).
  useEffect(() => {
    if (navigating && phase === 'touring') {
      const step = tourSteps[currentStep];
      if (step && routePathname(step.route) === pathname) {
        // Give the page time to render before showing the step
        const timer = setTimeout(() => setNavigating(false), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, navigating, currentStep, phase]);

  // Re-measure the target rect without scrolling (used on resize)
  const remeasure = useCallback(() => {
    const step = tourSteps[currentStep];
    if (!step) return;
    const el = document.querySelector(step.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    }
  }, [currentStep]);

  // Scroll to target and measure — called once per step change.
  // Retries if the element hasn't rendered yet (async data loads).
  const scrollAndMeasure = useCallback(() => {
    const step = tourSteps[currentStep];
    if (!step) return;

    let attempts = 0;
    const maxAttempts = 15;
    let cancelled = false;

    const tryFind = () => {
      if (cancelled) return;
      const el = document.querySelector(step.target);
      if (el) {
        // Check if element is outside the visible viewport area.
        // Account for the sticky header (~90px) and leave room for
        // the tooltip. Works regardless of whether the page scrolls
        // inside <main> or at the document level.
        const elRect = el.getBoundingClientRect();
        const headerHeight = 90;
        const margin = 60;
        const isVisible =
          elRect.top >= headerHeight &&
          elRect.bottom <= window.innerHeight - margin;
        if (!isVisible) {
          const startTop = elRect.top;
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Wait for scroll to begin, then poll until position stabilizes.
          // The initial 100ms delay prevents false "stable" readings
          // before the smooth scroll animation kicks in.
          setTimeout(() => {
            if (cancelled) return;
            let lastTop = el.getBoundingClientRect().top;
            let stableCount = 0;
            const pollScroll = () => {
              if (cancelled) return;
              const r = el.getBoundingClientRect();
              if (Math.abs(r.top - lastTop) < 2) {
                stableCount++;
                if (stableCount >= 3) {
                  setTargetRect(r);
                  return;
                }
              } else {
                stableCount = 0;
              }
              lastTop = r.top;
              requestAnimationFrame(pollScroll);
            };
            // If position already changed from start, begin polling.
            // Otherwise wait a bit more for scroll to start.
            if (Math.abs(el.getBoundingClientRect().top - startTop) > 5) {
              requestAnimationFrame(pollScroll);
            } else {
              setTimeout(() => {
                if (cancelled) return;
                // Scroll might not have started — measure anyway
                setTargetRect(el.getBoundingClientRect());
              }, 400);
            }
          }, 100);
        } else {
          setTargetRect(el.getBoundingClientRect());
        }
      } else if (attempts < maxAttempts) {
        // Element not rendered yet — retry
        attempts++;
        setTimeout(tryFind, 300);
      } else {
        setTargetRect(null);
      }
    };

    tryFind();

    // Return cancellation function
    return () => { cancelled = true; };
  }, [currentStep]);

  useEffect(() => {
    if (phase !== 'touring' || navigating) return;
    // Scroll to the target once when the step changes
    const timer = setTimeout(() => {
      scrollAndMeasure();
    }, 150);
    // Re-measure on resize only
    window.addEventListener('resize', remeasure);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', remeasure);
    };
  }, [phase, navigating, scrollAndMeasure, remeasure]);

  // Navigate to a tour step's route.
  // For same-page query-param changes, we update the URL directly
  // via pushState + popstate dispatch so useQueryParams (which
  // powers useUrlState) picks up the change immediately.
  // For cross-page navigation, we use router.push.
  const navigateToRoute = useCallback((route) => {
    const targetPathname = routePathname(route);
    if (targetPathname === pathname) {
      // Same page — update query params directly
      window.history.pushState(null, '', route);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      // Different page
      router.push(route);
    }
  }, [pathname, router]);

  const handleConfirm = () => {
    setPhase('touring');
    setCurrentStep(0);
    const firstStep = tourSteps[0];
    if (firstStep.route && firstStep.route !== currentFullPath) {
      setNavigating(true);
      navigateToRoute(firstStep.route);
    }
  };

  const handleNext = () => {
    if (currentStep >= totalSteps - 1) {
      onClose();
      return;
    }
    const nextIdx = currentStep + 1;
    const nextStep = tourSteps[nextIdx];
    setCurrentStep(nextIdx);
    setTargetRect(null);

    // Navigate if the next step targets a different page or query params
    if (nextStep.route && nextStep.route !== currentFullPath) {
      setNavigating(true);
      navigateToRoute(nextStep.route);
    }
  };

  const handleClose = () => onClose();

  if (!active) return null;
  if (typeof window === 'undefined') return null;

  const step = tourSteps[currentStep];

  return createPortal(
    <>
      {phase === 'confirm' && (
        <ConfirmDialog onConfirm={handleConfirm} onCancel={handleClose} />
      )}

      {phase === 'touring' && !navigating && (
        <>
          <ClickBlocker />
          <Spotlight rect={targetRect} />
          {step && (
            <StepTooltip
              step={step}
              stepIndex={currentStep}
              totalSteps={totalSteps}
              targetRect={targetRect}
              onNext={handleNext}
              onClose={handleClose}
            />
          )}
        </>
      )}

      {phase === 'touring' && navigating && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 10,
              padding: '24px 32px',
              fontSize: 14,
              color: '#555',
              boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
            }}
          >
            {t('guided_tour.navigating')}
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
