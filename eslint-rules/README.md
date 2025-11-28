# Custom ESLint Rules for Lab

This directory contains custom ESLint rules that enforce color usage standards in the Lab project.

## Overview

Lab uses a **two-tier color architecture** defined in `src/index.css`:

- **Tier 1: Primitive Color Scales** - Foundation colors (`terracotta-*`, `sand-*`, `neutral-*`, `aurora-*`)
  - These should ONLY be referenced in the theme definition (`src/index.css`)
  - Should NEVER be used directly in application code

- **Tier 2: Semantic Tokens** - Application-level colors
  - **Brand**: `primary`, `secondary`, `accent`
  - **Surface**: `background`, `surface`, `foreground`, `muted`, `border`
  - **State**: `success`, `warning`, `danger`
  - **Data Viz**: `blob-*`, `continent-*`, `chart-*`, `performance-*`

## Rules

### `lab/validate-route-images`

Validates that all images referenced in route meta tags (og:image, twitter:image) actually exist in the public directory.

**❌ Incorrect:**
```tsx
// In src/routes/xatu/contributors.tsx
export const Route = createFileRoute('/xatu/contributors')({
  head: () => ({
    meta: [
      { property: 'og:image', content: '/images/missing/file.png' }, // ❌ File doesn't exist
      { name: 'twitter:image', content: '/images/experiments/contributors.png' }, // ❌ Wrong section
    ],
  }),
});
```

**✅ Correct:**
```tsx
// In src/routes/xatu/contributors.tsx
export const Route = createFileRoute('/xatu/contributors')({
  head: () => ({
    meta: [
      { property: 'og:image', content: '/images/xatu/contributors.png' }, // ✅ File exists
      { name: 'twitter:image', content: '/images/xatu/contributors.png' }, // ✅ Correct path
    ],
  }),
});
```

**Image Path Convention:**
- Images should be placed at: `public/images/[section]/[page-name].png`
- Referenced as: `/images/[section]/[page-name].png`
- Example: `public/images/xatu/contributors.png` → `/images/xatu/contributors.png`

**When to create images:**
- Every page should have a feature image for social sharing (og:image, twitter:image)
- Images should be PNG format
- Follow the section-based directory structure

### `lab/no-hardcoded-colors`

Bans hardcoded color values (hex, RGB, HSL, named colors) in Tailwind className strings and React inline styles.

**❌ Incorrect:**
```tsx
// Tailwind arbitrary values
<div className="bg-[#ff0000]">Red background</div>
<div className="text-[rgb(255,0,0)]">Red text</div>
<div className="border-[hsl(0,100%,50%)]">Red border</div>
<div className={clsx('bg-[#00ff00]')}>Green background</div>

// Inline styles
<div style={{ color: '#ff0000' }}>Red text</div>
<div style={{ backgroundColor: 'rgb(255,0,0)' }}>Red background</div>
<div style={{ borderColor: 'hsl(0,100%,50%)' }}>Red border</div>
<div style={{ color: 'red' }}>Named color</div>
```

**✅ Correct:**
```tsx
// Tailwind semantic tokens
<div className="bg-danger">Red background</div>
<div className="text-danger">Red text</div>
<div className="border-danger">Red border</div>
<div className={clsx('bg-success')}>Green background</div>

// Inline styles with CSS variables
<div style={{ color: 'var(--color-danger)' }}>Red text</div>
<div style={{ backgroundColor: 'var(--color-primary)' }}>Primary background</div>

// Inline styles with useThemeColors hook
const themeColors = useThemeColors();
<div style={{ color: themeColors.danger }}>Red text</div>

// Allowed special values
<div style={{ color: 'transparent' }}>Transparent</div>
<div style={{ color: 'currentColor' }}>Current color</div>
<div style={{ color: 'inherit' }}>Inherit</div>
```

**Disabling the rule for specific cases:**
```tsx
// For legitimate use cases (e.g., dynamic colors from API):
// eslint-disable-next-line lab/no-hardcoded-colors
<div style={{ color: dynamicColorFromAPI }}>API color</div>

/* eslint-disable lab/no-hardcoded-colors */
// Multiple lines that need to be disabled
<Chart colors={['#ff0000', '#00ff00', '#0000ff']} />
/* eslint-enable lab/no-hardcoded-colors */
```

### `lab/no-primitive-color-scales`

Bans direct usage of primitive color scales in Tailwind className strings.

**❌ Incorrect:**
```tsx
<div className="bg-terracotta-500">Terracotta background</div>
<div className="text-sand-600">Sand text</div>
<div className="border-neutral-700">Neutral border</div>
<div className="bg-aurora-cyan-400">Aurora background</div>
<div className={clsx('text-terracotta-300')}>Terracotta text</div>
```

**✅ Correct:**
```tsx
<div className="bg-primary">Primary background</div>
<div className="text-foreground">Foreground text</div>
<div className="border-border">Border</div>
<div className="bg-accent">Accent background</div>
<div className={clsx('text-muted')}>Muted text</div>
```

## Why These Rules?

1. **Single Source of Truth**: All colors are defined in `src/index.css`, making it easy to maintain consistent theming
2. **Theme Switching**: Semantic tokens automatically adapt when switching between light, dark, and star themes
3. **Future-Proof**: Changing brand colors only requires updating `src/index.css`, not hunting through the codebase
4. **Accessibility**: Semantic tokens ensure proper contrast ratios across all themes
5. **Developer Experience**: Clear, meaningful names (`primary`, `danger`) instead of arbitrary numbers (`terracotta-500`)

## Using Colors in Charts

For chart components (ECharts, etc.), use the `useThemeColors()` hook:

```tsx
import { useThemeColors } from '@/hooks/useThemeColors';

export function MyChart() {
  const themeColors = useThemeColors();

  const option = {
    backgroundColor: themeColors.background,
    textStyle: { color: themeColors.foreground },
    series: [{
      itemStyle: { color: themeColors.primary }
    }]
  };

  return <ReactECharts option={option} />;
}
```

## Configuration

These rules are configured in `eslint.config.js`:

```js
{
  plugins: {
    lab: customRules,
  },
  rules: {
    'lab/validate-route-images': 'error',
    'lab/no-hardcoded-colors': 'error',
    'lab/no-primitive-color-scales': 'error',
  },
}
```

## Exceptions

The only place where primitive color scales should be used is in `src/index.css` when defining the semantic tokens:

```css
@layer base {
  :root {
    --color-primary: theme('colors.terracotta.500'); /* ✅ OK - defining semantic token */
    --color-background: theme('colors.sand.50'); /* ✅ OK - defining semantic token */
  }
}
```

## Disabling Rules

You can disable rules for specific lines or blocks using ESLint comments:

```tsx
// Disable for next line only
// eslint-disable-next-line lab/no-hardcoded-colors
<div style={{ color: '#ff0000' }}>Specific use case</div>

// Disable for entire block
/* eslint-disable lab/no-hardcoded-colors */
<Chart colors={apiColors} /> // Colors from external API
/* eslint-enable lab/no-hardcoded-colors */

// Disable both rules
// eslint-disable-next-line lab/no-hardcoded-colors, lab/no-primitive-color-scales
<div className="bg-[#ff0000] text-terracotta-500">Legacy code</div>
```

**When to disable:**
- Dynamic colors from external APIs or user input
- Third-party library requirements
- Data visualization with specific color requirements
- Legacy code during migration (temporary only)

## Testing

To test these rules, create a file with violations and run:

```bash
pnpm eslint path/to/file.tsx
```

Example violations:
- `className="bg-[#ff0000]"` → triggers `lab/no-hardcoded-colors`
- `style={{ color: '#ff0000' }}` → triggers `lab/no-hardcoded-colors`
- `className="bg-terracotta-500"` → triggers `lab/no-primitive-color-scales`
