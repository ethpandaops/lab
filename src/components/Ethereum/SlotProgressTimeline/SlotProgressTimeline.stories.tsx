import { useState, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SlotProgressTimeline } from './SlotProgressTimeline';
import type { PhaseData } from './SlotProgressTimeline.types';
import {
  CubeIcon,
  ArrowPathIcon,
  UserIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckCircleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

const meta = {
  title: 'Components/Ethereum/SlotProgressTimeline',
  component: SlotProgressTimeline,
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
  argTypes: {
    mode: {
      control: 'select',
      options: ['static', 'live'],
    },
    currentTime: {
      control: 'number',
    },
    showStats: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof SlotProgressTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

// Full MEV slot with all phases (typical successful slot)
const fullMEVPhases: PhaseData[] = [
  {
    id: 'builders',
    label: 'Builders',
    icon: CubeIcon,
    color: 'primary',
    timestamp: 500,
    duration: 1500,
    description: 'MEV builders submitted bids',
    stats: '43 builders bidded',
  },
  {
    id: 'relaying',
    label: 'Relaying',
    icon: ArrowPathIcon,
    color: 'accent',
    timestamp: 2000,
    duration: 1000,
    description: 'Block relayed through MEV network',
    stats: '2 relays used',
  },
  {
    id: 'proposing',
    label: 'Proposing',
    icon: UserIcon,
    color: 'secondary',
    timestamp: 3000,
    duration: 500,
    description: 'Block proposed by validator',
    stats: 'Validator 127834',
  },
  {
    id: 'gossiping',
    label: 'Gossiping',
    icon: ChatBubbleBottomCenterTextIcon,
    color: 'accent',
    timestamp: 3500,
    duration: 500,
    description: 'Block gossiped to network',
    stats: '156 peers reached',
  },
  {
    id: 'attesting',
    label: 'Attesting',
    icon: CheckCircleIcon,
    color: 'success',
    timestamp: 4000,
    duration: 4000,
    description: 'Attestations collected',
    stats: '89.3% attestations',
  },
  {
    id: 'accepted',
    label: 'Accepted',
    icon: LockClosedIcon,
    color: 'success',
    timestamp: 8000,
    description: 'Block accepted by network',
    stats: '>66% threshold',
  },
];

// No MEV - locally built block
const noMEVPhases: PhaseData[] = [
  {
    id: 'proposing',
    label: 'Proposing',
    icon: UserIcon,
    color: 'secondary',
    timestamp: 500,
    duration: 500,
    description: 'Block proposed by validator',
    stats: 'Validator 127834',
  },
  {
    id: 'gossiping',
    label: 'Gossiping',
    icon: ChatBubbleBottomCenterTextIcon,
    color: 'accent',
    timestamp: 1000,
    duration: 500,
    description: 'Block gossiped to network',
    stats: '142 peers reached',
  },
  {
    id: 'attesting',
    label: 'Attesting',
    icon: CheckCircleIcon,
    color: 'success',
    timestamp: 1500,
    duration: 6500,
    description: 'Attestations collected',
    stats: '92.1% attestations',
  },
  {
    id: 'accepted',
    label: 'Accepted',
    icon: LockClosedIcon,
    color: 'success',
    timestamp: 8000,
    description: 'Block accepted by network',
    stats: '>66% threshold',
  },
];

// Orphaned block - seen but not accepted
const orphanedPhases: PhaseData[] = [
  {
    id: 'builders',
    label: 'Builders',
    icon: CubeIcon,
    color: 'primary',
    timestamp: 500,
    duration: 1500,
    description: 'MEV builders submitted bids',
    stats: '38 builders bidded',
  },
  {
    id: 'relaying',
    label: 'Relaying',
    icon: ArrowPathIcon,
    color: 'accent',
    timestamp: 2000,
    duration: 1000,
    description: 'Block relayed through MEV network',
    stats: '2 relays used',
  },
  {
    id: 'proposing',
    label: 'Proposing',
    icon: UserIcon,
    color: 'secondary',
    timestamp: 3000,
    duration: 500,
    description: 'Block proposed by validator',
    stats: 'Validator 93012',
  },
  {
    id: 'gossiping',
    label: 'Gossiping',
    icon: ChatBubbleBottomCenterTextIcon,
    color: 'accent',
    timestamp: 3500,
    duration: 500,
    description: 'Block gossiped to network',
    stats: '89 peers reached',
  },
  {
    id: 'attesting',
    label: 'Attesting',
    icon: CheckCircleIcon,
    color: 'warning',
    timestamp: 4000,
    duration: 8000,
    description: 'Insufficient attestations',
    stats: '42.8% attestations',
  },
];

// Missed block - never seen
const missedPhases: PhaseData[] = [
  {
    id: 'missed',
    label: 'Missed',
    icon: CheckCircleIcon,
    color: 'danger',
    timestamp: 0,
    description: 'Block was never seen',
    stats: 'No block proposed',
  },
];

/**
 * Default static mode showing a complete, successful slot with all 6 phases.
 * This is the typical "happy path" for an MEV block that goes through
 * builders, relays, proposing, gossiping, attesting, and is finally accepted.
 */
export const Default: Story = {
  args: {
    phases: fullMEVPhases,
    mode: 'static',
    showStats: true,
  },
};

/**
 * Live mode at the very beginning of the slot (500ms).
 * Only the first phase (Builders) is active, all others are pending.
 * Demonstrates how the timeline looks when a slot just started.
 */
export const LiveBeginning: Story = {
  name: 'Live Mode - Beginning',
  args: {
    phases: fullMEVPhases,
    mode: 'live',
    currentTime: 500,
    showStats: true,
  },
};

/**
 * Live mode halfway through the slot (6000ms).
 * Some phases are completed, one is active (Attesting), and some are pending.
 * Shows the typical mid-slot state with partial progress.
 */
export const LiveMiddle: Story = {
  name: 'Live Mode - Middle',
  args: {
    phases: fullMEVPhases,
    mode: 'live',
    currentTime: 6000,
    showStats: true,
  },
};

/**
 * Live mode near the end of the slot (11500ms).
 * Almost all phases are completed, only the last phase (Accepted) is active.
 * Demonstrates the timeline state just before slot completion.
 */
export const LiveEnd: Story = {
  name: 'Live Mode - End',
  args: {
    phases: fullMEVPhases,
    mode: 'live',
    currentTime: 11500,
    showStats: true,
  },
};

/**
 * Animated live mode that auto-progresses through the entire slot.
 * Provides an interactive demonstration of how the timeline animates
 * from start to finish. Includes play/pause controls.
 */
export const LiveAnimated: Story = {
  name: 'Live Mode - Animated',
  args: {
    phases: fullMEVPhases,
    mode: 'live',
    showStats: true,
  },
  render: () => {
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);

    useEffect(() => {
      if (!isPlaying) return;

      const interval = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + 100;
          if (next > 12000) return 0;
          return next;
        });
      }, 100);

      return () => clearInterval(interval);
    }, [isPlaying]);

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="text-sm/6 text-muted">
            Current Time: <span className="font-medium text-foreground">{(currentTime / 1000).toFixed(1)}s</span>
            {' / 12.0s'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={() => setCurrentTime(0)}
              className="rounded-sm bg-muted/20 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/30"
            >
              Reset
            </button>
          </div>
        </div>
        <SlotProgressTimeline phases={fullMEVPhases} mode="live" currentTime={currentTime} showStats />
      </div>
    );
  },
};

/**
 * Orphaned block scenario - block was seen but didn't get enough attestations.
 * No "Accepted" phase exists because the block failed to reach the >66% threshold.
 * The Attesting phase shows warning color and lower attestation percentage.
 */
export const OrphanedBlock: Story = {
  args: {
    phases: orphanedPhases,
    mode: 'static',
    showStats: true,
  },
};

/**
 * Missed block scenario - no block was ever proposed for this slot.
 * Shows a single phase indicating the block was missed.
 * This is the simplest timeline state.
 */
export const MissedBlock: Story = {
  args: {
    phases: missedPhases,
    mode: 'static',
    showStats: true,
  },
};

/**
 * No MEV scenario - block was built locally without MEV involvement.
 * Skips the Builders and Relaying phases, starting directly with Proposing.
 * Shows a shorter timeline for non-MEV blocks.
 */
export const NoMEV: Story = {
  name: 'No MEV (Locally Built)',
  args: {
    phases: noMEVPhases,
    mode: 'static',
    showStats: true,
  },
};

/**
 * Timeline without statistics displayed.
 * Shows only the phase nodes and connections without the stats text.
 * Useful for compact views or when stats aren't relevant.
 */
export const WithoutStats: Story = {
  name: 'Without Statistics',
  args: {
    phases: fullMEVPhases,
    mode: 'static',
    showStats: false,
  },
};

/**
 * Interactive story demonstrating phase click callbacks.
 * Each phase can be clicked to show an alert with phase details.
 * Useful for testing interactivity and phase selection.
 */
export const WithClickHandlers: Story = {
  args: {
    phases: fullMEVPhases,
    mode: 'static',
    showStats: true,
    onPhaseClick: (phase: PhaseData) => {
      alert(`Clicked phase: ${phase.label}\n${phase.description}\n${phase.stats || 'No stats'}`);
    },
  },
};

/**
 * Minimal two-phase timeline showing just Proposing and Accepted.
 * Demonstrates the simplest successful slot with no MEV or intermediate phases.
 */
export const MinimalPhases: Story = {
  name: 'Minimal (Two Phases)',
  args: {
    phases: [
      {
        id: 'proposing',
        label: 'Proposing',
        icon: UserIcon,
        color: 'secondary',
        timestamp: 1000,
        duration: 1000,
        description: 'Block proposed',
        stats: 'Validator 45678',
      },
      {
        id: 'accepted',
        label: 'Accepted',
        icon: LockClosedIcon,
        color: 'success',
        timestamp: 8000,
        description: 'Block accepted',
        stats: '>66% attestations',
      },
    ],
    mode: 'static',
    showStats: true,
  },
};
