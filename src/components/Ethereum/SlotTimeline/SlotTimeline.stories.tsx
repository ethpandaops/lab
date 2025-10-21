import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { SlotTimeline } from './SlotTimeline';
import { DEFAULT_BEACON_SLOT_PHASES } from '@/utils/beacon';

const meta = {
  title: 'Components/Ethereum/SlotTimeline',
  component: SlotTimeline,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof SlotTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BeaconSlot: Story = {
  name: 'Beacon Chain Slot (Default)',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 5.5,
    // Using defaults: height=48, showInlineLabels=true, showPhaseLabels=false
  },
};

export const WithClickHandler: Story = {
  name: 'With Click Handler',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 5.5,
    onTimeClick: timeMs => {
      alert(`Clicked at ${timeMs}ms (${(timeMs / 1000).toFixed(2)}s)`);
    },
  },
};

export const WithInlineLabels: Story = {
  name: 'With Inline Labels',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 6,
    showPhaseLabels: false,
    showInlineLabels: true,
  },
};

export const InlineAndBelowLabels: Story = {
  name: 'Inline + Below Labels',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 6,
    showPhaseLabels: true,
    showInlineLabels: true,
  },
};

export const EarlyPhase: Story = {
  name: 'Early Phase (Block Proposal)',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 2,
    showInlineLabels: true,
    showPhaseLabels: false,
  },
};

export const MidPhase: Story = {
  name: 'Mid Phase (Attestations)',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 6,
    showInlineLabels: true,
    showPhaseLabels: false,
  },
};

export const LatePhase: Story = {
  name: 'Late Phase (Aggregations)',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 10,
    showInlineLabels: true,
    showPhaseLabels: false,
  },
};

export const Complete: Story = {
  name: 'Slot Complete',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 12,
    showInlineLabels: true,
    showPhaseLabels: false,
  },
};

export const WithCurrentTimeLabel: Story = {
  name: 'With Current Time Label',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 6,
    showCurrentTime: true,
    showPhaseLabels: true,
  },
};

export const WithTimeLabels: Story = {
  name: 'With Time Labels',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 6,
    showPhaseLabels: true,
    showTimeLabels: true,
  },
};

export const WithoutLabels: Story = {
  name: 'Without Any Labels',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 6,
    showPhaseLabels: false,
    showInlineLabels: false,
  },
};

export const TallTimeline: Story = {
  name: 'Tall Timeline with Inline Labels',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 6,
    showInlineLabels: true,
    showPhaseLabels: false,
    height: 56,
  },
};

export const ShortTimeline: Story = {
  name: 'Short Timeline',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 6,
    showPhaseLabels: true,
    showInlineLabels: false,
    height: 20,
  },
};

// Custom phases example
export const CustomPhases: Story = {
  name: 'Custom Phases',
  args: {
    phases: [
      { label: 'Init', duration: 2, className: 'bg-primary', textClassName: 'text-white' },
      { label: 'Process', duration: 5, className: 'bg-secondary', textClassName: 'text-white' },
      { label: 'Validate', duration: 2, className: 'bg-success', textClassName: 'text-white' },
      { label: 'Finalize', duration: 1, className: 'bg-accent', textClassName: 'text-white' },
    ],
    currentTime: 4.5,
    showPhaseLabels: true,
  },
};

// Custom text colors example
export const CustomTextColors: Story = {
  name: 'Custom Text Colors',
  args: {
    phases: [
      {
        label: 'Light Phase',
        duration: 3,
        className: 'bg-white border border-border',
        textClassName: 'text-foreground',
      },
      {
        label: 'Dark Phase',
        duration: 3,
        className: 'bg-slate-900',
        textClassName: 'text-white',
      },
      {
        label: 'Accent Phase',
        duration: 3,
        className: 'bg-amber-200',
        textClassName: 'text-amber-900',
      },
      {
        label: 'Primary Phase',
        duration: 3,
        className: 'bg-cyan-500',
        textClassName: 'text-cyan-50',
      },
    ],
    currentTime: 6,
    showPhaseLabels: true,
    showInlineLabels: true,
  },
};

// Animated example
export const LiveSlot: Story = {
  name: 'Live Animated Slot',
  render: args => {
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + 0.1;
          return next >= 12 ? 0 : next;
        });
      }, 100);

      return () => clearInterval(interval);
    }, []);

    return <SlotTimeline {...args} currentTime={currentTime} />;
  },
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 0,
    showInlineLabels: true,
    showPhaseLabels: false,
  },
};

// Multiple timelines comparison
export const MultipleSlots: Story = {
  name: 'Multiple Slots Comparison',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 0,
  },
  render: () => (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="mb-4 text-sm/6 font-semibold text-foreground">Slot 1234567</h3>
        <SlotTimeline
          phases={DEFAULT_BEACON_SLOT_PHASES}
          currentTime={2.5}
          showPhaseLabels={false}
          showInlineLabels={true}
        />
      </div>
      <div>
        <h3 className="mb-4 text-sm/6 font-semibold text-foreground">Slot 1234568</h3>
        <SlotTimeline
          phases={DEFAULT_BEACON_SLOT_PHASES}
          currentTime={6.3}
          showPhaseLabels={false}
          showInlineLabels={true}
        />
      </div>
      <div>
        <h3 className="mb-4 text-sm/6 font-semibold text-foreground">Slot 1234569</h3>
        <SlotTimeline
          phases={DEFAULT_BEACON_SLOT_PHASES}
          currentTime={10.1}
          showPhaseLabels={false}
          showInlineLabels={true}
        />
      </div>
      {/* Phase labels shown once at bottom */}
      <div className="flex gap-4 border-t border-border pt-4">
        {DEFAULT_BEACON_SLOT_PHASES.map((phase, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div className={`size-3 rounded-xs border border-border ${phase.className}`} />
            <span className="text-xs/4 text-muted">{phase.label}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};
