import { getDatabase } from "../connection.js";
import type { DimCandidateCore, DimDisease, FactClinicalTrialEvent } from "../types.js";

/**
 * Load a single candidate row by key. Returned by the slide-in resolver as
 * the `candidate` field; the resolver layer then triggers each DataLoader
 * for the joined entities.
 *
 * The resolver could just call candidateByKeyLoader directly, but exposing
 * a thin sync function keeps the test surface smaller and the resolver
 * shape consistent with the other table-backed queries.
 */
export function getCandidateForSlideIn(candidate_key: number): DimCandidateCore | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `
      SELECT candidate_key, candidateid, candidate_name, vin_candidate_code,
             developers_agg, alternative_names, target, mechanism_of_action,
             key_features, known_funders_agg, development_status,
             current_rd_stage, countries_approved_count, countries_approved_agg,
             candidate_type, indication, indication_type,
             healthcare_facility_level, preclinical_results_status,
             type_of_preclinical_results, preclinical_results_source,
             recent_updates, test_format
      FROM dim_candidate_core
      WHERE candidate_key = ?
    `,
    )
    .get(candidate_key) as DimCandidateCore | undefined;
  return row || null;
}

/**
 * The trial slide-in is keyed by trial_id, not candidate_key. The query
 * returns the trial row; resolvers join through to its parent candidate
 * (and through that to the disease chip) via DataLoaders.
 */
export function getTrialForSlideIn(trial_id: number): FactClinicalTrialEvent | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `
      SELECT trial_id, candidate_key, start_date_key, end_date_key,
             last_updated_key, primary_completion_date_key,
             trial_phase, enrollment_count, status,
             clinicaltrialid, disease_key, product_key, trial_name, trial_title,
             sponsor, locations, age_groups, study_type, source_text,
             description, collaborator, funder_type, interventions, sex,
             study_design, conditions
      FROM fact_clinical_trial_event
      WHERE trial_id = ?
    `,
    )
    .get(trial_id) as FactClinicalTrialEvent | undefined;
  return row || null;
}

/**
 * Disease used on the trial slide-in chip. Trials carry their own
 * disease_key denormalised from their candidate, so the lookup is direct
 * (no FK_VIA_CANDIDATE chase here).
 */
export function getDiseaseForSlideIn(disease_key: number): DimDisease | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `
      SELECT disease_key, diseaseid, disease_name, disease_group_name,
             global_health_area, disease_type, disease_filter,
             secondary_disease_name, disease_label
      FROM dim_disease
      WHERE disease_key = ?
    `,
    )
    .get(disease_key) as DimDisease | undefined;
  return row || null;
}

/**
 * Resolve a dim_date row to its ISO date string. Used by the trial
 * slide-in's Timeline strip (start / primary completion / end).
 */
export function getDateString(date_key: number | null): string | null {
  if (date_key == null) return null;
  const db = getDatabase();
  const row = db.prepare(`SELECT full_date FROM dim_date WHERE date_key = ?`).get(date_key) as
    | { full_date: string | null }
    | undefined;
  return row?.full_date ?? null;
}
