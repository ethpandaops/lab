# Layout Refactor Plan

## Summary
This refactor aims to modernize the Ethereum block explorer UI, focusing on improved spacing, organization, and responsiveness. The key objectives are:

### Current Pain Points
- Width-restricted layout limiting content visibility
- Inconsistent spacing and padding across components
- Mobile experience needs improvement
- Visual hierarchy could be clearer

### Key Improvements
- Full-width layout that scales elegantly
- Clear visual hierarchy with dedicated spaces for:
  - Timeline (~10vh)
  - Main content area (remaining viewport height) with:
    - Map (70% of remaining height)
    - Block details (horizontal sections, 30% of remaining height):
      - Block Proposal (25% of section height)
      - Attestation (25% of section height)
      - Aggregation (25% of section height)
      - Additional Info (25% of section height)
- No vertical scrolling in slot view - all content visible at all times
- Each section should handle overflow internally with horizontal scrolling if needed
- Responsive design that works well on all devices
- Maintains the cyber/space theme while being more spacious
- Enhanced touch interactions for mobile users

### Technical Approach
- Implement consistent spacing system using Tailwind
- Use CSS Grid for main layout structure with fixed viewport heights
- Leverage flexbox for component-level layouts
- Add responsive breakpoints with mobile-first approach
- Maintain existing data flow and real-time updates
- Keep the dark theme and cyber aesthetic
- Ensure all sections use fixed heights based on viewport percentages

## Phase 1: Root Layout Changes ✅
### Remove container width restrictions in Layout.tsx ✅
- Target file: `frontend/src/components/layout/Layout.tsx`
- Remove `container` class from main content wrapper
- Update the main content div structure:
```tsx
<main className="flex-1 relative">
  <div className="h-full w-full">
    <div className={isHome ? 'h-full' : 'relative backdrop-blur-md bg-surface/90 border border-subtle rounded-lg shadow-lg'}>
      <Outlet />
    </div>
  </div>
</main>
```
- Remove any fixed width constraints from parent containers

### Update main content area to use full viewport width ✅
- Target file: `frontend/src/components/layout/Layout.tsx`
- Remove padding constraints from main content area
- Implement new padding system:
```tsx
<div className="px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16">
  {/* Content */}
</div>
```

### Adjust padding and margin system ✅
- Create new spacing constants in `frontend/src/constants/layout.ts`:
```ts
export const LAYOUT = {
  CONTENT_PADDING: {
    DEFAULT: '1rem',
    MD: '1.5rem',
    LG: '2rem',
    XL: '3rem',
    '2XL': '4rem'
  },
  CONTENT_MAX_WIDTH: '100%',
  SIDEBAR_WIDTH: '20rem',
  TIMELINE_HEIGHT: '6rem'
}
```
- Use these constants throughout the app for consistent spacing

### Implement responsive breakpoints ✅
- Update `tailwind.config.js` with new breakpoints:
```js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px'
    }
  }
}
```

## Phase 2: Timeline Component 🔄
### Create new full-width timeline component ✅
- Create new file: `frontend/src/components/beacon/TimelineView/index.tsx`
- Component should accept:
  - Current slot
  - Loading state
  - Navigation callbacks
  - Live mode status
- Structure:
```tsx
<div className="w-full max-w-[80%] mx-auto">
  <div className="relative h-24 bg-surface/90 backdrop-blur-md border border-subtle rounded-lg">
    {/* Timeline content */}
  </div>
</div>
```

### Implement previous/next slot navigation ✅
- Add navigation buttons to TimelineView:
```tsx
<div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 flex justify-between">
  <button
    onClick={onPreviousSlot}
    className="p-2 rounded-lg bg-surface hover:bg-hover"
  >
    <ChevronLeft className="w-5 h-5" />
  </button>
  <button
    onClick={onNextSlot}
    disabled={isLive}
    className="p-2 rounded-lg bg-surface hover:bg-hover disabled:opacity-50"
  >
    <ChevronRight className="w-5 h-5" />
  </button>
</div>
```

### Add disabled state for "next" button ✅
- Add conditional styling for live mode:
```tsx
<button
  disabled={isLive}
  className={clsx(
    'p-2 rounded-lg transition-all',
    isLive ? 'opacity-50 cursor-not-allowed bg-surface/50' : 'bg-surface hover:bg-hover'
  )}
>
  <ChevronRight className="w-5 h-5" />
</button>
```

### Mobile responsiveness for timeline ✅
- [x] Add responsive classes:
```tsx
<div className="w-full md:max-w-[80%] mx-auto flex flex-col md:flex-row gap-4">
  <div className="relative h-16 md:h-24 bg-surface/90">
    {/* Timeline content */}
  </div>
</div>
```

## Phase 3: Main Content Area 🔄
### Refactor GlobalMap component ✅
- [x] Target file: `frontend/src/components/beacon/GlobalMap/index.tsx`
- [x] Update container to be more prominent:
```tsx
<div className="h-[70%] relative">
  <div className="absolute inset-0 rounded-lg overflow-hidden">
    {/* Map content */}
  </div>
</div>
```

### Create BlockDetailsOverlay component ✅
- [x] Create new file: `frontend/src/components/beacon/BlockDetailsOverlay/index.tsx`
- [x] Component structure should be horizontal with fixed height sections:
```tsx
<div className="h-[30%] grid grid-cols-4 gap-4">
  <div className="overflow-y-auto"> {/* Block Proposal */} </div>
  <div className="overflow-y-auto"> {/* Attestation */} </div>
  <div className="overflow-y-auto"> {/* Aggregation */} </div>
  <div className="overflow-y-auto"> {/* Additional Info */} </div>
</div>
```

### Position overlay ✅
- [x] Add positioning classes:
```tsx
<div className={clsx(
  'absolute transition-all duration-300',
  isCollapsed ? 'top-4 right-4 w-12 h-12' : 'top-4 right-4 w-80'
)}>
  {/* Content */}
</div>
```

### Make overlay collapsible ✅
- [x] Add collapse functionality:
```tsx
const [isCollapsed, setIsCollapsed] = useState(false);

<div className="absolute top-2 right-2">
  <button
    onClick={() => setIsCollapsed(!isCollapsed)}
    className="p-1 hover:bg-hover rounded"
  >
    {isCollapsed ? <Expand /> : <Collapse />}
  </button>
</div>
```

### Responsive overlay ✅
- [x] Add responsive classes:
```tsx
<div className={clsx(
  'absolute transition-all duration-300',
  'w-full md:w-80',
  isCollapsed
    ? 'h-12 md:top-4 md:right-4'
    : 'h-auto md:top-4 md:right-4',
  'bottom-0 md:bottom-auto',
  'left-0 md:left-auto'
)}>
  {/* Content */}
</div>
```

## Phase 4: Right Sidebar Event Timeline 🔄
### Create EventTimeline component
- Create new file: `frontend/src/components/beacon/EventTimeline/index.tsx`
- Component structure:
```tsx
interface Event {
  id: string;
  timestamp: number;
  type: string;
  node: string;
  data: any;
}

interface EventTimelineProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({
  events,
  onEventClick
}) => {
  return (
    <div className="w-full lg:w-80 h-full bg-surface/90 backdrop-blur-md border border-subtle rounded-lg">
      <div className="p-4">
        <h3 className="text-lg font-medium mb-4">Event Timeline</h3>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {events.map(event => (
            <EventItem
              key={event.id}
              event={event}
              onClick={() => onEventClick?.(event)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
```

### Implement real-time updates
- Use React Query for real-time updates:
```tsx
const { data: events, isLoading } = useQuery(
  ['events', slot],
  () => fetchEvents(slot),
  {
    refetchInterval: 1000,
    staleTime: 0
  }
);
```

### Add event animation
- Create animation styles in `index.css`:
```css
@keyframes highlight {
  0% { background-color: rgb(var(--accent) / 0.2); }
  100% { background-color: transparent; }
}

.event-highlight {
  animation: highlight 0.5s ease-out;
}
```
- Apply to new events:
```tsx
const EventItem = ({ event, isNew }) => (
  <div
    className={clsx(
      'p-3 rounded-lg border border-subtle',
      isNew && 'event-highlight'
    )}
  >
    {/* Event content */}
  </div>
);
```

### Add auto-scroll
- Implement auto-scroll using refs:
```tsx
const scrollRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (scrollRef.current) {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }
}, [events]);

<div ref={scrollRef} className="space-y-2 max-h-[60vh] overflow-y-auto">
  {/* Events */}
</div>
```

### Mobile collapsible sidebar
- Add collapse state:
```tsx
const [isCollapsed, setIsCollapsed] = useState(false);

<div className={clsx(
  'fixed inset-y-0 right-0 transform transition-transform duration-300',
  'w-full md:w-80',
  isCollapsed ? 'translate-x-full' : 'translate-x-0'
)}>
  {/* Content */}
</div>
```

### Width constraints
- Add width constraints in parent:
```tsx
<div className="hidden lg:block lg:w-80 flex-shrink-0">
  <EventTimeline events={events} />
</div>
```

## Phase 5: Bottom Information Panel ⏳
### Create BottomPanel component
- Create new file: `frontend/src/components/beacon/BottomPanel/index.tsx`
- Component structure:
```tsx
interface BottomPanelProps {
  attestationProgress: number;
  totalValidators: number;
  arrivalData: any[];
  distributionData: any[];
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  attestationProgress,
  totalValidators,
  arrivalData,
  distributionData
}) => {
  return (
    <div className="w-full bg-surface/90 backdrop-blur-md border border-subtle rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Content sections */}
      </div>
    </div>
  );
};
```

### Attestation progress bar
- Create progress component:
```tsx
const AttestationProgress = ({ progress, total }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <span>Attestations</span>
      <span>{progress} / {total}</span>
    </div>
    <div className="h-2 bg-surface rounded-full overflow-hidden">
      <div
        className="h-full bg-accent transition-all duration-300"
        style={{ width: `${(progress / total) * 100}%` }}
      />
    </div>
  </div>
);
```

### Charts implementation
- Use `recharts` for responsive charts:
```tsx
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const ArrivalChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={200}>
    <AreaChart data={data}>
      <Area
        type="monotone"
        dataKey="value"
        stroke="rgb(var(--accent))"
        fill="rgb(var(--accent) / 0.2)"
      />
      <XAxis dataKey="time" />
      <YAxis />
    </AreaChart>
  </ResponsiveContainer>
);
```

### Mobile stacking
- Add responsive grid:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="col-span-1 md:col-span-2 lg:col-span-1">
    <AttestationProgress progress={progress} total={total} />
  </div>
  <div className="col-span-1">
    <ArrivalChart data={arrivalData} />
  </div>
  <div className="col-span-1">
    <DistributionChart data={distributionData} />
  </div>
</div>
```

## Phase 6: Mobile/Responsive Implementation ⏳
### Add breakpoints
- Already defined in Phase 1
- Use consistent breakpoints throughout components:
  - sm: 640px (mobile)
  - md: 768px (tablet)
  - lg: 1024px (desktop)
  - xl: 1280px (large desktop)
  - 2xl: 1536px (extra large desktop)

### Stacking behavior
- Implement in Layout.tsx:
```tsx
<div className="flex flex-col lg:flex-row gap-4">
  <div className="w-full lg:w-[80%]">
    <TimelineView />
    <div className="mt-4">
      <GlobalMap />
    </div>
  </div>
  <div className="w-full lg:w-[20%]">
    <EventTimeline />
  </div>
</div>
```

### Mobile overlay
- Update BlockDetailsOverlay for mobile:
```tsx
<div className={clsx(
  'fixed lg:absolute',
  'bottom-0 lg:top-4 lg:right-4',
  'w-full lg:w-80',
  'z-50',
  isCollapsed && 'h-12'
)}>
  {/* Content */}
</div>
```

### Mobile event timeline
- Add slide-up panel for mobile:
```tsx
<div className={clsx(
  'fixed inset-x-0 bottom-0 lg:relative',
  'h-[70vh] lg:h-auto',
  'transform transition-transform duration-300',
  isCollapsed ? 'translate-y-full' : 'translate-y-0'
)}>
  {/* Content */}
</div>
```

### Bottom panel mobile
- Update BottomPanel grid:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="col-span-1 md:col-span-2 lg:col-span-1 order-1">
    <AttestationProgress />
  </div>
  <div className="col-span-1 order-2 lg:order-3">
    <ArrivalChart />
  </div>
  <div className="col-span-1 order-3 lg:order-2">
    <DistributionChart />
  </div>
</div>
```

### Touch targets
- Update all interactive elements:
```tsx
const MIN_TOUCH_TARGET = 'min-h-[44px] min-w-[44px]';
const TOUCH_FRIENDLY_PADDING = 'p-3';

<button className={clsx(
  MIN_TOUCH_TARGET,
  TOUCH_FRIENDLY_PADDING,
  'rounded-lg',
  'hover:bg-hover'
)}>
  {/* Button content */}
</button>
```

## Phase 7: Testing and Optimization ⏳
### Test breakpoints
- Create test scenarios in `frontend/src/tests/responsive.test.tsx`
- Test each component at every breakpoint
- Verify layout shifts and content reflow

### Animation testing
- Test all transitions:
  - Overlay collapse/expand
  - Sidebar slide
  - Event highlights
  - Progress bar updates
- Ensure smooth 60fps performance

### Accessibility testing
- Run Lighthouse audits
- Test with screen readers
- Verify keyboard navigation
- Check color contrast
- Ensure proper ARIA attributes

### Scroll testing
- Test on various devices and browsers
- Verify no horizontal scroll
- Check touch scrolling behavior
- Test momentum scrolling

### Touch testing
- Test on real devices
- Verify touch targets
- Check gesture handling
- Test touch feedback

### Functionality testing
- Create test suite for all features
- Verify data flow
- Test real-time updates
- Check error handling

## Phase 8: Final Polish ⏳
### Loading states
- Add loading skeletons:
```tsx
const Skeleton = () => (
  <div className="animate-pulse bg-surface/50 rounded-lg h-[20px]" />
);
```
- Implement for all components

### Transitions
- Add consistent transitions:
```css
.transition-standard {
  @apply transition-all duration-300 ease-in-out;
}
```

### Error handling
- Create error boundaries
- Add fallback UI
- Implement retry logic
- Add error logging

### Final testing
- Cross-browser testing
- Performance profiling
- Memory leak checks
- Load testing

### Performance
- Implement code splitting
- Add Suspense boundaries
- Optimize bundle size
- Cache API responses

### Documentation
- Update README
- Add component documentation
- Document responsive behavior
- Add accessibility guidelines 