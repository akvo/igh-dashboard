import PriorityShareCard from '../components/ui/PriorityShareCard';
import { chartColors } from '@/lib/theme';

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
    description: 'Pipeline aligned with a WHO priority.',
    candidatesWithPriority: 180,
    totalCandidates: 900,
  },
};

export const ZeroShare = {
  args: {
    title: "Women's health",
    description: 'Pipeline aligned with a WHO priority.',
    candidatesWithPriority: 0,
    totalCandidates: 1119,
  },
};

export const FullShare = {
  args: {
    title: 'Neglected diseases',
    description: 'Pipeline aligned with a WHO priority.',
    candidatesWithPriority: 400,
    totalCandidates: 400,
  },
};

export const NoDenominator = {
  args: {
    title: 'Emerging infectious diseases',
    description: 'Pipeline aligned with a WHO priority.',
    candidatesWithPriority: 0,
    totalCandidates: 0,
  },
};

export const Loading = {
  args: {
    title: 'Neglected diseases',
    description: 'Pipeline aligned with a WHO priority.',
    loading: true,
  },
};

// Exercise the per-GHA accent override. ND/EID/WH on the Home page each
// pass a different `accentColor` from `chartColors.primary`; this story
// pins the green variant so the override path stays covered.
export const GreenAccent = {
  args: {
    title: 'Emerging infectious diseases',
    description: 'Pipeline aligned with a WHO priority.',
    candidatesWithPriority: 180,
    totalCandidates: 900,
    accentColor: chartColors.primary[7],
  },
};
