/**
 * Shared column definitions for the Explore tab's three table types.
 *
 * Both the DataTable JSX and the CSV download handlers consume
 * these arrays, so adding/removing a column only needs one change.
 *
 * Shape of each entry:
 *   header        — column header text (used by DataTable and CSV label)
 *   accessor      — data key string (used by both table and CSV)
 *   csvAccessor   — optional override for CSV (function or string)
 *   render        — optional display-only renderer (DataTable)
 *   type          — optional DataTable display hint (e.g. 'line-clamp')
 *   maxWidth      — optional DataTable max width
 *   filter        — DataTable filter config { kind: 'text'|'category'|'number'|'date' }
 *                   omit to make the column unfilterable
 *   sortable      — DataTable sort affordance (default true; set false to disable)
 *   hideable      — DataTable hide affordance (default true; set false for required cols)
 *   defaultHidden — start hidden in the visible-columns popover (default false)
 */

import { normalizeProductName } from './filterGroups';
import { displayHealthArea } from './transformations/constants';

// =========================================================
// Candidates (Explore → Aggregated portfolio → Candidates)
// =========================================================
//
// Exported as a factory so the page can inject `onExplore(row)` into
// the Name column's render. The original constant export is kept as
// a named CSV-export shape (without the Explore link in the render).

export function buildCandidateColumns({ onExplore } = {}) {
  return [
    {
      header: 'Name',
      accessor: 'candidate_name',
      csvAccessor: (row) => row.candidate_name || row.alternative_names,
      render: (value, row) => (
        <div>
          <div className="text-sm font-medium text-black">{value}</div>
          {onExplore && (
            <button
              type="button"
              className="text-xs text-[#c05f23] font-medium hover:underline cursor-pointer"
              onClick={() => onExplore(row)}
            >
              Explore →
            </button>
          )}
        </div>
      ),
      filter: { kind: 'text' },
    },
    {
      header: 'GHA',
      accessor: 'global_health_area',
      csvAccessor: (row) => displayHealthArea(row.global_health_area),
      render: (v) => displayHealthArea(v),
      filter: { kind: 'category' },
    },
    { header: 'Disease', accessor: 'disease_name', filter: { kind: 'category' } },
    {
      header: 'Product',
      accessor: 'product_name',
      csvAccessor: (row) => normalizeProductName(row.product_name),
      render: (v) => normalizeProductName(v),
      filter: { kind: 'category' },
    },
    { header: 'R&D stage', accessor: 'current_rd_stage', filter: { kind: 'category' } },
    { header: 'Sub product', accessor: 'sub_product_name', filter: { kind: 'category' } },
    // Aggregated string column — TEXT-only per the backend column registry.
    { header: 'Developers', accessor: 'developers_agg', type: 'line-clamp', maxWidth: '200px', filter: { kind: 'text' }, sortable: false },
    // Free-text columns (no deterministic sort).
    { header: 'Indication', accessor: 'indication', type: 'line-clamp', maxWidth: '200px', filter: { kind: 'text' }, sortable: false },
    { header: 'Indication type', accessor: 'indication_type', filter: { kind: 'category' } },
    { header: 'Health care facility level', accessor: 'healthcare_facility_level', filter: { kind: 'category' } },
    { header: 'Target', accessor: 'target', filter: { kind: 'text' }, sortable: false },
    { header: 'Mechanism of action', accessor: 'mechanism_of_action', type: 'line-clamp', maxWidth: '200px', filter: { kind: 'text' }, sortable: false },
    { header: 'Technology type', accessor: 'technology_type', filter: { kind: 'category' } },
    { header: 'Test format', accessor: 'test_format', filter: { kind: 'category' } },
    { header: 'Preclinical results status', accessor: 'preclinical_results_status', filter: { kind: 'category' } },
    { header: 'Type of preclinical results', accessor: 'type_of_preclinical_results', filter: { kind: 'category' } },
    { header: 'Preclinical results source', accessor: 'preclinical_results_source', type: 'line-clamp', maxWidth: '200px', filter: { kind: 'text' }, sortable: false },
    { header: 'Key features and challenges', accessor: 'key_features', type: 'line-clamp', maxWidth: '200px', filter: { kind: 'text' }, sortable: false },
    { header: 'Recent updates', accessor: 'recent_updates', type: 'line-clamp', maxWidth: '200px', filter: { kind: 'text' }, sortable: false },
  ];
}

// Back-compat constant for CSV column derivation and any consumer
// that doesn't need the Explore link. It calls the factory with no
// onExplore, so the Name column has no button.
export const CANDIDATE_COLUMNS = buildCandidateColumns();

// =========================================================
// Approved products (Explore → Aggregated portfolio → Approved)
// =========================================================

export function buildApprovedProductColumns({ onExplore } = {}) {
  return [
    {
      header: 'Name',
      accessor: 'candidate_name',
      csvAccessor: (row) => row.candidate_name || row.alternative_names,
      render: (value, row) => (
        <div>
          <div className="text-sm font-medium text-black">{value}</div>
          {onExplore && (
            <button
              type="button"
              className="text-xs text-[#c05f23] font-medium hover:underline cursor-pointer"
              onClick={() => onExplore(row)}
            >
              Explore →
            </button>
          )}
        </div>
      ),
      filter: { kind: 'text' },
    },
    {
      header: 'GHA',
      accessor: 'global_health_area',
      csvAccessor: (row) => displayHealthArea(row.global_health_area),
      render: (v) => displayHealthArea(v),
      filter: { kind: 'category' },
    },
    { header: 'Disease', accessor: 'disease_name', filter: { kind: 'category' } },
    {
      header: 'Product',
      accessor: 'product_name',
      csvAccessor: (row) => normalizeProductName(row.product_name),
      render: (v) => normalizeProductName(v),
      filter: { kind: 'category' },
    },
    { header: 'R&D stage', accessor: 'current_rd_stage', filter: { kind: 'category' } },
    { header: 'Sub product', accessor: 'sub_product_name', filter: { kind: 'category' } },
    { header: 'Developers', accessor: 'developers_agg', type: 'line-clamp', maxWidth: '200px', filter: { kind: 'text' }, sortable: false },
    { header: 'Indication', accessor: 'indication', type: 'line-clamp', maxWidth: '200px', filter: { kind: 'text' }, sortable: false },
    { header: 'Indication type', accessor: 'indication_type', filter: { kind: 'category' } },
    { header: 'Health care facility level', accessor: 'healthcare_facility_level', filter: { kind: 'category' } },
    { header: 'Target', accessor: 'target', filter: { kind: 'text' }, sortable: false },
    { header: 'Mechanism of action', accessor: 'mechanism_of_action', type: 'line-clamp', maxWidth: '200px', filter: { kind: 'text' }, sortable: false },
    { header: 'Technology type', accessor: 'technology_type', filter: { kind: 'category' } },
    { header: 'Key features and challenges', accessor: 'key_features', type: 'line-clamp', maxWidth: '200px', filter: { kind: 'text' }, sortable: false },
    { header: 'Recent updates', accessor: 'recent_updates', type: 'line-clamp', maxWidth: '200px', filter: { kind: 'text' }, sortable: false },
    { header: 'Approval status', accessor: 'approval_status', filter: { kind: 'category' } },
    // Aggregated text — backed by a correlated GROUP_CONCAT subquery in
    // the list query and registered with the same subquery as sqlExpr in
    // the backend column registry, so TEXT filter emits a LIKE against
    // the concatenated authority list.
    { header: 'Approving authority', accessor: 'approving_authorities_agg', type: 'line-clamp', maxWidth: '200px', filter: { kind: 'text' }, sortable: false },
    { header: 'National regulatory authority approval status', accessor: 'nra_approval_status', filter: { kind: 'category' } },
    { header: 'Stringent regulatory authority approval status', accessor: 'sra_approval_status', filter: { kind: 'category' } },
    { header: 'EMA approval status', accessor: 'ema_approval_status', filter: { kind: 'category' } },
    { header: 'Japanese MHLW approval status', accessor: 'japanese_mhlw_approval_status', filter: { kind: 'category' } },
    { header: 'US FDA approval status', accessor: 'us_fda_approval_status', filter: { kind: 'category' } },
  ];
}

export const APPROVED_PRODUCT_COLUMNS = buildApprovedProductColumns();

// =========================================================
// Clinical trials (Explore → Aggregated portfolio → Trials)
// =========================================================

export function buildClinicalTrialColumns({ onExplore } = {}) {
  return [
    {
      header: 'CT number',
      accessor: 'trial_name',
      render: (value, row) => (
        <div>
          <div className="text-sm font-medium text-black">{value}</div>
          {onExplore && (
            <button
              type="button"
              className="text-xs text-[#c05f23] font-medium hover:underline cursor-pointer"
              onClick={() => onExplore(row)}
            >
              Explore →
            </button>
          )}
        </div>
      ),
      filter: { kind: 'text' },
    },
    { header: 'Candidate / product name', accessor: 'candidate_name', filter: { kind: 'text' } },
    // trial_title and description are free-text — backend supports LIKE
    // matching but neither is sortable.
    { header: 'Title', accessor: 'trial_title', render: (value) => <div className="text-sm font-medium text-black max-w-[300px]">{value}</div>, filter: { kind: 'text' }, sortable: false },
    { header: 'Description', accessor: 'description', type: 'line-clamp', maxWidth: '200px', filter: { kind: 'text' }, sortable: false },
    { header: 'CT phase', accessor: 'trial_phase', filter: { kind: 'category' } },
    { header: 'CT status', accessor: 'status', filter: { kind: 'category' } },
    // Aggregated semicolon-joined strings — TEXT only.
    { header: 'Locations', accessor: 'locations', type: 'line-clamp', maxWidth: '200px', filter: { kind: 'text' }, sortable: false },
    { header: 'CT results status', accessor: 'ct_results_status', filter: { kind: 'category' } },
    { header: 'Start date', accessor: 'start_date', filter: { kind: 'date' } },
    { header: 'End date', accessor: 'end_date', filter: { kind: 'date' } },
    { header: 'Last updated', accessor: 'last_updated', filter: { kind: 'date' } },
    { header: 'Sponsor', accessor: 'sponsor', filter: { kind: 'text' } },
    { header: 'Collaborator', accessor: 'collaborator', type: 'line-clamp', maxWidth: '200px', filter: { kind: 'text' }, sortable: false },
    { header: 'Source', accessor: 'source_text', type: 'line-clamp', maxWidth: '200px', filter: { kind: 'text' }, sortable: false },
  ];
}

export const CLINICAL_TRIAL_COLUMNS = buildClinicalTrialColumns();

// =========================================================
// Helper: convert column defs to CSV-compatible format
// =========================================================

export function toCSVColumns(columns) {
  return columns.map((col) => ({
    label: col.header,
    accessor: col.csvAccessor || col.accessor,
  }));
}
