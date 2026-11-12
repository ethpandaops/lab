import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field, Label } from '@headlessui/react';
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
    'aria-label': 'Default',
    name: 'default',
  },
};

export const Checked: Story = {
  args: {
    id: 'checked-checkbox',
    'aria-label': 'Checked',
    name: 'checked',
    defaultChecked: true,
  },
};

export const Indeterminate: Story = {
  args: {
    id: 'indeterminate-checkbox',
    'aria-label': 'Indeterminate',
    name: 'indeterminate',
    indeterminate: true,
  },
};

export const Disabled: Story = {
  args: {
    id: 'disabled-checkbox',
    'aria-label': 'Disabled',
    name: 'disabled',
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    id: 'disabled-checked-checkbox',
    'aria-label': 'Disabled checked',
    name: 'disabled-checked',
    disabled: true,
    defaultChecked: true,
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="flex flex-col gap-4">
        <Field className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox id="state-default" name="state-default" />
          <Label>Default</Label>
        </Field>
        <Field className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox id="state-checked" name="state-checked" defaultChecked />
          <Label>Checked</Label>
        </Field>
        <Field className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox id="state-indeterminate" name="state-indeterminate" indeterminate />
          <Label>Indeterminate</Label>
        </Field>
        <Field className="flex items-center gap-2 text-sm text-muted">
          <Checkbox id="state-disabled" name="state-disabled" disabled />
          <Label>Disabled</Label>
        </Field>
        <Field className="flex items-center gap-2 text-sm text-muted">
          <Checkbox id="state-disabled-checked" name="state-disabled-checked" disabled defaultChecked />
          <Label>Disabled Checked</Label>
        </Field>
      </div>
    </div>
  ),
};

/**
 * Checkbox with rounded corners.
 * Uses the `rounded` prop to apply rounded-sm class.
 */
export const Rounded: Story = {
  args: {
    id: 'rounded-checkbox',
    'aria-label': 'Rounded',
    name: 'rounded',
    rounded: true,
  },
};

/**
 * Comparison of rounded vs non-rounded checkboxes.
 */
export const RoundedComparison: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <Field className="flex items-center gap-2 text-sm text-foreground">
        <Checkbox id="no-rounded" name="no-rounded" />
        <Label>No Rounded Corners</Label>
      </Field>
      <Field className="flex items-center gap-2 text-sm text-foreground">
        <Checkbox id="with-rounded" name="with-rounded" rounded />
        <Label>With Rounded Corners</Label>
      </Field>
    </div>
  ),
};
