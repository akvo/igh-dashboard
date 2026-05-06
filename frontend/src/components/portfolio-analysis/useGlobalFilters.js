'use client';

// =========================================================
// useGlobalFilters — the four "page-group" filter selections
// =========================================================
//
// Encapsulates URL-backed state for Global health area, Disease
// (hierarchical primary + secondary), Product type, and R&D phase,
// plus the cross-filtered option lists and narrowed disease
// hierarchy that drive the filter dropdowns. Returned shape is
// shared by the page components (which need the values for data
// hooks) and by <GlobalFilterBar/> (which needs the options +
// setters to render the dropdowns).

import { useMemo } from 'react';
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer } from '@/lib/url-serializers';
import {
  consolidateProductOptionsByName,
  expandProductNameSelection,
} from '@/lib/filterGroups';
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

export function useGlobalFilters() {
  // URL-backed selections. Keys (`gha`, `primary`, `secondary`, `product`,
  // `rdPhase`) match what the existing page already writes to the URL.
  const [healthArea, setHealthArea] = useUrlState('gha', [], arraySerializer);
  const [primary, setPrimary] = useUrlState('primary', [], arraySerializer);
  const [secondary, setSecondary] = useUrlState('secondary', [], arraySerializer);
  const [product, setProduct] = useUrlState('product', [], arraySerializer);
  const [rdPhase, setRdPhase] = useUrlState('rdPhase', [], arraySerializer);

  // Expand "Vector control products" composite selection into its
  // subtype names for downstream API calls. The disease axis is
  // hierarchical and produces canonical lists directly, so no
  // disease-side expansion step is needed.
  const expandedProduct = expandProductNameSelection(product);

  // Source data for the dropdowns and cross-filtering.
  const { bubbleData: healthAreas, loading: healthAreasLoading } =
    useGlobalHealthAreaSummaries();
  const { products: productsList, loading: productsLoading } = useProducts();
  const { diseases: diseasesList, loading: diseasesLoading } = useDiseases();
  const { hierarchy: diseaseHierarchy, loading: hierarchyLoading } =
    useDiseaseHierarchy();
  const { phases, loading: phasesLoading } = usePhases();
  const { pairs, loading: pairsLoading } = useActivePipelineFilterPairs();

  const allProductOptions = useMemo(() => {
    const names = (productsList || []).map((p) => p.product_name);
    return consolidateProductOptionsByName(names);
  }, [productsList]);

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
    // URL-backed values
    healthArea,
    primary,
    secondary,
    product,
    rdPhase,
    expandedProduct,

    // setters
    setHealthArea,
    setPrimary,
    setSecondary,
    setProduct,
    setRdPhase,

    // pre-cross-filtered options for the dropdowns
    healthAreaOptions,
    narrowedHierarchy,
    productOptions,
    rdPhaseOptions,

    // loading flags from the underlying queries
    loading: {
      gha: healthAreasLoading,
      diseases: hierarchyLoading || diseasesLoading,
      products: productsLoading,
      phases: phasesLoading || pairsLoading,
    },

    // helpers
    hasFilters,
    clearAll,
  };
}
