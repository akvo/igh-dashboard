'use client';

// =========================================================
// useGlobalFilters — the four "page-group" filter selections
// =========================================================
//
// Encapsulates URL-backed state for Global health area, Disease
// (hierarchical primary + secondary), Product type, and R&D phase,
// plus the cross-filtered option lists and narrowed disease
// hierarchy that drive the filter dropdowns.
//
// A single instance is shared via <GlobalFiltersProvider> in the
// app layout — every call to useGlobalFilters() returns the same
// context object, avoiding duplicate GraphQL queries and racing
// pruning effects.

import { createContext, useContext, useMemo } from 'react';
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer } from '@/lib/url-serializers';
import { useCrossFilteredOptions } from '@/lib/useCrossFilteredOptions';
import { SIMPLIFIED_PHASE_NAMES } from '@/lib/transformations/constants';
import {
  useGlobalHealthAreaSummaries,
  useDiseases,
  useDiseaseHierarchy,
  useProducts,
  usePhases,
  useActivePipelineFilterPairs,
} from '@/graphql/hooks';

// ---- Context ----

const GlobalFiltersContext = createContext(null);

export function GlobalFiltersProvider({ children }) {
  const filters = useGlobalFiltersCore();
  return (
    <GlobalFiltersContext.Provider value={filters}>
      {children}
    </GlobalFiltersContext.Provider>
  );
}

/**
 * Public hook — returns the shared context value from the
 * <GlobalFiltersProvider> in the app layout.
 */
export function useGlobalFilters() {
  const ctx = useContext(GlobalFiltersContext);
  if (!ctx) {
    throw new Error(
      'useGlobalFilters() requires a <GlobalFiltersProvider> ancestor.',
    );
  }
  return ctx;
}

// ---- Core implementation ----

function useGlobalFiltersCore() {
  const [healthArea, setHealthArea] = useUrlState('gha', [], arraySerializer);
  const [primary, setPrimary] = useUrlState('primary', [], arraySerializer);
  const [secondary, setSecondary] = useUrlState('secondary', [], arraySerializer);
  const [product, setProduct] = useUrlState('product', [], arraySerializer);
  const [rdPhase, setRdPhase] = useUrlState('rdPhase', [], arraySerializer);

  // Selections are concrete product names; no expansion needed.
  const expandedProduct = product;

  const { bubbleData: healthAreas, loading: healthAreasLoading } =
    useGlobalHealthAreaSummaries();
  const { products: productsList, loading: productsLoading } = useProducts();
  const { diseases: diseasesList, loading: diseasesLoading } = useDiseases();
  const { hierarchy: diseaseHierarchy, loading: hierarchyLoading } =
    useDiseaseHierarchy();
  const { phases, loading: phasesLoading } = usePhases();
  const { pairs, loading: pairsLoading } = useActivePipelineFilterPairs();

  const allProductOptions = useMemo(
    () => (productsList || []).map((p) => p.product_name),
    [productsList],
  );

  const allPhaseOptions = useMemo(
    () =>
      phases.map((p) => ({
        label: SIMPLIFIED_PHASE_NAMES[p.name] || p.name,
        value: p.name,
      })),
    [phases],
  );

  const { healthAreaOptions, narrowedHierarchy, productOptions, rdPhaseOptions } =
    useCrossFilteredOptions({
      data: {
        healthAreas,
        diseaseHierarchy,
        pairs,
        allProductOptions,
        allPhaseOptions,
      },
      selections: { healthArea, primary, secondary, product, rdPhase },
      setters: { setHealthArea, setPrimary, setSecondary, setProduct, setRdPhase },
      loading: {
        healthAreas: healthAreasLoading,
        diseases: hierarchyLoading || diseasesLoading,
        products: productsLoading,
        pairs: pairsLoading,
      },
    });

  const hasFilters =
    healthArea.length > 0 ||
    primary.length > 0 ||
    secondary.length > 0 ||
    product.length > 0 ||
    rdPhase.length > 0;

  const clearAll = () => {
    setHealthArea([]);
    setPrimary([]);
    setSecondary([]);
    setProduct([]);
    setRdPhase([]);
  };

  return {
    healthArea,
    primary,
    secondary,
    product,
    rdPhase,
    expandedProduct,

    setHealthArea,
    setPrimary,
    setSecondary,
    setProduct,
    setRdPhase,

    healthAreaOptions,
    narrowedHierarchy,
    productOptions,
    rdPhaseOptions,

    loading: {
      gha: healthAreasLoading,
      diseases: hierarchyLoading || diseasesLoading,
      products: productsLoading,
      phases: phasesLoading || pairsLoading,
    },

    hasFilters,
    clearAll,
  };
}
