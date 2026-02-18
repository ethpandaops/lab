# Theming

Theme uses a **two-tier color architecture** defined in `src/index.css`:

**Tier 1:** Primitive scales (terracotta, sand, neutral) with 50-950 shades
**Tier 2:** Semantic tokens that reference Tier 1

## Semantic Tokens

- `primary`, `secondary`, `accent` - Brand colors
- `background`, `surface`, `foreground`, `muted`, `border` - UI colors
- `success`, `warning`, `danger` - State colors

## Usage

```tsx
// Always use semantic tokens
className="bg-primary text-foreground border-border"
className="hover:bg-accent text-muted"

// Programmatic access
import { useThemeColors } from '@/hooks/useThemeColors';
const colors = useThemeColors(); // { primary, background, ... }
```

**Never use primitive scales directly** (`bg-terracotta-500`, `bg-sand-100`) - only semantic tokens.

**Modify theme:** Edit semantic mappings in `src/index.css` at `@layer base` (`:root` for light, `html.dark` for dark).
