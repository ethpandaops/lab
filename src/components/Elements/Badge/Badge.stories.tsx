import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';

const meta = {
  title: 'Components/Elements/Badge',
  component: Badge,
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
    color: {
      control: 'select',
      options: ['gray', 'red', 'yellow', 'green', 'blue', 'indigo', 'purple', 'pink'],
    },
    variant: {
      control: 'radio',
      options: ['border', 'flat'],
    },
    size: {
      control: 'radio',
      options: ['default', 'small'],
    },
    pill: {
      control: 'boolean',
    },
    dot: {
      control: 'boolean',
    },
    truncate: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Badge',
    color: 'gray',
    variant: 'border',
    size: 'default',
  },
};

export const WithBorder: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge color="gray" variant="border">
        Badge
      </Badge>
      <Badge color="red" variant="border">
        Badge
      </Badge>
      <Badge color="yellow" variant="border">
        Badge
      </Badge>
      <Badge color="green" variant="border">
        Badge
      </Badge>
      <Badge color="blue" variant="border">
        Badge
      </Badge>
      <Badge color="indigo" variant="border">
        Badge
      </Badge>
      <Badge color="purple" variant="border">
        Badge
      </Badge>
      <Badge color="pink" variant="border">
        Badge
      </Badge>
    </div>
  ),
};

export const WithBorderAndDot: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge color="gray" variant="border" dot>
        Badge
      </Badge>
      <Badge color="red" variant="border" dot>
        Badge
      </Badge>
      <Badge color="yellow" variant="border" dot>
        Badge
      </Badge>
      <Badge color="green" variant="border" dot>
        Badge
      </Badge>
      <Badge color="blue" variant="border" dot>
        Badge
      </Badge>
      <Badge color="indigo" variant="border" dot>
        Badge
      </Badge>
      <Badge color="purple" variant="border" dot>
        Badge
      </Badge>
      <Badge color="pink" variant="border" dot>
        Badge
      </Badge>
    </div>
  ),
};

export const PillWithBorder: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge color="gray" variant="border" pill>
        Badge
      </Badge>
      <Badge color="red" variant="border" pill>
        Badge
      </Badge>
      <Badge color="yellow" variant="border" pill>
        Badge
      </Badge>
      <Badge color="green" variant="border" pill>
        Badge
      </Badge>
      <Badge color="blue" variant="border" pill>
        Badge
      </Badge>
      <Badge color="indigo" variant="border" pill>
        Badge
      </Badge>
      <Badge color="purple" variant="border" pill>
        Badge
      </Badge>
      <Badge color="pink" variant="border" pill>
        Badge
      </Badge>
    </div>
  ),
};

export const PillWithBorderAndDot: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge color="gray" variant="border" pill dot>
        Badge
      </Badge>
      <Badge color="red" variant="border" pill dot>
        Badge
      </Badge>
      <Badge color="yellow" variant="border" pill dot>
        Badge
      </Badge>
      <Badge color="green" variant="border" pill dot>
        Badge
      </Badge>
      <Badge color="blue" variant="border" pill dot>
        Badge
      </Badge>
      <Badge color="indigo" variant="border" pill dot>
        Badge
      </Badge>
      <Badge color="purple" variant="border" pill dot>
        Badge
      </Badge>
      <Badge color="pink" variant="border" pill dot>
        Badge
      </Badge>
    </div>
  ),
};

export const WithBorderAndRemoveButton: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge color="gray" variant="border" onRemove={() => console.log('Remove')}>
        Badge
      </Badge>
      <Badge color="red" variant="border" onRemove={() => console.log('Remove')}>
        Badge
      </Badge>
      <Badge color="yellow" variant="border" onRemove={() => console.log('Remove')}>
        Badge
      </Badge>
      <Badge color="green" variant="border" onRemove={() => console.log('Remove')}>
        Badge
      </Badge>
      <Badge color="blue" variant="border" onRemove={() => console.log('Remove')}>
        Badge
      </Badge>
      <Badge color="indigo" variant="border" onRemove={() => console.log('Remove')}>
        Badge
      </Badge>
      <Badge color="purple" variant="border" onRemove={() => console.log('Remove')}>
        Badge
      </Badge>
      <Badge color="pink" variant="border" onRemove={() => console.log('Remove')}>
        Badge
      </Badge>
    </div>
  ),
};

export const Flat: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge color="gray" variant="flat">
        Badge
      </Badge>
      <Badge color="red" variant="flat">
        Badge
      </Badge>
      <Badge color="yellow" variant="flat">
        Badge
      </Badge>
      <Badge color="green" variant="flat">
        Badge
      </Badge>
      <Badge color="blue" variant="flat">
        Badge
      </Badge>
      <Badge color="indigo" variant="flat">
        Badge
      </Badge>
      <Badge color="purple" variant="flat">
        Badge
      </Badge>
      <Badge color="pink" variant="flat">
        Badge
      </Badge>
    </div>
  ),
};

export const FlatPill: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge color="gray" variant="flat" pill>
        Badge
      </Badge>
      <Badge color="red" variant="flat" pill>
        Badge
      </Badge>
      <Badge color="yellow" variant="flat" pill>
        Badge
      </Badge>
      <Badge color="green" variant="flat" pill>
        Badge
      </Badge>
      <Badge color="blue" variant="flat" pill>
        Badge
      </Badge>
      <Badge color="indigo" variant="flat" pill>
        Badge
      </Badge>
      <Badge color="purple" variant="flat" pill>
        Badge
      </Badge>
      <Badge color="pink" variant="flat" pill>
        Badge
      </Badge>
    </div>
  ),
};

export const FlatWithDot: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge color="gray" variant="flat" dot>
        Badge
      </Badge>
      <Badge color="red" variant="flat" dot>
        Badge
      </Badge>
      <Badge color="yellow" variant="flat" dot>
        Badge
      </Badge>
      <Badge color="green" variant="flat" dot>
        Badge
      </Badge>
      <Badge color="blue" variant="flat" dot>
        Badge
      </Badge>
      <Badge color="indigo" variant="flat" dot>
        Badge
      </Badge>
      <Badge color="purple" variant="flat" dot>
        Badge
      </Badge>
      <Badge color="pink" variant="flat" dot>
        Badge
      </Badge>
    </div>
  ),
};

export const FlatPillWithDot: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge color="gray" variant="flat" pill dot>
        Badge
      </Badge>
      <Badge color="red" variant="flat" pill dot>
        Badge
      </Badge>
      <Badge color="yellow" variant="flat" pill dot>
        Badge
      </Badge>
      <Badge color="green" variant="flat" pill dot>
        Badge
      </Badge>
      <Badge color="blue" variant="flat" pill dot>
        Badge
      </Badge>
      <Badge color="indigo" variant="flat" pill dot>
        Badge
      </Badge>
      <Badge color="purple" variant="flat" pill dot>
        Badge
      </Badge>
      <Badge color="pink" variant="flat" pill dot>
        Badge
      </Badge>
    </div>
  ),
};

export const FlatWithRemoveButton: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge color="gray" variant="flat" onRemove={() => console.log('Remove')}>
        Badge
      </Badge>
      <Badge color="red" variant="flat" onRemove={() => console.log('Remove')}>
        Badge
      </Badge>
      <Badge color="yellow" variant="flat" onRemove={() => console.log('Remove')}>
        Badge
      </Badge>
      <Badge color="green" variant="flat" onRemove={() => console.log('Remove')}>
        Badge
      </Badge>
      <Badge color="blue" variant="flat" onRemove={() => console.log('Remove')}>
        Badge
      </Badge>
      <Badge color="indigo" variant="flat" onRemove={() => console.log('Remove')}>
        Badge
      </Badge>
      <Badge color="purple" variant="flat" onRemove={() => console.log('Remove')}>
        Badge
      </Badge>
      <Badge color="pink" variant="flat" onRemove={() => console.log('Remove')}>
        Badge
      </Badge>
    </div>
  ),
};

export const SmallWithBorder: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge color="gray" variant="border" size="small">
        Badge
      </Badge>
      <Badge color="red" variant="border" size="small">
        Badge
      </Badge>
      <Badge color="yellow" variant="border" size="small">
        Badge
      </Badge>
      <Badge color="green" variant="border" size="small">
        Badge
      </Badge>
      <Badge color="blue" variant="border" size="small">
        Badge
      </Badge>
      <Badge color="indigo" variant="border" size="small">
        Badge
      </Badge>
      <Badge color="purple" variant="border" size="small">
        Badge
      </Badge>
      <Badge color="pink" variant="border" size="small">
        Badge
      </Badge>
    </div>
  ),
};

export const SmallFlat: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge color="gray" variant="flat" size="small">
        Badge
      </Badge>
      <Badge color="red" variant="flat" size="small">
        Badge
      </Badge>
      <Badge color="yellow" variant="flat" size="small">
        Badge
      </Badge>
      <Badge color="green" variant="flat" size="small">
        Badge
      </Badge>
      <Badge color="blue" variant="flat" size="small">
        Badge
      </Badge>
      <Badge color="indigo" variant="flat" size="small">
        Badge
      </Badge>
      <Badge color="purple" variant="flat" size="small">
        Badge
      </Badge>
      <Badge color="pink" variant="flat" size="small">
        Badge
      </Badge>
    </div>
  ),
};

export const SmallPillWithBorder: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge color="gray" variant="border" size="small" pill>
        Badge
      </Badge>
      <Badge color="red" variant="border" size="small" pill>
        Badge
      </Badge>
      <Badge color="yellow" variant="border" size="small" pill>
        Badge
      </Badge>
      <Badge color="green" variant="border" size="small" pill>
        Badge
      </Badge>
      <Badge color="blue" variant="border" size="small" pill>
        Badge
      </Badge>
      <Badge color="indigo" variant="border" size="small" pill>
        Badge
      </Badge>
      <Badge color="purple" variant="border" size="small" pill>
        Badge
      </Badge>
      <Badge color="pink" variant="border" size="small" pill>
        Badge
      </Badge>
    </div>
  ),
};

export const SmallFlatPill: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge color="gray" variant="flat" size="small" pill>
        Badge
      </Badge>
      <Badge color="red" variant="flat" size="small" pill>
        Badge
      </Badge>
      <Badge color="yellow" variant="flat" size="small" pill>
        Badge
      </Badge>
      <Badge color="green" variant="flat" size="small" pill>
        Badge
      </Badge>
      <Badge color="blue" variant="flat" size="small" pill>
        Badge
      </Badge>
      <Badge color="indigo" variant="flat" size="small" pill>
        Badge
      </Badge>
      <Badge color="purple" variant="flat" size="small" pill>
        Badge
      </Badge>
      <Badge color="pink" variant="flat" size="small" pill>
        Badge
      </Badge>
    </div>
  ),
};

export const SmallFlatWithDot: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge color="gray" variant="flat" size="small" dot>
        Badge
      </Badge>
      <Badge color="red" variant="flat" size="small" dot>
        Badge
      </Badge>
      <Badge color="yellow" variant="flat" size="small" dot>
        Badge
      </Badge>
      <Badge color="green" variant="flat" size="small" dot>
        Badge
      </Badge>
      <Badge color="blue" variant="flat" size="small" dot>
        Badge
      </Badge>
      <Badge color="indigo" variant="flat" size="small" dot>
        Badge
      </Badge>
      <Badge color="purple" variant="flat" size="small" dot>
        Badge
      </Badge>
      <Badge color="pink" variant="flat" size="small" dot>
        Badge
      </Badge>
    </div>
  ),
};

export const SmallFlatPillWithDot: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge color="gray" variant="flat" size="small" pill dot>
        Badge
      </Badge>
      <Badge color="red" variant="flat" size="small" pill dot>
        Badge
      </Badge>
      <Badge color="yellow" variant="flat" size="small" pill dot>
        Badge
      </Badge>
      <Badge color="green" variant="flat" size="small" pill dot>
        Badge
      </Badge>
      <Badge color="blue" variant="flat" size="small" pill dot>
        Badge
      </Badge>
      <Badge color="indigo" variant="flat" size="small" pill dot>
        Badge
      </Badge>
      <Badge color="purple" variant="flat" size="small" pill dot>
        Badge
      </Badge>
      <Badge color="pink" variant="flat" size="small" pill dot>
        Badge
      </Badge>
    </div>
  ),
};

export const Truncated: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm/6 font-semibold">With border</h3>
        <div className="flex flex-wrap gap-2">
          <Badge color="gray" variant="border" truncate>
            This is a very long badge text that will be truncated
          </Badge>
          <Badge color="blue" variant="border" truncate>
            Another extremely long badge label that exceeds max width
          </Badge>
          <Badge color="green" variant="border" truncate>
            Short text
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm/6 font-semibold">Flat</h3>
        <div className="flex flex-wrap gap-2">
          <Badge color="red" variant="flat" truncate>
            This is a very long badge text that will be truncated
          </Badge>
          <Badge color="purple" variant="flat" truncate>
            Another extremely long badge label that exceeds max width
          </Badge>
          <Badge color="yellow" variant="flat" truncate>
            Short text
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm/6 font-semibold">Pill</h3>
        <div className="flex flex-wrap gap-2">
          <Badge color="indigo" variant="border" pill truncate>
            This is a very long pill badge that will be truncated
          </Badge>
          <Badge color="pink" variant="flat" pill truncate>
            Another extremely long pill badge label
          </Badge>
          <Badge color="blue" variant="border" pill truncate>
            Short
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm/6 font-semibold">With dot</h3>
        <div className="flex flex-wrap gap-2">
          <Badge color="green" variant="border" dot truncate>
            This is a very long badge with dot that will be truncated
          </Badge>
          <Badge color="red" variant="flat" dot truncate>
            Another extremely long badge with dot
          </Badge>
          <Badge color="blue" variant="border" pill dot truncate>
            Long pill with dot badge text here
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm/6 font-semibold">With remove button</h3>
        <div className="flex flex-wrap gap-2">
          <Badge color="blue" variant="border" truncate onRemove={() => console.log('Remove')}>
            This is a very long badge with remove button
          </Badge>
          <Badge color="purple" variant="flat" truncate onRemove={() => console.log('Remove')}>
            Another extremely long badge with remove
          </Badge>
          <Badge color="green" variant="border" pill truncate onRemove={() => console.log('Remove')}>
            Long pill badge with remove button
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm/6 font-semibold">Small size</h3>
        <div className="flex flex-wrap gap-2">
          <Badge color="gray" variant="border" size="small" truncate>
            This is a very long small badge text
          </Badge>
          <Badge color="blue" variant="flat" size="small" truncate>
            Another extremely long small badge
          </Badge>
          <Badge color="red" variant="border" size="small" pill truncate>
            Long small pill badge text
          </Badge>
        </div>
      </div>
    </div>
  ),
};

export const AllVariations: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm/6 font-semibold">With border</h3>
        <div className="flex flex-wrap gap-2">
          <Badge color="gray" variant="border">
            Badge
          </Badge>
          <Badge color="red" variant="border">
            Badge
          </Badge>
          <Badge color="yellow" variant="border">
            Badge
          </Badge>
          <Badge color="green" variant="border">
            Badge
          </Badge>
          <Badge color="blue" variant="border">
            Badge
          </Badge>
          <Badge color="indigo" variant="border">
            Badge
          </Badge>
          <Badge color="purple" variant="border">
            Badge
          </Badge>
          <Badge color="pink" variant="border">
            Badge
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm/6 font-semibold">With border and dot</h3>
        <div className="flex flex-wrap gap-2">
          <Badge color="gray" variant="border" dot>
            Badge
          </Badge>
          <Badge color="red" variant="border" dot>
            Badge
          </Badge>
          <Badge color="yellow" variant="border" dot>
            Badge
          </Badge>
          <Badge color="green" variant="border" dot>
            Badge
          </Badge>
          <Badge color="blue" variant="border" dot>
            Badge
          </Badge>
          <Badge color="indigo" variant="border" dot>
            Badge
          </Badge>
          <Badge color="purple" variant="border" dot>
            Badge
          </Badge>
          <Badge color="pink" variant="border" dot>
            Badge
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm/6 font-semibold">Pill with border</h3>
        <div className="flex flex-wrap gap-2">
          <Badge color="gray" variant="border" pill>
            Badge
          </Badge>
          <Badge color="red" variant="border" pill>
            Badge
          </Badge>
          <Badge color="yellow" variant="border" pill>
            Badge
          </Badge>
          <Badge color="green" variant="border" pill>
            Badge
          </Badge>
          <Badge color="blue" variant="border" pill>
            Badge
          </Badge>
          <Badge color="indigo" variant="border" pill>
            Badge
          </Badge>
          <Badge color="purple" variant="border" pill>
            Badge
          </Badge>
          <Badge color="pink" variant="border" pill>
            Badge
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm/6 font-semibold">Pill with border and dot</h3>
        <div className="flex flex-wrap gap-2">
          <Badge color="gray" variant="border" pill dot>
            Badge
          </Badge>
          <Badge color="red" variant="border" pill dot>
            Badge
          </Badge>
          <Badge color="yellow" variant="border" pill dot>
            Badge
          </Badge>
          <Badge color="green" variant="border" pill dot>
            Badge
          </Badge>
          <Badge color="blue" variant="border" pill dot>
            Badge
          </Badge>
          <Badge color="indigo" variant="border" pill dot>
            Badge
          </Badge>
          <Badge color="purple" variant="border" pill dot>
            Badge
          </Badge>
          <Badge color="pink" variant="border" pill dot>
            Badge
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm/6 font-semibold">With border and remove button</h3>
        <div className="flex flex-wrap gap-2">
          <Badge color="gray" variant="border" onRemove={() => {}}>
            Badge
          </Badge>
          <Badge color="red" variant="border" onRemove={() => {}}>
            Badge
          </Badge>
          <Badge color="yellow" variant="border" onRemove={() => {}}>
            Badge
          </Badge>
          <Badge color="green" variant="border" onRemove={() => {}}>
            Badge
          </Badge>
          <Badge color="blue" variant="border" onRemove={() => {}}>
            Badge
          </Badge>
          <Badge color="indigo" variant="border" onRemove={() => {}}>
            Badge
          </Badge>
          <Badge color="purple" variant="border" onRemove={() => {}}>
            Badge
          </Badge>
          <Badge color="pink" variant="border" onRemove={() => {}}>
            Badge
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm/6 font-semibold">Flat</h3>
        <div className="flex flex-wrap gap-2">
          <Badge color="gray" variant="flat">
            Badge
          </Badge>
          <Badge color="red" variant="flat">
            Badge
          </Badge>
          <Badge color="yellow" variant="flat">
            Badge
          </Badge>
          <Badge color="green" variant="flat">
            Badge
          </Badge>
          <Badge color="blue" variant="flat">
            Badge
          </Badge>
          <Badge color="indigo" variant="flat">
            Badge
          </Badge>
          <Badge color="purple" variant="flat">
            Badge
          </Badge>
          <Badge color="pink" variant="flat">
            Badge
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm/6 font-semibold">Flat pill</h3>
        <div className="flex flex-wrap gap-2">
          <Badge color="gray" variant="flat" pill>
            Badge
          </Badge>
          <Badge color="red" variant="flat" pill>
            Badge
          </Badge>
          <Badge color="yellow" variant="flat" pill>
            Badge
          </Badge>
          <Badge color="green" variant="flat" pill>
            Badge
          </Badge>
          <Badge color="blue" variant="flat" pill>
            Badge
          </Badge>
          <Badge color="indigo" variant="flat" pill>
            Badge
          </Badge>
          <Badge color="purple" variant="flat" pill>
            Badge
          </Badge>
          <Badge color="pink" variant="flat" pill>
            Badge
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm/6 font-semibold">Flat with dot</h3>
        <div className="flex flex-wrap gap-2">
          <Badge color="gray" variant="flat" dot>
            Badge
          </Badge>
          <Badge color="red" variant="flat" dot>
            Badge
          </Badge>
          <Badge color="yellow" variant="flat" dot>
            Badge
          </Badge>
          <Badge color="green" variant="flat" dot>
            Badge
          </Badge>
          <Badge color="blue" variant="flat" dot>
            Badge
          </Badge>
          <Badge color="indigo" variant="flat" dot>
            Badge
          </Badge>
          <Badge color="purple" variant="flat" dot>
            Badge
          </Badge>
          <Badge color="pink" variant="flat" dot>
            Badge
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm/6 font-semibold">Flat pill with dot</h3>
        <div className="flex flex-wrap gap-2">
          <Badge color="gray" variant="flat" pill dot>
            Badge
          </Badge>
          <Badge color="red" variant="flat" pill dot>
            Badge
          </Badge>
          <Badge color="yellow" variant="flat" pill dot>
            Badge
          </Badge>
          <Badge color="green" variant="flat" pill dot>
            Badge
          </Badge>
          <Badge color="blue" variant="flat" pill dot>
            Badge
          </Badge>
          <Badge color="indigo" variant="flat" pill dot>
            Badge
          </Badge>
          <Badge color="purple" variant="flat" pill dot>
            Badge
          </Badge>
          <Badge color="pink" variant="flat" pill dot>
            Badge
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm/6 font-semibold">Flat with remove button</h3>
        <div className="flex flex-wrap gap-2">
          <Badge color="gray" variant="flat" onRemove={() => {}}>
            Badge
          </Badge>
          <Badge color="red" variant="flat" onRemove={() => {}}>
            Badge
          </Badge>
          <Badge color="yellow" variant="flat" onRemove={() => {}}>
            Badge
          </Badge>
          <Badge color="green" variant="flat" onRemove={() => {}}>
            Badge
          </Badge>
          <Badge color="blue" variant="flat" onRemove={() => {}}>
            Badge
          </Badge>
          <Badge color="indigo" variant="flat" onRemove={() => {}}>
            Badge
          </Badge>
          <Badge color="purple" variant="flat" onRemove={() => {}}>
            Badge
          </Badge>
          <Badge color="pink" variant="flat" onRemove={() => {}}>
            Badge
          </Badge>
        </div>
      </div>
    </div>
  ),
};
