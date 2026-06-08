'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { globalSteps, pageSteps } from './tourConfig';

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
              background: '#f5a623',
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
        width: 300,
        boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 12, color: '#f5a623', fontWeight: 600 }}>
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
        }}
      >
        {step.description}
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onNext}
          style={{
            background: '#f5a623',
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
  const [phase, setPhase] = useState('confirm');
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  // Merge global + page-specific steps, filtering to only those
  // whose target element actually exists on the current page.
  const steps = useMemo(() => {
    if (!active) return [];
    const page = pageSteps[pathname] || [];
    const all = [...globalSteps, ...page];
    if (typeof document === 'undefined') return all;
    return all.filter((s) => document.querySelector(s.target));
  }, [pathname, active, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when tour is re-opened
  useEffect(() => {
    if (active) {
      setPhase('confirm');
      setCurrentStep(0);
      setTargetRect(null);
    }
  }, [active]);

  const measureTarget = useCallback(() => {
    if (!steps[currentStep]) return;
    const el = document.querySelector(steps[currentStep].target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [currentStep, steps]);

  useEffect(() => {
    if (phase !== 'touring') return;
    measureTarget();
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [phase, measureTarget]);

  const handleConfirm = () => {
    setPhase('touring');
    setCurrentStep(0);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onClose();
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

  return createPortal(
    <>
      {phase === 'confirm' && (
        <ConfirmDialog onConfirm={handleConfirm} onCancel={handleClose} />
      )}

      {phase === 'touring' && (
        <>
          <div
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, zIndex: 9997 }}
          />
          <Spotlight rect={targetRect} />
          {steps[currentStep] && (
            <StepTooltip
              step={steps[currentStep]}
              stepIndex={currentStep}
              totalSteps={steps.length}
              targetRect={targetRect}
              onNext={handleNext}
              onClose={handleClose}
            />
          )}
        </>
      )}
    </>,
    document.body,
  );
}
