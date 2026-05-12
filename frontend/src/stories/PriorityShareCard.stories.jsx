import PriorityShareCard from '../components/ui/PriorityShareCard';

export default {
  title: 'UI/PriorityShareCard',
  component: PriorityShareCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '260px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Typical = {
  args: {
    title: 'Neglected diseases',
    description: 'Share with dedicated priority.',
    diseasesWithPriority: 6,
    totalDiseases: 30,
  },
};

export const ZeroShare = {
  args: {
    title: "Women's health",
    description: 'Share with dedicated priority.',
    diseasesWithPriority: 0,
    totalDiseases: 59,
  },
};

export const FullShare = {
  args: {
    title: 'Neglected diseases',
    description: 'Share with dedicated priority.',
    diseasesWithPriority: 12,
    totalDiseases: 12,
  },
};

export const NoDenominator = {
  args: {
    title: 'Emerging infectious diseases',
    description: 'Share with dedicated priority.',
    diseasesWithPriority: 0,
    totalDiseases: 0,
  },
};

export const Loading = {
  args: {
    title: 'Neglected diseases',
    description: 'Share with dedicated priority.',
    loading: true,
  },
};
