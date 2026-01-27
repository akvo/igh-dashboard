import Sidebar from '../components/layout/Sidebar';

export default {
  title: 'Layout/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    activeId: {
      control: 'select',
      options: ['home', 'portfolio', 'cross-pipeline', 'who-priority', 'ai-search', 'case-studies', 'methodology'],
      description: 'Currently active menu item',
    },
    defaultExpanded: {
      control: 'boolean',
      description: 'Whether sidebar starts expanded',
    },
    showSearch: {
      control: 'boolean',
      description: 'Show/hide search input',
    },
    showHelp: {
      control: 'boolean',
      description: 'Show/hide help link',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', display: 'flex' }}>
        <Story />
        <div style={{ flex: 1, padding: '24px', backgroundColor: '#fbf6eb' }}>
          <p style={{ color: '#666' }}>Main content area</p>
        </div>
      </div>
    ),
  ],
};

export const Default = {
  args: {
    activeId: 'home',
    defaultExpanded: true,
    showSearch: true,
    showHelp: true,
  },
};

export const Collapsed = {
  args: {
    activeId: 'home',
    defaultExpanded: false,
    showSearch: true,
    showHelp: true,
  },
};

export const PortfolioActive = {
  args: {
    activeId: 'portfolio',
    defaultExpanded: true,
    showSearch: true,
    showHelp: true,
  },
};

export const AISearchActive = {
  args: {
    activeId: 'ai-search',
    defaultExpanded: true,
    showSearch: true,
    showHelp: true,
  },
};

export const NoSearch = {
  args: {
    activeId: 'home',
    defaultExpanded: true,
    showSearch: false,
    showHelp: true,
  },
};

export const Minimal = {
  args: {
    activeId: 'home',
    defaultExpanded: true,
    showSearch: false,
    showHelp: false,
  },
};

// Custom menu items example
const customMenuItems = [
  {
    section: 'DASHBOARDS',
    items: [
      { id: 'overview', label: 'Overview', icon: () => <span>📊</span>, href: '/overview' },
      { id: 'analytics', label: 'Analytics', icon: () => <span>📈</span>, href: '/analytics' },
    ],
  },
  {
    section: 'SETTINGS',
    items: [
      { id: 'profile', label: 'Profile', icon: () => <span>👤</span>, href: '/profile' },
      { id: 'preferences', label: 'Preferences', icon: () => <span>⚙️</span>, href: '/preferences' },
    ],
  },
];

export const CustomMenuItems = {
  args: {
    menuItems: customMenuItems,
    activeId: 'overview',
    defaultExpanded: true,
    showSearch: true,
    showHelp: true,
  },
};
