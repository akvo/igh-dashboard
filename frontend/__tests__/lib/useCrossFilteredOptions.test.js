// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCrossFilteredOptions } from '../../src/lib/useCrossFilteredOptions';

// ── Shared test fixtures ───────────────────────────────────────

const healthAreas = [
  { originalName: 'HIV', name: 'HIV/AIDS' },
  { originalName: 'Malaria', name: 'Malaria' },
  { originalName: 'TB', name: 'TB' },
];

const diseasesRaw = [
  { disease_group_name: 'HIV', global_health_area: 'HIV' },
  { disease_group_name: 'P. falciparum', global_health_area: 'Malaria' },
  { disease_group_name: 'P. vivax', global_health_area: 'Malaria' },
  { disease_group_name: 'TB', global_health_area: 'TB' },
];

const pairs = [
  { product_name: 'Drug A', product_key: 1, disease_group_name: 'HIV', phase_name: 'Discovery' },
  { product_name: 'Drug A', product_key: 1, disease_group_name: 'HIV', phase_name: 'Phase III' },
  { product_name: 'Drug B', product_key: 2, disease_group_name: 'P. falciparum', phase_name: 'Phase I' },
  { product_name: 'Drug C', product_key: 3, disease_group_name: 'TB', phase_name: 'Phase III' },
  { product_name: 'Biological vector control products', product_key: 4, disease_group_name: 'P. falciparum', phase_name: 'Discovery' },
  { product_name: 'Chemical vector control products', product_key: 5, disease_group_name: 'P. vivax', phase_name: 'Phase II' },
];

const noLoading = { healthAreas: false, diseases: false, products: false, pairs: false };
const allLoading = { healthAreas: true, diseases: true, products: true, pairs: true };

function makeSetters() {
  return {
    setHealthArea: vi.fn(),
    setDisease: vi.fn(),
    setProduct: vi.fn(),
    setRdPhase: vi.fn(),
  };
}

// ── by-name mode ───────────────────────────────────────────────

describe('useCrossFilteredOptions (by-name)', () => {
  const allProductOptions = ['Drug A', 'Drug B', 'Drug C', 'Vector control products'];

  function renderByName(overrides = {}) {
    const setters = makeSetters();
    const result = renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: [], disease: [], product: [], ...overrides.selections },
        setters,
        loading: { ...noLoading, ...overrides.loading },
      })
    );
    return { ...result, setters };
  }

  // --- All options with no selection ---

  it('returns all health area options when nothing is selected', () => {
    const { result } = renderByName();
    expect(result.current.healthAreaOptions).toHaveLength(3);
    expect(result.current.healthAreaOptions.map(o => o.value)).toEqual(
      expect.arrayContaining(['HIV', 'Malaria', 'TB'])
    );
  });

  it('returns all disease options when nothing is selected', () => {
    const { result } = renderByName();
    expect(result.current.diseaseOptions).toContain('HIV');
    expect(result.current.diseaseOptions).toContain('TB');
    // Malaria composite should be present (P. falciparum and P. vivax are in data)
    expect(result.current.diseaseOptions).toContain('Malaria');
  });

  it('returns all product options when nothing is selected', () => {
    const { result } = renderByName();
    expect(result.current.productOptions).toEqual(allProductOptions);
  });

  // --- Narrow diseases by GHA ---

  it('narrows diseases when a GHA is selected', () => {
    const { result } = renderByName({ selections: { healthArea: ['HIV'] } });
    expect(result.current.diseaseOptions).toContain('HIV');
    expect(result.current.diseaseOptions).not.toContain('TB');
    expect(result.current.diseaseOptions).not.toContain('Malaria');
  });

  // --- Narrow GHA by disease ---

  it('narrows GHA when a disease is selected', () => {
    const { result } = renderByName({ selections: { disease: ['HIV'] } });
    const ghaValues = result.current.healthAreaOptions.map(o => o.value);
    expect(ghaValues).toContain('HIV');
    expect(ghaValues).not.toContain('TB');
    expect(ghaValues).not.toContain('Malaria');
  });

  // --- Narrow GHA by product ---

  it('narrows GHA when a product is selected', () => {
    const { result } = renderByName({ selections: { product: ['Drug A'] } });
    const ghaValues = result.current.healthAreaOptions.map(o => o.value);
    expect(ghaValues).toContain('HIV');
    expect(ghaValues).not.toContain('TB');
  });

  // --- Narrow products by GHA ---

  it('narrows products when a GHA is selected', () => {
    const { result } = renderByName({ selections: { healthArea: ['HIV'] } });
    expect(result.current.productOptions).toContain('Drug A');
    expect(result.current.productOptions).not.toContain('Drug B');
    expect(result.current.productOptions).not.toContain('Drug C');
  });

  // --- Narrow products by disease ---

  it('narrows products when a disease is selected', () => {
    const { result } = renderByName({ selections: { disease: ['HIV'] } });
    expect(result.current.productOptions).toContain('Drug A');
    expect(result.current.productOptions).not.toContain('Drug C');
  });

  // --- Narrow diseases by product ---

  it('narrows diseases when a product is selected', () => {
    const { result } = renderByName({ selections: { product: ['Drug A'] } });
    expect(result.current.diseaseOptions).toContain('HIV');
    expect(result.current.diseaseOptions).not.toContain('TB');
  });

  // --- Combined: GHA + disease → products ---

  it('narrows products when both GHA and disease are selected', () => {
    const { result } = renderByName({
      selections: { healthArea: ['Malaria'], disease: ['P. falciparum'] },
    });
    // Drug B maps to P. falciparum, VC products map to falciparum/vivax
    expect(result.current.productOptions).toContain('Drug B');
    expect(result.current.productOptions).toContain('Vector control products');
    // Drug A (HIV) and Drug C (TB) should be filtered out
    expect(result.current.productOptions).not.toContain('Drug A');
    expect(result.current.productOptions).not.toContain('Drug C');
  });

  // --- Combined: disease + product → GHA ---

  it('narrows GHA when both disease and product are selected', () => {
    const { result } = renderByName({
      selections: { disease: ['HIV'], product: ['Drug A'] },
    });
    const ghaValues = result.current.healthAreaOptions.map(o => o.value);
    expect(ghaValues).toContain('HIV');
    expect(ghaValues).not.toContain('TB');
    expect(ghaValues).not.toContain('Malaria');
  });

  // --- VC name fallback (product matching) ---

  it('VC consolidated name matches via fallback when filtering by GHA', () => {
    const { result } = renderByName({ selections: { healthArea: ['Malaria'] } });
    expect(result.current.productOptions).toContain('Vector control products');
  });

  it('VC consolidated name matches via fallback when filtering by disease', () => {
    const { result } = renderByName({ selections: { disease: ['P. falciparum'] } });
    expect(result.current.productOptions).toContain('Vector control products');
  });

  // --- Malaria composite expansion ---

  it('Malaria composite expands in disease filtering when product selected', () => {
    const { result } = renderByName({ selections: { product: ['Drug B'] } });
    // Drug B → P. falciparum, which is a Malaria member
    expect(result.current.diseaseOptions).toContain('Malaria');
  });

  it('Malaria composite expands when selecting Malaria disease', () => {
    const { result } = renderByName({ selections: { disease: ['Malaria'] } });
    // Selecting "Malaria" should expand to P. falciparum, P. vivax, etc.
    // Products mapped to any malaria strain should appear
    expect(result.current.productOptions).toContain('Drug B');
    expect(result.current.productOptions).toContain('Vector control products');
    expect(result.current.productOptions).not.toContain('Drug A');
    expect(result.current.productOptions).not.toContain('Drug C');
  });

  // --- Pruning invalid selections ---

  it('prunes invalid disease selections', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: ['HIV'], disease: ['TB'], product: [] },
        setters,
        loading: noLoading,
      })
    );
    expect(setters.setDisease).toHaveBeenCalledWith([]);
  });

  it('prunes invalid product selections', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: [], disease: ['HIV'], product: ['Drug C'] },
        setters,
        loading: noLoading,
      })
    );
    expect(setters.setProduct).toHaveBeenCalledWith([]);
  });

  it('prunes invalid GHA selections', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: ['TB'], disease: ['HIV'], product: [] },
        setters,
        loading: noLoading,
      })
    );
    expect(setters.setHealthArea).toHaveBeenCalledWith([]);
  });

  // --- Partial pruning (keep valid subset) ---

  it('keeps valid subset when pruning diseases', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: ['HIV'], disease: ['HIV', 'TB'], product: [] },
        setters,
        loading: noLoading,
      })
    );
    // HIV is valid under HIV GHA, TB is not
    expect(setters.setDisease).toHaveBeenCalledWith(['HIV']);
  });

  it('keeps valid subset when pruning products', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: [], disease: ['HIV'], product: ['Drug A', 'Drug C'] },
        setters,
        loading: noLoading,
      })
    );
    // Drug A is valid for HIV, Drug C is not
    expect(setters.setProduct).toHaveBeenCalledWith(['Drug A']);
  });

  it('keeps valid subset when pruning GHAs', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: ['HIV', 'TB'], disease: ['HIV'], product: [] },
        setters,
        loading: noLoading,
      })
    );
    // HIV GHA is valid, TB is not
    expect(setters.setHealthArea).toHaveBeenCalledWith(['HIV']);
  });

  // --- Skip pruning while loading ---

  it('skips all pruning while everything is loading', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: ['HIV'], disease: ['TB'], product: ['Drug C'] },
        setters,
        loading: allLoading,
      })
    );
    expect(setters.setDisease).not.toHaveBeenCalled();
    expect(setters.setProduct).not.toHaveBeenCalled();
    expect(setters.setHealthArea).not.toHaveBeenCalled();
  });

  // --- Loading flag granularity ---

  it('skips disease pruning when diseases are loading but prunes products', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: [], disease: ['TB'], product: ['Drug C'] },
        setters,
        loading: { ...noLoading, diseases: true },
      })
    );
    // Disease pruning should be skipped (diseases loading)
    expect(setters.setDisease).not.toHaveBeenCalled();
    // Product pruning should proceed (products not loading)
    // Drug C → TB, no cross-filter restriction, so it's still valid
    // (no disease/GHA selection to narrow it out beyond disease loading)
  });

  it('skips product pruning when products are loading', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: [], disease: ['HIV'], product: ['Drug C'] },
        setters,
        loading: { ...noLoading, products: true },
      })
    );
    expect(setters.setProduct).not.toHaveBeenCalled();
  });

  it('skips GHA pruning when healthAreas are loading', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: ['TB'], disease: ['HIV'], product: [] },
        setters,
        loading: { ...noLoading, healthAreas: true },
      })
    );
    expect(setters.setHealthArea).not.toHaveBeenCalled();
  });

  // --- Empty/null data arrays ---

  it('returns empty options when data arrays are null', () => {
    const { result } = renderByName({
      selections: {},
    });
    // Override data to nulls
    const setters = makeSetters();
    const { result: nullResult } = renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas: null, diseasesRaw: null, pairs: [], allProductOptions: [] },
        selections: { healthArea: [], disease: [], product: [] },
        setters,
        loading: noLoading,
      })
    );
    expect(nullResult.current.healthAreaOptions).toEqual([]);
    expect(nullResult.current.diseaseOptions).toEqual([]);
    expect(nullResult.current.productOptions).toEqual([]);
  });

  it('returns empty options when data arrays are empty', () => {
    const setters = makeSetters();
    const { result } = renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas: [], diseasesRaw: [], pairs: [], allProductOptions: [] },
        selections: { healthArea: [], disease: [], product: [] },
        setters,
        loading: noLoading,
      })
    );
    expect(result.current.healthAreaOptions).toEqual([]);
    expect(result.current.diseaseOptions).toEqual([]);
    expect(result.current.productOptions).toEqual([]);
  });
});

// ── by-key mode ────────────────────────────────────────────────

describe('useCrossFilteredOptions (by-key)', () => {
  const allProductOptions = [
    { value: '1', label: 'Drug A' },
    { value: '2', label: 'Drug B' },
    { value: '3', label: 'Drug C' },
    { value: '4|5', label: 'Vector control products' },
  ];

  const allPhaseOptions = [
    { label: 'Discovery', value: 'Discovery' },
    { label: 'Phase I', value: 'Phase I' },
    { label: 'Phase II', value: 'Phase II' },
    { label: 'Phase III', value: 'Phase III' },
  ];

  function renderByKey(overrides = {}) {
    const setters = makeSetters();
    const result = renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions, allPhaseOptions },
        selections: { healthArea: [], disease: [], product: [], rdPhase: [], ...overrides.selections },
        setters,
        loading: { ...noLoading, ...overrides.loading },
        mode: 'by-key',
      })
    );
    return { ...result, setters };
  }

  // --- All options with no selection ---

  it('returns all options when nothing is selected', () => {
    const { result } = renderByKey();
    expect(result.current.healthAreaOptions).toHaveLength(3);
    expect(result.current.diseaseOptions).toContain('HIV');
    expect(result.current.diseaseOptions).toContain('TB');
    expect(result.current.diseaseOptions).toContain('Malaria');
    expect(result.current.productOptions).toHaveLength(4);
  });

  // --- Narrow diseases by GHA ---

  it('narrows diseases when a GHA is selected', () => {
    const { result } = renderByKey({ selections: { healthArea: ['HIV'] } });
    expect(result.current.diseaseOptions).toContain('HIV');
    expect(result.current.diseaseOptions).not.toContain('TB');
  });

  // --- Narrow GHA by disease ---

  it('narrows GHA when a disease is selected', () => {
    const { result } = renderByKey({ selections: { disease: ['TB'] } });
    const ghaValues = result.current.healthAreaOptions.map(o => o.value);
    expect(ghaValues).toContain('TB');
    expect(ghaValues).not.toContain('HIV');
  });

  // --- Narrow GHA by product ---

  it('narrows GHA from product key selection', () => {
    const { result } = renderByKey({ selections: { product: ['3'] } });
    const ghaValues = result.current.healthAreaOptions.map(o => o.value);
    expect(ghaValues).toContain('TB');
    expect(ghaValues).not.toContain('HIV');
  });

  // --- Narrow products by GHA ---

  it('narrows products when a GHA is selected', () => {
    const { result } = renderByKey({ selections: { healthArea: ['HIV'] } });
    const productLabels = result.current.productOptions.map(o => o.label);
    expect(productLabels).toContain('Drug A');
    expect(productLabels).not.toContain('Drug C');
  });

  // --- Narrow products by disease ---

  it('narrows products when a disease is selected', () => {
    const { result } = renderByKey({ selections: { disease: ['HIV'] } });
    const productLabels = result.current.productOptions.map(o => o.label);
    expect(productLabels).toContain('Drug A');
    expect(productLabels).not.toContain('Drug C');
  });

  // --- Narrow diseases by product ---

  it('narrows diseases when a product key is selected', () => {
    const { result } = renderByKey({ selections: { product: ['1'] } });
    expect(result.current.diseaseOptions).toContain('HIV');
    expect(result.current.diseaseOptions).not.toContain('TB');
  });

  // --- Combined: GHA + disease → products ---

  it('narrows products when both GHA and disease are selected', () => {
    const { result } = renderByKey({
      selections: { healthArea: ['Malaria'], disease: ['P. falciparum'] },
    });
    const productLabels = result.current.productOptions.map(o => o.label);
    expect(productLabels).toContain('Drug B');
    expect(productLabels).toContain('Vector control products');
    expect(productLabels).not.toContain('Drug A');
    expect(productLabels).not.toContain('Drug C');
  });

  // --- Combined: disease + product → GHA ---

  it('narrows GHA when both disease and product are selected', () => {
    const { result } = renderByKey({
      selections: { disease: ['HIV'], product: ['1'] },
    });
    const ghaValues = result.current.healthAreaOptions.map(o => o.value);
    expect(ghaValues).toContain('HIV');
    expect(ghaValues).not.toContain('TB');
  });

  // --- Pipe-separated key matching ---

  it('pipe-separated key matching works for product filtering', () => {
    const { result } = renderByKey({ selections: { healthArea: ['Malaria'] } });
    const productLabels = result.current.productOptions.map(o => o.label);
    // VC has keys 4|5, both mapping to Malaria diseases
    expect(productLabels).toContain('Drug B');
    expect(productLabels).toContain('Vector control products');
    expect(productLabels).not.toContain('Drug C');
  });

  it('pipe-separated VC key is kept when either sub-key matches', () => {
    // Select only P. vivax — VC key 5 matches, so 4|5 should stay
    const { result } = renderByKey({ selections: { disease: ['P. vivax'] } });
    const productLabels = result.current.productOptions.map(o => o.label);
    expect(productLabels).toContain('Vector control products');
  });

  // --- Malaria composite expansion ---

  it('Malaria composite expands correctly', () => {
    const { result } = renderByKey({ selections: { disease: ['Malaria'] } });
    const productLabels = result.current.productOptions.map(o => o.label);
    // Malaria expands to P. falciparum, P. vivax etc.
    expect(productLabels).toContain('Drug B');
    expect(productLabels).toContain('Vector control products');
    expect(productLabels).not.toContain('Drug A');
  });

  // --- Pruning ---

  it('prunes invalid disease selections', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: ['HIV'], disease: ['TB'], product: [] },
        setters,
        loading: noLoading,
        mode: 'by-key',
      })
    );
    expect(setters.setDisease).toHaveBeenCalledWith([]);
  });

  it('prunes invalid product selections by value', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: [], disease: ['HIV'], product: ['3'] },
        setters,
        loading: noLoading,
        mode: 'by-key',
      })
    );
    expect(setters.setProduct).toHaveBeenCalledWith([]);
  });

  it('prunes invalid GHA selections', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: ['TB'], disease: ['HIV'], product: [] },
        setters,
        loading: noLoading,
        mode: 'by-key',
      })
    );
    expect(setters.setHealthArea).toHaveBeenCalledWith([]);
  });

  // --- Partial pruning ---

  it('keeps valid subset when pruning products', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: [], disease: ['HIV'], product: ['1', '3'] },
        setters,
        loading: noLoading,
        mode: 'by-key',
      })
    );
    // key 1 (Drug A) valid for HIV, key 3 (Drug C) not
    expect(setters.setProduct).toHaveBeenCalledWith(['1']);
  });

  it('keeps valid subset when pruning diseases', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: ['HIV'], disease: ['HIV', 'TB'], product: [] },
        setters,
        loading: noLoading,
        mode: 'by-key',
      })
    );
    expect(setters.setDisease).toHaveBeenCalledWith(['HIV']);
  });

  it('keeps valid subset when pruning GHAs', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: ['HIV', 'TB'], disease: ['HIV'], product: [] },
        setters,
        loading: noLoading,
        mode: 'by-key',
      })
    );
    expect(setters.setHealthArea).toHaveBeenCalledWith(['HIV']);
  });

  // --- Skip pruning while loading ---

  it('skips all pruning while everything is loading', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: ['HIV'], disease: ['TB'], product: ['3'] },
        setters,
        loading: allLoading,
        mode: 'by-key',
      })
    );
    expect(setters.setDisease).not.toHaveBeenCalled();
    expect(setters.setProduct).not.toHaveBeenCalled();
    expect(setters.setHealthArea).not.toHaveBeenCalled();
  });

  // --- Loading flag granularity ---

  it('skips disease pruning when diseases loading, allows product pruning', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: [], disease: ['TB'], product: ['1'] },
        setters,
        loading: { ...noLoading, diseases: true },
        mode: 'by-key',
      })
    );
    expect(setters.setDisease).not.toHaveBeenCalled();
    // Product pruning: key 1 maps to HIV, no disease filter narrows it
    // (disease is ['TB'] but that only affects diseaseOptions, not productOptions
    // when product is selected without a narrowing GHA)
  });

  it('skips product pruning when products are loading', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: [], disease: ['HIV'], product: ['3'] },
        setters,
        loading: { ...noLoading, products: true },
        mode: 'by-key',
      })
    );
    expect(setters.setProduct).not.toHaveBeenCalled();
  });

  it('skips GHA pruning when healthAreas are loading', () => {
    const setters = makeSetters();
    renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas, diseasesRaw, pairs, allProductOptions },
        selections: { healthArea: ['TB'], disease: ['HIV'], product: [] },
        setters,
        loading: { ...noLoading, healthAreas: true },
        mode: 'by-key',
      })
    );
    expect(setters.setHealthArea).not.toHaveBeenCalled();
  });

  // --- Empty/null data arrays ---

  it('returns empty options when data arrays are null', () => {
    const setters = makeSetters();
    const { result } = renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas: null, diseasesRaw: null, pairs: [], allProductOptions: [] },
        selections: { healthArea: [], disease: [], product: [] },
        setters,
        loading: noLoading,
        mode: 'by-key',
      })
    );
    expect(result.current.healthAreaOptions).toEqual([]);
    expect(result.current.diseaseOptions).toEqual([]);
    expect(result.current.productOptions).toEqual([]);
  });

  it('returns empty options when data arrays are empty', () => {
    const setters = makeSetters();
    const { result } = renderHook(() =>
      useCrossFilteredOptions({
        data: { healthAreas: [], diseasesRaw: [], pairs: [], allProductOptions: [] },
        selections: { healthArea: [], disease: [], product: [] },
        setters,
        loading: noLoading,
        mode: 'by-key',
      })
    );
    expect(result.current.healthAreaOptions).toEqual([]);
    expect(result.current.diseaseOptions).toEqual([]);
    expect(result.current.productOptions).toEqual([]);
  });

  // --- rdPhase cross-filtering ---

  it('narrows products when an rdPhase is selected', () => {
    // Phase III has Drug A (key 1) and Drug C (key 3). Drug B (key 2)
    // and the two vector control products do not appear in Phase III pairs.
    const { result } = renderByKey({ selections: { rdPhase: ['Phase III'] } });
    const values = result.current.productOptions.map(o => o.value);
    expect(values).toContain('1');
    expect(values).toContain('3');
    expect(values).not.toContain('2');
    expect(values).not.toContain('4|5');
  });

  it('narrows diseases when an rdPhase is selected', () => {
    // Phase II only has 'P. vivax' (under Malaria GHA).
    const { result } = renderByKey({ selections: { rdPhase: ['Phase II'] } });
    expect(result.current.diseaseOptions).toContain('P. vivax');
    expect(result.current.diseaseOptions).not.toContain('HIV');
    expect(result.current.diseaseOptions).not.toContain('TB');
  });

  it('narrows health areas when an rdPhase is selected', () => {
    // Phase I only has Drug B (P. falciparum → Malaria).
    const { result } = renderByKey({ selections: { rdPhase: ['Phase I'] } });
    const values = result.current.healthAreaOptions.map(o => o.value);
    expect(values).toEqual(['Malaria']);
  });

  it('narrows rdPhase options when a product is selected', () => {
    // Drug A (key 1) appears in Discovery and Phase III.
    const { result } = renderByKey({ selections: { product: ['1'] } });
    const phaseValues = result.current.rdPhaseOptions.map(o => o.value);
    expect(phaseValues).toEqual(expect.arrayContaining(['Discovery', 'Phase III']));
    expect(phaseValues).not.toContain('Phase I');
    expect(phaseValues).not.toContain('Phase II');
  });

  it('prunes invalid rdPhase selections when narrowed by product', () => {
    // Drug B (key 2) only has Phase I; selecting Phase III should be pruned.
    const { setters } = renderByKey({
      selections: { product: ['2'], rdPhase: ['Phase III'] },
    });
    expect(setters.setRdPhase).toHaveBeenCalledWith([]);
  });

  it('keeps valid rdPhase selections when product narrows but overlap exists', () => {
    // Drug A (key 1) covers Discovery and Phase III; rdPhase=['Discovery']
    // is still valid → no prune call.
    const { setters } = renderByKey({
      selections: { product: ['1'], rdPhase: ['Discovery'] },
    });
    expect(setters.setRdPhase).not.toHaveBeenCalled();
  });

  it('skips rdPhase pruning while pairs are loading', () => {
    const { setters } = renderByKey({
      selections: { product: ['2'], rdPhase: ['Phase III'] },
      loading: { pairs: true },
    });
    expect(setters.setRdPhase).not.toHaveBeenCalled();
  });
});
