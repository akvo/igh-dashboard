import PriorityTotalCard from '../components/ui/PriorityTotalCard';

export default {
  title: 'UI/PriorityTotalCard',
  component: PriorityTotalCard,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [(Story) => <div style={{ width: '260px' }}><Story /></div>],
};

export const Typical = { args: { total: 164 } };
export const Filtered = { args: { total: 12 } };
export const Zero = { args: { total: 0 } };
export const Loading = { args: { loading: true } };
