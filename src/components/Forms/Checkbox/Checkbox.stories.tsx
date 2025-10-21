import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from './Checkbox';

const meta = {
  title: 'Components/Forms/Checkbox',
  component: Checkbox,
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
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'default-checkbox',
    name: 'default',
  },
};

export const Checked: Story = {
  args: {
    id: 'checked-checkbox',
    name: 'checked',
    defaultChecked: true,
  },
};

export const Indeterminate: Story = {
  args: {
    id: 'indeterminate-checkbox',
    name: 'indeterminate',
    indeterminate: true,
  },
};

export const Disabled: Story = {
  args: {
    id: 'disabled-checkbox',
    name: 'disabled',
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    id: 'disabled-checked-checkbox',
    name: 'disabled-checked',
    disabled: true,
    defaultChecked: true,
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox id="state-default" name="state-default" />
          Default
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox id="state-checked" name="state-checked" defaultChecked />
          Checked
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox id="state-indeterminate" name="state-indeterminate" indeterminate />
          Indeterminate
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <Checkbox id="state-disabled" name="state-disabled" disabled />
          Disabled
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <Checkbox id="state-disabled-checked" name="state-disabled-checked" disabled defaultChecked />
          Disabled Checked
        </label>
      </div>
    </div>
  ),
};
