/**
 * Per-tab column definitions for the Extract Custom Data section.
 *
 * Each tab has its own set of available columns. Columns with
 * `accessor: null` represent fields not yet available from the API —
 * they appear in the column picker but render empty cells.
 *
 * Filter / sortable / hideable fields are added on the columns whose
 * accessor matches a backend column registry entry; unregistered
 * columns (e.g. `route_of_administration`, `target_population`) stay
 * available in the column picker but don't get an inline filter
 * affordance until the registry surfaces them.
 *
 * The historical `EXTRACT_FIXED_COLUMNS` per-tab "always-visible
 * first column" is now exposed as the first entry of each tab's
 * column array (with `hideable: false`); freeze is positional, so the
 * first visible column is automatically frozen and the user can
 * re-arrange via drag-reorder if they want a different one frozen.
 */

import { displayHealthArea } from './transformations/constants';
import { specificDiseaseLabel } from './exploreColumnConfig';

// =========================================================
// Available (toggleable) columns per tab
// =========================================================

export const EXTRACT_TAB_COLUMNS = {
  'candidates-approved': [
    {
      id: 'name',
      label: 'Name',
      accessor: 'candidate_name',
      csvAccessor: (row) => row.candidate_name || row.alternative_names,
      // Fall back to `alternative_names` when `candidate_name` is
      // empty — matches what the historical fixed-column render
      // showed. The TEXT filter still targets `candidate_name` only
      // (backend registry doesn't have a combined column); cell
      // display + CSV stay aligned with the previous UX.
      render: (v, row) => v || row.alternative_names,
      filter: { kind: 'text' },
      hideable: false,
    },
    { id: 'type', label: 'Type', accessor: 'candidate_type', filter: { kind: 'category' } },
    { id: 'altNames', label: 'Alternative names', accessor: 'alternative_names', type: 'line-clamp', filter: { kind: 'text' } },
    { id: 'gha', label: 'Global health area', accessor: 'global_health_area', csvAccessor: (row) => displayHealthArea(row.global_health_area), render: (v) => displayHealthArea(v), filter: { kind: 'category' } },
    { id: 'primaryDisease', label: 'Disease', accessor: 'disease_name', render: (_v, row) => specificDiseaseLabel(row), csvAccessor: (row) => specificDiseaseLabel(row), filter: { kind: 'category' } },
    { id: 'product', label: 'Product', accessor: 'product_name', filter: { kind: 'category' } },
    { id: 'subProduct', label: 'Sub product', accessor: 'sub_product_name', filter: { kind: 'category' } },
    { id: 'indication', label: 'Indication', accessor: 'indication', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'target', label: 'Target', accessor: 'target', filter: { kind: 'text' }, sortable: false },
    { id: 'techType', label: 'Technology type', accessor: 'technology_type', filter: { kind: 'category' } },
    { id: 'routeOfAdmin', label: 'Route of administration', accessor: 'route_of_administration', filter: { kind: 'category' } },
    { id: 'moa', label: 'Mechanism of action', accessor: 'mechanism_of_action', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'techPrinciple', label: 'Technology principle', accessor: 'technology_principle', filter: { kind: 'text' } },
    { id: 'testFormat', label: 'Test format', accessor: 'test_format', filter: { kind: 'category' } },
    { id: 'rdStageCurrent', label: 'R&D Stage current', accessor: 'current_rd_stage', filter: { kind: 'category' } },
    { id: 'rdStage2023', label: 'R&D Stage 2023', accessor: 'rd_stage_2023', filter: { kind: 'text' }, sortable: false },
    { id: 'rdStage2019', label: 'R&D Stage 2019', accessor: 'rd_stage_2019', filter: { kind: 'text' }, sortable: false },
    { id: 'developers', label: 'Developers', accessor: 'developers_agg', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'knownFunders', label: 'Known Funders', accessor: 'known_funders_agg', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'keyClinicalTrial', label: 'Key clinical trial', accessor: 'key_clinical_trial', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'chiModel', label: 'Controlled Human Infection Model', accessor: 'chim_study', filter: { kind: 'category' } },
    { id: 'targetPop', label: 'Target population', accessor: 'target_population', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'platform', label: 'Platform', accessor: 'platform', filter: { kind: 'category' } },
  ],

  'rd-priorities': [
    {
      id: 'priorityName',
      label: 'Title',
      accessor: 'priority_name',
      filter: { kind: 'text' },
      hideable: false,
    },
    { id: 'tppPpc', label: 'TPP/PPC', accessor: 'intended_use', filter: { kind: 'text' }, sortable: false },
    { id: 'disease', label: 'Disease', accessor: 'disease_name', filter: { kind: 'category' } },
    { id: 'product', label: 'Product', accessor: 'product_name', filter: { kind: 'category' } },
    { id: 'gha', label: 'Global health area', accessor: 'global_health_area', csvAccessor: (row) => displayHealthArea(row.global_health_area), render: (v) => displayHealthArea(v), filter: { kind: 'category' } },
    { id: 'author', label: 'Author', accessor: 'author', filter: { kind: 'text' } },
    { id: 'pubData', label: 'Publication data', accessor: 'publication_date', filter: { kind: 'text' } },
    { id: 'indication', label: 'Indication', accessor: 'indication', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'intendedUse', label: 'Intended use', accessor: 'intended_use', filter: { kind: 'text' }, sortable: false },
    { id: 'targetPop', label: 'Target population', accessor: 'target_population', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'efficacy', label: 'Efficacy', accessor: 'efficacy', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'safety', label: 'Safety', accessor: 'safety', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'source', label: 'Source', accessor: 'source', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'candidateName', label: 'Candidate name', accessor: 'candidate_name', filter: { kind: 'text' } },
    { id: 'rdStage', label: 'RD Stage', accessor: 'current_rd_stage', filter: { kind: 'category' } },
  ],

  'clinical-trials': [
    {
      id: 'candidateName',
      label: 'Candidate name',
      accessor: 'candidate_name',
      filter: { kind: 'text' },
      hideable: false,
    },
    { id: 'ctName', label: 'CT number', accessor: 'trial_name', filter: { kind: 'text' } },
    { id: 'ageGroup', label: 'Age group', accessor: 'age_groups', filter: { kind: 'text' }, sortable: false },
    { id: 'collaborator', label: 'Collaborator', accessor: 'collaborator', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'conditions', label: 'Conditions', accessor: 'disease_name', filter: { kind: 'category' } },
    { id: 'funderType', label: 'Funder type', accessor: 'funder_type', filter: { kind: 'category' } },
    { id: 'interventions', label: 'Interventions', accessor: 'interventions', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'location', label: 'Location', accessor: 'locations', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'outcomeMeasure', label: 'Outcome measure', accessor: 'outcome_measure', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'sex', label: 'Sex', accessor: 'sex', filter: { kind: 'category' } },
    { id: 'sponsor', label: 'Sponsor', accessor: 'sponsor', filter: { kind: 'text' } },
    { id: 'studyDesign', label: 'Study design', accessor: 'study_design', filter: { kind: 'text' }, sortable: false },
    { id: 'studyType', label: 'Study type', accessor: 'study_type', filter: { kind: 'category' } },
    { id: 'ctEnrollment', label: 'CT enrollment', accessor: 'enrollment_count', type: 'number', filter: { kind: 'number' } },
    { id: 'rdPhase', label: 'R&D phase', accessor: 'trial_phase', filter: { kind: 'category' } },
    { id: 'ctResultsStatus', label: 'CT results status', accessor: 'ct_results_status', filter: { kind: 'category' } },
    { id: 'ctResultType', label: 'CT result type', accessor: 'ct_results_type', filter: { kind: 'category' } },
    { id: 'ctTerminatedReason', label: 'CT terminated reason', accessor: 'ct_terminated_reason', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'description', label: 'Description', accessor: 'description', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'endDate', label: 'End date', accessor: 'end_date', filter: { kind: 'date' } },
    { id: 'startDate', label: 'Start date', accessor: 'start_date', filter: { kind: 'date' } },
    { id: 'lastUpdated', label: 'Last updated', accessor: 'last_updated', filter: { kind: 'date' } },
    { id: 'source', label: 'Source', accessor: 'source_text', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'ctTitle', label: 'CT title', accessor: 'trial_title', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
  ],

  'rd-only': [
    {
      id: 'priorityName',
      label: 'Title',
      accessor: 'priority_name',
      filter: { kind: 'text' },
      hideable: false,
    },
    { id: 'tppPpc', label: 'TPP/PPC', accessor: 'intended_use', filter: { kind: 'text' }, sortable: false },
    { id: 'disease', label: 'Disease', accessor: 'disease_name', filter: { kind: 'category' } },
    { id: 'product', label: 'Product', accessor: 'product_name', filter: { kind: 'category' } },
    { id: 'gha', label: 'Global health area', accessor: 'global_health_area', csvAccessor: (row) => displayHealthArea(row.global_health_area), render: (v) => displayHealthArea(v), filter: { kind: 'category' } },
    { id: 'author', label: 'Author', accessor: 'author', filter: { kind: 'text' } },
    { id: 'pubData', label: 'Publication data', accessor: 'publication_date', filter: { kind: 'text' } },
    { id: 'indication', label: 'Indication', accessor: 'indication', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'intendedUse', label: 'Intended use', accessor: 'intended_use', filter: { kind: 'text' }, sortable: false },
    { id: 'targetPop', label: 'Target population', accessor: 'target_population', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'efficacy', label: 'Efficacy', accessor: 'efficacy', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'safety', label: 'Safety', accessor: 'safety', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
    { id: 'source', label: 'Source', accessor: 'source', type: 'line-clamp', filter: { kind: 'text' }, sortable: false },
  ],
};

// =========================================================
// Fixed (always-visible) first column per tab — kept for backward
// compatibility with the unmigrated Extract page. Phase 3.6 deletes
// the legacy mount and these consumers along with it.
// =========================================================

export const EXTRACT_FIXED_COLUMNS = {
  'candidates-approved': {
    label: 'Name',
    accessor: (row) => row.candidate_name || row.alternative_names,
  },
  'rd-priorities': {
    label: 'Title',
    accessor: 'priority_name',
  },
  'clinical-trials': {
    label: 'Candidate name',
    accessor: 'candidate_name',
  },
  'rd-only': {
    label: 'Title',
    accessor: 'priority_name',
  },
};

// =========================================================
// Tab display metadata
// =========================================================

export const EXTRACT_TAB_LABELS = {
  'candidates-approved': 'Candidates & Approved Products',
  'rd-priorities': 'R&D Priorities & Candidates',
  'clinical-trials': 'Clinical Trials & Candidates',
  'rd-only': 'R&D Priorities',
};

/**
 * Row key accessor per tab — used as the React `key` prop in table rows.
 */
export const EXTRACT_ROW_KEY = {
  'candidates-approved': 'candidate_key',
  'rd-priorities': null,
  'clinical-trials': 'trial_id',
  'rd-only': 'priority_key',
};
