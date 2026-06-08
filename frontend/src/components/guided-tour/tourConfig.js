/**
 * Guided Tour Configuration
 *
 * Organised by route. The tour engine picks the matching route's
 * steps based on `window.location.pathname`.
 *
 * Each step defines:
 *  - target:      CSS selector for the element to highlight
 *  - title:       Step heading
 *  - description: Explanatory text
 *  - position:    Tooltip placement ('top' | 'bottom' | 'left' | 'right')
 *
 * "global" steps run on every page (sidebar, header, share, etc.).
 * Page-specific steps run after global steps when the user is on
 * that page. To add/remove/reorder steps, simply edit the arrays.
 */

export const globalSteps = [
  {
    target: '[data-tour="sidebar-nav"]',
    title: 'Navigate the platform',
    description:
      'Use the side menu to jump between Home, portfolio analysis, and cross-pipeline comparison.',
    position: 'right',
  },
  {
    target: '[data-tour="header-nav"]',
    title: 'Navigate to main website',
    description:
      'Use the top menu to jump to the other components of the IGH website.',
    position: 'bottom',
  },
  {
    target: '[data-tour="share-button"]',
    title: 'Share this view',
    description:
      'Click to copy the current URL with all your filters and selections, so you can share the exact view with a colleague.',
    position: 'bottom',
  },
  {
    target: '[data-tour="filter-box"]',
    title: 'Active filters',
    description:
      'See which filters are currently applied and quickly clear them from here.',
    position: 'right',
  },
  {
    target: '[data-tour="sidebar-collapse"]',
    title: 'Hide side menu',
    description:
      'Click the \u00AB to hide the side bar and create more space to look at the visuals.',
    position: 'right',
  },
];

export const pageSteps = {
  '/': [
    {
      target: '[data-tour="home-welcome"]',
      title: 'Welcome to the Global Health R&D Pipeline',
      description:
        'This portal provides an overview of health products approved or in development across global health areas. Each page offers a snapshot of a different view of the data.',
      position: 'bottom',
    },
    {
      target: '[data-tour="home-kpi"]',
      title: 'Download email information',
      description:
        'Use these filters to find the data and charts you are interested in. The colouring also translates to all charts on this page.',
      position: 'bottom',
    },
  ],

  '/portfolio-analysis': [
    {
      target: '[data-tour="pa-filters"]',
      title: 'How do you filter data on the portal?',
      description:
        'Use the top menu to see R&D Targets & Areas, Products, and R&D Stages. Then use the colouring also translates to all R&D pipeline.',
      position: 'bottom',
    },
    {
      target: '[data-tour="pa-charts"]',
      title: 'Navigate to all charts on all pages',
      description:
        'Use these filters to find the data and charts you are interested in. The colouring also translates to all charts on this page.',
      position: 'bottom',
    },
    {
      target: '[data-tour="pa-keywords"]',
      title: 'Use keywords like this level',
      description:
        'Type keywords to search for specific candidates, products, or diseases across the portfolio.',
      position: 'bottom',
    },
    {
      target: '[data-tour="pa-explore"]',
      title: 'Explore the portfolio in depth',
      description:
        'Use the chart views to slice the data by disease, product type, and R&D stage to understand the landscape.',
      position: 'top',
    },
  ],

  '/portfolio-analysis/extract': [
    {
      target: '[data-tour="extract-filters"]',
      title: 'How do I filter the data?',
      description:
        'Use these column filters to narrow down the extract table. You can combine multiple filters across columns.',
      position: 'bottom',
    },
    {
      target: '[data-tour="extract-table"]',
      title: 'Browse and export data',
      description:
        'Browse the filtered results in the table below. Use the export button to download the data as a CSV file.',
      position: 'top',
    },
  ],

  '/cross-pipeline-analytics': [
    {
      target: '[data-tour="cpa-filters"]',
      title: 'Compare across pipelines',
      description:
        'Use the filters to compare candidates and products across different disease areas, product types, and development stages.',
      position: 'bottom',
    },
  ],

  '/who-priority-alignment': [
    {
      target: '[data-tour="wpa-overview"]',
      title: 'WHO Priority overview',
      description:
        'See how the R&D pipeline aligns with WHO priority pathogen lists and other global health priorities.',
      position: 'bottom',
    },
  ],

  '/analytical-insights': [
    {
      target: '[data-tour="ai-tabs"]',
      title: 'Explore analytical insights',
      description:
        'Switch between Candidates, Approved Products, Clinical Trials, and Technology Types to see different analytical views.',
      position: 'bottom',
    },
  ],
};
