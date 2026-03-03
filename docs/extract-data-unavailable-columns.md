# Extract Custom Data — Unavailable Columns Audit

## Context

The Extract Custom Data section has 4 tabs, each with a set of toggleable columns defined in `frontend/src/lib/extractColumnConfig.js`. Columns with `accessor: null` appear in the column picker but render empty cells. This document traces each unavailable column through the full data pipeline (Dataverse → Silver → Star Schema → GraphQL → Frontend) to document what data exists and where each column is blocked.

## Summary

**28 columns across 4 tabs have `accessor: null`** and render as empty cells.

After deduplication (Tabs 2 and 4 share the same R&D Priority fields), there are **24 unique unavailable columns**. Of these:
- **20 columns** have data in the Silver layer (ranging from <1% to 100% populated) but are not mapped through to the star schema
- **4 columns** have no matching source field in Dataverse at all (Route of administration, Key clinical trial, Controlled human Infection Model, Platform)

---

## Tab 1: Candidates & Approved Products

8 unavailable columns out of 24 total.

| # | Column Label | Silver Field | Silver Rows (of 5340) | In Star Schema? | What's Needed |
|---|---|---|---|---|---|
| 1 | **Route of administration** | _(no matching field)_ | 0 | No | **No source data.** Not in Dataverse export. |
| 2 | **Technology principle** | `technologyprinciple` | 1581 (30%) | No | Add to `dim_candidate_core` in schema_map → backend query → GraphQL → frontend accessor |
| 3 | **R&D Stage 2023** | `new_rdstage2023` | 2147 (40%) | No | Add to `dim_candidate_core` in schema_map → backend query → GraphQL → frontend accessor |
| 4 | **R&D Stage 2019** | `2019RDstage` | 429 (8%) | No | Add to `dim_candidate_core` in schema_map → backend query → GraphQL → frontend accessor |
| 5 | **Key clinical trial** | _(no matching field)_ | 0 | No | **No source data.** Would require a join to `fact_clinical_trial_event` and selection logic. |
| 6 | **Controlled human Infection Model** | _(no matching field)_ | 0 | No | **No source data.** Not in Dataverse export. |
| 7 | **Target population** | `new_targetpopulation` | 158 (3%) | No | Add to `dim_candidate_core` in schema_map → backend query → GraphQL → frontend accessor. Very sparse. |
| 8 | **Platform** | _(no matching field)_ | 0 | No | **No source data.** Not in Dataverse export. |

### Summary for Tab 1
- **Can surface now (data exists in Silver):** Technology principle, R&D Stage 2023, R&D Stage 2019, Target population
- **No source data available:** Route of administration, Key clinical trial, Controlled human Infection Model, Platform

---

## Tab 2: R&D Priorities & Candidates

8 unavailable columns out of 16 total.

| # | Column Label | Silver Field | Silver Rows (of 66) | In Star Schema? | What's Needed |
|---|---|---|---|---|---|
| 1 | **Type of guidance** | `ppctitle` | 66 (100%) | No | Add to `dim_priority` in schema_map → backend query → GraphQL → frontend accessor |
| 2 | **Product** | `product_value` | 65 (98%) | No | This is a FK to `vin_products`. Add product join to `dim_priority` → backend query → GraphQL |
| 3 | **Author** | `author` | 64 (97%) | No | Add to `dim_priority` in schema_map → backend query → GraphQL → frontend accessor |
| 4 | **Publication data** | `publicationdate` | 63 (95%) | No | Add to `dim_priority` in schema_map → backend query → GraphQL → frontend accessor |
| 5 | **Target population** | `targetpopulation` | 62 (94%) | No | Add to `dim_priority` in schema_map → backend query → GraphQL → frontend accessor |
| 6 | **Efficacy** | `efficacy` | 57 (86%) | No | Add to `dim_priority` in schema_map → backend query → GraphQL → frontend accessor |
| 7 | **Safety** | `safety` | 57 (86%) | No | Add to `dim_priority` in schema_map → backend query → GraphQL → frontend accessor |
| 8 | **Source** | `source` | 58 (88%) | No | Add to `dim_priority` in schema_map → backend query → GraphQL → frontend accessor |

### Summary for Tab 2
- **All 8 columns have rich data in Silver (86–100% populated).** None are surfaced because `dim_priority` in the star schema only maps 5 columns (`rdpriorityid`, `priority_name`, `indication`, `intended_use`, `disease_key`).

---

## Tab 3: Clinical Trials & Candidates

7 unavailable columns out of 22 total.

| # | Column Label | Silver Field | Silver Rows (of 5165) | In Star Schema? | What's Needed |
|---|---|---|---|---|---|
| 1 | **Funder type** | `fundertype` | 597 (12%) | No | Add to `fact_clinical_trial_event` in schema_map → backend query → GraphQL → frontend accessor |
| 2 | **Interventions** | `interventions` | 1261 (24%) | No | Add to `fact_clinical_trial_event` in schema_map → backend query → GraphQL → frontend accessor |
| 3 | **Outcome measure** | `outcomemeasure_primary` + `outcomemeasure_secondary` | 1729 + 924 (34%/18%) | No | Add both to star schema, possibly combine or expose separately → backend → GraphQL → frontend |
| 4 | **Sex** | `sex` | 5165 (100%) | No | Add to `fact_clinical_trial_event` in schema_map → backend query → GraphQL → frontend accessor |
| 5 | **Study design** | `study_design` | 1386 (27%) | No | Add to `fact_clinical_trial_event` in schema_map → backend query → GraphQL → frontend accessor |
| 6 | **CT result type** | `ctresultstype` | 20 (<1%) | No | Add to `fact_clinical_trial_event` (very sparse — optionset resolution needed) |
| 7 | **CT terminated reason** | `ctterminatedreason` | 75 (1%) | No | Add to `fact_clinical_trial_event` (very sparse) |

### Summary for Tab 3
- **Can surface now (data exists in Silver):** All 7 columns have data, though density varies widely (from <1% to 100%)
- **Richest fields:** Sex (100%), Outcome measure primary (34%), Study design (27%), Interventions (24%)
- **Sparsest fields:** CT result type (<1%), CT terminated reason (1%), Funder type (12%)

---

## Tab 4: R&D Priorities (Only)

8 unavailable columns out of 14 total. (Same fields as Tab 2 minus the candidate-linked columns.)

| # | Column Label | Silver Field | Silver Rows (of 66) | In Star Schema? | What's Needed |
|---|---|---|---|---|---|
| 1 | **Type of guidance** | `ppctitle` | 66 (100%) | No | Same as Tab 2 — shared dimension |
| 2 | **Product** | `product_value` | 65 (98%) | No | Same as Tab 2 |
| 3 | **Author** | `author` | 64 (97%) | No | Same as Tab 2 |
| 4 | **Publication data** | `publicationdate` | 63 (95%) | No | Same as Tab 2 |
| 5 | **Target population** | `targetpopulation` | 62 (94%) | No | Same as Tab 2 |
| 6 | **Efficacy** | `efficacy` | 57 (86%) | No | Same as Tab 2 |
| 7 | **Safety** | `safety` | 57 (86%) | No | Same as Tab 2 |
| 8 | **Source** | `source` | 58 (88%) | No | Same as Tab 2 |

### Summary for Tab 4
- Identical to Tab 2 — both tabs read from `dim_priority` which is missing these columns.

---

## Data Pipeline Gap Summary

### Where the gaps are

All unavailable columns hit the **same bottleneck**: the star schema ETL (`schema_map.py`) doesn't map the Silver-layer fields into the star schema tables. The pipeline breaks down like this:

```
Dataverse → Silver (data EXISTS) → Star Schema (NOT MAPPED) → GraphQL (NOT EXPOSED) → Frontend (accessor: null)
```

### Unique unavailable fields (deduplicated across tabs): 20

| Source | Field | Data Density | Blocked At |
|---|---|---|---|
| **Candidates** | `technologyprinciple` | 30% | Star schema |
| **Candidates** | `new_rdstage2023` | 40% | Star schema |
| **Candidates** | `2019RDstage` | 8% | Star schema |
| **Candidates** | `new_targetpopulation` | 3% | Star schema |
| **Priorities** | `ppctitle` (type of guidance) | 100% | Star schema |
| **Priorities** | `product_value` | 98% | Star schema |
| **Priorities** | `author` | 97% | Star schema |
| **Priorities** | `publicationdate` | 95% | Star schema |
| **Priorities** | `targetpopulation` | 94% | Star schema |
| **Priorities** | `efficacy` | 86% | Star schema |
| **Priorities** | `safety` | 86% | Star schema |
| **Priorities** | `source` | 88% | Star schema |
| **Trials** | `fundertype` | 12% | Star schema |
| **Trials** | `interventions` | 24% | Star schema |
| **Trials** | `outcomemeasure_primary` | 34% | Star schema |
| **Trials** | `outcomemeasure_secondary` | 18% | Star schema |
| **Trials** | `sex` | 100% | Star schema |
| **Trials** | `study_design` | 27% | Star schema |
| **Trials** | `ctresultstype` | <1% | Star schema |
| **Trials** | `ctterminatedreason` | 1% | Star schema |

### Fields with NO source data (4 columns, all in Candidates tab)

| Column | Notes |
|---|---|
| Route of administration | No matching field in Dataverse/Silver layer |
| Key clinical trial | Would need computed logic (join trials → pick "key" one) — no direct source |
| Controlled human Infection Model (CHIM) | No matching field in Dataverse/Silver layer |
| Platform | No matching field in Dataverse/Silver layer |

---

## Files Involved

| Layer | File | Purpose |
|---|---|---|
| Frontend column config | `frontend/src/lib/extractColumnConfig.js` | Defines all tab columns, `accessor: null` marks unavailable |
| Frontend GraphQL queries | `frontend/src/graphql/queries/index.js` | Defines fields fetched per query |
| Backend SQL queries | `backend/src/db/queries/portfolioCandidates.ts` | Candidate SQL with joins |
| Backend SQL queries | `backend/src/db/queries/clinicalTrials.ts` | Trial SQL with joins |
| Backend SQL queries | `backend/src/db/queries/rdPriorities.ts` | Priority SQL with joins |
| Backend GraphQL schema | `backend/src/schema/typeDefs.ts` | GraphQL type definitions |
| Backend resolvers | `backend/src/schema/resolvers.ts` | Query resolvers |
| ETL schema map | `igh-data-transform/.../etl/config/schema_map.py` | Star schema column mappings |
| Silver DB | `igh-data-transform/data/silver.db` | Cleaned source data |
| Star schema DB | `backend/star_schema.db` | Analytics database |
