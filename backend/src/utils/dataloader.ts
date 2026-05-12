import DataLoader from "dataloader";
import { getDatabase } from "../db/connection.js";
import type {
  DimDisease,
  DimPhase,
  DimProduct,
  DimDeveloper,
  DimPriority,
  CandidateGeography,
  FactClinicalTrialEvent,
  FactPipelineSnapshot,
  DimCandidateCore,
  DimCandidateRegulatory,
  DimPublication,
  PipelineHistoryEntry,
} from "../db/types.js";

/**
 * Create DataLoaders for batch loading related entities.
 * Prevents N+1 query problems when resolving nested relationships.
 */
// eslint-disable-next-line max-lines-per-function -- flat factory; each loader is independent
export function createLoaders() {
  return {
    // Batch load diseases by disease_key
    diseaseLoader: new DataLoader<number, DimDisease | null>(async (keys) => {
      const db = getDatabase();
      const placeholders = keys.map(() => "?").join(", ");
      const rows = db
        .prepare(
          `
          SELECT disease_key, diseaseid, disease_name, disease_group_name, global_health_area, disease_type,
                 disease_filter, secondary_disease_name
          FROM dim_disease
          WHERE disease_key IN (${placeholders})
        `,
        )
        .all(...keys) as DimDisease[];

      const map = new Map(rows.map((r) => [r.disease_key, r]));
      return keys.map((k) => map.get(k) || null);
    }),

    // Batch load phases by phase_key
    phaseLoader: new DataLoader<number, DimPhase | null>(async (keys) => {
      const db = getDatabase();
      const placeholders = keys.map(() => "?").join(", ");
      const rows = db
        .prepare(
          `
          SELECT phase_key, vin_rdstageid, phase_name, sort_order
          FROM dim_phase
          WHERE phase_key IN (${placeholders})
        `,
        )
        .all(...keys) as DimPhase[];

      const map = new Map(rows.map((r) => [r.phase_key, r]));
      return keys.map((k) => map.get(k) || null);
    }),

    // Batch load products by product_key
    productLoader: new DataLoader<number, DimProduct | null>(async (keys) => {
      const db = getDatabase();
      const placeholders = keys.map(() => "?").join(", ");
      const rows = db
        .prepare(
          `
          SELECT product_key, vin_productid, product_name, product_type
          FROM dim_product
          WHERE product_key IN (${placeholders})
        `,
        )
        .all(...keys) as DimProduct[];

      const map = new Map(rows.map((r) => [r.product_key, r]));
      return keys.map((k) => map.get(k) || null);
    }),

    // Batch load developers by candidate_key (one-to-many)
    developersByCandidateLoader: new DataLoader<number, DimDeveloper[]>(async (candidateKeys) => {
      const db = getDatabase();
      const placeholders = candidateKeys.map(() => "?").join(", ");
      const rows = db
        .prepare(
          `
          SELECT bd.candidate_key, d.developer_key, d.developer_name
          FROM dim_developer d
          JOIN bridge_candidate_developer bd ON d.developer_key = bd.developer_key
          WHERE bd.candidate_key IN (${placeholders})
          ORDER BY d.developer_name
        `,
        )
        .all(...candidateKeys) as (DimDeveloper & { candidate_key: number })[];

      const map = new Map<number, DimDeveloper[]>();
      for (const row of rows) {
        const existing = map.get(row.candidate_key) || [];
        existing.push({
          developer_key: row.developer_key,
          developer_name: row.developer_name,
        });
        map.set(row.candidate_key, existing);
      }
      return candidateKeys.map((k) => map.get(k) || []);
    }),

    // Batch load priorities by candidate_key (one-to-many)
    prioritiesByCandidateLoader: new DataLoader<number, DimPriority[]>(async (candidateKeys) => {
      const db = getDatabase();
      const placeholders = candidateKeys.map(() => "?").join(", ");
      const rows = db
        .prepare(
          `
          SELECT bp.candidate_key, p.priority_key, p.rdpriorityid, p.priority_name, p.indication, p.intended_use, p.disease_key
          FROM dim_priority p
          JOIN bridge_candidate_priority bp ON p.priority_key = bp.priority_key
          WHERE bp.candidate_key IN (${placeholders})
          ORDER BY p.priority_name
        `,
        )
        .all(...candidateKeys) as (DimPriority & { candidate_key: number })[];

      const map = new Map<number, DimPriority[]>();
      for (const row of rows) {
        const existing = map.get(row.candidate_key) || [];
        existing.push({
          priority_key: row.priority_key,
          rdpriorityid: row.rdpriorityid,
          priority_name: row.priority_name,
          indication: row.indication,
          intended_use: row.intended_use,
          disease_key: row.disease_key,
        });
        map.set(row.candidate_key, existing);
      }
      return candidateKeys.map((k) => map.get(k) || []);
    }),

    // Batch load geographies by candidate_key (one-to-many)
    geographiesByCandidateLoader: new DataLoader<number, CandidateGeography[]>(
      async (candidateKeys) => {
        const db = getDatabase();
        const placeholders = candidateKeys.map(() => "?").join(", ");
        const rows = db
          .prepare(
            `
          SELECT bg.candidate_key, g.country_key, g.country_name, g.iso_code, bg.location_scope
          FROM dim_geography g
          JOIN bridge_candidate_geography bg ON g.country_key = bg.country_key
          WHERE bg.candidate_key IN (${placeholders})
          ORDER BY g.country_name
        `,
          )
          .all(...candidateKeys) as (CandidateGeography & {
          candidate_key: number;
        })[];

        const map = new Map<number, CandidateGeography[]>();
        for (const row of rows) {
          const existing = map.get(row.candidate_key) || [];
          existing.push({
            country_key: row.country_key,
            country_name: row.country_name,
            iso_code: row.iso_code,
            location_scope: row.location_scope,
          });
          map.set(row.candidate_key, existing);
        }
        return candidateKeys.map((k) => map.get(k) || []);
      },
    ),

    // Batch load clinical trials by candidate_key (one-to-many)
    clinicalTrialsByCandidateLoader: new DataLoader<number, FactClinicalTrialEvent[]>(
      async (candidateKeys) => {
        const db = getDatabase();
        const placeholders = candidateKeys.map(() => "?").join(", ");
        const rows = db
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
          WHERE candidate_key IN (${placeholders})
          ORDER BY trial_phase
        `,
          )
          .all(...candidateKeys) as FactClinicalTrialEvent[];

        const map = new Map<number, FactClinicalTrialEvent[]>();
        for (const row of rows) {
          if (row.candidate_key !== null) {
            const existing = map.get(row.candidate_key) || [];
            existing.push(row);
            map.set(row.candidate_key, existing);
          }
        }
        return candidateKeys.map((k) => map.get(k) || []);
      },
    ),

    // Batch load pipeline snapshots by candidate_key
    snapshotByCandidateLoader: new DataLoader<number, FactPipelineSnapshot | null>(
      async (candidateKeys) => {
        const db = getDatabase();
        const placeholders = candidateKeys.map(() => "?").join(", ");
        const rows = db
          .prepare(
            `
          SELECT snapshot_id, candidate_key, product_key, disease_key,
                 technology_key, regulatory_key, phase_key, date_key, is_active_flag,
                 sub_product_key
          FROM fact_pipeline_snapshot
          WHERE candidate_key IN (${placeholders})
            AND is_active_flag = 1
          ORDER BY snapshot_id DESC
        `,
          )
          .all(...candidateKeys) as FactPipelineSnapshot[];

        const map = new Map<number, FactPipelineSnapshot>();
        for (const r of rows) {
          if (!map.has(r.candidate_key as number)) {
            map.set(r.candidate_key as number, r);
          }
        }
        return candidateKeys.map((k) => map.get(k) || null);
      },
    ),

    // Batch load candidates by candidate_key
    candidateByKeyLoader: new DataLoader<number, DimCandidateCore | null>(async (keys) => {
      const db = getDatabase();
      const placeholders = keys.map(() => "?").join(", ");
      const rows = db
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
          WHERE candidate_key IN (${placeholders})
        `,
        )
        .all(...keys) as DimCandidateCore[];
      const map = new Map(rows.map((r) => [r.candidate_key, r]));
      return keys.map((k) => map.get(k) || null);
    }),

    // Batch load a single trial by trial_id
    trialByIdLoader: new DataLoader<number, FactClinicalTrialEvent | null>(async (keys) => {
      const db = getDatabase();
      const placeholders = keys.map(() => "?").join(", ");
      const rows = db
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
          WHERE trial_id IN (${placeholders})
        `,
        )
        .all(...keys) as FactClinicalTrialEvent[];
      const map = new Map(rows.map((r) => [r.trial_id, r]));
      return keys.map((k) => map.get(k) || null);
    }),

    // Batch load regulatory info via fact_pipeline_snapshot.regulatory_key
    regulatoryByCandidateLoader: new DataLoader<number, DimCandidateRegulatory | null>(
      async (candidateKeys) => {
        const db = getDatabase();
        const placeholders = candidateKeys.map(() => "?").join(", ");
        const rows = db
          .prepare(
            `
          SELECT f.candidate_key, r.regulatory_key, r.approval_status,
                 r.fda_approval_date, r.who_prequal_date, r.who_prequalification,
                 r.nra_approval_status, r.sra_approval_status, r.ema_approval_status,
                 r.japanese_mhlw_approval_status, r.us_fda_approval_status
          FROM fact_pipeline_snapshot f
          JOIN dim_candidate_regulatory r ON f.regulatory_key = r.regulatory_key
          WHERE f.candidate_key IN (${placeholders})
            AND f.is_active_flag = 1
          GROUP BY f.candidate_key
        `,
          )
          .all(...candidateKeys) as (DimCandidateRegulatory & { candidate_key: number })[];
        const map = new Map(rows.map((r) => [r.candidate_key, r]));
        return candidateKeys.map((k) => map.get(k) || null);
      },
    ),

    // Batch load technology type via fact_pipeline_snapshot.technology_key
    techByCandidateLoader: new DataLoader<number, string | null>(async (candidateKeys) => {
      const db = getDatabase();
      const placeholders = candidateKeys.map(() => "?").join(", ");
      const rows = db
        .prepare(
          `
          SELECT f.candidate_key, t.technology_type
          FROM fact_pipeline_snapshot f
          JOIN dim_candidate_tech t ON f.technology_key = t.technology_key
          WHERE f.candidate_key IN (${placeholders})
            AND f.is_active_flag = 1
          GROUP BY f.candidate_key
        `,
        )
        .all(...candidateKeys) as Array<{ candidate_key: number; technology_type: string | null }>;
      const map = new Map(rows.map((r) => [r.candidate_key, r.technology_type]));
      return candidateKeys.map((k) => map.get(k) || null);
    }),

    // Batch load sub-product per candidate (active snapshot's sub_product_key)
    subProductByCandidateLoader: new DataLoader<number, DimProduct | null>(
      async (candidateKeys) => {
        const db = getDatabase();
        const placeholders = candidateKeys.map(() => "?").join(", ");
        const rows = db
          .prepare(
            `
          SELECT f.candidate_key, p.product_key, p.vin_productid, p.product_name, p.product_type
          FROM fact_pipeline_snapshot f
          JOIN dim_product p ON f.sub_product_key = p.product_key
          WHERE f.candidate_key IN (${placeholders})
            AND f.is_active_flag = 1
          GROUP BY f.candidate_key
        `,
          )
          .all(...candidateKeys) as (DimProduct & { candidate_key: number })[];
        const map = new Map(rows.map((r) => [r.candidate_key, r]));
        return candidateKeys.map((k) => map.get(k) || null);
      },
    ),

    // Batch load publications by candidate_key
    publicationsByCandidateLoader: new DataLoader<number, DimPublication[]>(
      async (candidateKeys) => {
        const db = getDatabase();
        const placeholders = candidateKeys.map(() => "?").join(", ");
        const rows = db
          .prepare(
            `
          SELECT publication_id, candidate_key, title, url, description
          FROM fact_publication
          WHERE candidate_key IN (${placeholders})
          ORDER BY publication_id
        `,
          )
          .all(...candidateKeys) as DimPublication[];
        const map = new Map<number, DimPublication[]>();
        for (const row of rows) {
          if (row.candidate_key === null) continue;
          const existing = map.get(row.candidate_key) || [];
          existing.push(row);
          map.set(row.candidate_key, existing);
        }
        return candidateKeys.map((k) => map.get(k) || []);
      },
    ),

    // Batch load approving authority names by candidate_key
    approvingAuthoritiesByCandidateLoader: new DataLoader<number, string[]>(
      async (candidateKeys) => {
        const db = getDatabase();
        const placeholders = candidateKeys.map(() => "?").join(", ");
        const rows = db
          .prepare(
            `
          SELECT b.candidate_key, a.authority_name
          FROM bridge_candidate_approving_authority b
          JOIN dim_approving_authority a ON b.authority_key = a.authority_key
          WHERE b.candidate_key IN (${placeholders})
          ORDER BY a.authority_name
        `,
          )
          .all(...candidateKeys) as Array<{ candidate_key: number; authority_name: string }>;
        const map = new Map<number, string[]>();
        for (const row of rows) {
          const existing = map.get(row.candidate_key) || [];
          existing.push(row.authority_name);
          map.set(row.candidate_key, existing);
        }
        return candidateKeys.map((k) => map.get(k) || []);
      },
    ),

    // Batch load age-group names by candidate_key
    ageGroupsByCandidateLoader: new DataLoader<number, string[]>(async (candidateKeys) => {
      const db = getDatabase();
      const placeholders = candidateKeys.map(() => "?").join(", ");
      const rows = db
        .prepare(
          `
        SELECT b.candidate_key, a.age_group_name
        FROM bridge_candidate_age_group b
        JOIN dim_age_group a ON b.age_group_key = a.age_group_key
        WHERE b.candidate_key IN (${placeholders})
        ORDER BY a.option_code
      `,
        )
        .all(...candidateKeys) as Array<{ candidate_key: number; age_group_name: string }>;
      const map = new Map<number, string[]>();
      for (const row of rows) {
        const existing = map.get(row.candidate_key) || [];
        existing.push(row.age_group_name);
        map.set(row.candidate_key, existing);
      }
      return candidateKeys.map((k) => map.get(k) || []);
    }),

    // Batch load org names linked to a candidate (used to enrich developer profiles)
    organizationsByCandidateLoader: new DataLoader<
      number,
      Array<{ org_name: string | null; org_type: string | null }>
    >(async (candidateKeys) => {
      const db = getDatabase();
      const placeholders = candidateKeys.map(() => "?").join(", ");
      const rows = db
        .prepare(
          `
        SELECT b.candidate_key, o.org_name, o.org_type
        FROM bridge_candidate_organization b
        JOIN dim_organization o ON b.organization_key = o.organization_key
        WHERE b.candidate_key IN (${placeholders})
      `,
        )
        .all(...candidateKeys) as Array<{
        candidate_key: number;
        org_name: string | null;
        org_type: string | null;
      }>;
      const map = new Map<number, Array<{ org_name: string | null; org_type: string | null }>>();
      for (const row of rows) {
        const existing = map.get(row.candidate_key) || [];
        existing.push({ org_name: row.org_name, org_type: row.org_type });
        map.set(row.candidate_key, existing);
      }
      return candidateKeys.map((k) => map.get(k) || []);
    }),

    // Batch load pipeline history (distinct year + phase per candidate)
    pipelineHistoryByCandidateLoader: new DataLoader<number, PipelineHistoryEntry[]>(
      async (candidateKeys) => {
        const db = getDatabase();
        const placeholders = candidateKeys.map(() => "?").join(", ");
        const rows = db
          .prepare(
            `
        SELECT DISTINCT f.candidate_key, dt.year, ph.phase_name
        FROM fact_pipeline_snapshot f
        JOIN dim_date dt ON f.date_key = dt.date_key
        JOIN dim_phase ph ON f.phase_key = ph.phase_key
        WHERE f.candidate_key IN (${placeholders})
        ORDER BY dt.year
      `,
          )
          .all(...candidateKeys) as Array<{
          candidate_key: number;
          year: number;
          phase_name: string;
        }>;
        const map = new Map<number, PipelineHistoryEntry[]>();
        for (const row of rows) {
          const existing = map.get(row.candidate_key) || [];
          existing.push({ year: row.year, phase_name: row.phase_name });
          map.set(row.candidate_key, existing);
        }
        return candidateKeys.map((k) => map.get(k) || []);
      },
    ),
  };
}

export type Loaders = ReturnType<typeof createLoaders>;
