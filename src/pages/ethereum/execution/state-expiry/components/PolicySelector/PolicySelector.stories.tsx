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
      textColor: 'text-data-blue',
      selectedBg: 'bg-data-blue-25',
      selectedRing: 'ring-data-blue',
      hoverBg: 'hover:bg-data-blue-hover',
      rowHoverBg: 'bg-data-blue-row',
      cellBg: 'bg-data-blue-10',
      fillColor: 'bg-data-blue-fill',
    },
    contract: {
      label: 'Contract',
      icon: DocumentTextIcon,
      textColor: 'text-data-violet',
      selectedBg: 'bg-data-violet-25',
      selectedRing: 'ring-data-violet',
      hoverBg: 'hover:bg-data-violet-hover',
      rowHoverBg: 'bg-data-violet-row',
      cellBg: 'bg-data-violet-10',
      fillColor: 'bg-data-violet-fill',
    },
  },
  policyConfig: {
    '12m': {
      shortLabel: '1y',
      fullLabel: '1 year',
      tooltip: 'Storage expires after 1 year of inactivity.',
    },
    '24m': {
      shortLabel: '2y',
      fullLabel: '2 years',
      tooltip: 'Storage expires after 2 years of inactivity.',
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

/** The current state the savings compare against, with formatters like the page's */
const BASELINE = {
  currentBytes: 250 * 1024 ** 3,
  currentSlots: 1_400_000_000,
  formatBytes: (bytes: number): string => `${(bytes / 1024 ** 3).toFixed(1)} GiB`,
  formatSlots: (slots: number): string => `${(slots / 1_000_000_000).toFixed(2)}B`,
};

/** A cell's savings and the state left after them */
function cell(bytesPercent: number, slotsPercent: number): PolicyData {
  return {
    bytesPercent,
    slotsPercent,
    afterBytes: BASELINE.currentBytes * (1 + bytesPercent / 100),
    afterSlots: Math.round(BASELINE.currentSlots * (1 + slotsPercent / 100)),
  };
}

/** Example savings data */
const EXAMPLE_SAVINGS_DATA: Record<ExpiryType, Record<ExpiryPolicy, PolicyData>> = {
  slot: {
    '12m': cell(-45, -42),
    '24m': cell(-32, -30),
  },
  contract: {
    '12m': cell(-38, -35),
    '24m': cell(-25, -22),
  },
};

const meta: Meta<typeof PolicySelector<ExpiryType, ExpiryPolicy>> = {
  title: 'Components/Forms/PolicySelector',
  component: PolicySelector,
  decorators: [
    Story => (
      <div className="min-w-150 rounded-xs bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  args: BASELINE,
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
        {...BASELINE}
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
const MISSING: PolicyData = { bytesPercent: null, slotsPercent: null, afterBytes: null, afterSlots: null };
const PARTIAL_DATA: Record<ExpiryType, Record<ExpiryPolicy, PolicyData>> = {
  slot: {
    '12m': cell(-45, -42),
    '24m': MISSING,
  },
  contract: {
    '12m': cell(-38, -35),
    '24m': MISSING,
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
