'use client';

// =========================================================
// useWhoPageFilters — WHO page's three global filters
// =========================================================
// Same shape as Portfolio Analysis's `useGlobalFilters` minus the R&D
// phase axis. URL keys (`gha`, `primary`, `secondary`, `product`) are
// deliberately shared with Portfolio Analysis so a user navigating
// between the two pages with the same filter query string lands with
// the same selections applied.

import { useMemo } from 'react';
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer } from '@/lib/url-serializers';
import { useCrossFilteredOptions } from '@/lib/useCrossFilteredOptions';
import {
  useGlobalHealthAreaSummaries,
  useDiseases,
  useDiseaseHierarchy,
  useProducts,
  useActivePipelineFilterPairs,
} from '@/graphql/hooks';

export function useWhoPageFilters() {
  const [healthArea, setHealthArea] = useUrlState('gha', [], arraySerializer);
  const [primary, setPrimary] = useUrlState('primary', [], arraySerializer);
  const [secondary, setSecondary] = useUrlState('secondary', [], arraySerializer);
  const [product, setProduct] = useUrlState('product', [], arraySerializer);

  // Selections are concrete product names; no expansion needed.
  const expandedProduct = product;

  const { bubbleData: healthAreas, loading: healthAreasLoading } =
    useGlobalHealthAreaSummaries();
  const { products: productsList, loading: productsLoading } = useProducts();
  const { diseases: diseasesList, loading: diseasesLoading } = useDiseases();
  const { hierarchy: diseaseHierarchy, loading: hierarchyLoading } =
    useDiseaseHierarchy();
  const { pairs, loading: pairsLoading } = useActivePipelineFilterPairs();

  const allProductOptions = useMemo(
    () => (productsList || []).map((p) => p.product_name),
    [productsList],
  );

  // Cross-filtering needs an R&D-phase axis on the helper's contract;
  // we pass empty arrays/stubs since the WHO page doesn't expose that
  // filter. `useCrossFilteredOptions` skips pruning when its phase
  // inputs are empty.
  const { healthAreaOptions, narrowedHierarchy, productOptions } =
    useCrossFilteredOptions({
      data: {
        healthAreas,
        diseaseHierarchy,
        pairs,
        allProductOptions,
        allPhaseOptions: [],
      },
      selections: { healthArea, primary, secondary, product, rdPhase: [] },
      setters: {
        setHealthArea,
        setPrimary,
        setSecondary,
        setProduct,
        setRdPhase: () => {},
      },
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
    product.length > 0;

  const clearAll = () => {
    setHealthArea([]);
    setPrimary([]);
    setSecondary([]);
    setProduct([]);
  };

  return {
    healthArea,
    primary,
    secondary,
    product,
    expandedProduct,

    setHealthArea,
    setPrimary,
    setSecondary,
    setProduct,

    healthAreaOptions,
    narrowedHierarchy,
    productOptions,

    loading: {
      gha: healthAreasLoading,
      diseases: hierarchyLoading || diseasesLoading,
      products: productsLoading,
    },

    hasFilters,
    clearAll,
  };
}
