/**
 * Per-tab column definitions for the Extract Custom Data section.
 *
 * Each tab has its own set of available columns. Columns with
 * `accessor: null` represent fields not yet available from the API —
 * they appear in the column picker but render empty cells.
 *
 * Every tab also has a fixed first column (always visible, not
 * toggleable) defined in EXTRACT_FIXED_COLUMNS.
 */

import { normalizeProductName } from './filterGroups';
import { displayHealthArea } from './transformations/constants';

// =========================================================
// Available (toggleable) columns per tab
// =========================================================

export const EXTRACT_TAB_COLUMNS = {
  'candidates-approved': [
    { id: 'type', label: 'Type', accessor: 'candidate_type' },
{ id: 'altNames', label: 'Alternative names', accessor: 'alternative_names', type: 'line-clamp' },
    { id: 'gha', label: 'Global health area', accessor: 'global_health_area', csvAccessor: (row) => displayHealthArea(row.global_health_area), render: (v) => displayHealthArea(v) },
    { id: 'primaryDisease', label: 'Primary disease', accessor: 'disease_name' },
    { id: 'product', label: 'Product', accessor: 'product_name', csvAccessor: (row) => normalizeProductName(row.product_name), render: (v) => normalizeProductName(v) },
    { id: 'subProduct', label: 'Sub product', accessor: 'sub_product_name' },
    { id: 'indication', label: 'Indication', accessor: 'indication', type: 'line-clamp' },
    { id: 'target', label: 'Target', accessor: 'target' },
    { id: 'techType', label: 'Technology type', accessor: 'technology_type' },
    { id: 'routeOfAdmin', label: 'Route of administration', accessor: 'route_of_administration' },
    { id: 'moa', label: 'Mechanism of action', accessor: 'mechanism_of_action', type: 'line-clamp' },
    { id: 'techPrinciple', label: 'Technology principle', accessor: 'technology_principle' },
    { id: 'testFormat', label: 'Test format', accessor: 'test_format' },
    { id: 'rdStageCurrent', label: 'R&D Stage current', accessor: 'current_rd_stage' },
    { id: 'rdStage2023', label: 'R&D Stage 2023', accessor: 'rd_stage_2023' },
    { id: 'rdStage2019', label: 'R&D Stage 2019', accessor: 'rd_stage_2019' },
    { id: 'developers', label: 'Developers', accessor: 'developers_agg', type: 'line-clamp' },
    { id: 'knownFunders', label: 'Known Funders', accessor: 'known_funders_agg', type: 'line-clamp' },
    { id: 'keyClinicalTrial', label: 'Key clinical trial', accessor: 'key_clinical_trial', type: 'line-clamp' },
    { id: 'chiModel', label: 'Controlled Human Infection Model', accessor: 'chim_study' },
    { id: 'targetPop', label: 'Target population', accessor: 'target_population', type: 'line-clamp' },
    { id: 'platform', label: 'Platform', accessor: 'platform' },
  ],

  'rd-priorities': [
    { id: 'tppPpc', label: 'TPP/PPC', accessor: 'intended_use' },
    { id: 'disease', label: 'Disease', accessor: 'disease_name' },
    { id: 'product', label: 'Product', accessor: 'product_name', csvAccessor: (row) => normalizeProductName(row.product_name), render: (v) => normalizeProductName(v) },
    { id: 'gha', label: 'Global health area', accessor: 'global_health_area', csvAccessor: (row) => displayHealthArea(row.global_health_area), render: (v) => displayHealthArea(v) },
    { id: 'author', label: 'Author', accessor: 'author' },
    { id: 'pubData', label: 'Publication data', accessor: 'publication_date' },
    { id: 'indication', label: 'Indication', accessor: 'indication', type: 'line-clamp' },
    { id: 'intendedUse', label: 'Intended use', accessor: 'intended_use' },
    { id: 'targetPop', label: 'Target population', accessor: 'target_population', type: 'line-clamp' },
    { id: 'efficacy', label: 'Efficacy', accessor: 'efficacy', type: 'line-clamp' },
    { id: 'safety', label: 'Safety', accessor: 'safety', type: 'line-clamp' },
    { id: 'source', label: 'Source', accessor: 'source', type: 'line-clamp' },
    { id: 'candidateName', label: 'Candidate name', accessor: 'candidate_name' },
    { id: 'rdStage', label: 'RD Stage', accessor: 'current_rd_stage' },
  ],

  'clinical-trials': [
    { id: 'ageGroup', label: 'Age group', accessor: 'age_groups' },
    { id: 'collaborator', label: 'Collaborator', accessor: 'collaborator', type: 'line-clamp' },
    { id: 'conditions', label: 'Conditions', accessor: 'disease_name' },
    { id: 'funderType', label: 'Funder type', accessor: 'funder_type' },
    { id: 'interventions', label: 'Interventions', accessor: 'interventions', type: 'line-clamp' },
    { id: 'location', label: 'Location', accessor: 'locations', type: 'line-clamp' },
    { id: 'outcomeMeasure', label: 'Outcome measure', accessor: 'outcome_measure', type: 'line-clamp' },
    { id: 'sex', label: 'Sex', accessor: 'sex' },
    { id: 'sponsor', label: 'Sponsor', accessor: 'sponsor' },
    { id: 'studyDesign', label: 'Study design', accessor: 'study_design' },
    { id: 'studyType', label: 'Study type', accessor: 'study_type' },
{ id: 'ctEnrollment', label: 'CT enrollment', accessor: 'enrollment_count' },
    { id: 'rdPhase', label: 'R&D phase', accessor: 'trial_phase' },
    { id: 'ctResultsStatus', label: 'CT results status', accessor: 'ct_results_status' },
    { id: 'ctResultType', label: 'CT result type', accessor: 'ct_results_type' },
    { id: 'ctTerminatedReason', label: 'CT terminated reason', accessor: 'ct_terminated_reason', type: 'line-clamp' },
    { id: 'description', label: 'Description', accessor: 'description', type: 'line-clamp' },
    { id: 'endDate', label: 'End date', accessor: 'end_date' },
    { id: 'startDate', label: 'Start date', accessor: 'start_date' },
    { id: 'lastUpdated', label: 'Last updated', accessor: 'last_updated' },
    { id: 'ctName', label: 'CT number', accessor: 'trial_name' },
    { id: 'source', label: 'Source', accessor: 'source_text', type: 'line-clamp' },
    { id: 'ctTitle', label: 'CT title', accessor: 'trial_title', type: 'line-clamp' },
  ],

  'rd-only': [
    { id: 'tppPpc', label: 'TPP/PPC', accessor: 'intended_use' },
    { id: 'disease', label: 'Disease', accessor: 'disease_name' },
    { id: 'product', label: 'Product', accessor: 'product_name', csvAccessor: (row) => normalizeProductName(row.product_name), render: (v) => normalizeProductName(v) },
    { id: 'gha', label: 'Global health area', accessor: 'global_health_area', csvAccessor: (row) => displayHealthArea(row.global_health_area), render: (v) => displayHealthArea(v) },
    { id: 'author', label: 'Author', accessor: 'author' },
    { id: 'pubData', label: 'Publication data', accessor: 'publication_date' },
    { id: 'indication', label: 'Indication', accessor: 'indication', type: 'line-clamp' },
    { id: 'intendedUse', label: 'Intended use', accessor: 'intended_use' },
    { id: 'targetPop', label: 'Target population', accessor: 'target_population', type: 'line-clamp' },
    { id: 'efficacy', label: 'Efficacy', accessor: 'efficacy', type: 'line-clamp' },
    { id: 'safety', label: 'Safety', accessor: 'safety', type: 'line-clamp' },
    { id: 'source', label: 'Source', accessor: 'source', type: 'line-clamp' },
  ],
};

// =========================================================
// Fixed (always-visible) first column per tab
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
