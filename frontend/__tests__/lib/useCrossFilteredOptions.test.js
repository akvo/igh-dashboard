// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCrossFilteredOptions } from '../../src/lib/useCrossFilteredOptions';

// =========================================================
// Shared fixtures
// =========================================================
//
// Three GHAs / four primaries / a handful of secondaries. The
// `disease_filter` field is what production now ships; legacy
// `disease_group_name` is no longer consulted but is retained on
// fixtures because some other callers still read it.

const healthAreas = [
  { originalName: 'HIV', name: 'HIV/AIDS' },
  { originalName: 'Malaria', name: 'Malaria' },
  { originalName: 'TB', name: 'TB' },
];

// Hierarchy rows -- the same shape `getDiseaseHierarchy()` returns.
// `secondary_disease === primary_disease` is the self-row that
// represents a childless primary (the sidebar's "leaf with no `+`"
// rule).
const diseaseHierarchy = [
  { primary_disease: 'HIV',         secondary_disease: 'HIV',           global_health_area: 'HIV' },
  { primary_disease: 'Malaria',     secondary_disease: 'P. falciparum', global_health_area: 'Malaria' },
  { primary_disease: 'Malaria',     secondary_disease: 'P. vivax',      global_health_area: 'Malaria' },
  { primary_disease: 'Tuberculosis', secondary_disease: 'Tuberculosis', global_health_area: 'TB' },
];

// pipelineFilterPairs rows: the new schema carries both
// disease_filter and secondary_disease_name. NULL secondary on the
// HIV pair represents the "no sub-disease" case.
const pairs = [
  { product_name: 'Drug A', product_key: 1, disease_filter: 'HIV',          secondary_disease_name: null,             phase_name: 'Phase II' },
  { product_name: 'Drug B', product_key: 2, disease_filter: 'Malaria',      secondary_disease_name: 'P. falciparum',  phase_name: 'Phase I'  },
  { product_name: 'Drug C', product_key: 3, disease_filter: 'Tuberculosis', secondary_disease_name: null,             phase_name: 'Phase III'},
  { product_name: 'Vector control', product_key: 4, disease_filter: 'Malaria', secondary_disease_name: 'P. falciparum', phase_name: 'Phase I' },
  { product_name: 'Vector control', product_key: 5, disease_filter: 'Malaria', secondary_disease_name: 'P. vivax',      phase_name: 'Phase I' },
];

const allProductOptions = ['Drug A', 'Drug B', 'Drug C', 'Vector control'];
const allPhaseOptions = [
  { value: 'Phase I',   label: 'Phase I' },
  { value: 'Phase II',  label: 'Phase II' },
  { value: 'Phase III', label: 'Phase III' },
];

const noLoading = { healthAreas: false, diseases: false, products: false, pairs: false };

function makeSetters() {
  return {
    setHealthArea: vi.fn(),
    setPrimary: vi.fn(),
    setSecondary: vi.fn(),
    setProduct: vi.fn(),
    setRdPhase: vi.fn(),
  };
}

function render(overrides = {}) {
  const setters = overrides.setters ?? makeSetters();
  const result = renderHook(() =>
    useCrossFilteredOptions({
      data: {
        healthAreas,
        diseaseHierarchy,
        pairs,
        allProductOptions,
        allPhaseOptions,
      },
      selections: {
        healthArea: [],
        primary: [],
        secondary: [],
        product: [],
        rdPhase: [],
        ...overrides.selections,
      },
      setters,
      loading: { ...noLoading, ...(overrides.loading ?? {}) },
      mode: overrides.mode ?? 'by-name',
    }),
  );
  return { ...result, setters };
}

// =========================================================
// Baseline
// =========================================================

describe('useCrossFilteredOptions — baseline (no selections)', () => {
  it('returns the full hierarchy when nothing is selected', () => {
    const { result } = render();
    expect(result.current.narrowedHierarchy).toEqual(diseaseHierarchy);
  });

  it('returns all GHA options', () => {
    const { result } = render();
    expect(result.current.healthAreaOptions.map((o) => o.value)).toEqual(
      ['HIV', 'Malaria', 'TB'],
    );
  });

  it('returns all product options', () => {
    const { result } = render();
    expect(result.current.productOptions).toEqual(allProductOptions);
  });

  it('returns all phase options', () => {
    const { result } = render();
    expect(result.current.rdPhaseOptions.map((o) => o.value)).toEqual(
      ['Phase I', 'Phase II', 'Phase III'],
    );
  });
});

// =========================================================
// GHA narrows the rest
// =========================================================

describe('useCrossFilteredOptions — GHA narrowing', () => {
  it('narrows the hierarchy to the selected GHA', () => {
    const { result } = render({ selections: { healthArea: ['Malaria'] } });
    const primaries = new Set(
      result.current.narrowedHierarchy.map((r) => r.primary_disease),
    );
    expect(primaries).toEqual(new Set(['Malaria']));
  });

  it('narrows products to those reachable from the selected GHA', () => {
    const { result } = render({ selections: { healthArea: ['HIV'] } });
    expect(result.current.productOptions).toEqual(['Drug A']);
  });
});

// =========================================================
// Primary disease narrows the rest
// =========================================================

describe('useCrossFilteredOptions — primary narrowing', () => {
  it('narrows GHA to the GHAs reachable from the selected primary', () => {
    const { result } = render({ selections: { primary: ['HIV'] } });
    expect(result.current.healthAreaOptions.map((o) => o.value)).toEqual(['HIV']);
  });

  it('narrows products by the selected primary alone (includes both children + NULL-secondary)', () => {
    // Primary alone selected. NULL-secondary candidates of that
    // primary are INCLUDED -- documented baseline behavior.
    const { result } = render({ selections: { primary: ['Malaria'] } });
    expect(result.current.productOptions).toEqual(
      expect.arrayContaining(['Drug B', 'Vector control']),
    );
    expect(result.current.productOptions).not.toContain('Drug A');
    expect(result.current.productOptions).not.toContain('Drug C');
  });
});

// =========================================================
// Secondary disease narrows further
// =========================================================

describe('useCrossFilteredOptions — secondary narrowing', () => {
  it('narrows products to only pairs whose secondary is in the selected list', () => {
    // Selecting Malaria + only P. vivax should narrow to the
    // single pair that carries that combination.
    const { result } = render({
      selections: { primary: ['Malaria'], secondary: ['P. vivax'] },
    });
    expect(result.current.productOptions).toEqual(['Vector control']);
  });

  it('cross-primary secondary alone still narrows', () => {
    // A secondary value with no primary selected matches across
    // primaries (here only Malaria has children, so this is the
    // same as Malaria alone, but the narrowing path is different).
    const { result } = render({ selections: { secondary: ['P. falciparum'] } });
    expect(result.current.productOptions).toEqual(
      expect.arrayContaining(['Drug B', 'Vector control']),
    );
    expect(result.current.productOptions).not.toContain('Drug C');
  });
});

// =========================================================
// Product narrows back to the disease tree
// =========================================================

describe('useCrossFilteredOptions — product narrows hierarchy', () => {
  it('narrowedHierarchy excludes primaries with no surviving children under the product filter', () => {
    const { result } = render({ selections: { product: ['Drug A'] } });
    const primaries = new Set(
      result.current.narrowedHierarchy.map((r) => r.primary_disease),
    );
    expect(primaries).toEqual(new Set(['HIV']));
  });

  it('narrowedHierarchy keeps only the surviving secondaries within a primary', () => {
    // Vector control + product_key=4 narrows to P. falciparum only,
    // even though both Malaria sub-diseases share the product NAME.
    // (The hook matches by product_name in 'by-name' mode, so all
    // three Vector control rows count -- both children survive.)
    const { result } = render({ selections: { product: ['Vector control'] } });
    const malariaRows = result.current.narrowedHierarchy.filter(
      (r) => r.primary_disease === 'Malaria',
    );
    expect(malariaRows.map((r) => r.secondary_disease).sort()).toEqual([
      'P. falciparum',
      'P. vivax',
    ]);
  });
});

// =========================================================
// Phase narrows everything
// =========================================================

describe('useCrossFilteredOptions — phase narrows', () => {
  it('narrowedHierarchy excludes primaries unreachable through the phase', () => {
    const { result } = render({ selections: { rdPhase: ['Phase I'] } });
    const primaries = new Set(
      result.current.narrowedHierarchy.map((r) => r.primary_disease),
    );
    // Only Malaria has Phase I in the fixture pairs.
    expect(primaries).toEqual(new Set(['Malaria']));
  });

  it('narrows products by phase', () => {
    const { result } = render({ selections: { rdPhase: ['Phase II'] } });
    expect(result.current.productOptions).toEqual(['Drug A']);
  });
});

// =========================================================
// Pruning effects
// =========================================================

describe('useCrossFilteredOptions — pruning', () => {
  it('prunes a stale primary when GHA selection rules it out', () => {
    const setters = makeSetters();
    render({
      selections: { healthArea: ['HIV'], primary: ['HIV', 'Malaria'] },
      setters,
    });
    // After the effect runs, only HIV is still valid.
    expect(setters.setPrimary).toHaveBeenCalledWith(['HIV']);
  });

  it('prunes a stale secondary when product narrowing eliminates its primary', () => {
    const setters = makeSetters();
    render({
      selections: {
        product: ['Drug A'], // HIV-only
        primary: ['HIV'],
        secondary: ['P. vivax'],
      },
      setters,
    });
    // P. vivax belongs to Malaria, which the product narrowing
    // eliminated. The pruning effect drops it.
    expect(setters.setSecondary).toHaveBeenCalledWith([]);
  });

  it('prunes a stale product when GHA narrowing eliminates it', () => {
    const setters = makeSetters();
    render({
      selections: { healthArea: ['HIV'], product: ['Drug B'] },
      setters,
    });
    expect(setters.setProduct).toHaveBeenCalledWith([]);
  });
});

// =========================================================
// by-key mode (product matching by product_key)
// =========================================================

describe('useCrossFilteredOptions — by-key mode', () => {
  const allProductByKey = [
    { value: '1',   label: 'Drug A' },
    { value: '2',   label: 'Drug B' },
    { value: '3',   label: 'Drug C' },
    { value: '4|5', label: 'Vector control' },
  ];

  it('matches a multi-key option (e.g. consolidated product) when any key is in the valid set', () => {
    const setters = makeSetters();
    const { result } = renderHook(() =>
      useCrossFilteredOptions({
        data: {
          healthAreas,
          diseaseHierarchy,
          pairs,
          allProductOptions: allProductByKey,
        },
        selections: {
          healthArea: [],
          primary: ['Malaria'],
          secondary: [],
          product: [],
          rdPhase: [],
        },
        setters,
        loading: noLoading,
        mode: 'by-key',
      }),
    );

    // 4|5 is the consolidated Vector control option, both keys
    // belong to Malaria pairs; the option survives.
    const optionValues = result.current.productOptions.map((o) => o.value);
    expect(optionValues).toContain('4|5');
    expect(optionValues).toContain('2');
    expect(optionValues).not.toContain('1');
  });
});
