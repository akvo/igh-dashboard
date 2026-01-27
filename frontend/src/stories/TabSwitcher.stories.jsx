import TabSwitcher from '../components/ui/TabSwitcher';
import { ChartIcon, ListIcon, GridIcon, GlobeIcon } from '../components/icons';
import { useState } from 'react';

export default {
  title: 'UI/TabSwitcher',
  component: TabSwitcher,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = {
  render: () => {
    const DefaultDemo = () => {
      const [active, setActive] = useState('visual');

      return (
        <TabSwitcher
          activeTab={active}
          onChange={setActive}
          tabs={[
            { label: 'Explore visual insights', value: 'visual', icon: ChartIcon },
            { label: 'Extract custom details', value: 'extract', icon: ListIcon },
          ]}
        />
      );
    };

    return <DefaultDemo />;
  },
};

export const ThreeTabs = {
  render: () => {
    const ThreeTabsDemo = () => {
      const [active, setActive] = useState('chart');

      return (
        <TabSwitcher
          activeTab={active}
          onChange={setActive}
          tabs={[
            { label: 'Chart view', value: 'chart', icon: ChartIcon },
            { label: 'Grid view', value: 'grid', icon: GridIcon },
            { label: 'Map view', value: 'map', icon: GlobeIcon },
          ]}
        />
      );
    };

    return <ThreeTabsDemo />;
  },
};

export const TextOnly = {
  render: () => {
    const TextOnlyDemo = () => {
      const [active, setActive] = useState('overview');

      return (
        <TabSwitcher
          activeTab={active}
          onChange={setActive}
          tabs={[
            { label: 'Overview', value: 'overview' },
            { label: 'Details', value: 'details' },
            { label: 'Analytics', value: 'analytics' },
          ]}
        />
      );
    };

    return <TextOnlyDemo />;
  },
};

export const IconOnly = {
  render: () => {
    const IconOnlyDemo = () => {
      const [active, setActive] = useState('chart');

      return (
        <TabSwitcher
          activeTab={active}
          onChange={setActive}
          tabs={[
            { value: 'chart', icon: ChartIcon },
            { value: 'grid', icon: GridIcon },
            { value: 'list', icon: ListIcon },
            { value: 'map', icon: GlobeIcon },
          ]}
        />
      );
    };

    return <IconOnlyDemo />;
  },
};

export const SimpleStrings = {
  render: () => {
    const SimpleDemo = () => {
      const [active, setActive] = useState('Tab 1');

      return (
        <TabSwitcher
          activeTab={active}
          onChange={setActive}
          tabs={['Tab 1', 'Tab 2', 'Tab 3']}
        />
      );
    };

    return <SimpleDemo />;
  },
};
