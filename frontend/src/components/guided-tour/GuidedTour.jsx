'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import tourSteps from './tourConfig';

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
          Do you want to take a guided tour through the platform?
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
            No
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
            Start tour
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
          Step {stepIndex + 1} of {totalSteps}
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
        {step.title}
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
        {step.description}
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
          {isLast ? 'Finish' : 'Next'} &rarr;
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main GuidedTour component                                         */
/* ------------------------------------------------------------------ */
export default function GuidedTour({ active, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
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

  // When pathname changes and we were navigating, stop navigating —
  // the new page is loaded and we can show the step.
  useEffect(() => {
    if (navigating && phase === 'touring') {
      const step = tourSteps[currentStep];
      if (step && step.route === pathname) {
        // Give the page a moment to render, then measure
        const timer = setTimeout(() => setNavigating(false), 400);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, navigating, currentStep, phase]);

  const measureTarget = useCallback(() => {
    const step = tourSteps[currentStep];
    if (!step) return;
    const el = document.querySelector(step.target);
    if (el) {
      // Scroll element into view if needed
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      // Measure after a small delay to account for scroll
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      }, 100);
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (phase !== 'touring' || navigating) return;
    // Small delay to let the page render before measuring
    const timer = setTimeout(measureTarget, 200);
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [phase, navigating, measureTarget]);

  const handleConfirm = () => {
    setPhase('touring');
    setCurrentStep(0);
    // If not already on the first step's route, navigate
    const firstStep = tourSteps[0];
    if (firstStep.route && firstStep.route !== pathname) {
      setNavigating(true);
      router.push(firstStep.route);
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

    // If the next step is on a different page, navigate there
    if (nextStep.route && nextStep.route !== pathname) {
      setNavigating(true);
      router.push(nextStep.route);
    }
  };

  const handleClose = () => onClose();

  useEffect(() => {
    if (!active) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [active]);

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
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9997 }}
          />
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
            Navigating to next page...
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
