# The Lab — Design System

## Direction

**Product:** Ethereum blockchain observatory. Consensus health, validator performance, MEV dynamics, data availability, network topology.

**Who uses this:** Ethereum researchers, node operators, protocol developers. Technical people who read time-series data fluently. They're monitoring network health, analyzing fork impact, debugging validators, or preparing data for presentations. Often late-night, often deep in context.

**What it feels like:** A warm observatory — precision instruments with earthy warmth. Not the cold blue of every other data platform. Dense enough for experts, not hostile to newcomers. Charts are artifacts, not decorations — expandable, downloadable, cross-referenced.

**Signature element:** The PopoutCard. Every chart lives in an expandable container that breaks out to fullscreen or exports as a branded image. Fork annotations read like geological strata across synchronized chart groups.

**Typeface:** Geist for UI text and numbers (`font-sans`), Geist Mono for identifiers — hashes, graffiti, code (`font-mono`). Space Grotesk is the brand display face (`font-display`), used only for the wordmark and the landing hero. Charts get Geist through the registered `lab` ECharts theme (`ECHARTS_THEME`), since canvas text can't inherit CSS fonts.

---

## Tokens

### Color Architecture

Two-tier system defined in `src/index.css`:

**Tier 1 — Primitives** (never use directly in components):
- `terracotta` (50–950): warm accent, the brand signature
- `sand` (50–950): warm neutrals for light mode
- `neutral` (50–950): grayscale for dark mode
- `aurora-*` (cyan, green, purple, pink, blue): star mode

**Tier 2 — Semantic** (always use these):
- `primary` / `secondary` / `accent` — brand
- `background` / `surface` / `foreground` / `muted` / `border` — UI structure
- `success` / `warning` / `danger` — state

**Theme mappings:**

| Token | Light | Dark | Star |
|---|---|---|---|
| primary | terracotta-600 | terracotta-400 | aurora-cyan-400 |
| secondary | sand-200 | neutral-900 | aurora-purple-600 |
| accent | terracotta-500 | terracotta-300 | aurora-cyan-300 |
| background | sand-100 | neutral-950 | aurora-blue-950 |
| surface | sand-50 | #242424 | #0a1428 |
| foreground | sand-950 | neutral-50 | aurora-cyan-50 |
| muted | sand-600 | neutral-400 | aurora-cyan-700 |
| border | sand-300 | neutral-800 | #1a2847 |

**Programmatic access:**
```tsx
const colors = useThemeColors();
// { primary, secondary, accent, background, surface, foreground, muted, border, success, warning, danger }
```

### Data Visualization Colors

Constant across all themes:
- **Chart categorical** (0–14): `--color-chart-{n}` — blue, emerald, amber, red, cyan, lime, orange, purple, pink, violet, teal, indigo, rose, fuchsia, sky
- **Blob indices** (0–5): `--color-blob-{n}` — cyan, pink, amber, green, violet, red
- **Continents**: `--color-continent-{code}` — af(red), as(amber), eu(emerald), na(blue), oc(cyan), sa(violet), an(slate)
- **Performance gradient**: excellent(green) → good(lime) → fair(yellow) → slow(orange) → poor(red)

---

## Colour Only Exceptions

Data values render in `text-foreground` (or `text-muted` when secondary). Colour marks what needs
attention: `warning` and `danger` for thresholds, failures, missed/orphaned/late states and lag.
Good and normal values (participation, Ready, Canonical, Delivered, pass marks) are not green;
the normal state of a multi-state badge is neutral. `success` remains for live/running
indicators and transient feedback ("Copied"). Categorical data colours (chart series, call
types, heatmaps) are data, not judgement. Each Ethereum client has one colour everywhere:
`getClientColor` in `src/utils/ethereum.ts`.

## Depth Strategy

**Hairlines only, both themes.** Panels are `bg-surface outline -outline-offset-1 outline-border`;
no shadows in light mode, no lift on hover. The palette has three clearly separated steps —
page (`background`), panel (`surface`), hairline (`border`) — so panels read without shadows.
The sidebar uses the page background, so content panels are the only raised surfaces.

| Token | Light | Dark |
|---|---|---|
| background | sand-100 | #0f0f0e |
| surface | #fbfaf6 | #181817 |
| border | #dcd7c5 | #2c2b29 |
| muted | sand-700 | #a19f9a |
| foreground | sand-950 | #f5f5f4 |

## Border Radius

Two radii, set as tokens in `src/index.css`:

| Class | Value | Use |
|---|---|---|
| `rounded-xs` | 4px | Inline marks: badges, tags, skeleton bars, toggle knobs |
| `rounded-sm` | 6px | Every container and control: cards, buttons, inputs, selects, toggles, menus, nav items |
| `rounded-full` | — | Dots, avatars, progress tracks only |

`rounded-md` through `rounded-3xl` alias to `rounded-sm`, so legacy classes can't drift. Card,
Button, ButtonGroup, SelectMenu, Toggle and Checkbox are rounded by default; their `rounded` prop
exists only to opt out (for example a card bleeding into a page edge).

## Spacing

**Base unit: 4px (Tailwind default)**

| Context | Value | Classes |
|---|---|---|
| Container padding | responsive | `p-4 sm:p-6 lg:p-8` |
| Container max-width | responsive | `max-w-screen-2xl 3xl:max-w-screen-3xl 4xl:max-w-screen-4xl` |
| Card header padding | responsive | `px-4 py-3 sm:px-5` |
| Card body padding | responsive | `p-4 sm:p-5` |
| Card footer padding | responsive | `px-4 py-3 sm:px-5` |
| Page header margin | 32px | `mb-8` |
| Grid gap | 24px | `gap-6` |
| Section dividers | divide-y | `divide-y divide-border` |

---

## Typography

All UI text uses Geist (`font-sans`). Identifiers use Geist Mono (`font-mono`). Space Grotesk (`font-display`) is reserved for the brand.

| Role | Classes |
|---|---|
| Page title (md) | `text-2xl/8 font-semibold tracking-tight text-foreground` |
| Page title (sm) | `text-lg/7 font-semibold tracking-tight text-foreground` |
| Page description | `text-sm/6 text-muted max-w-3xl` |
| Card title | `text-sm/6 font-semibold text-foreground` (rendered by `Card title`) |
| Card subtitle | `text-xs/5 text-muted` (rendered by `Card subtitle`) |
| Section header | `text-xs font-semibold tracking-wider text-foreground` |
| Subsection header | `text-2xs font-semibold tracking-wider text-muted/60 uppercase` |
| Body text | `text-sm text-foreground` |
| Metadata | `text-xs text-muted` |
| Dense label | `text-2xs` (10px) — axis ticks, HUD keys, badges in tight cells |

The ramp is `text-2xs` → `xs` → `sm` → `base` → `lg` → `2xl`. Never use arbitrary pixel sizes
(`text-[9px]`, `text-[11px]`); `text-2xs` is the floor.

---

## Controls

Filter rows mix selects, segmented controls and buttons, so they share one size:

| Control | Recipe |
|---|---|
| Height | `h-8` (32px) for SelectMenu, SegmentedControl, Button `sm`, filter inputs |
| Text | `text-sm` (selects, inputs, buttons), `text-xs font-medium` (segments) |
| Surface | `bg-surface border border-border` — no blur, no shadow |
| Hover | `hover:border-primary/40` |
| Chevron | `size-4 text-muted` |

## Interactive States

| State | Pattern |
|---|---|
| Default link/nav | `text-muted` |
| Hover | `hover:bg-primary/10 hover:text-primary` |
| Active/Selected | `bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20` |
| Transition | `transition-all duration-200` or `transition-colors` |
| Icon button | `rounded-sm p-1 transition-colors hover:bg-muted/20` |
| Icon in button | `size-5 text-muted group-hover:text-foreground` |

---

## Component Patterns

### Card

Core container for all content sections.

```
bg-surface rounded-sm
Light: shadow-sm
Dark: outline outline-border
Sections: divide-y divide-border
Header: px-4 py-3 sm:px-5
Body: p-4 sm:p-5
```

Pass `title`, `subtitle` and `actions` instead of hand-built header markup. The header row is
one recipe everywhere: `text-sm/6` semibold title, `text-xs/5` muted subtitle, actions right-aligned
and pulled into the header's vertical padding so they never make it taller. Header and body share
the same horizontal inset, so content starting at the body's left edge lines up with the title.
Rows with their own hover background (`px-2`) offset it with `-mx-2` on the list.

Variants: `default`, `muted`, `primary`, `accent`, `elevated`, `surface`.

### PopoutCard

Wraps Card with expand-to-modal and download capabilities.

- Uses the Card header (`title`/`subtitle`/`actions`)
- Actions (top-right): `size-4` icons in `p-1.5` buttons — expand + export dropdown
- Modal size options: `default`, `lg`, `xl`, `full`
- `anchorId` prop for deep-linking via URL hash
- Render prop `({ inModal })` for responsive chart heights
- Download metadata footer: grid with logo, title, subtitle, branding

### Long lists

Any list of a sequence that goes further back than one screen (slots, epochs, an entity's
proposals) pages through its full indexed history. Never hard-cap to "the last N" and never use
"Load more".
- `RangePager` (`src/components/Lists/RangePager`): range on screen, Latest / Newer / Older, and
  "Go to" a number. Put it above the table (and below long tables).
- Pages are addressed by their top number in the URL (`?from=`), so every page is linkable.
- `getRangePage` clamps to the earliest indexed row from `/bounds`, so a jump past the start
  lands on the oldest page instead of an empty one.
- Tables that summarise a page (e.g. offline validators by entity) list every row, worst first,
  with a name filter; charts above them may show the top N but must say so.

### Stats (KPI strip)

Headline numbers are one panel, not a card per number: a hairline panel split by internal rules.
- Cell: `px-4 py-3.5 sm:px-5`; label `text-xs/5 font-medium text-muted` with an optional
  `size-3.5` icon (tinted by `iconColor` when given); value `text-2xl/8 font-semibold tracking-tight tabular-nums`
- Delta: `text-xs` with a 16px arrow, inline after the value
- `accentColor` draws a 2px rule on the cell's top edge
- Pages control columns with `gridClassName`; gaps are always zero


`Table` (`src/components/Lists/Table`) has one density for every list of records:

- Rows: `py-2.5` (~40px), `divide-y divide-border`, no zebra, `hover:bg-background`
- Column labels: `text-xs font-medium text-muted` (not bold foreground — the data is the content)
- Cells: `text-sm text-foreground tabular-nums`; pass `cellClassName` to mute secondary columns
- Edge columns are padded by `--table-inset`. A `nested` table inside a Card body bleeds to the
  card edges (rules span the full card) and takes the card's inset, so the first column lines up
  with the card title. Placed first or last in the body it also absorbs the vertical padding.
- Placed directly on a page, a `nested` table gets the Card surface and depth; inside a Card body
  it is transparent (the Card body sets `data-slot="card-body"`, `--card-inset`, `--card-inset-y`).

### Header

Page-level header. Size and weight carry the hierarchy; no accent bar or other ornament.

- Sizes: `xs`, `sm`, `md` (default), `lg`, `xl`
- Margin below: `mb-6` (md)

### Container

Page wrapper. `mx-auto p-4 sm:p-6 lg:p-8 max-w-screen-2xl`.

### App frame

- Top bar: `h-12 border-b border-border bg-background/85 backdrop-blur-sm`, sticky on desktop, holds
  the breadcrumb. Its rule continues the sidebar header's rule, so the frame is one line.
- Breadcrumb: ancestors `text-muted hover:text-foreground`, current page `font-medium text-foreground`,
  separators `text-muted/50`. No accent color.
- Navigation states are neutral: hover `bg-foreground/5 text-foreground`, active
  `bg-foreground/[0.07] text-foreground` with a primary icon. Primary color marks selection in
  controls, not navigation.

### Sidebar

- Width: `w-14` collapsed, `w-56` expanded
- Background: `bg-background` (same as the page)
- Border: `border-r border-border`
- Nav items: `rounded-sm px-2 py-1 text-sm/5 font-medium`
- Icons: `size-4 shrink-0`
- Version badge: `text-[10px] text-muted/60`

---

## Chart Standards

### Grid

```tsx
grid: { left: 52, right: 16, top: 12, bottom: 28 }
// top: 32 when the y-axis has a name (it sits above the axis)
// right: 56 with a secondary y-axis
// bottom: 48 when a numeric x-axis has a name, +40 for native legend, +28 for dataZoom
```

### Axes

- Horizontal hairline grid lines on the value axis (`splitLine` solid, `themeColors.border`); no y-axis line
- X-axis line in `themeColors.border`, no ticks, `hideOverlap` labels
- Labels `themeColors.muted`, size 11
- Y-axis name reads horizontally above the axis (`nameLocation: 'end'`), not rotated beside it
- X-axis name only on numeric axes ("Slot"); dates and categories label themselves, so "Date" is dropped
- dataZoom slider: an 8px neutral track with thin handles, no data preview, no accent color

### Lines

- Width: 3
- Symbols: hidden (`showSymbol: false`)
- Smooth: true (default)
- Emphasis: symbol size 8, line width 4
- Animation: 300ms, cubicOut easing

### End labels

MultiLine names each plain line at its right end (2–8 lines; not stacked/area/bar/band series).
Off on charts narrower than 480px and on charts with a secondary y-axis; `endLabels={false}`
opts out. Legends stay: they toggle series.

### Tooltip

- Panel: `themeColors.surface`, 6px radius, soft shadow, padding 8×10
- Background: `themeColors.surface`
- Border: `themeColors.border`
- Text: `themeColors.foreground`, size 12
- Axis pointer: dashed line in `themeColors.muted`

### Legend (Interactive)

Borderless toggles (not native ECharts legend), with no rule between legend and chart:
- `rounded-xs px-1.5 py-0.5 text-xs/5 hover:bg-muted/10`
- Visible: `text-foreground`, filled dot
- Hidden: `text-muted/60`, hollow dot
- Color indicator: `h-2 w-2 rounded-full`

### Synchronized Crosshairs

Charts sharing x-axis domain use `syncGroup` prop:
- `"consensus-overview"` — consensus charts
- `"execution-overview"` — execution charts
- Disabled in modal: `syncGroup={inModal ? undefined : 'group-name'}`

### Slot Time Formatting

- Title: "Slot Time (s)"
- Units: seconds (not milliseconds)
- Precision: nearest second
- Default ticks: 0, 4, 8, 12

---

## Page Layout Patterns

### Chart Grid Page

Two-column responsive grid with time controls:

```tsx
<Container>
  <Header title="..." description="..." />
  {/* Time controls */}
  <div className="flex items-center gap-3">
    <ButtonGroup options={timeWindows} />
    <Toggle label="Show Forks" />
  </div>
  {/* Chart grid */}
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
    <PopoutCard title="..." anchorId="...">
      {({ inModal }) => (
        <MultiLineChart height={inModal ? 600 : 400} syncGroup="..." />
      )}
    </PopoutCard>
    {/* ... more charts */}
  </div>
</Container>
```

### Time Period Selector

`SegmentedControl` (`src/components/Forms/SegmentedControl`) — never hand-roll pill rows.
- Track: `h-8 rounded-sm bg-surface p-0.5 ring-1 ring-border`
- Selected segment: `bg-primary/15 text-primary` (the app-wide selected state)
- Other segments: `text-muted hover:bg-muted/10 hover:text-foreground`

### Fork Annotations

Vertical mark lines on time-series charts:
- Consensus forks, execution forks, blob schedule changes
- Different line styles per category
- Shown/hidden via "Show Forks" toggle

---

## Animations

| Name | Duration | Easing | Use |
|---|---|---|---|
| shimmer | 2s linear infinite | linear | Loading skeletons |
| fade-in | 0.8s | ease-out | Page entry |
| fade-in-delay | 0.8s, 0.2s delay | ease-out | Staggered entry |
| highlight-new | 0.5s | ease-out | New items |
| row-new | 0.3s | ease-out | Live data rows |
| transitions | 0.2s | default | Interactive states |

Elements with fade-in start with `opacity: 0`.

---

## Don't

- Use primitive color scales directly (`bg-terracotta-500`, `bg-sand-100`)
- Use locale formatting for slots/epochs (no commas)
- Override chart grid config in wrapper components unless necessary
- Mix depth strategies (shadows in dark mode, outlines in light mode)
- Reach for `rounded-md`/`rounded-lg` — they alias to `rounded-sm`; write `rounded-sm` (or `rounded-xs` for inline marks)
- Use `rounded-full` for buttons or segmented controls
- Use multiple accent colors — terracotta is the accent
