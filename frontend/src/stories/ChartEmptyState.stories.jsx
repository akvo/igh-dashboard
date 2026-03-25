import ChartEmptyState from '../components/charts/ChartEmptyState';

export default {
  title: 'Charts/ChartEmptyState',
  component: ChartEmptyState,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['bar', 'stackedBar', 'donut', 'bubble', 'generic'],
    },
    height: { control: 'number' },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 16, background: '#fff' }}>
        <Story />
      </div>
    ),
  ],
};

export const Bar = {
  args: { variant: 'bar', height: 280 },
};

export const StackedBar = {
  args: { variant: 'stackedBar', height: 200 },
};

export const Donut = {
  args: { variant: 'donut', height: 280 },
};

export const Bubble = {
  args: { variant: 'bubble', height: 320 },
};

export const Generic = {
  args: { variant: 'generic', height: 280 },
};

export const WithDescription = {
  args: {
    variant: 'donut',
    height: 280,
    title: 'No data available',
    description: 'Try adjusting your filters to see data.',
  },
};
