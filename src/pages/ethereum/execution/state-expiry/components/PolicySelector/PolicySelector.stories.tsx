import { useState, type JSX } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CubeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { PolicySelector } from './PolicySelector';
import type { PolicySelectorConfig, PolicyData } from './PolicySelector.types';

/** Example expiry types */
type ExpiryType = 'slot' | 'contract';

/** Example expiry policies */
type ExpiryPolicy = '12m' | '24m';

/** Example configuration matching state-expiry page */
const EXAMPLE_CONFIG: PolicySelectorConfig<ExpiryType, ExpiryPolicy> = {
  types: ['slot', 'contract'] as const,
  policies: ['12m', '24m'] as const,
  typeConfig: {
    slot: {
      label: 'Slot',
      icon: CubeIcon,
      textColor: 'text-blue-600 dark:text-blue-400',
      selectedBg: 'bg-blue-500/25',
      selectedRing: 'ring-blue-500 dark:ring-blue-400',
      hoverBg: 'hover:bg-blue-500/20 dark:hover:bg-blue-500/25',
      rowHoverBg: 'bg-blue-500/10 dark:bg-blue-500/15',
      cellBg: 'bg-blue-500/10 dark:bg-blue-500/10',
      fillColor: 'bg-blue-500/30 dark:bg-blue-500/25',
    },
    contract: {
      label: 'Contract',
      icon: DocumentTextIcon,
      textColor: 'text-violet-600 dark:text-violet-400',
      selectedBg: 'bg-violet-500/25',
      selectedRing: 'ring-violet-500 dark:ring-violet-400',
      hoverBg: 'hover:bg-violet-500/20 dark:hover:bg-violet-500/25',
      rowHoverBg: 'bg-violet-500/10 dark:bg-violet-500/15',
      cellBg: 'bg-violet-500/10 dark:bg-violet-500/10',
      fillColor: 'bg-violet-500/30 dark:bg-violet-500/25',
    },
  },
  policyConfig: {
    '12m': {
      shortLabel: '1y',
      fullLabel: '1 year',
      tooltip: 'Storage expires after 1 year of inactivity. More aggressive pruning.',
    },
    '24m': {
      shortLabel: '2y',
      fullLabel: '2 years',
      tooltip: 'Storage expires after 2 years of inactivity. More conservative.',
    },
  },
  typeTooltips: {
    slot: {
      title: 'Slot-based expiry',
      description:
        "Tracks each storage slot independently. A slot expires if it hasn't been accessed within the inactivity period.",
    },
    contract: {
      title: 'Contract-based expiry',
      description: 'Groups all slots by contract. If ANY slot is accessed, the entire contract stays active.',
    },
  },
};

/** Example savings data */
const EXAMPLE_SAVINGS_DATA: Record<ExpiryType, Record<ExpiryPolicy, PolicyData>> = {
  slot: {
    '12m': { bytesPercent: -45, slotsPercent: -42 },
    '24m': { bytesPercent: -32, slotsPercent: -30 },
  },
  contract: {
    '12m': { bytesPercent: -38, slotsPercent: -35 },
    '24m': { bytesPercent: -25, slotsPercent: -22 },
  },
};

const meta: Meta<typeof PolicySelector<ExpiryType, ExpiryPolicy>> = {
  title: 'Components/Forms/PolicySelector',
  component: PolicySelector,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-xs bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof PolicySelector<ExpiryType, ExpiryPolicy>>;

/** Interactive story with state management */
function InteractivePolicySelector(): JSX.Element {
  const [selectedType, setSelectedType] = useState<ExpiryType>('slot');
  const [selectedPolicy, setSelectedPolicy] = useState<ExpiryPolicy>('12m');

  return (
    <div className="space-y-4">
      <PolicySelector
        selectedType={selectedType}
        selectedPolicy={selectedPolicy}
        onSelect={(type, policy) => {
          setSelectedType(type);
          setSelectedPolicy(policy);
        }}
        savingsData={EXAMPLE_SAVINGS_DATA}
        config={EXAMPLE_CONFIG}
      />
      <p className="text-sm text-muted">
        Selected: <strong>{selectedType}</strong> + <strong>{selectedPolicy}</strong>
      </p>
    </div>
  );
}

export const Default: Story = {
  render: () => <InteractivePolicySelector />,
};

export const SlotSelected: Story = {
  args: {
    selectedType: 'slot',
    selectedPolicy: '12m',
    savingsData: EXAMPLE_SAVINGS_DATA,
    config: EXAMPLE_CONFIG,
    onSelect: () => {},
  },
};

export const ContractSelected: Story = {
  args: {
    selectedType: 'contract',
    selectedPolicy: '24m',
    savingsData: EXAMPLE_SAVINGS_DATA,
    config: EXAMPLE_CONFIG,
    onSelect: () => {},
  },
};

/** Example with some missing data */
const PARTIAL_DATA: Record<ExpiryType, Record<ExpiryPolicy, PolicyData>> = {
  slot: {
    '12m': { bytesPercent: -45, slotsPercent: -42 },
    '24m': { bytesPercent: null, slotsPercent: null },
  },
  contract: {
    '12m': { bytesPercent: -38, slotsPercent: -35 },
    '24m': { bytesPercent: null, slotsPercent: null },
  },
};

export const WithMissingData: Story = {
  args: {
    selectedType: 'slot',
    selectedPolicy: '12m',
    savingsData: PARTIAL_DATA,
    config: EXAMPLE_CONFIG,
    onSelect: () => {},
  },
};
