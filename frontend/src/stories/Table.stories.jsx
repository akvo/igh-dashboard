import Table from '../components/ui/Table';

export default {
  title: 'UI/Table',
  component: Table,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

// Sample data for candidates table
const candidatesData = [
  {
    id: 1,
    globalHealthArea: 'Sexual & reproductive health',
    type: 'AIM candidate',
    idNumber: '5,891.00',
    name: 'PreEclampsia Predictor with Machine Learning (PEPrML)',
    disease: 'Preeclampsia/eclampsia (PE/E)',
    ownedArea: 'No secondary disease',
    products: 'Diagnostics',
    subProduct: 'Multi parametric tests',
    rdStage: 'Early',
  },
  {
    id: 2,
    globalHealthArea: 'Mental health support',
    type: 'AIM candidate',
    idNumber: '12,450.00',
    name: 'Cognitive Behavioral Therapy App',
    disease: 'Depression & anxiety',
    ownedArea: 'No co occurring disorders',
    products: 'Therapeutics',
    subProduct: 'Digital interventions',
    rdStage: 'Late',
  },
  {
    id: 3,
    globalHealthArea: 'Cardiovascular wellness',
    type: 'AIM candidate',
    idNumber: '8,230.00',
    name: 'Personalized Nutrition Tracker',
    disease: 'Hypertension management',
    ownedArea: 'Mild anxiety symptoms',
    products: 'Monitoring',
    subProduct: 'Behavioral analytics',
    rdStage: 'On Time',
  },
  {
    id: 4,
    globalHealthArea: 'Diabetes management',
    type: 'AIM candidate',
    idNumber: '7,800.00',
    name: 'Smart Sleep Assistant',
    disease: 'Gestational diabetes',
    ownedArea: 'Occasional depression',
    products: 'Prognostics',
    subProduct: 'Predictive modeling',
    rdStage: 'Delayed',
  },
  {
    id: 5,
    globalHealthArea: 'Nutrition guidance',
    type: 'AIM candidate',
    idNumber: '14,600.00',
    name: 'Virtual Reality Exposure Therapy',
    disease: 'Thyroid disorders',
    ownedArea: 'History of substance use disorder',
    products: 'Prevention',
    subProduct: 'User experience research',
    rdStage: 'Cancelled',
  },
  {
    id: 6,
    globalHealthArea: 'Chronic pain management',
    type: 'AIM candidate',
    idNumber: '9,300.00',
    name: 'Telemedicine Platform for Rural Areas',
    disease: 'Postpartum hemorrhage',
    ownedArea: 'Post traumatic stress disorder (PTSD)',
    products: 'Rehabilitation',
    subProduct: 'Machine learning applications',
    rdStage: 'Rescheduled',
  },
];

// Sample data for clinical trials
const clinicalTrialsData = [
  {
    id: 1,
    name: 'NCT06558643',
    ctTitle: 'Single Ascending Dose Study to Assess the Safety, Tolerability and Pharmacokinetics of MMV371 LAI',
    phase: 'Pre-clinical',
    candidate: 'MMV371',
    disease: 'Malaria',
    product: 'Drugs',
    startDate: '2024-08-27',
    endDate: '2024-09-10',
    terminatedReason: 'Not Applicable',
    results: 'Read more',
    sponsor: 'Medicines for Malaria Venture',
    type: 'Interventional',
  },
  {
    id: 2,
    name: 'NCT06558644',
    ctTitle: 'Phase 2 Clinical Trial to Evaluate the Efficacy of MMV371 LAI in Patients with Chronic Conditions',
    phase: 'Phase 3',
    candidate: 'MMV372',
    disease: 'Dengue',
    product: 'Drugs',
    startDate: '2024-08-28',
    endDate: '2024-09-24',
    terminatedReason: 'Pending',
    results: 4,
    sponsor: 'Global Fund to Fight AIDS, Tuberculosis',
    type: 'Preventive',
  },
  {
    id: 3,
    name: 'NCT06558645',
    ctTitle: 'Long Term Safety Study of MMV371 LAI in Pediatric Participants',
    phase: 'Pre-clinical',
    candidate: 'MMV373',
    disease: 'Tuberculosis',
    product: 'Drugs',
    startDate: '2024-08-29',
    endDate: '2024-10-08',
    terminatedReason: 'In Review',
    results: 1,
    sponsor: 'World Health Organization (WHO)',
    type: 'Diagnostic',
  },
  {
    id: 4,
    name: 'NCT06558646',
    ctTitle: 'MMV371 LAI Dosing Regimen Study for Optimal Therapeutic Outcomes',
    phase: 'Approved',
    candidate: 'MMV374',
    disease: 'HIV/AIDS',
    product: 'Drugs',
    startDate: '2024-08-30',
    endDate: '2024-10-22',
    terminatedReason: 'Approved',
    results: 4,
    sponsor: 'Roll Back Malaria Partnership',
    type: 'Therapeutic',
  },
  {
    id: 5,
    name: 'NCT06558647',
    ctTitle: 'Comparative Study of MMV371 LAI and Existing Treatments for Efficacy',
    phase: 'Phase 2',
    candidate: 'MMV375',
    disease: 'COVID-19',
    product: 'Drugs',
    startDate: '2024-08-31',
    endDate: '2024-11-05',
    terminatedReason: 'Rejected',
    results: 70,
    sponsor: 'Malaria No More',
    type: 'Palliative',
  },
  {
    id: 6,
    name: 'NCT06558648',
    ctTitle: 'Post Marketing Surveillance of MMV371 LAI in Diverse Populations',
    phase: 'Phase 2',
    candidate: 'MMV376',
    disease: 'Hepatitis',
    product: 'Drugs',
    startDate: '2024-09-01',
    endDate: '2024-11-19',
    terminatedReason: 'Completed',
    results: 0,
    sponsor: 'PATH Malaria Vaccine Initiative',
    type: 'Rehabilitative',
  },
];

// Technology types data
const technologyTypesData = [
  {
    id: 1,
    name: 'Immunoglobulin products animal plasma/serum derived',
    discovery: 1,
    preClinical: 132,
    phase1: 1,
    phase2: 4,
    phase3: 1,
    phase4: 0,
  },
  {
    id: 2,
    name: 'Therapeutic synthetic',
    discovery: 12,
    preClinical: 37,
    phase1: 1,
    phase2: 1,
    phase3: 0,
    phase4: 0,
  },
  {
    id: 3,
    name: 'Non immunoglobulin products animal/naturally derived; recombinant',
    discovery: 2,
    preClinical: 8,
    phase1: 0,
    phase2: 0,
    phase3: 0,
    phase4: 0,
  },
  {
    id: 4,
    name: 'Immunoglobulin products recombinant',
    discovery: 6,
    preClinical: 24,
    phase1: 0,
    phase2: 0,
    phase3: 0,
    phase4: 0,
  },
  {
    id: 5,
    name: 'Therapeutic natural/botanical',
    discovery: 12,
    preClinical: 42,
    phase1: 0,
    phase2: 0,
    phase3: 0,
    phase4: 0,
  },
];

// Column definitions for candidates
const candidatesColumns = [
  { header: 'Global health area', accessor: 'globalHealthArea', minWidth: '140px' },
  { header: 'Type', accessor: 'type', minWidth: '110px' },
  { header: '#ID', accessor: 'idNumber', type: 'number', minWidth: '90px' },
  {
    header: 'Name',
    accessor: 'name',
    type: 'name-with-link',
    minWidth: '220px',
    linkText: 'Explore',
    onClick: (value, row) => console.log('Explore clicked:', row),
  },
  { header: 'Disease', accessor: 'disease', minWidth: '150px' },
  { header: 'Owned area', accessor: 'ownedArea', minWidth: '150px' },
  { header: 'Products', accessor: 'products', minWidth: '100px' },
  { header: 'Sub-Product', accessor: 'subProduct', minWidth: '140px' },
  {
    header: 'R&D stage',
    accessor: 'rdStage',
    type: 'badge',
    minWidth: '100px',
    getVariant: (value) => {
      const variants = {
        Early: 'early',
        Late: 'late',
        'On Time': 'on-time',
        Delayed: 'delayed',
        Cancelled: 'cancelled',
        Rescheduled: 'rescheduled',
      };
      return variants[value] || 'default';
    },
  },
];

// Column definitions for clinical trials
const clinicalTrialsColumns = [
  { header: 'Name', accessor: 'name', minWidth: '110px' },
  {
    header: 'CT title',
    accessor: 'ctTitle',
    type: 'name-with-link',
    minWidth: '280px',
    linkText: 'Explore',
  },
  {
    header: 'Phase',
    accessor: 'phase',
    type: 'badge',
    minWidth: '100px',
    getVariant: (value) => {
      const variants = {
        'Pre-clinical': 'pre-clinical',
        'Phase 1': 'phase-1',
        'Phase 2': 'phase-2',
        'Phase 3': 'phase-3',
        'Phase 4': 'phase-4',
        Approved: 'approved',
      };
      return variants[value] || 'default';
    },
  },
  { header: 'Candidate', accessor: 'candidate', minWidth: '90px' },
  { header: 'Disease', accessor: 'disease', minWidth: '100px' },
  { header: 'Product', accessor: 'product', minWidth: '80px' },
  { header: 'Start date', accessor: 'startDate', type: 'date', minWidth: '100px' },
  { header: 'End date', accessor: 'endDate', type: 'date', minWidth: '100px' },
  { header: 'Terminated reason', accessor: 'terminatedReason', minWidth: '130px' },
  { header: 'Results', accessor: 'results', minWidth: '70px' },
  { header: 'Sponsor', accessor: 'sponsor', type: 'truncate', minWidth: '140px' },
  { header: 'Type', accessor: 'type', minWidth: '100px' },
];

// Column definitions for technology types
const technologyTypesColumns = [
  { header: 'Name', accessor: 'name', type: 'truncate', minWidth: '250px' },
  { header: 'Discovery', accessor: 'discovery', type: 'number' },
  { header: 'Pre-clinical', accessor: 'preClinical', type: 'number' },
  { header: 'Phase 1', accessor: 'phase1', type: 'number' },
  { header: 'Phase 2', accessor: 'phase2', type: 'number' },
  { header: 'Phase 3', accessor: 'phase3', type: 'number' },
  { header: 'Phase 4', accessor: 'phase4', type: 'number' },
];

export const Candidates = {
  args: {
    columns: candidatesColumns,
    data: candidatesData,
    defaultResultsPerPage: 6,
  },
};

export const ClinicalTrials = {
  args: {
    columns: clinicalTrialsColumns,
    data: clinicalTrialsData,
    defaultResultsPerPage: 6,
  },
};

export const TechnologyTypes = {
  args: {
    columns: technologyTypesColumns,
    data: technologyTypesData,
    pagination: false,
  },
};

export const EmptyState = {
  args: {
    columns: candidatesColumns,
    data: [],
    emptyState: {
      title: 'No candidates found',
      description: 'Your search "Streptokok" did not match any candidates. Please try again or clear the search.',
      onClear: () => console.log('Clear search clicked'),
    },
  },
};

export const WithRowClick = {
  args: {
    columns: candidatesColumns,
    data: candidatesData,
    onRowClick: (row) => alert(`Clicked: ${row.name}`),
  },
};

// More data for pagination demo
const largeDataset = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  globalHealthArea: ['Sexual & reproductive health', 'Mental health support', 'Cardiovascular wellness'][i % 3],
  type: 'AIM candidate',
  idNumber: (Math.random() * 20000).toFixed(2),
  name: `Candidate ${i + 1}`,
  disease: ['Malaria', 'Dengue', 'Tuberculosis', 'HIV/AIDS'][i % 4],
  ownedArea: 'No secondary disease',
  products: ['Diagnostics', 'Therapeutics', 'Monitoring'][i % 3],
  subProduct: 'Multi parametric tests',
  rdStage: ['Early', 'Late', 'On Time', 'Delayed', 'Cancelled', 'Rescheduled'][i % 6],
}));

export const WithPagination = {
  args: {
    columns: candidatesColumns,
    data: largeDataset,
    defaultResultsPerPage: 10,
  },
};
