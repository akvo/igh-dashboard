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
    { id: 'routeOfAdmin', label: 'Route of administration', accessor: 'route_of_administration' },
    { id: 'moa', label: 'Mechanism of action', accessor: 'mechanism_of_action' },
    { id: 'techPrinciple', label: 'Technology principle', accessor: 'technology_principle' },
    { id: 'testFormat', label: 'Test format', accessor: 'test_format' },
    { id: 'rdStageCurrent', label: 'R&D Stage current', accessor: 'current_rd_stage' },
    { id: 'rdStage2023', label: 'R&D Stage 2023', accessor: 'rd_stage_2023' },
    { id: 'rdStage2019', label: 'R&D Stage 2019', accessor: 'rd_stage_2019' },
    { id: 'developers', label: 'Developers', accessor: 'developers_agg' },
    { id: 'knownFunders', label: 'Known Funders', accessor: 'known_funders_agg' },
    { id: 'keyClinicalTrial', label: 'Key clinical trial', accessor: 'key_clinical_trial' },
    { id: 'chiModel', label: 'Controlled human Infection Model', accessor: 'chim_study' },
    { id: 'targetPop', label: 'Target population', accessor: 'target_population' },
    { id: 'platform', label: 'Platform', accessor: 'platform' },
  ],

  'rd-priorities': [
    { id: 'title', label: 'Title', accessor: 'priority_name' },
    { id: 'tppPpc', label: 'TPP/PPC', accessor: 'intended_use' },
    { id: 'typeOfGuidance', label: 'Type of guidance', accessor: 'type_of_guidance' },
    { id: 'disease', label: 'Disease', accessor: 'disease_name' },
    { id: 'product', label: 'Product', accessor: 'product_name' },
    { id: 'gha', label: 'Global Health area', accessor: 'global_health_area' },
    { id: 'author', label: 'Author', accessor: 'author' },
    { id: 'pubData', label: 'Publication data', accessor: 'publication_date' },
    { id: 'indication', label: 'Indication', accessor: 'indication' },
    { id: 'intendedUse', label: 'Intended use', accessor: 'intended_use' },
    { id: 'targetPop', label: 'Target population', accessor: 'target_population' },
    { id: 'efficacy', label: 'Efficacy', accessor: 'efficacy' },
    { id: 'safety', label: 'Safety', accessor: 'safety' },
    { id: 'source', label: 'Source', accessor: 'source' },
    { id: 'candidateName', label: 'Candidate name', accessor: 'candidate_name' },
    { id: 'rdStage', label: 'RD Stage', accessor: 'current_rd_stage' },
  ],

  'clinical-trials': [
    { id: 'ageGroup', label: 'Age group', accessor: 'age_groups' },
    { id: 'collaborator', label: 'Collaborator', accessor: 'collaborator' },
    { id: 'conditions', label: 'Conditions', accessor: 'disease_name' },
    { id: 'funderType', label: 'Funder type', accessor: 'funder_type' },
    { id: 'interventions', label: 'Interventions', accessor: 'interventions' },
    { id: 'location', label: 'Location', accessor: 'locations' },
    { id: 'outcomeMeasure', label: 'Outcome measure', accessor: 'outcome_measure' },
    { id: 'sex', label: 'Sex', accessor: 'sex' },
    { id: 'sponsor', label: 'Sponsor', accessor: 'sponsor' },
    { id: 'studyDesign', label: 'Study design', accessor: 'study_design' },
    { id: 'studyType', label: 'Study type', accessor: 'study_type' },
    { id: 'ctId', label: 'Clinical trial ID', accessor: 'clinicaltrialid' },
    { id: 'ctEnrollment', label: 'CT enrollment', accessor: 'enrollment_count' },
    { id: 'rdPhase', label: 'R&D phase', accessor: 'trial_phase' },
    { id: 'ctResultsStatus', label: 'CT results status', accessor: 'ct_results_status' },
    { id: 'ctResultType', label: 'CT result type', accessor: 'ct_results_type' },
    { id: 'ctTerminatedReason', label: 'CT terminated reason', accessor: 'ct_terminated_reason' },
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
    { id: 'typeOfGuidance', label: 'Type of guidance', accessor: 'type_of_guidance' },
    { id: 'disease', label: 'Disease', accessor: 'disease_name' },
    { id: 'product', label: 'Product', accessor: 'product_name' },
    { id: 'gha', label: 'Global Health area', accessor: 'global_health_area' },
    { id: 'author', label: 'Author', accessor: 'author' },
    { id: 'pubData', label: 'Publication data', accessor: 'publication_date' },
    { id: 'indication', label: 'Indication', accessor: 'indication' },
    { id: 'intendedUse', label: 'Intended use', accessor: 'intended_use' },
    { id: 'targetPop', label: 'Target population', accessor: 'target_population' },
    { id: 'efficacy', label: 'Efficacy', accessor: 'efficacy' },
    { id: 'safety', label: 'Safety', accessor: 'safety' },
    { id: 'source', label: 'Source', accessor: 'source' },
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
