import { Public_Sans } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import Header from '@/components/ui/Header';
import { ApolloProvider } from '@/lib/apollo-provider';

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
      title: 'G-FINDER',
      href: 'https://gfinderdata.impactglobalhealth.org/',
      external: true,
      description: 'The annual tracker of R&D investment into new drugs, vaccines, diagnostics and vector control products for global health.',
    },
    items: [
      { label: 'Infectious Disease R&D Tracker', href: '/', description: 'Candidates in the pipeline and approved products for global health priorities across neglected diseases and emerging infectious diseases.' },
      { label: 'Maternal Health Pipeline', href: '/', description: 'Database profiling medicines, diagnostics, and devices for seven significant pregnancy-related conditions.' },
      { label: 'Snakebite Envenoming Medicines Database', href: '/', description: 'Database of all snakebite envenoming medicines with direct action on toxins.' },
      { label: 'Sexually Transmitted Infections Pipeline', href: '/', description: 'Database of critical products for three STIs with an AMR risk.' },
      { label: 'Gynaecological Conditions Pipeline', href: '/', description: "Database of women's health products for three significant gynaecological conditions." },
      { label: 'Innovation Spillover Tracker', href: '/', description: 'A tracker of health innovations developed for LMICs that have translated into new applications and benefits in HICs.' },
    ],
  },
  {
    label: 'Insights',
    hasDropdown: true,
    description: "Here you will find the analysis and insights to support decisions - whether you're funding research, setting policies, developing products or advocating for change.",
    featured: {
      title: 'Explore our hubs',
      items: [
        { label: 'The Investment Landscape Hub', href: '/insights/investment-landscape', description: 'A unique source of data and analysis tracking the funding of global health R&D and the pipeline of products in development. Powered by G-FINDER.' },
        { label: 'The Impact of Global Health R&D Hub', href: '/insights/impact', description: 'Global, UK and EU analyses of the health and economic impact of the last two decades of investment in global health R&D.' },
        { label: "Women's Health Hub", href: '/insights/womens-health', description: "This resource hub provides a suite of data, insights and tools to accelerate progress in women's health R&D." },
      ],
    },
    items: [
      { label: 'Report Library', href: '/insights/reports', description: 'Our reports deliver critical insights using the evidence collected through G-FINDER and over two decades of independent analysis.' },
      { label: 'Health areas', href: '/insights/health-areas', description: "This quick reference guide gives you a snapshot analysis of the R&D needs and the state of innovation to tackle each disease or condition we cover. It's a handy quick overview of what's needed to impact global health in these areas." },
      { label: 'Hubs', href: '/insights/hubs', description: 'Themed collections of all the data, analysis and tools you need to understand the landscape and make smart decisions on global health R&D.' },
      { label: 'Impact Global Health Dialogues', href: '/insights/dialogues', description: 'A series of dialogues with global health leaders to co-create an R&D investment roadmap that is fit for the future.' },
    ],
  },
  {
    label: 'Tools',
    hasDropdown: true,
    description: "We've created some practical frameworks and tools you can use to assess and increase impact in global health.",
    featured: {
      title: 'Advocacy Kits',
      href: '/tools/advocacy-kits',
      description: 'Join us in creating global health impact with our advocacy and press kits',
    },
    items: [
      { label: 'Impact Framework', href: '/tools/impact-framework', description: 'A global network of experts collaborated for two years to develop this comprehensive set of metrics that create an impact assessment framework for global health R&D.' },
      { label: '100 Days Mission Scorecard', href: '/tools/100-days-mission', description: 'Is the world ready to deploy a new product to tackle an epidemic within 100 days of an outbreak?' },
    ],
  },
  {
    label: 'About Us',
    hasDropdown: true,
    description: 'Meet the team working to create a more equitable future through global health innovation and impact.',
    items: [
      { label: 'Our Team', href: '/about/team', description: 'Meet our diverse international team of experts, who collate and analyse data on global health funding and the innovation pipeline.' },
      { label: 'Our Global Advisory Council', href: '/about/advisory-council', description: 'Bringing together some of the leading and most influential figures in global health, our Council challenges our thinking, expands our foresight and helps us with horizon scanning.' },
      { label: 'Join Us', href: '/about/join-us', description: 'We build bridges, partnerships and consensus across the complex ecosystem of global health R&D players. Find out how to partner with us, commission our expertise, and how to join our team when we have vacancies.' },
      { label: 'Contact Us', href: '/about/contact', description: 'Please get in touch with any questions or feedback. Between us, we cover most time zones so one of us will get back to you quickly.' },
    ],
  },
  {
    label: 'News',
    hasDropdown: false,
    href: '/news',
  },
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
