/**
 * Guided Tour Configuration
 *
 * A single continuous tour that walks the user across every major page.
 * Each step defines:
 *  - target:      CSS selector for the element to highlight
 *  - title:       Step heading
 *  - description: Explanatory text
 *  - position:    Tooltip placement ('top' | 'bottom' | 'left' | 'right')
 *  - route:       (optional) If the step lives on a different page, the
 *                 tour engine navigates here before showing the step.
 *
 * Steps are numbered continuously (Step 1 of 17, Step 2 of 17, ...).
 * Clicking "Next" on the last step of a page navigates to the next
 * page's first step automatically.
 */

const tourSteps = [
  // ---- Home page ----
  {
    route: '/',
    target: '[data-tour="sidebar-nav"]',
    title: 'Navigate the platform',
    description:
      'Use the side menu to jump between Home, Pipeline Overview, Pipeline Explorer, Pipeline Trends and WHO Priority Alignment.',
    position: 'right',
  },
  {
    route: '/',
    target: '[data-tour="header-nav"]',
    title: 'Navigate to main website',
    description:
      'Use the top menu to jump to the other components of the IGH website.',
    position: 'bottom',
  },
  {
    route: '/',
    target: '[data-tour="sidebar-collapse"]',
    title: 'Hide side menu',
    description:
      'Click the \u00AB to hide the side bar and create more space to look at the visuals.',
    position: 'right',
  },
  {
    route: '/',
    target: '[data-tour="filter-box"]',
    title: 'Overview of filters',
    description:
      'Every filter that is activated remains active throughout the portal. To deactivate a filter you can always see which filters are active in this filter screen.',
    position: 'right',
  },
  {
    route: '/',
    target: '[data-tour="home-welcome"]',
    title: 'Welcome to the Global Health R\u0026D Pipeline',
    description:
      'This platform gives you an at-a-glance view of the global effort to develop new health products for the world\u2019s most neglected diseases. The home page brings together key statistics from across the full pipeline \u2014 from early-stage candidates still in the lab, through to products that have reached the people who need them most.\n\nEach visual on this page offers a snapshot of a different dimension of that story: the scale of research activity across disease areas, where in the world trials are being conducted and developers are based, how pipelines are distributed across development stages, and how progress has shifted over time.\n\nUse the visuals to explore what interests you most, and follow the links to dive deeper into the detailed data and analysis available throughout the portal.',
    position: 'bottom',
  },
  {
    route: '/',
    target: '[data-tour="home-kpi"]',
    title: 'Download visual information',
    description:
      'Save a snapshot of this chart as an image, or download the underlying data to explore in your own tools.',
    position: 'bottom',
  },

  // ---- Pipeline Overview ----
  {
    route: '/pipeline-overview',
    target: '[data-tour="po-filters"]',
    title: 'Filters apply to all visuals on this page',
    description:
      'Use these filters to focus the data across every chart and map on this page at once. Any selection you make will automatically update all visuals to reflect your chosen scope.',
    position: 'bottom',
  },
  {
    route: '/pipeline-overview',
    target: '[data-tour="po-legend"]',
    title: 'Use legend to filter the visual',
    description:
      'Tick or untick the checkboxes in the legend to show or hide specific categories within the charts.',
    position: 'left',
  },

  // ---- Pipeline Explorer ----
  {
    route: '/pipeline-explorer',
    target: '[data-tour="pe-view-toggle"]',
    title: 'How do you like to look at the data?',
    description:
      'Visual insights: discover trends and patterns through interactive charts, maps and diagrams. A visual deep dive into the pipeline data.\n\nTable builder: filter and slice the data your way. Build a custom table and download it as .csv to use in your own analysis.',
    position: 'bottom',
  },
  {
    route: '/pipeline-explorer',
    target: '[data-tour="pe-tabs"]',
    title: 'Explore the portfolio in depth',
    description:
      'Use the four tabs to dive deeper into your filtered selection. Each tab gives you a different lens on the data. Switch between them to explore active candidates, approved products, clinical trials and the technology types driving development across your chosen scope.',
    position: 'bottom',
  },

  // ---- Cross-pipeline Analytics (Pipeline Trends) ----
  {
    route: '/pipeline-trends',
    target: '[data-tour="cpa-welcome"]',
    title: 'Welcome to cross-pipeline analysis',
    description:
      'Build and compare your own portfolios across the global health R\u0026D landscape. Define a custom selection of diseases and product types, then compare how your portfolio has evolved over time or see how it stacks up against others. To get you started, the visual below gives you a taste of what\u2019s possible.',
    position: 'bottom',
  },
  {
    route: '/pipeline-trends',
    target: '[data-tour="cpa-mode"]',
    title: 'Choose your comparison mode',
    description:
      'Decide how you want to explore the data.\n\u2714 Compare single portfolio over time: Track how a single portfolio has changed across IGH\u2019s annual pipeline snapshots.\n\u2714 Compare different portfolios: Place up to four portfolios side by side to see how they differ at a single point in time.',
    position: 'bottom',
  },
  {
    route: '/pipeline-trends',
    target: '[data-tour="cpa-portfolio"]',
    title: 'Build your portfolio and select your years',
    description:
      'Choose the diseases and product types you want to include \u2014 these will be combined into a single portfolio. Then select the years you want to compare across. The available years reflect the annual snapshots IGH has taken of the global R\u0026D pipeline over time.',
    position: 'bottom',
  },
  {
    route: '/pipeline-trends',
    target: '[data-tour="cpa-compare"]',
    title: 'Define and compare your portfolios',
    description:
      'Build up to four portfolios by selecting a disease and/or product type for each one. Use the + button to add more portfolios to your comparison. Once you\u2019re happy with your selection, choose a single year and click Apply to see the results side by side.',
    position: 'bottom',
  },

  // ---- WHO Priority Alignment ----
  {
    route: '/who-priority-alignment',
    target: '[data-tour="wpa-overview"]',
    title: 'Explore the WHO priorities',
    description:
      'Filter the disease on global health area, disease or product type to get an understanding of the WHO priorities that are developed for this selection.',
    position: 'bottom',
  },
  {
    route: '/who-priority-alignment',
    target: '[data-tour="wpa-individual"]',
    title: 'Explore the priority in depth',
    description:
      'Select one specific priority and click on apply to load the pipeline that is related to that priority.',
    position: 'bottom',
  },
  {
    route: '/who-priority-alignment',
    target: '[data-tour="wpa-explore"]',
    title: 'Click on Explore',
    description:
      'Click on explore in any table, to activate a slide-in panel that will show the in-depth information of that row in the table.',
    position: 'top',
  },
];

export default tourSteps;
