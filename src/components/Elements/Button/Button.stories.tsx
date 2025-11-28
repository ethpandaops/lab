import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { Button } from './Button';
import { CheckCircleIcon, PlusIcon } from '@heroicons/react/20/solid';

const meta = {
  title: 'Components/Elements/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-80 rounded-lg bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'soft', 'outline', 'danger', 'blank'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    rounded: {
      control: 'select',
      options: ['normal', 'full'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic variants
export const Primary: Story = {
  args: {
    children: 'Button text',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Button text',
    variant: 'secondary',
  },
};

export const Soft: Story = {
  args: {
    children: 'Button text',
    variant: 'soft',
  },
};

export const Outline: Story = {
  args: {
    children: 'Button text',
    variant: 'outline',
  },
};

export const Danger: Story = {
  args: {
    children: 'Button text',
    variant: 'danger',
  },
};

export const Blank: Story = {
  args: {
    children: 'Button text',
    variant: 'blank',
  },
};

// Size variants
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Primary</p>
        <div className="flex items-center gap-4">
          <Button variant="primary" size="xs">
            Button text
          </Button>
          <Button variant="primary" size="sm">
            Button text
          </Button>
          <Button variant="primary" size="md">
            Button text
          </Button>
          <Button variant="primary" size="lg">
            Button text
          </Button>
          <Button variant="primary" size="xl">
            Button text
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Secondary</p>
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="xs">
            Button text
          </Button>
          <Button variant="secondary" size="sm">
            Button text
          </Button>
          <Button variant="secondary" size="md">
            Button text
          </Button>
          <Button variant="secondary" size="lg">
            Button text
          </Button>
          <Button variant="secondary" size="xl">
            Button text
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Soft</p>
        <div className="flex items-center gap-4">
          <Button variant="soft" size="xs">
            Button text
          </Button>
          <Button variant="soft" size="sm">
            Button text
          </Button>
          <Button variant="soft" size="md">
            Button text
          </Button>
          <Button variant="soft" size="lg">
            Button text
          </Button>
          <Button variant="soft" size="xl">
            Button text
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Outline</p>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="xs">
            Button text
          </Button>
          <Button variant="outline" size="sm">
            Button text
          </Button>
          <Button variant="outline" size="md">
            Button text
          </Button>
          <Button variant="outline" size="lg">
            Button text
          </Button>
          <Button variant="outline" size="xl">
            Button text
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Danger</p>
        <div className="flex items-center gap-4">
          <Button variant="danger" size="xs">
            Button text
          </Button>
          <Button variant="danger" size="sm">
            Button text
          </Button>
          <Button variant="danger" size="md">
            Button text
          </Button>
          <Button variant="danger" size="lg">
            Button text
          </Button>
          <Button variant="danger" size="xl">
            Button text
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Blank</p>
        <div className="flex items-center gap-4">
          <Button variant="blank" size="xs">
            Button text
          </Button>
          <Button variant="blank" size="sm">
            Button text
          </Button>
          <Button variant="blank" size="md">
            Button text
          </Button>
          <Button variant="blank" size="lg">
            Button text
          </Button>
          <Button variant="blank" size="xl">
            Button text
          </Button>
        </div>
      </div>
    </div>
  ),
};

// Leading icon
export const WithLeadingIcon: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button variant="primary" size="md" leadingIcon={<CheckCircleIcon />}>
        Button text
      </Button>
      <Button variant="primary" size="lg" leadingIcon={<CheckCircleIcon />}>
        Button text
      </Button>
      <Button variant="primary" size="xl" leadingIcon={<CheckCircleIcon />}>
        Button text
      </Button>
    </div>
  ),
};

// Trailing icon
export const WithTrailingIcon: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button variant="primary" size="md" trailingIcon={<CheckCircleIcon />}>
        Button text
      </Button>
      <Button variant="primary" size="lg" trailingIcon={<CheckCircleIcon />}>
        Button text
      </Button>
      <Button variant="primary" size="xl" trailingIcon={<CheckCircleIcon />}>
        Button text
      </Button>
    </div>
  ),
};

// Rounded (pill-shaped) buttons
export const Rounded: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Primary</p>
        <div className="flex items-center gap-4">
          <Button variant="primary" size="xs" rounded="full">
            Button text
          </Button>
          <Button variant="primary" size="sm" rounded="full">
            Button text
          </Button>
          <Button variant="primary" size="md" rounded="full">
            Button text
          </Button>
          <Button variant="primary" size="lg" rounded="full">
            Button text
          </Button>
          <Button variant="primary" size="xl" rounded="full">
            Button text
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Secondary</p>
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="xs" rounded="full">
            Button text
          </Button>
          <Button variant="secondary" size="sm" rounded="full">
            Button text
          </Button>
          <Button variant="secondary" size="md" rounded="full">
            Button text
          </Button>
          <Button variant="secondary" size="lg" rounded="full">
            Button text
          </Button>
          <Button variant="secondary" size="xl" rounded="full">
            Button text
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Soft</p>
        <div className="flex items-center gap-4">
          <Button variant="soft" size="xs" rounded="full">
            Button text
          </Button>
          <Button variant="soft" size="sm" rounded="full">
            Button text
          </Button>
          <Button variant="soft" size="md" rounded="full">
            Button text
          </Button>
          <Button variant="soft" size="lg" rounded="full">
            Button text
          </Button>
          <Button variant="soft" size="xl" rounded="full">
            Button text
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Outline</p>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="xs" rounded="full">
            Button text
          </Button>
          <Button variant="outline" size="sm" rounded="full">
            Button text
          </Button>
          <Button variant="outline" size="md" rounded="full">
            Button text
          </Button>
          <Button variant="outline" size="lg" rounded="full">
            Button text
          </Button>
          <Button variant="outline" size="xl" rounded="full">
            Button text
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Danger</p>
        <div className="flex items-center gap-4">
          <Button variant="danger" size="xs" rounded="full">
            Button text
          </Button>
          <Button variant="danger" size="sm" rounded="full">
            Button text
          </Button>
          <Button variant="danger" size="md" rounded="full">
            Button text
          </Button>
          <Button variant="danger" size="lg" rounded="full">
            Button text
          </Button>
          <Button variant="danger" size="xl" rounded="full">
            Button text
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Blank</p>
        <div className="flex items-center gap-4">
          <Button variant="blank" size="xs" rounded="full">
            Button text
          </Button>
          <Button variant="blank" size="sm" rounded="full">
            Button text
          </Button>
          <Button variant="blank" size="md" rounded="full">
            Button text
          </Button>
          <Button variant="blank" size="lg" rounded="full">
            Button text
          </Button>
          <Button variant="blank" size="xl" rounded="full">
            Button text
          </Button>
        </div>
      </div>
    </div>
  ),
};

// Circular (icon-only) buttons
export const CircularIconOnly: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button variant="primary" size="xs" iconOnly leadingIcon={<PlusIcon />} />
      <Button variant="primary" size="sm" iconOnly leadingIcon={<PlusIcon />} />
      <Button variant="primary" size="md" iconOnly leadingIcon={<PlusIcon />} />
    </div>
  ),
};

// All variants comparison
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Primary</p>
        <div className="flex gap-4">
          <Button variant="primary" size="md">
            Button text
          </Button>
          <Button variant="primary" size="md" leadingIcon={<CheckCircleIcon />}>
            With icon
          </Button>
          <Button variant="primary" size="md" iconOnly leadingIcon={<PlusIcon />} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Secondary</p>
        <div className="flex gap-4">
          <Button variant="secondary" size="md">
            Button text
          </Button>
          <Button variant="secondary" size="md" leadingIcon={<CheckCircleIcon />}>
            With icon
          </Button>
          <Button variant="secondary" size="md" iconOnly leadingIcon={<PlusIcon />} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Soft</p>
        <div className="flex gap-4">
          <Button variant="soft" size="md">
            Button text
          </Button>
          <Button variant="soft" size="md" leadingIcon={<CheckCircleIcon />}>
            With icon
          </Button>
          <Button variant="soft" size="md" iconOnly leadingIcon={<PlusIcon />} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Outline</p>
        <div className="flex gap-4">
          <Button variant="outline" size="md">
            Button text
          </Button>
          <Button variant="outline" size="md" leadingIcon={<CheckCircleIcon />}>
            With icon
          </Button>
          <Button variant="outline" size="md" iconOnly leadingIcon={<PlusIcon />} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Danger</p>
        <div className="flex gap-4">
          <Button variant="danger" size="md">
            Button text
          </Button>
          <Button variant="danger" size="md" leadingIcon={<CheckCircleIcon />}>
            With icon
          </Button>
          <Button variant="danger" size="md" iconOnly leadingIcon={<PlusIcon />} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Blank</p>
        <div className="flex gap-4">
          <Button variant="blank" size="md">
            Button text
          </Button>
          <Button variant="blank" size="md" leadingIcon={<CheckCircleIcon />}>
            With icon
          </Button>
          <Button variant="blank" size="md" iconOnly leadingIcon={<PlusIcon />} />
        </div>
      </div>
    </div>
  ),
};

// Disabled state
export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button variant="primary" disabled>
        Primary
      </Button>
      <Button variant="secondary" disabled>
        Secondary
      </Button>
      <Button variant="soft" disabled>
        Soft
      </Button>
      <Button variant="outline" disabled>
        Outline
      </Button>
      <Button variant="danger" disabled>
        Danger
      </Button>
      <Button variant="blank" disabled>
        Blank
      </Button>
    </div>
  ),
};

// Full width buttons
export const FullWidth: Story = {
  render: () => (
    <div className="flex w-full flex-col gap-4">
      <Button variant="primary" className="w-full justify-center">
        Full Width Primary
      </Button>
      <Button variant="secondary" className="w-full justify-center">
        Full Width Secondary
      </Button>
      <Button variant="soft" className="w-full justify-center">
        Full Width Soft
      </Button>
      <Button variant="outline" className="w-full justify-center">
        Full Width Outline
      </Button>
      <Button variant="danger" className="w-full justify-center">
        Full Width Danger
      </Button>
      <Button variant="blank" className="w-full justify-center">
        Full Width Blank
      </Button>
      <Button variant="primary" className="w-full justify-center" leadingIcon={<CheckCircleIcon />}>
        Full Width with Icon
      </Button>
    </div>
  ),
};

// Interactive example with Headless UI features
export const Interactive: Story = {
  render: () => {
    const [clicks, setClicks] = React.useState(0);

    return (
      <div className="flex flex-col gap-4">
        <div className="text-sm text-muted">
          Click count: {clicks} - Button uses Headless UI for accessibility and keyboard navigation
        </div>
        <div className="flex items-center gap-4">
          <Button variant="primary" onClick={() => setClicks(c => c + 1)} leadingIcon={<PlusIcon />}>
            Click me
          </Button>
          <Button variant="secondary" onClick={() => setClicks(0)}>
            Reset
          </Button>
          <Button variant="outline" disabled={clicks === 0} onClick={() => setClicks(c => c - 1)}>
            Decrement
          </Button>
        </div>
        <div className="text-xs text-muted">Try using Tab to navigate and Space/Enter to activate buttons</div>
      </div>
    );
  },
};

// Hyper mode with pulsating border
export const Hyper: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">All Variants - Hyper Mode</p>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" hyper>
            Primary
          </Button>
          <Button variant="secondary" hyper>
            Secondary
          </Button>
          <Button variant="soft" hyper>
            Soft
          </Button>
          <Button variant="outline" hyper>
            Outline
          </Button>
          <Button variant="danger" hyper>
            Danger
          </Button>
          <Button variant="blank" hyper>
            Blank
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Different Sizes - Hyper Mode</p>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" size="xs" hyper>
            Extra Small
          </Button>
          <Button variant="primary" size="sm" hyper>
            Small
          </Button>
          <Button variant="primary" size="md" hyper>
            Medium
          </Button>
          <Button variant="primary" size="lg" hyper>
            Large
          </Button>
          <Button variant="primary" size="xl" hyper>
            Extra Large
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Rounded Full - All Variants - Hyper Mode</p>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" rounded="full" hyper>
            Primary
          </Button>
          <Button variant="secondary" rounded="full" hyper>
            Secondary
          </Button>
          <Button variant="soft" rounded="full" hyper>
            Soft
          </Button>
          <Button variant="outline" rounded="full" hyper>
            Outline
          </Button>
          <Button variant="danger" rounded="full" hyper>
            Danger
          </Button>
          <Button variant="blank" rounded="full" hyper>
            Blank
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Rounded Full - All Sizes - Hyper Mode</p>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" size="xs" rounded="full" hyper>
            XS
          </Button>
          <Button variant="primary" size="sm" rounded="full" hyper>
            SM
          </Button>
          <Button variant="primary" size="md" rounded="full" hyper>
            MD
          </Button>
          <Button variant="primary" size="lg" rounded="full" hyper>
            LG
          </Button>
          <Button variant="primary" size="xl" rounded="full" hyper>
            XL
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">With Leading Icons - Hyper Mode</p>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" size="xs" leadingIcon={<CheckCircleIcon />} hyper>
            Extra Small
          </Button>
          <Button variant="primary" size="sm" leadingIcon={<CheckCircleIcon />} hyper>
            Small
          </Button>
          <Button variant="primary" size="md" leadingIcon={<CheckCircleIcon />} hyper>
            Medium
          </Button>
          <Button variant="primary" size="lg" leadingIcon={<CheckCircleIcon />} hyper>
            Large
          </Button>
          <Button variant="primary" size="xl" leadingIcon={<CheckCircleIcon />} hyper>
            Extra Large
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Rounded Full with Icons - Hyper Mode</p>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" rounded="full" leadingIcon={<CheckCircleIcon />} hyper>
            Leading Icon
          </Button>
          <Button variant="secondary" rounded="full" leadingIcon={<PlusIcon />} hyper>
            Secondary
          </Button>
          <Button variant="soft" rounded="full" trailingIcon={<CheckCircleIcon />} hyper>
            Trailing Icon
          </Button>
          <Button variant="outline" rounded="full" trailingIcon={<PlusIcon />} hyper>
            Outline
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Icon Only (Circular) - All Sizes - Hyper Mode</p>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" size="xs" iconOnly leadingIcon={<PlusIcon />} hyper />
          <Button variant="primary" size="sm" iconOnly leadingIcon={<PlusIcon />} hyper />
          <Button variant="primary" size="md" iconOnly leadingIcon={<PlusIcon />} hyper />
          <Button variant="primary" size="lg" iconOnly leadingIcon={<PlusIcon />} hyper />
          <Button variant="primary" size="xl" iconOnly leadingIcon={<PlusIcon />} hyper />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Icon Only - All Variants - Hyper Mode</p>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" iconOnly leadingIcon={<PlusIcon />} hyper />
          <Button variant="secondary" iconOnly leadingIcon={<PlusIcon />} hyper />
          <Button variant="soft" iconOnly leadingIcon={<PlusIcon />} hyper />
          <Button variant="outline" iconOnly leadingIcon={<PlusIcon />} hyper />
          <Button variant="danger" iconOnly leadingIcon={<PlusIcon />} hyper />
          <Button variant="blank" iconOnly leadingIcon={<PlusIcon />} hyper />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Comparison - Normal vs Hyper</p>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary">Normal</Button>
          <Button variant="primary" hyper>
            Hyper
          </Button>
          <Button variant="secondary" rounded="full">
            Normal Rounded
          </Button>
          <Button variant="secondary" rounded="full" hyper>
            Hyper Rounded
          </Button>
          <Button variant="soft" iconOnly leadingIcon={<PlusIcon />} />
          <Button variant="soft" iconOnly leadingIcon={<PlusIcon />} hyper />
        </div>
      </div>
    </div>
  ),
};
