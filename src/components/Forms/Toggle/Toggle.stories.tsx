import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, useState } from 'react';
import { Toggle } from './Toggle';
import { MoonIcon, SunIcon, BellIcon, BellSlashIcon } from '@heroicons/react/24/solid';

const meta = {
  title: 'Components/Forms/Toggle',
  component: Toggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component for interactive state
function ToggleWrapper(props: Omit<React.ComponentProps<typeof Toggle>, 'checked' | 'onChange'>): JSX.Element {
  const [checked, setChecked] = useState(false);
  return <Toggle checked={checked} onChange={setChecked} {...props} />;
}

export const Default: Story = {
  args: {} as never,
  render: () => <ToggleWrapper srLabel="Toggle" />,
};

export const ThemeToggle: Story = {
  args: {} as never,
  render: () => (
    <ToggleWrapper
      leftIcon={<SunIcon />}
      rightIcon={<MoonIcon />}
      leftColor="text-amber-500"
      rightColor="text-primary"
      srLabel="Toggle theme"
    />
  ),
};

export const NotificationToggle: Story = {
  args: {} as never,
  render: () => (
    <ToggleWrapper
      leftIcon={<BellSlashIcon />}
      rightIcon={<BellIcon />}
      leftColor="text-muted"
      rightColor="text-primary"
      srLabel="Toggle notifications"
    />
  ),
};

export const WithoutIcons: Story = {
  args: {} as never,
  render: () => <ToggleWrapper srLabel="Simple toggle" />,
};

export const OnDarkBackground: Story = {
  args: {} as never,
  render: () => (
    <div className="bg-surface p-8">
      <ToggleWrapper
        leftIcon={<SunIcon />}
        rightIcon={<MoonIcon />}
        leftColor="text-amber-500"
        rightColor="text-primary"
        srLabel="Toggle theme"
      />
    </div>
  ),
};

export const SmallSize: Story = {
  args: {} as never,
  render: () => (
    <ToggleWrapper
      leftIcon={<SunIcon />}
      rightIcon={<MoonIcon />}
      leftColor="text-amber-500"
      rightColor="text-primary"
      srLabel="Toggle theme"
      size="small"
    />
  ),
};

export const SmallWithoutIcons: Story = {
  args: {} as never,
  render: () => <ToggleWrapper srLabel="Simple toggle" size="small" />,
};

export const SizeComparison: Story = {
  args: {} as never,
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">Default size:</p>
        <ToggleWrapper
          leftIcon={<SunIcon />}
          rightIcon={<MoonIcon />}
          leftColor="text-amber-500"
          rightColor="text-primary"
          srLabel="Toggle theme default"
        />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">Small size:</p>
        <ToggleWrapper
          leftIcon={<SunIcon />}
          rightIcon={<MoonIcon />}
          leftColor="text-amber-500"
          rightColor="text-primary"
          srLabel="Toggle theme small"
          size="small"
        />
      </div>
    </div>
  ),
};
