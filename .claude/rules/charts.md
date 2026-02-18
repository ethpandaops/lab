# Charts

## Visual Standards

**Axis Lines:**

- **ALWAYS** render both y-axis and x-axis lines unless specifically not needed
- Set `axisLine: { show: true }` for both xAxis and yAxis

**Grid Lines:**

- **NEVER** render grid lines
- Set `splitLine: { show: false }` for both xAxis and yAxis

**Axis Ranges & Intervals:**

- yMax/xMax must work with consistent, evenly-spaced intervals
- BAD: `0, 200, 400, 600, 800, 1000, 1100` (inconsistent final interval)
- GOOD: `0, 200, 400, 600, 800, 1000` OR `0, 250, 500, 750, 1000, 1250`
- Prefer setting yMax/xMax with `splitNumber` and let ECharts calculate intervals automatically
- Example: `yAxis: { max: 1000, splitNumber: 5 }` → generates [0, 200, 400, 600, 800, 1000]

**Grid Padding:**

- Minimize whitespace while ensuring labels are visible
- **Use simple explicit padding values** and let ECharts handle label positioning:
  - Set `left`, `right`, `top`, `bottom` values
  - No need for `containLabel`, `align`, `inside`, `margin` - let ECharts use defaults
- **Standard padding values:**
  - **Left**: 60px (for y-axis labels and name)
  - **Right**: 24px (minimal, 80px if dual y-axes present)
  - **Top**: 16px (40px if ECharts title is used)
  - **Bottom**: 50px (90px if native legend at bottom)
- Override only when absolutely necessary (e.g., dual y-axes, legends, special layouts)
- Wrappers should never override grid config unless they have very specific layout needs

**Slot Time Formatting:**

- When plotting slot time on xAxis:
  - **Title**: Must be "Slot Time (s)"
  - **Units**: Use seconds (not milliseconds)
  - **Precision**: Round to the nearest second
  - **Ticks**: Default ticks at 0, 4s, 8s, 12s (unless otherwise specified)
  - **Format**: Display as "0", "4", "8", "12" (numbers only, no "s" suffix in tick labels)

## Component Architecture

**Core Chart Components** (`src/components/Charts/`):

- Define sensible defaults for all visual standards above
- Provide consistent `gridConfig`, axis styling, and formatting
- Should be production-ready without overrides

**Wrapper Components** (page-scoped chart components):

- **Defer to core components** for most settings
- Only override when directly needed for page-specific requirements
- **Do NOT override** `gridConfig` unless absolutely necessary
- Pass through props to core components rather than recreating configuration

**Example Pattern:**

```tsx
// BAD: Wrapper recreates all config
<LineChart
  gridConfig={{ left: 60, right: 20, top: 60, bottom: 60 }}
  xAxis={{ type: 'value', axisLine: { show: true }, splitLine: { show: false } }}
  yAxis={{ type: 'value', axisLine: { show: true }, splitLine: { show: false } }}
/>

// GOOD: Wrapper defers to core component
<LineChart
  data={data}
  xAxisLabel="Slot Time (s)"
  // Only override what's truly page-specific
/>
```

## Shared Crosshairs

Charts sharing the same x-axis can synchronize tooltips and crosshairs using the `syncGroup` prop:

- Use `syncGroup="slot-time"` for charts with slot time x-axis (0-12s)
- Use `syncGroup="slot-number"` for charts with slot number x-axis
- Omit `syncGroup` for independent charts
