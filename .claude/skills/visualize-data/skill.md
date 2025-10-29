---
name: Visualize any data
description: Learn how to visualize data in a sustainable, accurate, and theme aware way.
---

Whenever Claude is asked to visualize data, you must follow the steps below. 
- Chart components live in the `src/components/Charts` directory
- If you need a new core component type, create it in the `src/components/Charts` directory. Inspect the existing components to see how to create a new one. Seperation of concerns is important. Make storybook stories for the new component. 
- `echarts` and `echarts-for-react` are the only libraries you can use to visualize data, and you must use them in the `src/components/Charts` directory.
- If you think the chart can be reusable, create it within the `src/components/*` directory. For example, `src/components/Ethereum/AttestationsByEntity`.

## Step 1: What Are You Trying to Show?

| Goal | Best Chart Types | Use When |
|------|------------------|----------|
| **Trend over time** | Line, Step, Area | X-axis is temporal (time, slot, epoch, block) |
| **Compare categories** | Bar, Column, Dot plot | Comparing distinct groups |
| **Show distribution** | Histogram, Box plot, Violin | Understanding spread/shape of data |
| **Show relationship** | Scatter, Bubble | Correlation between two+ variables |
| **Show composition** | Stacked bar, Pie, Treemap | Parts of a whole |
| **Show single value** | Number card, Gauge | Key metric snapshot |

## Step 2: Time-Series Data Patterns

### Data Type Detection → Interpolation Method

| Data Characteristics | Chart Config | Example Metrics |
|---------------------|--------------|-----------------|
| **Integer values only, non-negative** | Step chart: `step: 'end'` | blob count, transaction count, user count |
| **Values hold between updates** | Step chart: `step: 'start'` | base fee, price tier, status, config value |
| **Continuous decimals, volatile** | Line: `smooth: false` | gas price, latency, response time |
| **Continuous decimals, trend focus** | Line: `smooth: true` | moving averages, smoothed rates |
| **Categorical states** | Step chart: `step: 'start'` + colors | validator status, network state |
| **Sparse/irregular events** | Scatter plot | slashing events, errors, alerts |

### Quick Decision Tree for Time-Series
```
Is data always integers? 
├─ YES → Can you have 3.5 of this thing?
│         ├─ NO → Step chart (step: 'end')
│         └─ YES → It's rounded data → Line chart
│
└─ NO → Does value stay constant between measurements?
          ├─ YES → Step chart (step: 'start')  
          └─ NO → Line chart (linear or smooth)
```

## Step 3: Non-Temporal Data Patterns

### Comparison Charts

| Scenario | Chart Type | Configuration Notes |
|----------|-----------|---------------------|
| Compare 3-10 categories | **Bar chart** (horizontal if labels long) | Start axis at zero |
| Compare 10+ categories | **Dot plot** or **Horizontal bar** | Easier to read labels |
| Compare across 2 dimensions | **Grouped bar** | Limit to 2-4 groups per category |
| Compare ratios/percentages | **Bar chart** | NOT pie chart |
| Compare ranges | **Box plot** | Shows min/max/quartiles |

### Distribution Charts

| Data Type | Chart Type | Use When |
|-----------|-----------|----------|
| Single continuous variable | **Histogram** | Show frequency distribution |
| Multiple distributions to compare | **Box plot** or **Violin plot** | Compare shapes across groups |
| Small dataset (<50 points) | **Dot plot** or **Strip plot** | Show individual points |
| Check for outliers | **Box plot** | Visualize quartiles and extremes |

### Relationship Charts

| Scenario | Chart Type | Notes |
|----------|-----------|-------|
| Two continuous variables | **Scatter plot** | Look for correlation |
| Three variables (2 continuous + 1 size) | **Bubble chart** | Size = third dimension |
| Many overlapping points | **Hex bin** or **2D histogram** | Shows density |
| Categorical + continuous | **Box plot** or **Violin** | Distribution per category |

### Composition Charts

| Scenario | Chart Type | Use When |
|----------|-----------|----------|
| Parts of whole (2-5 parts) | **Donut chart** | Simple proportions |
| Parts of whole (6+ parts) | **Bar chart** (NOT pie) | Too many slices are unreadable |
| Hierarchical composition | **Treemap** or **Sunburst** | Nested categories |
| Composition over time | **Stacked area** | Show how parts change |
| 100% composition | **Stacked bar (100%)** | Compare proportions across groups |

## Step 4: Universal Rules

### Always Do:

| Rule | Why | How |
|------|-----|-----|
| **Start Y-axis at zero for bars** | Human eyes judge area; starting elsewhere misleads | Set `yAxis: { min: 0 }` |
| **Use consistent colors** | Same metric = same color across charts | Define color palette |
| **Label axes clearly** | Include units (gwei, %, count, etc.) | `name: 'Gas Price (gwei)'` |
| **Limit colors per chart** | Too many colors = cognitive overload | Max 5-7 distinct colors |
| **Show data directly when <20 points** | Let users see actual values | Add data labels or table |
| **Use integers for count data** | Fractional counts don't exist | `yAxis: { minInterval: 1 }` |

### Never Do:

| Mistake | Why It's Bad | Correct Approach |
|---------|--------------|------------------|
| **Smooth lines for count data** | Implies fractional values exist (e.g., 3.5 transactions) | Use step chart |
| **Pie charts with >5 slices** | Impossible to compare similar-sized slices | Use bar chart |
| **3D charts** | Distorts perception, harder to read | Use 2D always |
| **Dual-axis with unrelated scales** | Can manipulate perception | Only if truly related metrics |
| **Too many series on one chart** | Becomes unreadable | Split into multiple charts |

## Step 5: Common Metric Patterns

### Pattern Library (Generic)

| Metric Type | Example | Chart | Settings |
|-------------|---------|-------|----------|
| **Event count per period** | "transactions per block" | Step | `step: 'end'`, `minInterval: 1` |
| **Total/cumulative** | "total users", "cumulative revenue" | Area or Line | `smooth: false` or filled area |
| **Rate/percentage** | "success rate", "utilization %" | Line | `smooth: false`, range 0-100 |
| **Price/fee** | "gas price", "transaction fee" | Line or Step | Step if updates discrete, Line if continuous |
| **Average** | "average latency", "mean value" | Line | `smooth: true` for trends |
| **Status/state** | "server status", "order state" | Step | `step: 'start'`, use colors |
| **Distribution** | "transaction sizes" | Histogram | Bin count = √n as starting point |
| **Comparison** | "revenue by product" | Bar | Horizontal if many categories |
| **Correlation** | "price vs volume" | Scatter | Add trendline if useful |

## Step 6: Data Volume Guidelines

| Data Points | Approach | Reasoning |
|-------------|----------|-----------|
| **< 20 points** | Show all detail, consider data labels | Every point is visible |
| **20-100 points** | Show all, use tooltips | Still manageable |
| **100-1,000 points** | Show all with interaction (zoom/pan) | Need exploration tools |
| **1,000-10,000 points** | Aggregate OR downsample | Too dense for individual points |
| **> 10,000 points** | Must aggregate or use density visualization | Line chart becomes solid blob |

## Step 7: Interpolation Quick Reference

### Step Chart: When to Use Which Direction

| Direction | When to Use | Example |
|-----------|-------------|---------|
| `step: 'end'` | Value measured **AT** this point | Count of events in slot N, measured at slot N |
| `step: 'start'` | Value **HOLDS FROM** this point | Price changed at slot N, stays until next change |
| `step: 'middle'` | Rare - value centered on interval | Midpoint representation (uncommon) |

### Smooth vs Linear for Continuous Data

| Use Case | Setting | When |
|----------|---------|------|
| **Show volatility/precision** | `smooth: false` | Raw measurements, user needs exact values |
| **Show overall trend** | `smooth: true` | Filtered/averaged data, focus on pattern |
| **Moving average** | `smooth: true` | Already smoothed data |
| **Real-time fluctuations** | `smooth: false` | Price tickers, live monitoring |

## Step 8: Validation Checklist

Before finalizing any chart, ask:

- [ ] **Reality check**: Can the values between my data points actually exist?
  - If NO → Use step chart or scatter
  - If YES → Use line chart

- [ ] **Zero baseline**: For bar charts, does Y-axis start at zero?
  - If NO and showing bars → Fix it
  
- [ ] **Color count**: Am I using more than 7 colors?
  - If YES → Reduce or group categories

- [ ] **Label clarity**: Can someone understand the chart without explanation?
  - If NO → Improve axis labels and add units

- [ ] **Data density**: Are there so many points they overlap?
  - If YES → Aggregate, downsample, or add interaction

- [ ] **Chart purpose**: Does this visualization answer the user's question?
  - If NO → Choose different chart type

## Step 9: ECharts Config Patterns

### Basic Templates
```javascript
// INTEGER COUNT over time
{
  type: 'line',
  step: 'end',
  data: [...],
  yAxis: { minInterval: 1 }
}

// CONTINUOUS MEASUREMENT over time  
{
  type: 'line',
  smooth: false,  // or true for trends
  data: [...]
}

// VALUE THAT HOLDS between updates
{
  type: 'line',
  step: 'start',
  data: [...]
}

// CATEGORY COMPARISON
{
  type: 'bar',
  data: [...],
  yAxis: { min: 0 }
}

// SPARSE EVENTS
{
  type: 'scatter',
  symbolSize: 8,
  data: [...]
}
```

## Quick Decision Matrix

| I Have... | I Want To... | Use This |
|-----------|--------------|----------|
| Counts over time | Show exact counts per period | Step chart (`step: 'end'`) |
| Measurements over time | Show trend | Line (smooth) |
| Measurements over time | Show volatility | Line (linear) |
| Values that update occasionally | Show when changes occur | Step chart (`step: 'start'`) |
| Categories to compare | Compare values | Bar chart |
| Parts of a whole | Show composition | Donut (if ≤5) or Bar chart |
| Two variables | Find correlation | Scatter plot |
| One variable distribution | Understand spread | Histogram or Box plot |
| States over time | Show transitions | Step chart + colors |

## Key Principles to Remember

1. **Match visualization to data nature** - Don't force continuous interpolation on discrete data
2. **Simpler is better** - Use the simplest chart that answers the question
3. **Context matters** - Same data may need different viz for different questions
4. **Always label clearly** - Include units, axis names, and legends
5. **Test readability** - Can someone understand it in 5 seconds?