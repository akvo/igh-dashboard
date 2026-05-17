import { useState } from 'react';
import PriorityListPanel from '../components/ui/PriorityListPanel';

const SAMPLE = [
  { priority_key: 1, priority_name: 'Malaria surveillance assessment toolkit: implementation reference guide, 2nd ed....' },
  { priority_key: 2, priority_name: 'Malaria case management Plasmodium vivax malaria' },
  { priority_key: 3, priority_name: 'WHO Malaria Policy Advisory Group: meeting report, 14-16 October 2025' },
  { priority_key: 4, priority_name: 'WHO malaria terminology 2025, Third edition' },
  { priority_key: 5, priority_name: 'World malaria report 2025' },
  { priority_key: 6, priority_name: 'Paediatric drug optimization for malaria: meeting report, 24-26 June 2025' },
  { priority_key: 7, priority_name: 'Paediatric drug optimization for malaria: meeting report, 24-26 June 2025 (follow-up)' },
];

function Wrapper(props) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="bg-black text-white px-3 py-2 text-sm"
      >
        Open slide-in
      </button>
      <PriorityListPanel {...props} isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}

export default {
  title: 'UI/PriorityListPanel',
  component: PriorityListPanel,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};

export const Populated = {
  render: () => <Wrapper priorities={SAMPLE} />,
};

export const Empty = {
  render: () => <Wrapper priorities={[]} />,
};
