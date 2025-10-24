import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ItemNavigation } from './ItemNavigation';
import { ClockIcon } from '@heroicons/react/20/solid';

const meta = {
  title: 'Components/Navigation/ItemNavigation',
  component: ItemNavigation,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    showJumpTo: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof ItemNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story with interactive state
export const Default: Story = {
  args: {} as never,
  render: () => {
    const [currentSlot, setCurrentSlot] = useState(12345);

    return (
      <ItemNavigation
        currentItem={currentSlot}
        itemLabel="Slot"
        hasNext={true}
        hasPrevious={currentSlot > 0}
        onNext={() => setCurrentSlot(s => s + 1)}
        onPrevious={() => setCurrentSlot(s => Math.max(0, s - 1))}
        onJumpTo={slot => setCurrentSlot(Number(slot))}
      />
    );
  },
};

// Without jump to input
export const WithoutJumpTo: Story = {
  args: {} as never,
  render: () => {
    const [currentSlot, setCurrentSlot] = useState(12345);

    return (
      <ItemNavigation
        currentItem={currentSlot}
        itemLabel="Slot"
        hasNext={true}
        hasPrevious={currentSlot > 0}
        onNext={() => setCurrentSlot(s => s + 1)}
        onPrevious={() => setCurrentSlot(s => Math.max(0, s - 1))}
        showJumpTo={false}
      />
    );
  },
};

// At first item (previous disabled)
export const AtFirstItem: Story = {
  args: {} as never,
  render: () => (
    <ItemNavigation
      currentItem={0}
      itemLabel="Slot"
      hasNext={true}
      hasPrevious={false}
      onNext={() => console.log('Next')}
      onPrevious={() => console.log('Previous')}
      onJumpTo={slot => console.log('Jump to:', slot)}
    />
  ),
};

// At last item (next disabled)
export const AtLastItem: Story = {
  args: {} as never,
  render: () => (
    <ItemNavigation
      currentItem={99999}
      itemLabel="Slot"
      hasNext={false}
      hasPrevious={true}
      onNext={() => console.log('Next')}
      onPrevious={() => console.log('Previous')}
      onJumpTo={slot => console.log('Jump to:', slot)}
    />
  ),
};

// Small size
export const SmallSize: Story = {
  args: {} as never,
  render: () => {
    const [currentSlot, setCurrentSlot] = useState(12345);

    return (
      <ItemNavigation
        currentItem={currentSlot}
        itemLabel="Slot"
        hasNext={true}
        hasPrevious={currentSlot > 0}
        onNext={() => setCurrentSlot(s => s + 1)}
        onPrevious={() => setCurrentSlot(s => Math.max(0, s - 1))}
        onJumpTo={slot => setCurrentSlot(Number(slot))}
        size="sm"
      />
    );
  },
};

// Large size
export const LargeSize: Story = {
  args: {} as never,
  render: () => {
    const [currentSlot, setCurrentSlot] = useState(12345);

    return (
      <ItemNavigation
        currentItem={currentSlot}
        itemLabel="Slot"
        hasNext={true}
        hasPrevious={currentSlot > 0}
        onNext={() => setCurrentSlot(s => s + 1)}
        onPrevious={() => setCurrentSlot(s => Math.max(0, s - 1))}
        onJumpTo={slot => setCurrentSlot(Number(slot))}
        size="lg"
      />
    );
  },
};

// Loading state
export const Loading: Story = {
  args: {} as never,
  render: () => (
    <ItemNavigation
      currentItem={12345}
      itemLabel="Slot"
      hasNext={true}
      hasPrevious={true}
      onNext={() => console.log('Next')}
      onPrevious={() => console.log('Previous')}
      onJumpTo={slot => console.log('Jump to:', slot)}
      loading={true}
    />
  ),
};

// With leading content
export const WithLeadingContent: Story = {
  args: {} as never,
  render: () => {
    const [currentSlot, setCurrentSlot] = useState(12345);

    return (
      <ItemNavigation
        currentItem={currentSlot}
        itemLabel="Slot"
        hasNext={true}
        hasPrevious={currentSlot > 0}
        onNext={() => setCurrentSlot(s => s + 1)}
        onPrevious={() => setCurrentSlot(s => Math.max(0, s - 1))}
        onJumpTo={slot => setCurrentSlot(Number(slot))}
        leadingContent={
          <div className="flex items-center gap-2 rounded-sm bg-muted/20 px-3 py-2">
            <ClockIcon className="size-4 text-primary" />
            <span className="text-sm/6 text-muted">Epoch 385</span>
          </div>
        }
      />
    );
  },
};

// With trailing content
export const WithTrailingContent: Story = {
  args: {} as never,
  render: () => {
    const [currentSlot, setCurrentSlot] = useState(12345);

    return (
      <ItemNavigation
        currentItem={currentSlot}
        itemLabel="Slot"
        hasNext={true}
        hasPrevious={currentSlot > 0}
        onNext={() => setCurrentSlot(s => s + 1)}
        onPrevious={() => setCurrentSlot(s => Math.max(0, s - 1))}
        onJumpTo={slot => setCurrentSlot(Number(slot))}
        trailingContent={
          <div className="rounded-sm bg-success/10 px-3 py-2">
            <span className="text-sm/6 font-medium text-success">Proposed</span>
          </div>
        }
      />
    );
  },
};

// Different item types - Block
export const BlockNavigation: Story = {
  args: {} as never,
  render: () => {
    const [currentBlock, setCurrentBlock] = useState(18000000);

    return (
      <ItemNavigation
        currentItem={currentBlock}
        itemLabel="Block"
        hasNext={true}
        hasPrevious={currentBlock > 0}
        onNext={() => setCurrentBlock(b => b + 1)}
        onPrevious={() => setCurrentBlock(b => Math.max(0, b - 1))}
        onJumpTo={block => setCurrentBlock(Number(block))}
      />
    );
  },
};

// Different item types - Page
export const PageNavigation: Story = {
  args: {} as never,
  render: () => {
    const [currentPage, setCurrentPage] = useState(5);

    return (
      <ItemNavigation
        currentItem={currentPage}
        itemLabel="Page"
        hasNext={currentPage < 10}
        hasPrevious={currentPage > 1}
        onNext={() => setCurrentPage(p => Math.min(10, p + 1))}
        onPrevious={() => setCurrentPage(p => Math.max(1, p - 1))}
        onJumpTo={page => setCurrentPage(Number(page))}
      />
    );
  },
};

// String-based items
export const StringBasedItems: Story = {
  args: {} as never,
  render: () => {
    const items = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
    const [currentIndex, setCurrentIndex] = useState(2);

    return (
      <ItemNavigation
        currentItem={items[currentIndex]}
        itemLabel="Version"
        hasNext={currentIndex < items.length - 1}
        hasPrevious={currentIndex > 0}
        onNext={() => setCurrentIndex(i => Math.min(items.length - 1, i + 1))}
        onPrevious={() => setCurrentIndex(i => Math.max(0, i - 1))}
        onJumpTo={version => {
          const index = items.indexOf(version as string);
          if (index !== -1) setCurrentIndex(index);
        }}
        showJumpTo={false}
      />
    );
  },
};

// All sizes comparison
export const AllSizes: Story = {
  args: {} as never,
  render: () => {
    const [slot, setSlot] = useState(12345);

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm/6 text-muted">Small</p>
          <ItemNavigation
            currentItem={slot}
            itemLabel="Slot"
            hasNext={true}
            hasPrevious={true}
            onNext={() => setSlot(s => s + 1)}
            onPrevious={() => setSlot(s => s - 1)}
            onJumpTo={s => setSlot(Number(s))}
            size="sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm/6 text-muted">Medium (default)</p>
          <ItemNavigation
            currentItem={slot}
            itemLabel="Slot"
            hasNext={true}
            hasPrevious={true}
            onNext={() => setSlot(s => s + 1)}
            onPrevious={() => setSlot(s => s - 1)}
            onJumpTo={s => setSlot(Number(s))}
            size="md"
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm/6 text-muted">Large</p>
          <ItemNavigation
            currentItem={slot}
            itemLabel="Slot"
            hasNext={true}
            hasPrevious={true}
            onNext={() => setSlot(s => s + 1)}
            onPrevious={() => setSlot(s => s - 1)}
            onJumpTo={s => setSlot(Number(s))}
            size="lg"
          />
        </div>
      </div>
    );
  },
};

// Keyboard navigation demo
export const KeyboardNavigation: Story = {
  args: {} as never,
  render: () => {
    const [currentSlot, setCurrentSlot] = useState(12345);

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-sm bg-muted/20 p-4">
          <p className="text-sm/6 text-foreground">Try using keyboard arrows:</p>
          <ul className="mt-2 list-inside list-disc text-sm/6 text-muted">
            <li>Press ← (Left Arrow) to go to previous slot</li>
            <li>Press → (Right Arrow) to go to next slot</li>
          </ul>
        </div>
        <ItemNavigation
          currentItem={currentSlot}
          itemLabel="Slot"
          hasNext={true}
          hasPrevious={currentSlot > 0}
          onNext={() => setCurrentSlot(s => s + 1)}
          onPrevious={() => setCurrentSlot(s => Math.max(0, s - 1))}
          onJumpTo={slot => setCurrentSlot(Number(slot))}
        />
      </div>
    );
  },
};
