'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import tourSteps from './tourConfig';
import { t } from '@/content';

/**
 * Parse **bold** markers in text into React <strong> elements.
 * Returns an array of strings and <strong> elements.
 */
function parseBold(text) {
  if (!text || !text.includes('**')) return text;
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} style={{ color: '#111', fontWeight: 600 }}>{part}</strong> : part
  );
}

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

/**
 * Find the sidebar nav link that corresponds to a step's route.
 */
function findSidebarLink(stepRoute) {
  if (!stepRoute) return null;
  const stepPath = routePathname(stepRoute);
  const nav = document.querySelector('[data-tour="sidebar-nav"]');
  if (!nav) return null;
  const links = nav.querySelectorAll('a');
  for (const link of links) {
    try {
      const linkPath = new URL(link.href).pathname;
      if (stepPath === '/' && linkPath === '/') return link;
      if (stepPath !== '/' && linkPath !== '/' && stepPath.startsWith(linkPath)) return link;
    } catch {
      continue;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Spotlight overlay (supports primary + secondary highlight)        */
/* ------------------------------------------------------------------ */
function Spotlight({ rect, secondaryRect }) {
  if (!rect) return null;
  const pad = 8;
  const r = {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
  const pad2 = 4;
  const r2 = secondaryRect
    ? {
        top: secondaryRect.top - pad2,
        left: secondaryRect.left - pad2,
        width: secondaryRect.width + pad2 * 2,
        height: secondaryRect.height + pad2 * 2,
      }
    : null;
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
          {r2 && (
            <rect
              x={r2.left}
              y={r2.top}
              width={r2.width}
              height={r2.height}
              rx="6"
              fill="black"
            />
          )}
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
function StepTooltip({ step, stepIndex, totalSteps, targetRect, onNext, onBack, onClose }) {
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
  const isFirst = stepIndex === 0;

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
          Step {stepIndex + 1} {t('guided_tour.controls.step_of')} {totalSteps}
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
        {parseBold(t(step.descKey))}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {!isFirst && (
            <button
              onClick={onBack}
              style={{
                background: '#fff',
                border: '1.5px solid #ccc',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                color: '#555',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              &larr; {t('guided_tour.controls.back')}
            </button>
          )}
        </div>
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
          {isLast ? t('guided_tour.controls.finish') : t('guided_tour.controls.next')} &rarr;
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
  const router = useRouter();
  const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
  const currentFullPath = currentSearch ? `${pathname}${currentSearch}` : pathname;

  // Restore tour state from sessionStorage so cross-page navigation
  // doesn't lose progress.
  const [phase, setPhase] = useState(() => {
    if (typeof window !== 'undefined' && active) {
      const saved = sessionStorage.getItem('guidedTourStep');
      if (saved != null) return 'touring';
    }
    return 'idle';
  });
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window !== 'undefined' && active) {
      const saved = sessionStorage.getItem('guidedTourStep');
      return saved != null ? Number(saved) : 0;
    }
    return 0;
  });
  const [targetRect, setTargetRect] = useState(null);
  const [sidebarRect, setSidebarRect] = useState(null);
  const [navigating, setNavigating] = useState(false);
  const totalSteps = tourSteps.length;

  // Persist current step to sessionStorage
  useEffect(() => {
    if (phase === 'touring') {
      sessionStorage.setItem('guidedTourStep', String(currentStep));
    }
  }, [phase, currentStep]);

  // Reset only when tour is freshly activated (not on page navigations).
  const prevActive = useRef(active);
  useEffect(() => {
    if (active && !prevActive.current) {
      // Fresh activation — check if we're resuming from sessionStorage
      const saved = sessionStorage.getItem('guidedTourStep');
      if (saved != null) {
        setPhase('touring');
        setCurrentStep(Number(saved));
      } else {
        // Start touring immediately (no confirm dialog)
        setPhase('touring');
        setCurrentStep(0);
        // Navigate to first step's route if needed
        const firstStep = tourSteps[0];
        if (firstStep.route && firstStep.route !== (typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '')) {
          setNavigating(true);
          const targetPath = routePathname(firstStep.route);
          if (targetPath === window.location.pathname) {
            window.history.pushState(null, '', firstStep.route);
            window.dispatchEvent(new PopStateEvent('popstate'));
          } else {
            router.push(firstStep.route);
          }
        }
      }
      setTargetRect(null);
      setSidebarRect(null);
      setNavigating(false);
    }
    prevActive.current = active;
  }, [active, router]);

  // When navigating, wait for the page to be ready then clear the flag.
  useEffect(() => {
    if (navigating && phase === 'touring') {
      const step = tourSteps[currentStep];
      if (step && routePathname(step.route) === pathname) {
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
    // Also remeasure sidebar highlight
    const sidebarLink = findSidebarLink(step.route);
    if (sidebarLink) {
      setSidebarRect(sidebarLink.getBoundingClientRect());
    } else {
      setSidebarRect(null);
    }
  }, [currentStep]);

  // Scroll to target and measure — called once per step change.
  const scrollAndMeasure = useCallback(() => {
    const step = tourSteps[currentStep];
    if (!step) return;

    // Measure sidebar link for secondary highlight
    const sidebarLink = findSidebarLink(step.route);
    if (sidebarLink) {
      setSidebarRect(sidebarLink.getBoundingClientRect());
    } else {
      setSidebarRect(null);
    }

    let attempts = 0;
    const maxAttempts = 15;
    let cancelled = false;

    const tryFind = () => {
      if (cancelled) return;
      const el = document.querySelector(step.target);
      if (el) {
        const elRect = el.getBoundingClientRect();
        const headerHeight = 90;
        const margin = 60;
        const isVisible =
          elRect.top >= headerHeight &&
          elRect.bottom <= window.innerHeight - margin;
        if (!isVisible) {
          const startTop = elRect.top;
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
            if (Math.abs(el.getBoundingClientRect().top - startTop) > 5) {
              requestAnimationFrame(pollScroll);
            } else {
              setTimeout(() => {
                if (cancelled) return;
                setTargetRect(el.getBoundingClientRect());
              }, 400);
            }
          }, 100);
        } else {
          setTargetRect(el.getBoundingClientRect());
        }
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(tryFind, 300);
      } else {
        setTargetRect(null);
      }
    };

    tryFind();

    return () => { cancelled = true; };
  }, [currentStep]);

  useEffect(() => {
    if (phase !== 'touring' || navigating) return;
    const timer = setTimeout(() => {
      scrollAndMeasure();
    }, 150);
    window.addEventListener('resize', remeasure);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', remeasure);
    };
  }, [phase, navigating, scrollAndMeasure, remeasure]);

  const navigateToRoute = useCallback((route) => {
    const targetPathname = routePathname(route);
    if (targetPathname === pathname) {
      window.history.pushState(null, '', route);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      router.push(route);
    }
  }, [pathname, router]);

  const handleNext = () => {
    if (currentStep >= totalSteps - 1) {
      onClose();
      return;
    }
    const nextIdx = currentStep + 1;
    const nextStep = tourSteps[nextIdx];
    setCurrentStep(nextIdx);
    setTargetRect(null);
    setSidebarRect(null);

    if (nextStep.route && nextStep.route !== currentFullPath) {
      setNavigating(true);
      navigateToRoute(nextStep.route);
    }
  };

  const handleBack = () => {
    if (currentStep <= 0) return;
    const prevIdx = currentStep - 1;
    const prevStep = tourSteps[prevIdx];
    setCurrentStep(prevIdx);
    setTargetRect(null);
    setSidebarRect(null);

    if (prevStep.route && prevStep.route !== currentFullPath) {
      setNavigating(true);
      navigateToRoute(prevStep.route);
    }
  };

  const handleClose = () => onClose();

  if (!active) return null;
  if (typeof window === 'undefined') return null;

  const step = tourSteps[currentStep];

  // Don't highlight sidebar link if the current step IS the sidebar
  const showSidebarHighlight = sidebarRect && step && !step.target.includes('sidebar');

  return createPortal(
    <>
      {phase === 'touring' && !navigating && (
        <>
          <ClickBlocker />
          <Spotlight rect={targetRect} secondaryRect={showSidebarHighlight ? sidebarRect : null} />
          {step && (
            <StepTooltip
              step={step}
              stepIndex={currentStep}
              totalSteps={totalSteps}
              targetRect={targetRect}
              onNext={handleNext}
              onBack={handleBack}
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
            {t('guided_tour.controls.navigating')}
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
