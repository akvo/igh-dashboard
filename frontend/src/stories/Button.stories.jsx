import Button, { TextLink } from '../components/ui/Button';
import { DownloadIcon, PlusIcon, ArrowRightIcon } from '../components/icons';

export default {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'link', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
  },
};

export const Primary = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Outline = {
  args: {
    children: 'Outline Button',
    variant: 'outline',
  },
};

export const Ghost = {
  args: {
    children: 'Ghost Button',
    variant: 'ghost',
  },
};

export const Danger = {
  args: {
    children: 'Delete',
    variant: 'danger',
  },
};

export const WithLeftIcon = {
  args: {
    children: 'Add Item',
    variant: 'primary',
    leftIcon: <PlusIcon className="w-4 h-4" />,
  },
};

export const WithRightIcon = {
  args: {
    children: 'Download CSV',
    variant: 'secondary',
    rightIcon: <DownloadIcon className="w-4 h-4" />,
  },
};

export const Loading = {
  args: {
    children: 'Saving...',
    variant: 'primary',
    loading: true,
  },
};

export const Disabled = {
  args: {
    children: 'Disabled',
    variant: 'primary',
    disabled: true,
  },
};

export const Sizes = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const AllVariants = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};

// TextLink stories
export const ExploreLink = {
  render: () => (
    <TextLink href="#">Explore</TextLink>
  ),
};

export const TextLinkWithoutArrow = {
  render: () => (
    <TextLink href="#" showArrow={false}>View Details</TextLink>
  ),
};

export const TextLinkWithOnClick = {
  render: () => (
    <TextLink onClick={() => alert('Clicked!')}>Click Me</TextLink>
  ),
};
