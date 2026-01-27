import Chip, { ChipGroup } from '../components/ui/Chip';
import { useState } from 'react';

export default {
  title: 'UI/Chip',
  component: Chip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default', 'primary', 'success', 'warning', 'error', 'info',
        'early', 'late', 'on-time', 'delayed', 'cancelled', 'rescheduled',
        'pre-clinical', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'approved',
      ],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export const Default = {
  args: {
    children: 'Default Chip',
    variant: 'default',
  },
};

// R&D Stage variants
export const RDStages = {
  render: () => (
    <ChipGroup>
      <Chip variant="early">Early</Chip>
      <Chip variant="late">Late</Chip>
      <Chip variant="on-time">On Time</Chip>
      <Chip variant="delayed">Delayed</Chip>
      <Chip variant="cancelled">Cancelled</Chip>
      <Chip variant="rescheduled">Rescheduled</Chip>
    </ChipGroup>
  ),
};

// Phase variants
export const Phases = {
  render: () => (
    <ChipGroup>
      <Chip variant="pre-clinical">Pre-clinical</Chip>
      <Chip variant="phase-1">Phase 1</Chip>
      <Chip variant="phase-2">Phase 2</Chip>
      <Chip variant="phase-3">Phase 3</Chip>
      <Chip variant="phase-4">Phase 4</Chip>
      <Chip variant="approved">Approved</Chip>
    </ChipGroup>
  ),
};

// Status variants
export const Status = {
  render: () => (
    <ChipGroup>
      <Chip variant="success">Success</Chip>
      <Chip variant="warning">Warning</Chip>
      <Chip variant="error">Error</Chip>
      <Chip variant="info">Info</Chip>
    </ChipGroup>
  ),
};

// Sizes
export const Sizes = {
  render: () => (
    <ChipGroup>
      <Chip size="sm" variant="primary">Small</Chip>
      <Chip size="md" variant="primary">Medium</Chip>
      <Chip size="lg" variant="primary">Large</Chip>
    </ChipGroup>
  ),
};

// Clickable chips
export const Clickable = {
  render: () => (
    <ChipGroup>
      <Chip variant="primary" onClick={() => alert('Clicked!')}>Click me</Chip>
      <Chip variant="success" onClick={() => alert('Clicked!')}>Click me too</Chip>
    </ChipGroup>
  ),
};

// Removable chips
export const Removable = {
  render: () => {
    const RemovableDemo = () => {
      const [chips, setChips] = useState(['Chip 1', 'Chip 2', 'Chip 3']);

      const handleRemove = (index) => {
        setChips(chips.filter((_, i) => i !== index));
      };

      return (
        <ChipGroup>
          {chips.map((chip, index) => (
            <Chip
              key={chip}
              variant="primary"
              removable
              onRemove={() => handleRemove(index)}
            >
              {chip}
            </Chip>
          ))}
        </ChipGroup>
      );
    };

    return <RemovableDemo />;
  },
};

// Filter chips (selectable)
export const FilterChips = {
  render: () => {
    const FilterDemo = () => {
      const [selected, setSelected] = useState(['Phase 1']);
      const phases = ['Pre-clinical', 'Phase 1', 'Phase 2', 'Phase 3', 'Approved'];

      const togglePhase = (phase) => {
        if (selected.includes(phase)) {
          setSelected(selected.filter(p => p !== phase));
        } else {
          setSelected([...selected, phase]);
        }
      };

      return (
        <ChipGroup>
          {phases.map((phase) => (
            <Chip
              key={phase}
              variant={selected.includes(phase) ? 'active' : 'inactive'}
              selected={selected.includes(phase)}
              onClick={() => togglePhase(phase)}
            >
              {phase}
            </Chip>
          ))}
        </ChipGroup>
      );
    };

    return <FilterDemo />;
  },
};

// Disabled
export const Disabled = {
  args: {
    children: 'Disabled Chip',
    variant: 'primary',
    disabled: true,
  },
};
