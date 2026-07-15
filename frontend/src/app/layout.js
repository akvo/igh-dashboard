import { Public_Sans } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import Header from '@/components/ui/Header';
import { ApolloProvider } from '@/lib/apollo-provider';
import Analytics from '@/components/Analytics';
import { ResponsiveGate } from '@/components/layout';
import { GlobalFiltersProvider } from '@/components/global-filters';
import { t } from '@/content';

const publicSans = Public_Sans({
  variable: '--font-public-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const align = localFont({
  src: [
    {
      path: '../../public/fonts/AlignUpright-VF.ttf',
      style: 'normal',
    },
    {
      path: '../../public/fonts/AlignItalic-VF.ttf',
      style: 'italic',
    },
  ],
  variable: '--font-align',
  display: 'swap',
});

export const metadata = {
  title: t('layout.metadata.title'),
  description: t('layout.metadata.description'),
};

const navItems = [
  {
    label: t('layout.header.nav_data'),
    hasDropdown: true,
    description: t('layout.header.data.description'),
    featured: {
      title: t('layout.header.data.featured_title'),
      showIcon: false,
      items: [
        { label: t('layout.header.data.item_gfinder_label'), href: 'https://gfinderdata.impactglobalhealth.org/', description: t('layout.header.data.item_gfinder_description') },
        { label: t('layout.header.data.item_pipeline_label'), href: 'https://pipeline.impactglobalhealth.org/', description: t('layout.header.data.item_pipeline_description') },
      ],
    },
    items: [
      { label: t('layout.header.data.item_spillover_label'), href: 'https://www.impactglobalhealth.org/data/innovation-spillover-tracker', description: t('layout.header.data.item_spillover_description') },
    ],
  },
  {
    label: t('layout.header.nav_insights'),
    hasDropdown: true,
    description: t('layout.header.insights.description'),
    featured: {
      title: t('layout.header.insights.featured_title'),
      items: [
        { label: t('layout.header.insights.item_hub_investment_label'), href: 'https://www.impactglobalhealth.org/insights/hubs/the-investment-landscape-hub', description: t('layout.header.insights.item_hub_investment_description') },
        { label: t('layout.header.insights.item_hub_impact_label'), href: 'https://www.impactglobalhealth.org/insights/hubs/the-impact-of-global-health-rd-hub', description: t('layout.header.insights.item_hub_impact_description') },
        { label: t('layout.header.insights.item_womens_hub_label'), href: 'https://www.impactglobalhealth.org/insights/hubs/womens-health-hub', description: t('layout.header.insights.item_womens_hub_description') },
      ],
    },
    items: [
      { label: t('layout.header.insights.item_reports_label'), href: 'https://www.impactglobalhealth.org/insights/report-library', description: t('layout.header.insights.item_reports_description') },
      { label: t('layout.header.insights.item_health_areas_label'), href: 'https://www.impactglobalhealth.org/insights/health-areas', description: t('layout.header.insights.item_health_areas_description') },
      { label: t('layout.header.insights.item_hubs_label'), href: 'https://www.impactglobalhealth.org/insights/hubs', description: t('layout.header.insights.item_hubs_description') },
      { label: t('layout.header.insights.item_dialogues_label'), href: 'https://www.impactglobalhealth.org/insights/dialogues', description: t('layout.header.insights.item_dialogues_description') },
    ],
  },
  {
    label: t('layout.header.nav_tools'),
    hasDropdown: true,
    description: t('layout.header.tools.description'),
    featured: {
      title: t('layout.header.tools.featured_title'),
      href: 'https://www.impactglobalhealth.org/tools/communications--press-kits',
      showIcon: true,
      description: t('layout.header.tools.featured_description'),
    },
    items: [
      { label: t('layout.header.tools.item_framework_label'), href: 'https://www.impactglobalhealth.org/tools/impact-framework', description: t('layout.header.tools.item_framework_description') },
      { label: t('layout.header.tools.item_100days_label'), href: 'https://www.impactglobalhealth.org/tools/100-days-mission-scorecard', description: t('layout.header.tools.item_100days_description') },
    ],
  },
  {
    label: t('layout.header.nav_about'),
    hasDropdown: true,
    description: t('layout.header.about.description'),
    items: [
      { label: t('layout.header.about.item_team_label'), href: 'https://www.impactglobalhealth.org/about-us/our-team', description: t('layout.header.about.item_team_description') },
      { label: t('layout.header.about.item_council_label'), href: 'https://www.impactglobalhealth.org/about-us/our-global-advisory-council', description: t('layout.header.about.item_council_description') },
      { label: t('layout.header.about.item_join_label'), href: 'https://www.impactglobalhealth.org/about-us/join-us', description: t('layout.header.about.item_join_description') },
      { label: t('layout.header.about.item_contact_label'), href: 'https://www.impactglobalhealth.org/about-us/contact-us', description: t('layout.header.about.item_contact_description') },
      { label: t('layout.header.about.item_advocacy_label'), href: 'https://www.impactglobalhealth.org/tools/communications--press-kits', description: t('layout.header.about.item_advocacy_description') },
    ],
  },
  {
    label: t('layout.header.nav_news'),
    hasDropdown: false,
    href: 'https://www.impactglobalhealth.org/news',
  },
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <Analytics />
      <body className={`${publicSans.variable} ${align.variable} antialiased`}>
        <ApolloProvider>
          <GlobalFiltersProvider>
            <Header navItems={navItems} />
            <div style={{ paddingTop: 90 }}>
              <ResponsiveGate>{children}</ResponsiveGate>
            </div>
          </GlobalFiltersProvider>
        </ApolloProvider>
      </body>
    </html>
  );
}
