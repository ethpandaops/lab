# SlotProgressTimeline Component

A reusable React component for visualizing Ethereum slot phases as an interactive timeline.

## Features

- **Two Modes**: Live mode with real-time progress animations, or static mode showing all phases completed
- **Responsive Design**: Horizontal layout on desktop, vertical stack on mobile
- **Three Phase States**: Pending (gray), Active (pulsing), Completed (full color)
- **Customizable**: Support for custom phases, icons, colors, and stats
- **Accessible**: Semantic HTML, ARIA labels, keyboard navigation
- **Type-Safe**: Full TypeScript support with comprehensive interfaces

## Installation

The component is located at:
```
src/components/Ethereum/SlotProgressTimeline/
```

## Basic Usage

```tsx
import { SlotProgressTimeline, type PhaseData } from '@/components/Ethereum/SlotProgressTimeline';
import { CubeIcon, ArrowPathIcon, UserIcon } from '@heroicons/react/24/outline';

const phases: PhaseData[] = [
  {
    id: 'builders',
    label: 'Builders',
    icon: CubeIcon,
    color: 'primary',
    timestamp: 500,
    description: 'MEV builders bidding',
    stats: '43 builders bidded'
  },
  {
    id: 'relaying',
    label: 'Relaying',
    icon: ArrowPathIcon,
    color: 'accent',
    timestamp: 2000,
    duration: 1000,
    description: 'Relay connection',
    stats: '2 relays'
  },
  {
    id: 'proposing',
    label: 'Proposing',
    icon: UserIcon,
    color: 'success',
    timestamp: 3500,
    description: 'Block proposal',
    stats: 'Validator 12345'
  }
];

// Live mode - shows real-time progress
function LiveExample() {
  const [currentTime, setCurrentTime] = useState(0);

  return (
    <SlotProgressTimeline
      phases={phases}
      mode="live"
      currentTime={currentTime}
      showStats={true}
    />
  );
}

// Static mode - shows all phases completed
function StaticExample() {
  return (
    <SlotProgressTimeline
      phases={phases}
      mode="static"
    />
  );
}
```

## Props

### SlotProgressTimelineProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `phases` | `PhaseData[]` | Yes | - | Array of phase data to display |
| `mode` | `'live' \| 'static'` | Yes | - | Timeline mode |
| `currentTime` | `number` | Conditional | `0` | Current time in ms (0-12000). Required for live mode. |
| `showStats` | `boolean` | No | `true` | Whether to show statistics below phase nodes |
| `onPhaseClick` | `(phase: PhaseData) => void` | No | - | Callback when a phase is clicked |
| `className` | `string` | No | - | Optional CSS class name |

### PhaseData Interface

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier |
| `label` | `string` | Yes | Display name |
| `icon` | `ComponentType<{ className?: string }>` | Yes | Heroicon component |
| `color` | `string` | Yes | Semantic color token (e.g., 'primary', 'success') |
| `description` | `string` | Yes | Description for accessibility |
| `timestamp` | `number` | No | When phase occurred (ms from slot start) |
| `duration` | `number` | No | How long phase took (ms) |
| `stats` | `string` | No | Optional stats to display |
| `isActive` | `boolean` | No | Computed automatically |
| `isCompleted` | `boolean` | No | Computed automatically |

## Semantic Color Tokens

Use these tokens defined in `src/index.css`:

- `primary` - Main brand color
- `secondary` - Secondary brand color
- `accent` - Accent color
- `success` - Success state
- `warning` - Warning state
- `danger` - Danger/error state

**Important:** Do NOT use primitive scales like `terracotta-500` directly.

## Phase State Logic

### Live Mode
- **Pending**: `currentTime < phase.timestamp`
- **Active**: `currentTime >= phase.timestamp && !isCompleted`
- **Completed**:
  - With duration: `currentTime >= (timestamp + duration)`
  - Without duration: `currentTime >= nextPhase.timestamp`

### Static Mode
- All phases are shown as **Completed**

## Responsive Behavior

### Desktop (>=768px)
- Horizontal timeline layout
- Phase nodes arranged left to right
- Time axis displayed below
- Horizontal progress connections

### Mobile (<768px)
- Vertical stack layout
- Phase nodes arranged top to bottom
- No time axis
- Vertical progress connections

## Sub-Components

### PhaseNode
Displays a circular icon with three states (pending, active, completed).

```tsx
import { PhaseNode } from '@/components/Ethereum/SlotProgressTimeline';

<PhaseNode
  phase={phaseData}
  status="active"
  showStats={true}
  onClick={() => handleClick()}
/>
```

### PhaseConnection
Shows progress line between phases.

```tsx
import { PhaseConnection } from '@/components/Ethereum/SlotProgressTimeline';

<PhaseConnection
  progress={75}
  orientation="horizontal"
  isActive={true}
/>
```

### TimelineAxis
Displays time scale markers.

```tsx
import { TimelineAxis } from '@/components/Ethereum/SlotProgressTimeline';

<TimelineAxis
  orientation="horizontal"
  totalDuration={12000}
  tickCount={7}
/>
```

## Utility Functions

Located in `src/pages/ethereum/live/utils/slot-progress.ts`:

### computePhaseTimings
```tsx
import { computePhaseTimings } from '@/pages/ethereum/live/utils';

const events = [
  { id: 'builders', timestamp: 500 },
  { id: 'relaying', timestamp: 2000, duration: 1000 }
];
const timings = computePhaseTimings(events, 2500);
// Returns: ComputedPhaseTiming[] with isActive and isCompleted
```

### getPhaseStatus
```tsx
import { getPhaseStatus } from '@/pages/ethereum/live/utils';

const status = getPhaseStatus(2000, 2500, 1000);
// Returns: 'pending' | 'active' | 'completed'
```

### calculatePhaseProgress
```tsx
import { calculatePhaseProgress } from '@/pages/ethereum/live/utils';

const progress = calculatePhaseProgress(2000, 2500, 1000);
// Returns: 50 (percentage)
```

See `src/pages/ethereum/live/utils/slot-progress.ts` for all available utilities.

## Standard Ethereum Slot Phases

See `PHASE_DEFINITIONS.md` for the 6 standard phases:
1. Builders
2. Relaying
3. Proposing
4. Gossiping
5. Attesting
6. Accepted

## Advanced Example: Integration with API

```tsx
import { SlotProgressTimeline } from '@/components/Ethereum/SlotProgressTimeline';
import { useQuery } from '@tanstack/react-query';
import { SLOT_PHASES } from './constants';

function SlotView({ slot }: { slot: number }) {
  // Fetch slot data from API
  const { data } = useQuery({
    queryKey: ['slot', slot],
    queryFn: () => fetchSlotData(slot)
  });

  // Enrich phases with API data
  const enrichedPhases = SLOT_PHASES.map(phase => ({
    ...phase,
    timestamp: data?.phases[phase.id]?.timestamp,
    duration: data?.phases[phase.id]?.duration,
    stats: data?.phases[phase.id]?.stats
  }));

  return (
    <SlotProgressTimeline
      phases={enrichedPhases}
      mode="live"
      currentTime={data?.currentTime || 0}
      onPhaseClick={(phase) => {
        console.log('Clicked:', phase.label);
      }}
    />
  );
}
```

## Accessibility

- Semantic HTML structure
- ARIA labels for screen readers
- Keyboard navigation support
- Color contrast compliance
- Focus indicators

## Browser Support

Compatible with all modern browsers supporting:
- CSS Grid
- CSS Flexbox
- CSS Custom Properties
- ES2020+ JavaScript

## Performance

- Uses React.useMemo for efficient phase calculations
- Optimized re-renders with proper memoization
- CSS transitions for smooth animations
- No heavy dependencies

## Future Enhancements (Phase 4)

- Storybook stories for all variants
- Comprehensive tests (Vitest + Storybook interactions)
- Additional phase presets
- Animation customization
- Tooltip improvements
