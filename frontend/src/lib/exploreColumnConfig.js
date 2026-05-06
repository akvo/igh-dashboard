/**
 * Shared column definitions for the Explore tab's three table types.
 *
 * Both the ServerTable JSX and the CSV download handlers consume
 * these arrays, so adding/removing a column only needs one change.
 *
 * Shape of each entry:
 *   header      — column header text (used by ServerTable and CSV label)
 *   accessor    — data key string (used by both table and CSV)
 *   csvAccessor — optional override for CSV (function or string)
 *   render      — optional display-only renderer (ServerTable)
 *   type        — optional ServerTable display hint (e.g. 'line-clamp')
 *   maxWidth    — optional ServerTable max width
 */

import { normalizeProductName } from './filterGroups';
import { displayHealthArea } from './transformations/constants';

// =========================================================
// Candidates (Explore → Aggregated portfolio → Candidates)
// =========================================================

export const CANDIDATE_COLUMNS = [
  {
    header: 'Name',
    accessor: 'candidate_name',
    csvAccessor: (row) => row.candidate_name || row.alternative_names,
    render: (value) => <div className="text-sm font-medium text-black">{value}</div>,
  },
  { header: 'GHA', accessor: 'global_health_area', csvAccessor: (row) => displayHealthArea(row.global_health_area), render: (v) => displayHealthArea(v) },
  { header: 'Disease', accessor: 'disease_name' },
  {
    header: 'Product',
    accessor: 'product_name',
    csvAccessor: (row) => normalizeProductName(row.product_name),
    render: (v) => normalizeProductName(v),
  },
  { header: 'R&D stage', accessor: 'current_rd_stage' },
  { header: 'Developers', accessor: 'developers_agg', type: 'line-clamp', maxWidth: '200px' },
  { header: 'Indication', accessor: 'indication', type: 'line-clamp', maxWidth: '200px' },
  { header: 'Indication type', accessor: 'indication_type' },
  { header: 'Health care facility level', accessor: 'healthcare_facility_level' },
  { header: 'Target', accessor: 'target' },
  { header: 'Mechanism of action', accessor: 'mechanism_of_action', type: 'line-clamp', maxWidth: '200px' },
  { header: 'Technology type', accessor: 'technology_type' },
  { header: 'Test format', accessor: 'test_format' },
  { header: 'Preclinical results status', accessor: 'preclinical_results_status' },
  { header: 'Type of preclinical results', accessor: 'type_of_preclinical_results' },
  { header: 'Preclinical results source', accessor: 'preclinical_results_source', type: 'line-clamp', maxWidth: '200px' },
  { header: 'Key features and challenges', accessor: 'key_features', type: 'line-clamp', maxWidth: '200px' },
  { header: 'Recent updates', accessor: 'recent_updates', type: 'line-clamp', maxWidth: '200px' },
];

// =========================================================
// Approved products (Explore → Aggregated portfolio → Approved)
// =========================================================

export const APPROVED_PRODUCT_COLUMNS = [
  {
    header: 'Name',
    accessor: 'candidate_name',
    csvAccessor: (row) => row.candidate_name || row.alternative_names,
    render: (value) => <div className="text-sm font-medium text-black">{value}</div>,
  },
  { header: 'GHA', accessor: 'global_health_area', csvAccessor: (row) => displayHealthArea(row.global_health_area), render: (v) => displayHealthArea(v) },
  { header: 'Disease', accessor: 'disease_name' },
  {
    header: 'Product',
    accessor: 'product_name',
    csvAccessor: (row) => normalizeProductName(row.product_name),
    render: (v) => normalizeProductName(v),
  },
  { header: 'R&D stage', accessor: 'current_rd_stage' },
  { header: 'Developers', accessor: 'developers_agg', type: 'line-clamp', maxWidth: '200px' },
  { header: 'Indication', accessor: 'indication', type: 'line-clamp', maxWidth: '200px' },
  { header: 'Indication type', accessor: 'indication_type' },
  { header: 'Health care facility level', accessor: 'healthcare_facility_level' },
  { header: 'Target', accessor: 'target' },
  { header: 'Mechanism of action', accessor: 'mechanism_of_action', type: 'line-clamp', maxWidth: '200px' },
  { header: 'Technology type', accessor: 'technology_type' },
  { header: 'Key features and challenges', accessor: 'key_features', type: 'line-clamp', maxWidth: '200px' },
  { header: 'Recent updates', accessor: 'recent_updates', type: 'line-clamp', maxWidth: '200px' },
  { header: 'Approval status', accessor: 'approval_status' },
  { header: 'Approving authority', accessor: 'approving_authorities_agg', type: 'line-clamp', maxWidth: '200px' },
  { header: 'National regulatory authority approval status', accessor: 'nra_approval_status' },
  { header: 'Stringent regulatory authority approval status', accessor: 'sra_approval_status' },
  { header: 'EMA approval status', accessor: 'ema_approval_status' },
  { header: 'Japanese MHLW approval status', accessor: 'japanese_mhlw_approval_status' },
  { header: 'US FDA approval status', accessor: 'us_fda_approval_status' },
];

// =========================================================
// Clinical trials (Explore → Aggregated portfolio → Trials)
// =========================================================

export const CLINICAL_TRIAL_COLUMNS = [
  {
    header: 'CT number',
    accessor: 'trial_name',
  },
  { header: 'Candidate / product name', accessor: 'candidate_name' },
  { header: 'Title', accessor: 'trial_title', render: (value) => <div className="text-sm font-medium text-black max-w-[300px]">{value}</div> },
  { header: 'Description', accessor: 'description', type: 'line-clamp', maxWidth: '200px' },
  { header: 'CT phase', accessor: 'trial_phase' },
  { header: 'CT status', accessor: 'status' },
  { header: 'Locations', accessor: 'locations', type: 'line-clamp', maxWidth: '200px' },
  { header: 'CT results status', accessor: 'ct_results_status' },
  { header: 'Start date', accessor: 'start_date' },
  { header: 'End date', accessor: 'end_date' },
  { header: 'Last updated', accessor: 'last_updated' },
  { header: 'Sponsor', accessor: 'sponsor' },
  { header: 'Collaborator', accessor: 'collaborator', type: 'line-clamp', maxWidth: '200px' },
  { header: 'Source', accessor: 'source_text', type: 'line-clamp', maxWidth: '200px' },
];

// =========================================================
// Helper: convert column defs to CSV-compatible format
// =========================================================

export function toCSVColumns(columns) {
  return columns.map((col) => ({
    label: col.header,
    accessor: col.csvAccessor || col.accessor,
  }));
}
