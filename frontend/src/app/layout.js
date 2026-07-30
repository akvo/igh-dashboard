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
    label: t('layout.header.nav.data'),
    hasDropdown: true,
    description: t('layout.header.data.description'),
    featured: {
      title: t('layout.header.data.featured_title'),
      showIcon: false,
      items: [
        { label: t('layout.header.data.items.gfinder.label'), href: 'https://gfinderdata.impactglobalhealth.org/', description: t('layout.header.data.items.gfinder.description') },
        { label: t('layout.header.data.items.pipeline.label'), href: 'https://pipeline.impactglobalhealth.org/', description: t('layout.header.data.items.pipeline.description') },
      ],
    },
    items: [
      { label: t('layout.header.data.items.spillover.label'), href: 'https://www.impactglobalhealth.org/data/innovation-spillover-tracker', description: t('layout.header.data.items.spillover.description') },
      { label: t('layout.header.data.items.snakebite.label'), href: 'https://www.impactglobalhealth.org/data/snakebite-envenoming-medicines-database', description: t('layout.header.data.items.snakebite.description') },
    ],
  },
  {
    label: t('layout.header.nav.insights'),
    hasDropdown: true,
    description: t('layout.header.insights.description'),
    featured: {
      title: t('layout.header.insights.featured_title'),
      items: [
        { label: t('layout.header.insights.items.hub_investment.label'), href: 'https://www.impactglobalhealth.org/insights/hubs/the-investment-landscape-hub', description: t('layout.header.insights.items.hub_investment.description') },
        { label: t('layout.header.insights.items.hub_impact.label'), href: 'https://www.impactglobalhealth.org/insights/hubs/the-impact-of-global-health-rd-hub', description: t('layout.header.insights.items.hub_impact.description') },
        { label: t('layout.header.insights.items.womens_hub.label'), href: 'https://www.impactglobalhealth.org/insights/hubs/womens-health-hub', description: t('layout.header.insights.items.womens_hub.description') },
      ],
    },
    items: [
      { label: t('layout.header.insights.items.reports.label'), href: 'https://www.impactglobalhealth.org/insights/report-library', description: t('layout.header.insights.items.reports.description') },
      { label: t('layout.header.insights.items.health_areas.label'), href: 'https://www.impactglobalhealth.org/insights/health-areas', description: t('layout.header.insights.items.health_areas.description') },
      { label: t('layout.header.insights.items.hubs.label'), href: 'https://www.impactglobalhealth.org/insights/hubs', description: t('layout.header.insights.items.hubs.description') },
      { label: t('layout.header.insights.items.blindspots.label'), href: 'https://www.impactglobalhealth.org/igh-path-partnership', description: t('layout.header.insights.items.blindspots.description') },
    ],
  },
  {
    label: t('layout.header.nav.tools'),
    hasDropdown: true,
    description: t('layout.header.tools.description'),
    featured: {
      title: t('layout.header.tools.featured_title'),
      href: 'https://www.impactglobalhealth.org/tools/communications--press-kits',
      showIcon: true,
      description: t('layout.header.tools.featured_description'),
    },
    items: [
      { label: t('layout.header.tools.items.framework.label'), href: 'https://www.impactglobalhealth.org/tools/impact-framework', description: t('layout.header.tools.items.framework.description') },
      { label: t('layout.header.tools.items.100days.label'), href: 'https://www.impactglobalhealth.org/tools/100-days-mission-scorecard', description: t('layout.header.tools.items.100days.description') },
    ],
  },
  {
    label: t('layout.header.nav.about'),
    hasDropdown: true,
    description: t('layout.header.about.description'),
    items: [
      { label: t('layout.header.about.items.team.label'), href: 'https://www.impactglobalhealth.org/about-us/our-team', description: t('layout.header.about.items.team.description') },
      { label: t('layout.header.about.items.council.label'), href: 'https://www.impactglobalhealth.org/about-us/our-global-advisory-council', description: t('layout.header.about.items.council.description') },
      { label: t('layout.header.about.items.join.label'), href: 'https://www.impactglobalhealth.org/about-us/join-us', description: t('layout.header.about.items.join.description') },
      { label: t('layout.header.about.items.contact.label'), href: 'https://www.impactglobalhealth.org/about-us/contact-us', description: t('layout.header.about.items.contact.description') },
      { label: t('layout.header.about.items.advocacy.label'), href: 'https://www.impactglobalhealth.org/tools/communications--press-kits', description: t('layout.header.about.items.advocacy.description') },
    ],
  },
  {
    label: t('layout.header.nav.news'),
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
