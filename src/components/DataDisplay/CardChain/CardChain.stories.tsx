import type { Meta, StoryObj } from '@storybook/react-vite';
import { CardChain } from './CardChain';
import type { CardChainItem } from './CardChain.types';

/**
 * Format large numbers with K/M suffix for display
 */
function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

const meta: Meta<typeof CardChain> = {
  title: 'Components/DataDisplay/CardChain',
  component: CardChain,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className="min-w-[900px] rounded-xs bg-background p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CardChain>;

// Sample block data
const blockItems: CardChainItem[] = [
  {
    id: 24245075,
    label: 'Block',
    value: 24245075,
    stats: [
      { label: 'Gas', value: formatCompact(18_500_000) },
      { label: 'Opcodes', value: formatCompact(915_800) },
    ],
    fillPercentage: 36,
  },
  {
    id: 24245076,
    label: 'Block',
    value: 24245076,
    stats: [
      { label: 'Gas', value: formatCompact(10_700_000) },
      { label: 'Opcodes', value: formatCompact(566_800) },
    ],
    fillPercentage: 21,
  },
  {
    id: 24245077,
    label: 'Block',
    value: 24245077,
    stats: [
      { label: 'Gas', value: formatCompact(16_500_000) },
      { label: 'Opcodes', value: formatCompact(966_700) },
    ],
    fillPercentage: 32,
  },
  {
    id: 24245078,
    label: 'Block',
    value: 24245078,
    stats: [
      { label: 'Gas', value: formatCompact(13_700_000) },
      { label: 'Opcodes', value: formatCompact(752_900) },
    ],
    fillPercentage: 27,
  },
  {
    id: 24245079,
    label: 'Block',
    value: 24245079,
    stats: [
      { label: 'Gas', value: formatCompact(12_000_000) },
      { label: 'Opcodes', value: formatCompact(741_400) },
    ],
    fillPercentage: 23,
  },
  {
    id: 24245080,
    label: 'Block',
    value: 24245080,
    stats: [
      { label: 'Gas', value: formatCompact(51_500_000) },
      { label: 'Opcodes', value: formatCompact(2_500_000) },
    ],
    fillPercentage: 100,
    isHighlighted: true,
  },
];

// Sample epoch data
const epochItems: CardChainItem[] = [
  {
    id: 285120,
    label: 'Epoch',
    value: 285120,
    stats: [
      { label: 'Slots', value: '32/32' },
      { label: 'Attestations', value: formatCompact(98_500) },
    ],
    fillPercentage: 100,
  },
  {
    id: 285121,
    label: 'Epoch',
    value: 285121,
    stats: [
      { label: 'Slots', value: '31/32' },
      { label: 'Attestations', value: formatCompact(95_200) },
    ],
    fillPercentage: 97,
  },
  {
    id: 285122,
    label: 'Epoch',
    value: 285122,
    stats: [
      { label: 'Slots', value: '32/32' },
      { label: 'Attestations', value: formatCompact(99_100) },
    ],
    fillPercentage: 100,
  },
  {
    id: 285123,
    label: 'Epoch',
    value: 285123,
    stats: [
      { label: 'Slots', value: '30/32' },
      { label: 'Attestations', value: formatCompact(92_800) },
    ],
    fillPercentage: 94,
    isHighlighted: true,
  },
];

// Sample slot data with single stat
const slotItems: CardChainItem[] = Array.from({ length: 6 }, (_, i) => ({
  id: 9123456 + i,
  label: 'Slot',
  value: 9123456 + i,
  stats: [{ label: 'Proposer', value: `0x${(12345 + i).toString(16).padStart(4, '0')}...` }],
  fillPercentage: Math.floor(Math.random() * 100),
  isHighlighted: i === 5,
}));

/**
 * Default display showing blockchain blocks with gas and opcode statistics.
 */
export const Default: Story = {
  args: {
    items: blockItems,
    onLoadPrevious: () => console.log('Load previous'),
    onLoadNext: () => console.log('Load next'),
    hasPreviousItems: true,
    hasNextItems: false,
  },
};

/**
 * Blocks without the "latest" highlight - viewing historical data.
 */
export const HistoricalBlocks: Story = {
  args: {
    items: blockItems.map(item => ({ ...item, isHighlighted: false })),
    onLoadPrevious: () => console.log('Load previous'),
    onLoadNext: () => console.log('Load next'),
    hasPreviousItems: true,
    hasNextItems: true,
  },
};

/**
 * Epochs with different statistics and custom highlight badge.
 */
export const Epochs: Story = {
  args: {
    items: epochItems,
    highlightBadgeText: 'CURRENT',
    onLoadPrevious: () => console.log('Load previous'),
    hasPreviousItems: true,
  },
};

/**
 * Slots with single stat and custom badge text.
 */
export const Slots: Story = {
  args: {
    items: slotItems,
    highlightBadgeText: 'HEAD',
    onLoadPrevious: () => console.log('Load previous'),
    hasPreviousItems: true,
  },
};

/**
 * Loading state showing skeleton placeholders.
 */
export const Loading: Story = {
  args: {
    items: [],
    isLoading: true,
    skeletonCount: 6,
    onLoadPrevious: () => {},
    hasPreviousItems: false,
  },
};

/**
 * Custom skeleton count for different layouts.
 */
export const LoadingFourItems: Story = {
  args: {
    items: [],
    isLoading: true,
    skeletonCount: 4,
    onLoadPrevious: () => {},
    hasPreviousItems: false,
  },
};

/**
 * Without navigation arrows - static display only.
 */
export const WithoutNavigation: Story = {
  args: {
    items: blockItems.slice(0, 4),
  },
};

/**
 * Items without stats - minimal display.
 */
export const MinimalItems: Story = {
  args: {
    items: [
      { id: 1, label: 'TX', value: '0x1234...5678', fillPercentage: 45 },
      { id: 2, label: 'TX', value: '0x2345...6789', fillPercentage: 72 },
      { id: 3, label: 'TX', value: '0x3456...789a', fillPercentage: 88 },
      { id: 4, label: 'TX', value: '0x4567...89ab', fillPercentage: 100, isHighlighted: true },
    ],
    highlightBadgeText: 'PENDING',
  },
};

/**
 * With custom item wrapper for link/click handling.
 */
export const WithCustomWrapper: Story = {
  args: {
    items: blockItems,
    renderItemWrapper: (item, _index, children) => (
      <a
        key={item.id}
        href={`#block-${item.id}`}
        className="group relative flex-1 no-underline"
        onClick={e => {
          e.preventDefault();
          console.log(`Navigate to block ${item.id}`);
        }}
      >
        {children}
      </a>
    ),
    onLoadPrevious: () => console.log('Load previous'),
    hasPreviousItems: true,
  },
};
