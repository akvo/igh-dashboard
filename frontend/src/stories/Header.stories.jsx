import Header from '../components/ui/Header';

export default {
  title: 'UI/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {
    navItems: [
      {
        label: 'Data',
        hasDropdown: true,
        items: [
          { label: 'Pipeline' },
          { label: 'Clinical Trials' },
          { label: 'Candidates' },
        ],
      },
      {
        label: 'Insights',
        hasDropdown: true,
        items: [
          { label: 'Visual Insights' },
          { label: 'Reports' },
        ],
      },
      {
        label: 'Tools',
        hasDropdown: true,
        items: [
          { label: 'Search' },
          { label: 'Compare' },
          { label: 'Export' },
        ],
      },
      {
        label: 'About Us',
        hasDropdown: true,
        items: [
          { label: 'Team' },
          { label: 'Mission' },
          { label: 'Contact' },
        ],
      },
      {
        label: 'News',
        hasDropdown: false,
        href: '/news',
      },
    ],
  },
};

export const MinimalNav = {
  args: {
    navItems: [
      { label: 'Dashboard', hasDropdown: false },
      { label: 'Reports', hasDropdown: false },
      { label: 'Settings', hasDropdown: false },
    ],
  },
};
