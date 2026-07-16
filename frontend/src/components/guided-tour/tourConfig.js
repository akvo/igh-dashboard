/**
 * Guided Tour Configuration
 *
 * A single continuous tour that walks the user across every major page.
 * Each step defines:
 *  - target:      CSS selector for the element to highlight
 *  - titleKey:    Content key for the step heading (resolved via t())
 *  - descKey:     Content key for the explanatory text (resolved via t())
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
    titleKey: 'guided_tour.steps.1.title',
    descKey: 'guided_tour.steps.1.description',
    position: 'right',
  },
  {
    route: '/',
    target: '[data-tour="header-nav"]',
    titleKey: 'guided_tour.steps.2.title',
    descKey: 'guided_tour.steps.2.description',
    position: 'bottom',
  },
  {
    route: '/',
    target: '[data-tour="sidebar-collapse"]',
    titleKey: 'guided_tour.steps.3.title',
    descKey: 'guided_tour.steps.3.description',
    position: 'right',
  },
  {
    route: '/',
    target: '[data-tour="filter-box"]',
    titleKey: 'guided_tour.steps.4.title',
    descKey: 'guided_tour.steps.4.description',
    position: 'right',
  },
  {
    route: '/',
    target: '[data-tour="home-welcome"]',
    titleKey: 'guided_tour.steps.5.title',
    descKey: 'guided_tour.steps.5.description',
    position: 'bottom',
  },
  {
    route: '/',
    target: '[data-tour="home-kpi"]',
    titleKey: 'guided_tour.steps.6.title',
    descKey: 'guided_tour.steps.6.description',
    position: 'bottom',
  },

  // ---- Pipeline Overview ----
  {
    route: '/pipeline-overview',
    target: '[data-tour="po-filters"]',
    titleKey: 'guided_tour.steps.7.title',
    descKey: 'guided_tour.steps.7.description',
    position: 'bottom',
  },
  {
    route: '/pipeline-overview',
    target: '[data-tour="po-legend"]',
    titleKey: 'guided_tour.steps.8.title',
    descKey: 'guided_tour.steps.8.description',
    position: 'left',
  },

  // ---- Pipeline Explorer ----
  {
    route: '/pipeline-explorer',
    target: '[data-tour="pe-view-toggle"]',
    titleKey: 'guided_tour.steps.9.title',
    descKey: 'guided_tour.steps.9.description',
    position: 'bottom',
  },
  {
    route: '/pipeline-explorer',
    target: '[data-tour="pe-tabs"]',
    titleKey: 'guided_tour.steps.10.title',
    descKey: 'guided_tour.steps.10.description',
    position: 'bottom',
  },

  // ---- Cross-pipeline Analytics (Pipeline Trends) ----
  {
    route: '/pipeline-trends',
    target: '[data-tour="cpa-welcome"]',
    titleKey: 'guided_tour.steps.11.title',
    descKey: 'guided_tour.steps.11.description',
    position: 'bottom',
  },
  {
    route: '/pipeline-trends',
    target: '[data-tour="cpa-mode"]',
    titleKey: 'guided_tour.steps.12.title',
    descKey: 'guided_tour.steps.12.description',
    position: 'bottom',
  },
  {
    route: '/pipeline-trends',
    target: '[data-tour="cpa-portfolio"]',
    titleKey: 'guided_tour.steps.13.title',
    descKey: 'guided_tour.steps.13.description',
    position: 'bottom',
  },
  {
    route: '/pipeline-trends',
    target: '[data-tour="cpa-compare-tab"]',
    titleKey: 'guided_tour.steps.14.title',
    descKey: 'guided_tour.steps.14.description',
    position: 'bottom',
  },

  // ---- WHO Priority Alignment ----
  {
    route: '/who-priority-alignment',
    target: '[data-tour="wpa-overview"]',
    titleKey: 'guided_tour.steps.15.title',
    descKey: 'guided_tour.steps.15.description',
    position: 'bottom',
  },
  {
    route: '/who-priority-alignment',
    target: '[data-tour="wpa-individual"]',
    titleKey: 'guided_tour.steps.16.title',
    descKey: 'guided_tour.steps.16.description',
    position: 'bottom',
  },
  {
    route: '/who-priority-alignment?priority=56',
    target: '[data-tour="wpa-explore"]',
    titleKey: 'guided_tour.steps.17.title',
    descKey: 'guided_tour.steps.17.description',
    position: 'top',
  },
];

export default tourSteps;
