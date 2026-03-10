import { useMemo, useEffect } from 'react';
import {
  addMalariaOption,
  expandDiseaseSelection,
  expandProductNameSelection,
  expandProductKeySelection,
  VECTOR_CONTROL_PRODUCT_NAMES,
  VECTOR_CONTROL_CONSOLIDATED_NAME,
  MALARIA_GROUP,
} from '@/lib/filterGroups';

/**
 * Bidirectional cross-filtering for GHA ↔ disease ↔ product filters.
 *
 * @param {Object} params
 * @param {Object} params.data - { healthAreas, diseasesRaw, pairs, allProductOptions }
 * @param {Object} params.selections - { healthArea, disease, product }
 * @param {Object} params.setters - { setHealthArea, setDisease, setProduct }
 * @param {Object} params.loading - { healthAreas, diseases, products, pairs }
 * @param {'by-name'|'by-key'} [params.mode='by-name']
 *   - 'by-name': products are plain strings, pairs matched via product_name
 *   - 'by-key': products are {value, label}, pairs matched via product_key
 * @returns {{ healthAreaOptions, diseaseOptions, productOptions }}
 */
export function useCrossFilteredOptions({
  data,
  selections,
  setters,
  loading,
  mode = 'by-name',
}) {
  const { healthAreas, diseasesRaw, pairs, allProductOptions } = data;
  const { healthArea, disease, product } = selections;
  const { setHealthArea, setDisease, setProduct } = setters;

  const expandProduct = mode === 'by-key' ? expandProductKeySelection : expandProductNameSelection;

  // Products → diseases lookup via pairs
  function productPairKeys(expandedProduct) {
    if (mode === 'by-key') {
      const keys = new Set(expandedProduct);
      return pairs.filter(p => keys.has(String(p.product_key)));
    }
    const names = new Set(expandedProduct);
    return pairs.filter(p => names.has(p.product_name));
  }

  // Does a product option belong to a valid set?
  function productOptionMatches(option, validSet) {
    if (mode === 'by-key') {
      return option.value.split('|').some(k => validSet.has(k));
    }
    if (validSet.has(option)) return true;
    if (option === VECTOR_CONTROL_CONSOLIDATED_NAME) {
      return VECTOR_CONTROL_PRODUCT_NAMES.some(n => validSet.has(n));
    }
    return false;
  }

  // Valid-set key extractor for product pairs filtered by disease
  function pairProductKey(p) {
    return mode === 'by-key' ? String(p.product_key) : p.product_name;
  }

  // Is a selected product value still present in the options list?
  function isProductValueValid(val, options) {
    if (mode === 'by-key') {
      return options.some(o => o.value === val);
    }
    return options.includes(val);
  }

  // --- Memos ---

  const healthAreaOptions = useMemo(() => {
    const all = (healthAreas || []).map(item => ({ value: item.originalName, label: item.name }));
    const hasDis = disease.length > 0;
    const hasProd = product.length > 0;
    if (!hasDis && !hasProd) return all;

    const disGHAs = hasDis
      ? new Set((diseasesRaw || [])
          .filter(d => expandDiseaseSelection(disease).includes(d.disease_group_name))
          .map(d => d.global_health_area))
      : null;

    let prodGHAs = null;
    if (hasProd) {
      const matchingPairs = productPairKeys(expandProduct(product));
      const validDiseases = new Set(matchingPairs.map(p => p.disease_group_name));
      prodGHAs = new Set((diseasesRaw || [])
        .filter(d => validDiseases.has(d.disease_group_name))
        .map(d => d.global_health_area));
    }

    return all.filter(o => {
      if (disGHAs && !disGHAs.has(o.value)) return false;
      if (prodGHAs && !prodGHAs.has(o.value)) return false;
      return true;
    });
  }, [healthAreas, disease, product, diseasesRaw, pairs]); // eslint-disable-line react-hooks/exhaustive-deps

  const ghaDiseaseOptions = useMemo(() => {
    const source = diseasesRaw || [];
    const filtered = healthArea.length > 0
      ? source.filter(d => healthArea.includes(d.global_health_area))
      : source;
    const names = [...new Set(filtered.map(d => d.disease_group_name).filter(Boolean))];
    return addMalariaOption(names);
  }, [diseasesRaw, healthArea]);

  const diseaseOptions = useMemo(() => {
    if (product.length === 0) return ghaDiseaseOptions;
    const matchingPairs = productPairKeys(expandProduct(product));
    const validNames = new Set(matchingPairs.map(p => p.disease_group_name));
    return ghaDiseaseOptions.filter(d => {
      if (validNames.has(d)) return true;
      if (d === MALARIA_GROUP.label) {
        return MALARIA_GROUP.members.some(m => validNames.has(m));
      }
      return false;
    });
  }, [product, pairs, ghaDiseaseOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const ghaProductOptions = useMemo(() => {
    if (healthArea.length === 0) return allProductOptions;
    const ghaDiseases = new Set(
      (diseasesRaw || [])
        .filter(d => healthArea.includes(d.global_health_area))
        .map(d => d.disease_group_name)
    );
    const validSet = new Set(
      pairs.filter(p => ghaDiseases.has(p.disease_group_name)).map(pairProductKey)
    );
    return allProductOptions.filter(o => productOptionMatches(o, validSet));
  }, [healthArea, diseasesRaw, pairs, allProductOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const productOptions = useMemo(() => {
    if (disease.length === 0) return ghaProductOptions;
    const expanded = expandDiseaseSelection(disease);
    const validSet = new Set(
      pairs.filter(p => expanded.includes(p.disease_group_name)).map(pairProductKey)
    );
    return ghaProductOptions.filter(o => productOptionMatches(o, validSet));
  }, [disease, pairs, ghaProductOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Pruning effects ---

  useEffect(() => {
    if (loading.diseases || loading.pairs) return;
    if (disease.length > 0) {
      const valid = disease.filter(d => diseaseOptions.includes(d));
      if (valid.length !== disease.length) setDisease(valid);
    }
  }, [diseaseOptions, loading.diseases, loading.pairs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loading.products || loading.pairs) return;
    if (product.length > 0) {
      const valid = product.filter(p => isProductValueValid(p, productOptions));
      if (valid.length !== product.length) setProduct(valid);
    }
  }, [productOptions, loading.products, loading.pairs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loading.healthAreas || loading.diseases || loading.pairs) return;
    if (healthArea.length > 0) {
      const validValues = new Set(healthAreaOptions.map(o => o.value));
      const valid = healthArea.filter(h => validValues.has(h));
      if (valid.length !== healthArea.length) setHealthArea(valid);
    }
  }, [healthAreaOptions, loading.healthAreas, loading.diseases, loading.pairs]); // eslint-disable-line react-hooks/exhaustive-deps

  return { healthAreaOptions, diseaseOptions, productOptions };
}
