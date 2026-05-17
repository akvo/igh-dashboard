import PriorityListCard from '../components/ui/PriorityListCard';

const SAMPLE = [
  { priority_key: 1, priority_name: 'Malaria surveillance assessment toolkit: implementation reference guide, 2nd ed....' },
  { priority_key: 2, priority_name: 'Malaria case management Plasmodium vivax malaria' },
  { priority_key: 3, priority_name: 'WHO Malaria Policy Advisory Group: meeting report, 14-16 October 2025' },
  { priority_key: 4, priority_name: 'WHO malaria terminology 2025, Third edition' },
  { priority_key: 5, priority_name: 'World malaria report 2025' },
  { priority_key: 6, priority_name: 'Paediatric drug optimization for malaria: meeting report, 24-26 June 2025' },
];

export default {
  title: 'UI/PriorityListCard',
  component: PriorityListCard,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [(Story) => <div style={{ width: '300px' }}><Story /></div>],
};

export const Typical = {
  args: { priorities: SAMPLE, onSeeAll: () => alert('See all') },
};
export const ExactlyThree = {
  args: { priorities: SAMPLE.slice(0, 3), onSeeAll: () => alert('See all') },
};
export const Empty = {
  args: { priorities: [], onSeeAll: () => alert('See all') },
};
export const Loading = {
  args: { loading: true },
};
