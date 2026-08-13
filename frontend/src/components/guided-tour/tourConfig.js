/**
 * Guided Tour Configuration
 *
 * Thirteen steps across five pages: Home, Pipeline Overview, Pipeline Explorer,
 * Pipeline Trends, WHO Priority Alignment, then exit.
 *
 * Each step defines:
 *  - target:      CSS selector for the element to highlight
 *  - titleKey:    Content key for the step heading (resolved via t())
 *  - descKey:     Content key for the explanatory text (resolved via t())
 *  - position:    Tooltip placement ('top' | 'bottom' | 'left' | 'right')
 *  - route:       (optional) If the step lives on a different page, the
 *                 tour engine navigates here before showing the step.
 */

const tourSteps = [
  // ---- Home page ----
  {
    route: '/',
    target: '[data-tour="home-welcome"]',
    titleKey: 'guided_tour.steps.1.title',
    descKey: 'guided_tour.steps.1.description',
    position: 'bottom',
  },
  {
    route: '/',
    target: '[data-tour="filter-box"]',
    titleKey: 'guided_tour.steps.2.title',
    descKey: 'guided_tour.steps.2.description',
    position: 'right',
  },
  {
    route: '/',
    target: '[data-tour="home-kpi"]',
    titleKey: 'guided_tour.steps.3.title',
    descKey: 'guided_tour.steps.3.description',
    position: 'bottom',
  },

  // ---- Pipeline Overview ----
  {
    route: '/pipeline-overview',
    target: '[data-tour="po-filters"]',
    titleKey: 'guided_tour.steps.4.title',
    descKey: 'guided_tour.steps.4.description',
    position: 'bottom',
  },
  {
    route: '/pipeline-overview',
    target: '[data-tour="po-legend"]',
    titleKey: 'guided_tour.steps.5.title',
    descKey: 'guided_tour.steps.5.description',
    position: 'left',
  },

  // ---- Pipeline Explorer ----
  {
    route: '/pipeline-explorer',
    target: '[data-tour="pe-view-toggle"]',
    titleKey: 'guided_tour.steps.6.title',
    descKey: 'guided_tour.steps.6.description',
    position: 'bottom',
  },
  {
    route: '/pipeline-explorer',
    target: '[data-tour="pe-tabs"]',
    titleKey: 'guided_tour.steps.7.title',
    descKey: 'guided_tour.steps.7.description',
    position: 'bottom',
  },

  // ---- Pipeline Trends ----
  {
    route: '/pipeline-trends',
    target: '[data-tour="cpa-welcome"]',
    titleKey: 'guided_tour.steps.8.title',
    descKey: 'guided_tour.steps.8.description',
    position: 'bottom',
  },
  {
    route: '/pipeline-trends',
    target: '[data-tour="cpa-mode"]',
    titleKey: 'guided_tour.steps.9.title',
    descKey: 'guided_tour.steps.9.description',
    position: 'bottom',
  },

  // ---- WHO Priority Alignment ----
  {
    route: '/who-priority-alignment',
    target: '[data-tour="wpa-overview"]',
    titleKey: 'guided_tour.steps.10.title',
    descKey: 'guided_tour.steps.10.description',
    position: 'bottom',
  },
  {
    route: '/who-priority-alignment',
    target: '[data-tour="wpa-individual"]',
    titleKey: 'guided_tour.steps.11.title',
    descKey: 'guided_tour.steps.11.description',
    position: 'bottom',
  },
  {
    route: '/who-priority-alignment?priority=56',
    target: '[data-tour="wpa-explore"]',
    titleKey: 'guided_tour.steps.12.title',
    descKey: 'guided_tour.steps.12.description',
    position: 'top',
  },

  // ---- Navigate back (last step) ----
  {
    route: '/who-priority-alignment',
    target: '[data-tour="header-nav"]',
    titleKey: 'guided_tour.steps.13.title',
    descKey: 'guided_tour.steps.13.description',
    position: 'bottom',
  },
];

export default tourSteps;
