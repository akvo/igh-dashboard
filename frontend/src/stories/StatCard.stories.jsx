import StatCard from '../components/ui/StatCard';

export default {
  title: 'UI/StatCard',
  component: StatCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {
    title: 'Total number of candidates',
    value: 4022,
    description: 'Total number of candidates.',
    buttonText: 'Explore candidates',
    tooltip: 'All candidates in the pipeline',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export const WithoutButton = {
  args: {
    title: 'Active trials',
    value: 187,
    description: 'Currently running clinical trials.',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export const LargeNumber = {
  args: {
    title: 'Total investments',
    value: 12500000,
    description: 'Total investment amount in USD.',
    buttonText: 'View details',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export const StringValue = {
  args: {
    title: 'Success rate',
    value: '73.5%',
    description: 'Overall pipeline success rate.',
    buttonText: 'View breakdown',
    tooltip: 'Percentage of candidates that advance',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export const CardGrid = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', width: '960px' }}>
      <StatCard
        title="Total number of candidates"
        value={4022}
        description="Total number of candidates."
        buttonText="Explore candidates"
        tooltip="All candidates in the pipeline"
      />
      <StatCard
        title="Active clinical trials"
        value={187}
        description="Currently running trials."
        buttonText="View trials"
      />
      <StatCard
        title="Diseases covered"
        value={45}
        description="Unique diseases targeted."
        buttonText="Explore diseases"
      />
    </div>
  ),
};
