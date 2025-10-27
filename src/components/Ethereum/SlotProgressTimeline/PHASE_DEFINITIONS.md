# Slot Progress Timeline - Phase Definitions

This document describes the 6 standard phases in the Ethereum slot lifecycle used by the SlotProgressTimeline component.

## Phase Overview

Each 12-second Ethereum slot consists of these phases:

1. **Builders** (0-2s) - MEV-Boost builders bid on block construction
2. **Relaying** (2-4s) - Relay connection and block transmission
3. **Proposing** (4-6s) - Proposer selects and broadcasts block
4. **Gossiping** (6-8s) - Block propagates through the network
5. **Attesting** (8-10s) - Validators submit attestations
6. **Accepted** (10-12s) - 66% attestation threshold reached

## Implementation Example

```tsx
import {
  CubeIcon,
  ArrowPathIcon,
  UserIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckCircleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { SlotProgressTimeline, type PhaseData } from '@/components/Ethereum/SlotProgressTimeline';

const SLOT_PHASES: PhaseData[] = [
  {
    id: 'builders',
    label: 'Builders',
    icon: CubeIcon,
    color: 'primary',
    description: 'MEV-Boost builders bid on block construction',
    // These will be populated from API data:
    // timestamp: 500,  // When builders started bidding
    // stats: '43 builders bidded'
  },
  {
    id: 'relaying',
    label: 'Relaying',
    icon: ArrowPathIcon,
    color: 'accent',
    description: 'Relay connection and block transmission',
    // timestamp: 2000,
    // duration: 1000,
    // stats: '2 relays'
  },
  {
    id: 'proposing',
    label: 'Proposing',
    icon: UserIcon,
    color: 'secondary',
    description: 'Proposer selects and broadcasts block',
    // timestamp: 3500,
    // stats: 'Validator 12345'
  },
  {
    id: 'gossiping',
    label: 'Gossiping',
    icon: ChatBubbleBottomCenterTextIcon,
    color: 'primary',
    description: 'Block propagates through the peer-to-peer network',
    // timestamp: 5000,
    // stats: '127 peers'
  },
  {
    id: 'attesting',
    label: 'Attesting',
    icon: CheckCircleIcon,
    color: 'success',
    description: 'Validators submit attestations for the block',
    // timestamp: 7000,
    // stats: '342 attestations'
  },
  {
    id: 'accepted',
    label: 'Accepted',
    icon: LockClosedIcon,
    color: 'success',
    description: '66% attestation threshold reached, block finalized',
    // timestamp: 10500,
    // stats: '67% consensus'
  },
];

// Usage
function MyComponent() {
  const currentTime = 5500; // milliseconds from slot start

  return (
    <SlotProgressTimeline
      phases={SLOT_PHASES}
      mode="live"
      currentTime={currentTime}
      showStats={true}
    />
  );
}
```

## Alternative Icons

You can customize icons based on your design preferences:

### Builders
- `CubeIcon` - Block building
- `RectangleStackIcon` - Multiple bids stacking
- `BoltIcon` - Speed/performance

### Relaying
- `ArrowPathIcon` - Data relay
- `SignalIcon` - Network signal
- `CloudArrowUpIcon` - Upload/transmission

### Proposing
- `UserIcon` - Validator/proposer
- `AcademicCapIcon` - Authority/leadership
- `HandRaisedIcon` - Proposal action

### Gossiping
- `ChatBubbleBottomCenterTextIcon` - Communication
- `GlobeAltIcon` - Network spread
- `RadioIcon` - Broadcasting

### Attesting
- `CheckCircleIcon` - Validation
- `ShieldCheckIcon` - Security validation
- `ClipboardDocumentCheckIcon` - Verification

### Accepted
- `LockClosedIcon` - Finalized/locked
- `ShieldCheckIcon` - Secured
- `CheckBadgeIcon` - Verified and accepted

## Color Semantic Tokens

Use these semantic color tokens (defined in `src/index.css`):

- `primary` - Main brand color (terracotta)
- `secondary` - Secondary brand color
- `accent` - Accent color
- `success` - Success state (green)
- `warning` - Warning state (yellow/amber)
- `danger` - Error/danger state (red)

Do NOT use primitive scales like `terracotta-500` or `sand-100` directly.
