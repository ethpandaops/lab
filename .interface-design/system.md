# The Lab — Design System

## Direction

**Product:** Ethereum blockchain observatory. Consensus health, validator performance, MEV dynamics, data availability, network topology.

**Who uses this:** Ethereum researchers, node operators, protocol developers. Technical people who read time-series data fluently. They're monitoring network health, analyzing fork impact, debugging validators, or preparing data for presentations. Often late-night, often deep in context.

**What it feels like:** A warm observatory — precision instruments with earthy warmth. Not the cold blue of every other data platform. Dense enough for experts, not hostile to newcomers. Charts are artifacts, not decorations — expandable, downloadable, cross-referenced.

**Signature element:** The PopoutCard. Every chart lives in an expandable container that breaks out to fullscreen or exports as a branded image. Fork annotations read like geological strata across synchronized chart groups.

**Typeface:** Space Grotesk Variable — geometric precision with personality. Not sterile, not playful. Technical with warmth.

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

## Depth Strategy

**Hybrid: shadows (light) + outlines (dark).**

- Light mode: `shadow-sm` on cards
- Dark mode: `outline outline-border` (no shadows — they disappear on dark backgrounds)
- Star mode: follows dark mode pattern
- Interactive hover: `-translate-y-0.5 shadow-xs` (light), no shadow change (dark)

---

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

All text uses Space Grotesk Variable.

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

### Header

Page-level header. Size and weight carry the hierarchy; no accent bar or other ornament.

- Sizes: `xs`, `sm`, `md` (default), `lg`, `xl`
- Margin below: `mb-6` (md)

### Container

Page wrapper. `mx-auto p-4 sm:p-6 lg:p-8 max-w-screen-2xl`.

### Sidebar

- Width: `w-14` collapsed, `w-56` expanded
- Background: `bg-surface/95 backdrop-blur-xl`
- Border: `border-r border-border`
- Nav items: `rounded-sm px-2 py-1 text-sm/5 font-medium`
- Icons: `size-4 shrink-0`
- Version badge: `text-[10px] text-muted/60`

---

## Chart Standards

### Grid

```tsx
grid: { left: 60, right: 24, top: 16, bottom: 50 }
// top: 40 if title present
// right: 70 if dual y-axes
// bottom: +40 for legend, +40 for dataZoom
```

### Axes

- Always show axis lines: `axisLine: { show: true }`, color = `themeColors.border`
- Never show grid lines: `splitLine: { show: false }`
- Label color: `themeColors.muted`, size 12
- Name position: `nameLocation: 'middle'`, xAxis gap 30, yAxis gap 50
- Name color: `themeColors.foreground`, size 12

### Lines

- Width: 3
- Symbols: hidden (`showSymbol: false`)
- Smooth: true (default)
- Emphasis: symbol size 8, line width 4
- Animation: 300ms, cubicOut easing

### Tooltip

- Background: `themeColors.background`
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
- Add grid lines to charts
- Use multiple accent colors — terracotta is the accent
