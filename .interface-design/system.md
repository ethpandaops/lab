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

`rounded-sm` everywhere. Cards, buttons, inputs, navigation items, badges, legends.

No mixing of sharp and round. One radius, one feel.

---

## Spacing

**Base unit: 4px (Tailwind default)**

| Context | Value | Classes |
|---|---|---|
| Container padding | responsive | `p-4 sm:p-6 lg:p-8` |
| Container max-width | responsive | `max-w-screen-2xl 3xl:max-w-screen-3xl 4xl:max-w-screen-4xl` |
| Card header padding | responsive | `px-4 py-5 sm:px-6` |
| Card body padding | responsive | `px-4 py-5 sm:p-6` |
| Card footer padding | responsive | `px-4 py-4 sm:px-6` |
| Page header margin | 32px | `mb-8` |
| Grid gap | 24px | `gap-6` |
| Section dividers | divide-y | `divide-y divide-border` |

---

## Typography

All text uses Space Grotesk Variable.

| Role | Classes |
|---|---|
| Page title (md) | `text-4xl/tight font-bold text-foreground` |
| Page title (sm) | `text-2xl/tight font-bold text-foreground` |
| Page description | `text-base text-muted` |
| Card title | `text-lg/7 font-semibold text-foreground` |
| Card subtitle | `text-sm text-muted` |
| Section header | `text-xs font-semibold tracking-wider text-foreground` |
| Subsection header | `text-[10px] font-semibold tracking-wider text-muted/60 uppercase` |
| Body text | `text-sm text-foreground` |
| Metadata | `text-xs text-muted` |

---

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
Header: px-4 py-5 sm:px-6
Body: px-4 py-5 sm:p-6
```

Variants: `default`, `muted`, `primary`, `accent`, `elevated`, `surface`.

### PopoutCard

Wraps Card with expand-to-modal and download capabilities.

- Title: `text-lg/7 font-semibold text-foreground`
- Subtitle: `text-sm text-muted`
- Actions (top-right): expand icon + dropdown for export
- Modal size options: `default`, `lg`, `xl`, `full`
- `anchorId` prop for deep-linking via URL hash
- Render prop `({ inModal })` for responsive chart heights
- Download metadata footer: grid with logo, title, subtitle, branding

### Header

Page-level header with optional accent bar.

- Accent bar: `h-1 w-24 rounded-sm bg-linear-to-r from-primary to-accent`
- Sizes: `xs`, `sm`, `md` (default), `lg`, `xl`
- Margin below: `mb-8` (md)

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

Pill-style buttons (not native ECharts legend):
- `rounded-sm border px-2 py-1 text-xs/5`
- Active: `bg-surface-hover border-border text-foreground`
- Inactive: `border-transparent bg-surface/50 text-muted/50`
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

Button group with pill buttons:
- Active: `bg-primary text-primary-foreground ring-2 ring-primary/30`
- Inactive: `bg-surface text-muted ring-1 ring-border`

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
- Use `rounded-md`, `rounded-lg` — only `rounded-sm`
- Add grid lines to charts
- Use multiple accent colors — terracotta is the accent
