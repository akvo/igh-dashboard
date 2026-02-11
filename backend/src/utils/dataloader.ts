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
} from "../db/types.js";

/**
 * Create DataLoaders for batch loading related entities.
 * Prevents N+1 query problems when resolving nested relationships.
 */
export function createLoaders() {
  return {
    // Batch load diseases by disease_key
    diseaseLoader: new DataLoader<number, DimDisease | null>(async (keys) => {
      const db = getDatabase();
      const placeholders = keys.map(() => "?").join(", ");
      const rows = db
        .prepare(
          `
          SELECT disease_key, vin_diseaseid, disease_name, global_health_area, disease_type
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
          SELECT bp.candidate_key, p.priority_key, p.vin_rdpriorityid, p.priority_name, p.indication, p.intended_use
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
          vin_rdpriorityid: row.vin_rdpriorityid,
          priority_name: row.priority_name,
          indication: row.indication,
          intended_use: row.intended_use,
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
          SELECT trial_id, candidate_key, start_date_key, trial_phase, enrollment_count, status
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
                 technology_key, regulatory_key, phase_key, date_key, is_active_flag
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
  };
}

export type Loaders = ReturnType<typeof createLoaders>;
