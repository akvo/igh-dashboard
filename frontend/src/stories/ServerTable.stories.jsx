import ServerTable from '../components/ui/ServerTable';
import { createHeatmapScale } from '../lib/heatmap';

export default {
  title: 'UI/ServerTable',
  component: ServerTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

// =========================================================
// Technology Type Heatmap — demonstrates logarithmic colour
// scaling on a right-skewed dataset (many 0–3 values with a
// few large outliers).
// =========================================================

const heatmapPhases = [
  { key: 'discovery', label: 'Discovery' },
  { key: 'preClinical', label: 'Pre-clinical' },
  { key: 'phase1', label: 'Phase 1' },
  { key: 'phase2', label: 'Phase 2' },
  { key: 'phase3', label: 'Phase 3' },
  { key: 'approved', label: 'Approved' },
];

const heatmapData = [
  { technology_type: 'Whole cell / lysate vaccines', discovery: 2, preClinical: 120, phase1: 8, phase2: 3, phase3: 1, approved: 0 },
  { technology_type: 'Protein subunit vaccines', discovery: 45, preClinical: 600, phase1: 30, phase2: 12, phase3: 5, approved: 2 },
  { technology_type: 'mRNA vaccines', discovery: 18, preClinical: 85, phase1: 15, phase2: 6, phase3: 2, approved: 1 },
  { technology_type: 'Viral vector vaccines', discovery: 10, preClinical: 42, phase1: 7, phase2: 3, phase3: 1, approved: 0 },
  { technology_type: 'DNA vaccines', discovery: 5, preClinical: 22, phase1: 3, phase2: 1, phase3: 0, approved: 0 },
  { technology_type: 'Conjugate vaccines', discovery: 3, preClinical: 15, phase1: 2, phase2: 1, phase3: 0, approved: 0 },
  { technology_type: 'Live attenuated vaccines', discovery: 1, preClinical: 8, phase1: 1, phase2: 0, phase3: 0, approved: 0 },
  { technology_type: 'Inactivated vaccines', discovery: 1, preClinical: 5, phase1: 0, phase2: 0, phase3: 0, approved: 0 },
  { technology_type: 'Toxoid vaccines', discovery: 0, preClinical: 2, phase1: 0, phase2: 0, phase3: 0, approved: 0 },
  { technology_type: 'Nanoparticle vaccines', discovery: 7, preClinical: 35, phase1: 4, phase2: 2, phase3: 0, approved: 0 },
  { technology_type: 'Outer membrane vesicle', discovery: 1, preClinical: 3, phase1: 0, phase2: 0, phase3: 0, approved: 0 },
  { technology_type: 'VLP vaccines', discovery: 2, preClinical: 10, phase1: 1, phase2: 0, phase3: 0, approved: 0 },
];

const phaseAccessors = heatmapPhases.map((p) => p.key);
const getHeatmapStyle = createHeatmapScale(heatmapData, phaseAccessors);

const heatmapColumns = [
  { header: 'Name', accessor: 'technology_type', minWidth: '250px' },
  ...heatmapPhases.map((phase) => ({
    header: phase.label,
    accessor: phase.key,
    cellStyle: (value) => getHeatmapStyle(value),
    render: (value) => (
      <span className="tabular-nums text-center block">{value || 0}</span>
    ),
  })),
];

export const TechnologyTypeHeatmap = {
  args: {
    columns: heatmapColumns,
    data: heatmapData,
    currentPage: 1,
    onPageChange: () => {},
    totalCount: heatmapData.length,
    hasNextPage: false,
    itemsPerPage: 20,
  },
};
