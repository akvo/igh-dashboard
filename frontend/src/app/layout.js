import { Public_Sans } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import Header from '@/components/ui/Header';
import { ApolloProvider } from '@/lib/apollo-provider';
import Analytics from '@/components/Analytics';

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
  title: 'IGH Dashboard',
  description: 'Innovation in Global Health Dashboard',
};

const navItems = [
  {
    label: 'Data',
    hasDropdown: true,
    description: 'Here are the gold-standard databases and data visualizations of R&D funding, approved products and candidates in the pipeline for neglected diseases, emerging infectious diseases and maternal health.',
    featured: {
      title: 'Our data portals',
      showIcon: false,
      items: [
        { label: 'G-FINDER R&D funding portal', href: 'https://gfinderdata.impactglobalhealth.org/', description: 'Since 2007, the G-FINDER project tracks R&D funding for new products and technologies across global health areas.' },
        { label: 'Product pipeline portal', href: 'https://pipeline.impactglobalhealth.org/', description: 'Our product pipeline portal provides an overview of health products approved or in development across global health areas.' },
      ],
    },
    items: [
      { label: 'Innovation Spillover Tracker', href: 'https://www.impactglobalhealth.org/data/innovation-spillover-tracker', description: 'A tracker of health innovations developed for LMICs that have translated into new applications and benefits in HICs.' },
    ],
  },
  {
    label: 'Insights',
    hasDropdown: true,
    description: "Here you will find the analysis and insights to support decisions - whether you're funding research, setting policies, developing products or advocating for change.",
    featured: {
      title: 'Explore our hubs',
      items: [
        { label: 'The Investment Landscape Hub', href: 'https://www.impactglobalhealth.org/insights/hubs/the-investment-landscape-hub', description: 'A unique source of data and analysis tracking the funding of global health R&D and the pipeline of products in development. Powered by G-FINDER.' },
        { label: 'The Impact of Global Health R&D Hub', href: 'https://www.impactglobalhealth.org/insights/hubs/the-impact-of-global-health-rd-hub', description: 'Global, UK and EU analyses of the health and economic impact of the last two decades of investment in global health R&D.' },
        { label: "Women's Health Hub", href: 'https://www.impactglobalhealth.org/insights/hubs/womens-health-hub', description: "This resource hub provides a suite of data, insights and tools to accelerate progress in women's health R&D." },
      ],
    },
    items: [
      { label: 'Report Library', href: 'https://www.impactglobalhealth.org/insights/report-library', description: 'Our reports deliver critical insights using the evidence collected through G-FINDER and over two decades of independent analysis.' },
      { label: 'Health areas', href: 'https://www.impactglobalhealth.org/insights/health-areas', description: "This quick reference guide gives you a snapshot analysis of the R&D needs and the state of innovation to tackle each disease or condition we cover. It's a handy quick overview of what's needed to impact global health in these areas." },
      { label: 'Hubs', href: 'https://www.impactglobalhealth.org/insights/hubs', description: 'Themed collections of all the data, analysis and tools you need to understand the landscape and make smart decisions on global health R&D.' },
      { label: 'Impact Global Health Dialogues', href: 'https://www.impactglobalhealth.org/insights/dialogues', description: 'A series of dialogues with global health leaders to co-create an R&D investment roadmap that is fit for the future.' },
    ],
  },
  {
    label: 'Tools',
    hasDropdown: true,
    description: "We've created some practical frameworks and tools you can use to assess and increase impact in global health.",
    featured: {
      title: 'Advocacy Kits',
      href: 'https://www.impactglobalhealth.org/tools/communications--press-kits',
      showIcon: true,
      description: 'Join us in creating global health impact with our advocacy and press kits',
    },
    items: [
      { label: 'Impact Framework', href: 'https://www.impactglobalhealth.org/tools/impact-framework', description: 'A global network of experts collaborated for two years to develop this comprehensive set of metrics that create an impact assessment framework for global health R&D.' },
      { label: '100 Days Mission Scorecard', href: 'https://www.impactglobalhealth.org/tools/100-days-mission-scorecard', description: 'Is the world ready to deploy a new product to tackle an epidemic within 100 days of an outbreak?' },
    ],
  },
  {
    label: 'About Us',
    hasDropdown: true,
    description: 'Meet the team working to create a more equitable future through global health innovation and impact.',
    items: [
      { label: 'Our Team', href: 'https://www.impactglobalhealth.org/about-us/our-team', description: 'Meet our diverse international team of experts, who collate and analyse data on global health funding and the innovation pipeline.' },
      { label: 'Our Global Advisory Council', href: 'https://www.impactglobalhealth.org/about-us/our-global-advisory-council', description: 'Bringing together some of the leading and most influential figures in global health, our Council challenges our thinking, expands our foresight and helps us with horizon scanning.' },
      { label: 'Join Us', href: 'https://www.impactglobalhealth.org/about-us/join-us', description: 'We build bridges, partnerships and consensus across the complex ecosystem of global health R&D players. Find out how to partner with us, commission our expertise, and how to join our team when we have vacancies.' },
      { label: 'Contact Us', href: 'https://www.impactglobalhealth.org/about-us/contact-us', description: 'Please get in touch with any questions or feedback. Between us, we cover most time zones so one of us will get back to you quickly.' },
      { label: 'Advocacy Kits', href: 'https://www.impactglobalhealth.org/tools/communications--press-kits', description: 'Join us in creating global health impact with our advocacy and press kits.' },
    ],
  },
  {
    label: 'News',
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
          <Header navItems={navItems} />
          <div style={{ paddingTop: 90 }}>
            {children}
          </div>
        </ApolloProvider>
      </body>
    </html>
  );
}
