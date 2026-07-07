'use client';

// =========================================================
// useWhoPageFilters — WHO page's full global filter set
// =========================================================
// Mirrors `useGlobalFilters` including R&D phase (URL key `rdPhase`).
// The other URL keys (`gha`, `primary`, `secondary`, `product`) are
// deliberately shared with Portfolio Analysis so a user navigating
// between the two pages with the same filter query string lands with
// the same selections applied.

import { useMemo } from 'react';
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
  usePriorityAlignment,
} from '@/graphql/hooks';

export function useWhoPageFilters() {
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
  const { pairs, loading: pairsLoading } = useActivePipelineFilterPairs();
  const { phases, loading: phasesLoading } = usePhases();

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

  // Fetch the list of diseases that have at least one WHO priority
  // linked. The disease dropdown should only offer these so the user
  // can't filter to a disease with zero priority coverage. The call
  // uses no filters so the list is stable regardless of selections.
  const { diseaseOptions: priorityDiseases } = usePriorityAlignment(null, null, null, null);

  // Restrict the disease hierarchy to only diseases bearing a priority.
  const priorityDiseaseHierarchy = useMemo(() => {
    if (!priorityDiseases || priorityDiseases.length === 0) return diseaseHierarchy;
    const nameSet = new Set(priorityDiseases.map((d) => d.disease_filter));
    // Also match by disease_name for rows where disease_filter is null.
    for (const d of priorityDiseases) nameSet.add(d.disease_name);
    return (diseaseHierarchy || []).filter((r) => nameSet.has(r.primary_disease));
  }, [diseaseHierarchy, priorityDiseases]);

  const { healthAreaOptions, narrowedHierarchy, productOptions, rdPhaseOptions } =
    useCrossFilteredOptions({
      data: {
        healthAreas,
        diseaseHierarchy: priorityDiseaseHierarchy,
        pairs,
        allProductOptions,
        allPhaseOptions,
      },
      selections: { healthArea, primary, secondary, product, rdPhase },
      setters: {
        setHealthArea,
        setPrimary,
        setSecondary,
        setProduct,
        setRdPhase,
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
      phases: phasesLoading,
    },

    hasFilters,
    clearAll,
  };
}
