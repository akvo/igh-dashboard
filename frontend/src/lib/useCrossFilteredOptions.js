import { useMemo, useEffect } from 'react';
import { expandProductKeySelection } from '@/lib/filterGroups';

/**
 * Bidirectional cross-filtering for GHA <-> primary disease <->
 * secondary disease <-> product <-> R&D phase.
 *
 * The hook reads from `pipelineFilterPairs` (one row per
 * (disease, product, phase) triple actually present in active
 * pipeline candidates) and intersects it with the current
 * selections to produce narrowed option lists for each axis.
 *
 * The disease axis is now hierarchical: callers pass
 * `selections.primary` (an array of primary disease names) and
 * `selections.secondary` (an array of sub-disease names). Both are
 * optional and default to empty. The hook returns:
 *
 *   - `healthAreaOptions`: GHA dropdown options narrowed by other
 *     active filters.
 *   - `narrowedHierarchy`: a subset of the input
 *     `data.diseaseHierarchy` rows so that
 *     `<HierarchicalDiseaseFilter hierarchy={narrowedHierarchy}>`
 *     only shows primaries/secondaries reachable under the other
 *     active filters.
 *   - `productOptions`: product dropdown options narrowed by GHA,
 *     primary, secondary, and phase.
 *   - `rdPhaseOptions`: phase dropdown options narrowed similarly.
 *
 * Pair rows must carry `disease_filter` and `secondary_disease_name`
 * (added on the backend in this PR). The legacy `disease_group_name`
 * is no longer consulted.
 *
 * @param {Object} params
 * @param {Object} params.data - { healthAreas, diseaseHierarchy, pairs, allProductOptions, allPhaseOptions? }
 * @param {Object} params.selections - { healthArea, primary?, secondary?, product, rdPhase? }
 * @param {Object} params.setters - { setHealthArea, setPrimary?, setSecondary?, setProduct, setRdPhase? }
 * @param {Object} params.loading - { healthAreas, diseases, products, pairs }
 * @param {'by-name'|'by-key'} [params.mode='by-name']
 *   - 'by-name': products are plain strings, pairs matched via product_name
 *   - 'by-key': products are {value, label}, pairs matched via product_key
 * @returns {{ healthAreaOptions, narrowedHierarchy, productOptions, rdPhaseOptions? }}
 */
export function useCrossFilteredOptions({
  data,
  selections,
  setters,
  loading,
  mode = 'by-name',
}) {
  const {
    healthAreas,
    diseaseHierarchy = [],
    pairs,
    allProductOptions,
    allPhaseOptions,
  } = data;
  const {
    healthArea = [],
    primary = [],
    secondary = [],
    product = [],
    rdPhase = [],
  } = selections;
  const {
    setHealthArea,
    setPrimary,
    setSecondary,
    setProduct,
    setRdPhase,
  } = setters;

  // Product selections are concrete values in both modes now (no
  // consolidated VCP sentinel). expandProductKeySelection is kept on the
  // by-key path as a harmless defensive split: pipe-joined values are no
  // longer produced, so it returns the keys unchanged.
  const expandProduct =
    mode === 'by-key' ? expandProductKeySelection : (sel) => sel;

  // ---------------------------------------------------------
  // Pair-side helpers
  // ---------------------------------------------------------
  //
  // Most narrowing happens by intersecting `pairs` against the
  // active filters then projecting some axis out of the survivors.
  // These helpers centralize the matching rules so each memo below
  // is small and obvious.

  function pairMatchesPrimary(p, primarySet) {
    if (primarySet.size === 0) return true;
    return p.disease_filter && primarySet.has(p.disease_filter);
  }

  function pairMatchesSecondary(p, secondarySet) {
    if (secondarySet.size === 0) return true;
    return p.secondary_disease_name && secondarySet.has(p.secondary_disease_name);
  }

  function pairProductKey(p) {
    return mode === 'by-key' ? String(p.product_key) : p.product_name;
  }

  function productOptionMatches(option, validSet) {
    if (mode === 'by-key') {
      return option.value.split('|').some((k) => validSet.has(k));
    }
    return validSet.has(option);
  }

  function isProductValueValid(val, options) {
    if (mode === 'by-key') {
      return options.some((o) => o.value === val);
    }
    return options.includes(val);
  }

  // ---------------------------------------------------------
  // Pre-computed sets
  // ---------------------------------------------------------

  const primarySet = useMemo(() => new Set(primary), [primary]);
  const secondarySet = useMemo(() => new Set(secondary), [secondary]);
  const productExpanded = useMemo(
    () => (product.length > 0 ? new Set(expandProduct(product)) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product],
  );
  const phaseSet = useMemo(
    () => (rdPhase.length > 0 ? new Set(rdPhase) : null),
    [rdPhase],
  );

  // Pairs after restricting to the active phase and product
  // selections. These two axes never narrow themselves through this
  // intermediate filter (otherwise we'd just always return what the
  // user typed in), so they're applied first and reused.
  const pairsByPhaseAndProduct = useMemo(() => {
    let active = pairs || [];
    if (phaseSet) {
      active = active.filter((p) => p.phase_name && phaseSet.has(p.phase_name));
    }
    if (productExpanded) {
      active = active.filter((p) =>
        productExpanded.has(pairProductKey(p)),
      );
    }
    return active;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs, phaseSet, productExpanded]);

  // ---------------------------------------------------------
  // healthAreaOptions
  // ---------------------------------------------------------

  const healthAreaOptions = useMemo(() => {
    const all = (healthAreas || []).map((item) => ({
      value: item.originalName,
      label: item.name,
    }));
    const hasPri = primary.length > 0;
    const hasSec = secondary.length > 0;
    const hasProd = product.length > 0;
    const hasPhase = rdPhase.length > 0;
    if (!hasPri && !hasSec && !hasProd && !hasPhase) return all;

    // For each non-trivial axis, derive the set of GHAs the
    // hierarchy actually reaches under that axis. Then intersect
    // them with the unfiltered GHA list.

    const fromHierarchy = (predicate) =>
      new Set(
        diseaseHierarchy.filter(predicate).map((r) => r.global_health_area),
      );

    let priGHAs = null;
    if (hasPri) {
      priGHAs = fromHierarchy((r) => primarySet.has(r.primary_disease));
    }
    let secGHAs = null;
    if (hasSec) {
      secGHAs = fromHierarchy((r) => secondarySet.has(r.secondary_disease));
    }

    // Product/phase narrow GHAs through the pairs view.
    let pairGHAs = null;
    if (hasProd || hasPhase) {
      const validPrimaries = new Set(
        pairsByPhaseAndProduct.map((p) => p.disease_filter).filter(Boolean),
      );
      pairGHAs = fromHierarchy((r) => validPrimaries.has(r.primary_disease));
    }

    return all.filter((o) => {
      if (priGHAs && !priGHAs.has(o.value)) return false;
      if (secGHAs && !secGHAs.has(o.value)) return false;
      if (pairGHAs && !pairGHAs.has(o.value)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    healthAreas,
    diseaseHierarchy,
    primary,
    secondary,
    product,
    rdPhase,
    pairsByPhaseAndProduct,
  ]);

  // ---------------------------------------------------------
  // narrowedHierarchy
  // ---------------------------------------------------------
  //
  // Filter `diseaseHierarchy` rows to those still reachable under
  // the active GHA / product / phase selections. The
  // HierarchicalDiseaseFilter component renders this as the tree
  // it offers the user, so primaries with no surviving children
  // disappear, and so do secondaries whose pair has been ruled out.

  const narrowedHierarchy = useMemo(() => {
    const ghaSet = new Set(healthArea);
    const hasGHA = healthArea.length > 0;
    const hasProd = product.length > 0;
    const hasPhase = rdPhase.length > 0;

    if (!hasGHA && !hasProd && !hasPhase) return diseaseHierarchy;

    // GHA narrows directly.
    let rows = hasGHA
      ? diseaseHierarchy.filter((r) => ghaSet.has(r.global_health_area))
      : diseaseHierarchy;

    if (hasProd || hasPhase) {
      const reachablePrimaries = new Set();
      const reachableSecondaries = new Set();
      for (const p of pairsByPhaseAndProduct) {
        if (p.disease_filter) reachablePrimaries.add(p.disease_filter);
        if (p.secondary_disease_name) {
          reachableSecondaries.add(p.secondary_disease_name);
        }
      }
      rows = rows.filter((r) => {
        if (!reachablePrimaries.has(r.primary_disease)) return false;
        // Self-row (childless primary) is kept iff its primary is
        // reachable -- there's no secondary to check.
        if (r.secondary_disease === r.primary_disease) return true;
        return reachableSecondaries.has(r.secondary_disease);
      });
    }

    return rows;
  }, [diseaseHierarchy, healthArea, product, rdPhase, pairsByPhaseAndProduct]);

  // ---------------------------------------------------------
  // productOptions
  // ---------------------------------------------------------

  const productOptions = useMemo(() => {
    if (!allProductOptions) return [];

    let active = pairs || [];
    if (phaseSet) {
      active = active.filter((p) => p.phase_name && phaseSet.has(p.phase_name));
    }

    if (healthArea.length > 0) {
      const ghaSet = new Set(healthArea);
      const validPrimaries = new Set(
        diseaseHierarchy
          .filter((r) => ghaSet.has(r.global_health_area))
          .map((r) => r.primary_disease),
      );
      active = active.filter((p) => validPrimaries.has(p.disease_filter));
    }

    if (primary.length > 0) {
      active = active.filter((p) => pairMatchesPrimary(p, primarySet));
    }

    if (secondary.length > 0) {
      active = active.filter((p) => pairMatchesSecondary(p, secondarySet));
    }

    if (
      healthArea.length === 0 &&
      primary.length === 0 &&
      secondary.length === 0 &&
      !phaseSet
    ) {
      return allProductOptions;
    }

    const validSet = new Set(active.map(pairProductKey));
    return allProductOptions.filter((o) => productOptionMatches(o, validSet));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    allProductOptions,
    pairs,
    healthArea,
    primary,
    secondary,
    phaseSet,
    primarySet,
    secondarySet,
    diseaseHierarchy,
  ]);

  // ---------------------------------------------------------
  // rdPhaseOptions
  // ---------------------------------------------------------

  const rdPhaseOptions = useMemo(() => {
    if (!allPhaseOptions) return [];
    let active = pairs || [];

    if (healthArea.length > 0) {
      const ghaSet = new Set(healthArea);
      const validPrimaries = new Set(
        diseaseHierarchy
          .filter((r) => ghaSet.has(r.global_health_area))
          .map((r) => r.primary_disease),
      );
      active = active.filter((p) => validPrimaries.has(p.disease_filter));
    }
    if (primary.length > 0) {
      active = active.filter((p) => pairMatchesPrimary(p, primarySet));
    }
    if (secondary.length > 0) {
      active = active.filter((p) => pairMatchesSecondary(p, secondarySet));
    }
    if (productExpanded) {
      active = active.filter((p) => productExpanded.has(pairProductKey(p)));
    }

    const validPhases = new Set(active.map((p) => p.phase_name).filter(Boolean));
    return allPhaseOptions.filter((o) => validPhases.has(o.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    allPhaseOptions,
    pairs,
    healthArea,
    primary,
    secondary,
    productExpanded,
    primarySet,
    secondarySet,
    diseaseHierarchy,
  ]);

  // ---------------------------------------------------------
  // Pruning effects
  // ---------------------------------------------------------
  //
  // When upstream narrowing eliminates a previously valid
  // selection, drop the stale entries so the chart query doesn't
  // ask for something that's no longer offered.

  // Primary pruning: a primary is valid iff it appears as
  // `primary_disease` somewhere in narrowedHierarchy.
  useEffect(() => {
    if (!setPrimary) return;
    if (loading.diseases || loading.pairs) return;
    if (primary.length === 0) return;
    const validPrimaries = new Set(
      narrowedHierarchy.map((r) => r.primary_disease),
    );
    const valid = primary.filter((p) => validPrimaries.has(p));
    if (valid.length !== primary.length) setPrimary(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrowedHierarchy, loading.diseases, loading.pairs]);

  // Secondary pruning: a secondary is valid iff it appears as
  // `secondary_disease` (and is not the self-row).
  useEffect(() => {
    if (!setSecondary) return;
    if (loading.diseases || loading.pairs) return;
    if (secondary.length === 0) return;
    const validSecondaries = new Set(
      narrowedHierarchy
        .filter((r) => r.secondary_disease !== r.primary_disease)
        .map((r) => r.secondary_disease),
    );
    const valid = secondary.filter((s) => validSecondaries.has(s));
    if (valid.length !== secondary.length) setSecondary(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrowedHierarchy, loading.diseases, loading.pairs]);

  useEffect(() => {
    if (!setProduct) return;
    if (loading.products || loading.pairs) return;
    if (product.length === 0) return;
    const valid = product.filter((p) => isProductValueValid(p, productOptions));
    if (valid.length !== product.length) setProduct(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productOptions, loading.products, loading.pairs]);

  useEffect(() => {
    if (!setHealthArea) return;
    if (loading.healthAreas || loading.diseases || loading.pairs) return;
    if (healthArea.length === 0) return;
    const validValues = new Set(healthAreaOptions.map((o) => o.value));
    const valid = healthArea.filter((h) => validValues.has(h));
    if (valid.length !== healthArea.length) setHealthArea(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthAreaOptions, loading.healthAreas, loading.diseases, loading.pairs]);

  useEffect(() => {
    if (!setRdPhase) return;
    if (loading.pairs) return;
    if (rdPhase.length === 0) return;
    const validValues = new Set(rdPhaseOptions.map((o) => o.value));
    const valid = rdPhase.filter((v) => validValues.has(v));
    if (valid.length !== rdPhase.length) setRdPhase(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rdPhaseOptions, loading.pairs]);

  return {
    healthAreaOptions,
    narrowedHierarchy,
    productOptions,
    rdPhaseOptions,
  };
}
