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

// =========================================================
// Available (toggleable) columns per tab
// =========================================================

export const EXTRACT_TAB_COLUMNS = {
  'candidates-approved': [
    { id: 'type', label: 'Type', accessor: 'candidate_type' },
    { id: 'ighId', label: 'IGH ID', accessor: 'candidateid' },
    { id: 'altNames', label: 'Alternative names', accessor: 'alternative_names' },
    { id: 'gha', label: 'Global health area', accessor: 'global_health_area' },
    { id: 'primaryDisease', label: 'Primary disease', accessor: 'disease_name' },
    { id: 'secondaryDisease', label: 'Secondary disease', accessor: 'secondary_disease_name' },
    { id: 'product', label: 'Product', accessor: 'product_name' },
    { id: 'subProduct', label: 'Sub product', accessor: 'sub_product_name' },
    { id: 'indication', label: 'Indication', accessor: 'indication' },
    { id: 'target', label: 'Target', accessor: 'target' },
    { id: 'techType', label: 'Technology type', accessor: 'technology_type' },
    { id: 'routeOfAdmin', label: 'Route of administration', accessor: null },
    { id: 'moa', label: 'Mechanism of action', accessor: 'mechanism_of_action' },
    { id: 'techPrinciple', label: 'Technology principle', accessor: null },
    { id: 'testFormat', label: 'Test format', accessor: 'test_format' },
    { id: 'rdStageCurrent', label: 'R&D Stage current', accessor: 'current_rd_stage' },
    { id: 'rdStage2023', label: 'R&D Stage 2023', accessor: null },
    { id: 'rdStage2019', label: 'R&D Stage 2019', accessor: null },
    { id: 'developers', label: 'Developers', accessor: 'developers_agg' },
    { id: 'knownFunders', label: 'Known Funders', accessor: 'known_funders_agg' },
    { id: 'keyClinicalTrial', label: 'Key clinical trial', accessor: null },
    { id: 'chiModel', label: 'Controlled human Infection Model', accessor: null },
    { id: 'targetPop', label: 'Target population', accessor: null },
    { id: 'platform', label: 'Platform', accessor: null },
  ],

  'rd-priorities': [
    { id: 'title', label: 'Title', accessor: 'priority_name' },
    { id: 'tppPpc', label: 'TPP/PPC', accessor: 'intended_use' },
    { id: 'typeOfGuidance', label: 'Type of guidance', accessor: null },
    { id: 'disease', label: 'Disease', accessor: 'disease_name' },
    { id: 'product', label: 'Product', accessor: null },
    { id: 'gha', label: 'Global Health area', accessor: 'global_health_area' },
    { id: 'author', label: 'Author', accessor: null },
    { id: 'pubData', label: 'Publication data', accessor: null },
    { id: 'indication', label: 'Indication', accessor: 'indication' },
    { id: 'intendedUse', label: 'Intended use', accessor: 'intended_use' },
    { id: 'targetPop', label: 'Target population', accessor: null },
    { id: 'efficacy', label: 'Efficacy', accessor: null },
    { id: 'safety', label: 'Safety', accessor: null },
    { id: 'source', label: 'Source', accessor: null },
    { id: 'candidateName', label: 'Candidate name', accessor: 'candidate_name' },
    { id: 'rdStage', label: 'RD Stage', accessor: 'current_rd_stage' },
  ],

  'clinical-trials': [
    { id: 'ageGroup', label: 'Age group', accessor: 'age_groups' },
    { id: 'collaborator', label: 'Collaborator', accessor: 'collaborator' },
    { id: 'conditions', label: 'Conditions', accessor: 'disease_name' },
    { id: 'funderType', label: 'Funder type', accessor: null },
    { id: 'interventions', label: 'Interventions', accessor: null },
    { id: 'location', label: 'Location', accessor: 'locations' },
    { id: 'outcomeMeasure', label: 'Outcome measure', accessor: null },
    { id: 'sex', label: 'Sex', accessor: null },
    { id: 'sponsor', label: 'Sponsor', accessor: 'sponsor' },
    { id: 'studyDesign', label: 'Study design', accessor: null },
    { id: 'studyType', label: 'Study type', accessor: 'study_type' },
    { id: 'ctId', label: 'Clinical trial ID', accessor: 'clinicaltrialid' },
    { id: 'ctEnrollment', label: 'CT enrollment', accessor: 'enrollment_count' },
    { id: 'rdPhase', label: 'R&D phase', accessor: 'trial_phase' },
    { id: 'ctResultsStatus', label: 'CT results status', accessor: 'ct_results_status' },
    { id: 'ctResultType', label: 'CT result type', accessor: null },
    { id: 'ctTerminatedReason', label: 'CT terminated reason', accessor: null },
    { id: 'description', label: 'Description', accessor: 'description' },
    { id: 'endDate', label: 'End date', accessor: 'end_date' },
    { id: 'startDate', label: 'Start date', accessor: 'start_date' },
    { id: 'ctName', label: 'CT name', accessor: 'trial_name' },
    { id: 'source', label: 'Source', accessor: 'source_text' },
    { id: 'ctTitle', label: 'CT title', accessor: 'trial_title' },
  ],

  'rd-only': [
    { id: 'title', label: 'Title', accessor: 'priority_name' },
    { id: 'tppPpc', label: 'TPP/PPC', accessor: 'intended_use' },
    { id: 'typeOfGuidance', label: 'Type of guidance', accessor: null },
    { id: 'disease', label: 'Disease', accessor: 'disease_name' },
    { id: 'product', label: 'Product', accessor: null },
    { id: 'gha', label: 'Global Health area', accessor: 'global_health_area' },
    { id: 'author', label: 'Author', accessor: null },
    { id: 'pubData', label: 'Publication data', accessor: null },
    { id: 'indication', label: 'Indication', accessor: 'indication' },
    { id: 'intendedUse', label: 'Intended use', accessor: 'intended_use' },
    { id: 'targetPop', label: 'Target population', accessor: null },
    { id: 'efficacy', label: 'Efficacy', accessor: null },
    { id: 'safety', label: 'Safety', accessor: null },
    { id: 'source', label: 'Source', accessor: null },
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
    label: 'Priority ID',
    accessor: 'rdpriorityid',
  },
  'clinical-trials': {
    label: 'Candidate name',
    accessor: 'candidate_name',
  },
  'rd-only': {
    label: 'Priority ID',
    accessor: 'rdpriorityid',
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
  'rd-priorities': 'priority_key',
  'clinical-trials': 'trial_id',
  'rd-only': 'priority_key',
};
