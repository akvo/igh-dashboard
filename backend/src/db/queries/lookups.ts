import { getDatabase } from "../connection.js";
import type {
  DimDisease,
  DimPhase,
  DimProduct,
  DimGeography,
  DimDeveloper,
  DimPriority,
  FactClinicalTrialEvent,
  CandidateGeography,
  DiseaseHierarchyRow,
} from "../types.js";

/**
 * Primary disease groups (e.g. "Malaria", "Tuberculosis") that
 * appear on at least one active pipeline candidate. Backs the
 * top level of the hierarchical disease filter.
 */
export function getDiseases(): Pick<DimDisease, "disease_filter" | "global_health_area">[] {
  const db = getDatabase();

  return db
    .prepare(
      `
    SELECT DISTINCT d.disease_filter, d.global_health_area
    FROM dim_disease d
    JOIN fact_pipeline_snapshot f ON d.disease_key = f.disease_key
    WHERE f.is_active_flag = 1
      AND f.include_in_pipeline = 1
      AND d.disease_filter IS NOT NULL
    ORDER BY d.disease_filter
  `,
    )
    .all() as Pick<DimDisease, "disease_filter" | "global_health_area">[];
}

/**
 * Secondary diseases (sub-diseases like "P. falciparum") joined to
 * their parent primary, restricted to those active in the pipeline.
 *
 * Returning the parent on every row lets the frontend assemble the
 * parent -> children tree without a second roundtrip.
 *
 * The previous implementation joined `f.secondary_disease_key` to
 * `dim_disease`, but that fact column had effectively zero signal
 * (set on 59/9388 candidates, 57 of those self-referring to the
 * primary) and is now dropped. Authoritative secondaries come
 * directly from `dim_disease.secondary_disease_name`.
 */
export function getSecondaryDiseases(): Pick<
  DimDisease,
  "disease_filter" | "secondary_disease_name" | "global_health_area"
>[] {
  const db = getDatabase();

  return db
    .prepare(
      `
    SELECT DISTINCT d.disease_filter, d.secondary_disease_name, d.global_health_area
    FROM dim_disease d
    JOIN fact_pipeline_snapshot f ON d.disease_key = f.disease_key
    WHERE f.is_active_flag = 1
      AND f.include_in_pipeline = 1
      AND d.secondary_disease_name IS NOT NULL
    ORDER BY d.disease_filter, d.secondary_disease_name
  `,
    )
    .all() as Pick<
    DimDisease,
    "disease_filter" | "secondary_disease_name" | "global_health_area"
  >[];
}

/**
 * Full hierarchy of (primary, secondary, global health area) tuples
 * for active pipeline diseases.
 *
 * Standalone primaries (no children) emit a row where
 * `secondary_disease = primary_disease`. The sidebar consumes that
 * shape and renders such rows as leaves without an expand `+` -- it
 * matches its existing rendering rule with no extra branching.
 *
 * Replaces the previous text-parsing of `disease_name` (the first
 * segment before " - "). The new columns are authoritative, so the
 * hierarchy no longer depends on naming conventions of the source.
 */
export function getDiseaseHierarchy(): DiseaseHierarchyRow[] {
  const db = getDatabase();

  return db
    .prepare(
      `
    SELECT DISTINCT
      d.disease_filter AS primary_disease,
      COALESCE(d.secondary_disease_name, d.disease_filter) AS secondary_disease,
      d.global_health_area
    FROM dim_disease d
    JOIN fact_pipeline_snapshot f ON d.disease_key = f.disease_key
    WHERE f.is_active_flag = 1
      AND f.include_in_pipeline = 1
      AND d.disease_filter IS NOT NULL
      AND d.global_health_area IS NOT NULL
    ORDER BY d.global_health_area, d.disease_filter, secondary_disease
  `,
    )
    .all() as DiseaseHierarchyRow[];
}

/**
 * Get a disease by key.
 */
export function getDiseaseByKey(disease_key: number): DimDisease | null {
  const db = getDatabase();

  const disease = db
    .prepare(
      `
    SELECT disease_key, diseaseid, disease_name, global_health_area, disease_type
    FROM dim_disease
    WHERE disease_key = ?
  `,
    )
    .get(disease_key) as DimDisease | undefined;

  return disease || null;
}

/**
 * Get all phases for filter dropdown.
 */
export function getPhases(): DimPhase[] {
  const db = getDatabase();

  return db
    .prepare(
      `
    SELECT phase_key, vin_rdstageid, phase_name, sort_order
    FROM dim_phase
    ORDER BY sort_order
  `,
    )
    .all() as DimPhase[];
}

/**
 * Get a phase by key.
 */
export function getPhaseByKey(phase_key: number): DimPhase | null {
  const db = getDatabase();

  const phase = db
    .prepare(
      `
    SELECT phase_key, vin_rdstageid, phase_name, sort_order
    FROM dim_phase
    WHERE phase_key = ?
  `,
    )
    .get(phase_key) as DimPhase | undefined;

  return phase || null;
}

/**
 * Get products that have at least one candidate in the pipeline.
 */
export function getProducts(): DimProduct[] {
  const db = getDatabase();

  return db
    .prepare(
      `
    SELECT DISTINCT p.product_key, p.vin_productid, p.product_name, p.product_type
    FROM dim_product p
    JOIN fact_pipeline_snapshot f ON p.product_key = f.product_key
    WHERE f.is_active_flag = 1
      AND f.include_in_pipeline = 1
    ORDER BY p.product_name
  `,
    )
    .all() as DimProduct[];
}

/**
 * Get a product by key.
 */
export function getProductByKey(product_key: number): DimProduct | null {
  const db = getDatabase();

  const product = db
    .prepare(
      `
    SELECT product_key, vin_productid, product_name, product_type
    FROM dim_product
    WHERE product_key = ?
  `,
    )
    .get(product_key) as DimProduct | undefined;

  return product || null;
}

/**
 * Get all countries for filter dropdown.
 */
export function getCountries(): DimGeography[] {
  const db = getDatabase();

  return db
    .prepare(
      `
    SELECT country_key, vin_countryid, country_name, iso_code, region_name
    FROM dim_geography
    ORDER BY country_name
  `,
    )
    .all() as DimGeography[];
}

/**
 * Get developers for a candidate via bridge table.
 */
export function getDevelopersByCandidateKey(candidate_key: number): DimDeveloper[] {
  const db = getDatabase();

  return db
    .prepare(
      `
    SELECT d.developer_key, d.developer_name
    FROM dim_developer d
    JOIN bridge_candidate_developer bd ON d.developer_key = bd.developer_key
    WHERE bd.candidate_key = ?
    ORDER BY d.developer_name
  `,
    )
    .all(candidate_key) as DimDeveloper[];
}

/**
 * Get priorities for a candidate via bridge table.
 */
export function getPrioritiesByCandidateKey(candidate_key: number): DimPriority[] {
  const db = getDatabase();

  return db
    .prepare(
      `
    SELECT p.priority_key, p.rdpriorityid, p.priority_name, p.indication, p.intended_use
    FROM dim_priority p
    JOIN bridge_candidate_priority bp ON p.priority_key = bp.priority_key
    WHERE bp.candidate_key = ?
    ORDER BY p.priority_name
  `,
    )
    .all(candidate_key) as DimPriority[];
}

/**
 * Get geographies for a candidate via bridge table.
 */
export function getGeographiesByCandidateKey(candidate_key: number): CandidateGeography[] {
  const db = getDatabase();

  return db
    .prepare(
      `
    SELECT g.country_key, g.country_name, g.iso_code, bg.location_scope
    FROM dim_geography g
    JOIN bridge_candidate_geography bg ON g.country_key = bg.country_key
    WHERE bg.candidate_key = ?
    ORDER BY g.country_name
  `,
    )
    .all(candidate_key) as CandidateGeography[];
}

/**
 * Get clinical trials for a candidate.
 */
export function getClinicalTrialsByCandidateKey(candidate_key: number): FactClinicalTrialEvent[] {
  const db = getDatabase();

  return db
    .prepare(
      `
    SELECT trial_id, candidate_key, start_date_key, trial_phase, enrollment_count, status
    FROM fact_clinical_trial_event
    WHERE candidate_key = ?
    ORDER BY trial_phase
  `,
    )
    .all(candidate_key) as FactClinicalTrialEvent[];
}
