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
} from "../types.js";

/**
 * Get all diseases for filter dropdown.
 */
export function getDiseases(): DimDisease[] {
  const db = getDatabase();

  return db
    .prepare(
      `
    SELECT disease_key, vin_diseaseid, disease_name, global_health_area, disease_type
    FROM dim_disease
    ORDER BY disease_name
  `,
    )
    .all() as DimDisease[];
}

/**
 * Get a disease by key.
 */
export function getDiseaseByKey(disease_key: number): DimDisease | null {
  const db = getDatabase();

  const disease = db
    .prepare(
      `
    SELECT disease_key, vin_diseaseid, disease_name, global_health_area, disease_type
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
 * Get all products for filter dropdown.
 */
export function getProducts(): DimProduct[] {
  const db = getDatabase();

  return db
    .prepare(
      `
    SELECT product_key, vin_productid, product_name, product_type
    FROM dim_product
    ORDER BY product_name
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
    SELECT p.priority_key, p.vin_rdpriorityid, p.priority_name, p.indication, p.intended_use
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
