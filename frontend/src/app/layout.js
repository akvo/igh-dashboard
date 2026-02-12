import { Public_Sans } from 'next/font/google';
import './globals.css';
import Header from '@/components/ui/Header';
import { ApolloProvider } from '@/lib/apollo-provider';

const publicSans = Public_Sans({
  variable: '--font-public-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata = {
  title: 'IGH Dashboard',
  description: 'Innovation in Global Health Dashboard',
};

const navItems = [
  {
    label: 'Data',
    hasDropdown: true,
    items: [
      { label: 'Pipeline', href: '/data/pipeline' },
      { label: 'Clinical Trials', href: '/data/trials' },
      { label: 'Candidates', href: '/data/candidates' },
    ],
  },
  {
    label: 'Insights',
    hasDropdown: true,
    items: [
      { label: 'Visual Insights', href: '/insights/visual' },
      { label: 'Reports', href: '/insights/reports' },
    ],
  },
  {
    label: 'Tools',
    hasDropdown: true,
    items: [
      { label: 'Search', href: '/tools/search' },
      { label: 'Compare', href: '/tools/compare' },
      { label: 'Export', href: '/tools/export' },
    ],
  },
  {
    label: 'About Us',
    hasDropdown: true,
    items: [
      { label: 'Team', href: '/about/team' },
      { label: 'Mission', href: '/about/mission' },
      { label: 'Contact', href: '/about/contact' },
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
      <body className={`${publicSans.variable} antialiased`}>
        <ApolloProvider>
          <div style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
            <Header navItems={navItems} />
          </div>
          {children}
        </ApolloProvider>
      </body>
    </html>
  );
}
