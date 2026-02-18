# Lab

## Commands

```bash
pnpm dev                    # Dev server proxying to local backend (localhost:8080)
BACKEND=production pnpm dev # Dev server proxying to production (lab.ethpandaops.io)
pnpm lint
pnpm test
pnpm build
pnpm storybook
```

The `BACKEND` env var controls the API proxy target. Values: `local` (default), `production`, or any custom URL.

## Libraries

- pnpm v10, node v24, vite v7, react v19, typescript v5
- tailwindcss v4, headlessui v2, heroicons v2
- @tanstack/react-query v5, @tanstack/router-plugin v1
- zod v4, react-hook-form v7, clsx
- echarts v6, echarts-for-react v3, echarts-gl v2
- storybook v10, vitest v4

## Project Structure

```bash
src/
  routes/                             # Thin TanStack Router definitions
    __root.tsx                        # Root layout with sidebar, providers, navigation
    index.tsx                         # "/" - Landing page route
    [section].tsx                     # Layout routes (ethereum, xatu, experiments)
    [section]/                        # Section-specific routes
      [page-name].tsx                 # Page route
      [page-name]/                    # Nested/sub-section routes
        index.tsx                     # Default nested route
        $param.tsx                    # Dynamic parameter route

  pages/                              # Page components (actual UI implementation)
    home/                             # Landing page
    [section]/                        # Section-specific pages
      [page-name]/                    # Individual page folder
        IndexPage.tsx                 # Main page component
        IndexPage.types.ts            # Search param types, page-specific types
        [OtherPage].tsx               # Additional pages (e.g., DetailPage)
        index.ts                      # Barrel export
        components/                   # Page-specific components
        hooks/                        # Page-specific hooks
        contexts/                     # Page-specific contexts
        providers/                    # Page-specific providers
        utils/                        # Page-specific utilities
        constants.ts                  # Page-specific constants

  components/                         # Core, app-wide reusable UI components
    [Category]/[ComponentName]/       # Category → Component folder
      [ComponentName].tsx             # Implementation
      [ComponentName].test.tsx        # Vitest tests
      [ComponentName].types.ts        # TypeScript types (optional)
      [ComponentName].stories.tsx     # Storybook stories
      index.ts                        # Barrel export

  providers/                          # React Context Providers
  contexts/                           # React Context definitions (with .types.ts)
  hooks/                              # Custom React hooks (with tests)
  api/                                # Generated API client (do not edit)
    @tanstack/react-query.gen.ts      # TanStack Query hooks - USE THIS for all API calls
  utils/                              # Utility functions and helpers
  index.css                           # Global styles and Tailwind theme config
```

## Architecture

### Component & State Philosophy

**Core/Shared** (`src/components/`, `src/hooks/`, `src/contexts/`):
- App-wide reusable building blocks — generic and configurable
- Work in any context without page logic
- Core components include Storybook stories

**Page-Scoped** (`src/pages/[section]/[page-name]/components|hooks|contexts|providers|utils/`):
- Used within specific page/section only
- Compose/extend core items for page needs
- Contain page-specific business logic

**Placement rule:** Used across pages → Core. Page-specific → Page-scoped.

### Core Component Categories

- **Charts**: Bar, BoxPlot, Donut, FlameGraph, GasFlowDiagram, Gauge, Globe, GridHeatmap, Heatmap, Line, Map, Map2D, MultiLine, Radar, ScatterAndLine, Sparkline, StackedBar
- **DataDisplay**: CardChain, GasTooltip, MiniStat, Stats, Timestamp
- **DataTable**: DataTable (compound component with sub-components)
- **DateTimePickers**: DatePicker
- **Elements**: Avatar, Badge, Button, ButtonGroup, CopyToClipboard, Dropdown, Icons, TimezoneToggle
- **Ethereum**: ~32 blockchain-specific components (ClientLogo, Entity, Epoch, ForkLabel, NetworkIcon, NetworkSelect, Slot, SlotTimeline, etc.)
- **Feedback**: Alert, InfoBox
- **Forms**: Checkbox, CheckboxGroup, Input, RadioGroup, RangeInput, SelectMenu, TagInput, Toggle
- **Layout**: Card, Container, Disclosure, Divider, Header, ListContainer, LoadingContainer, PopoutCard, ScrollArea, Sidebar, ThemeToggle
- **Lists**: ScrollingTimeline, Table
- **Navigation**: Breadcrumb, ProgressBar, ProgressSteps, ScrollableTabs, ScrollAnchor, Tab
- **Overlays**: ConfigGate, Dialog, FatalError, FeatureGate, NotFound, Notification, Popover

### Page Sections

- **home**: Landing page
- **ethereum**: Blockchain visualizations (sub-sections: consensus, contracts, data-availability, entities, epochs, execution, forks, slots, validators)
- **xatu**: Xatu data, metrics, contributor insights
- **experiments**: Legacy experiments index

Route directories also include `beacon/` and `xatu-data/` alongside the sections above.

## Development Guidelines

### Quick Reference

- **New page**: Route in `src/routes/[section]/`, page in `src/pages/[section]/[page-name]/`
- **Feature image**: `public/images/[section]/[page-name].png` for social sharing
- **Skeleton component**: `src/pages/[section]/[page-name]/components/[PageName]Skeleton/` using `LoadingContainer`
- **Core component**: `src/components/[Category]/[ComponentName]/`
- **Page-scoped component**: `src/pages/[section]/[page-name]/components/[ComponentName]/`
- **Core hook**: `src/hooks/use[HookName]/`
- **Page-scoped hook**: `src/pages/[section]/[page-name]/hooks/use[HookName].ts`
- **Utility function**: `src/utils/[util-name].ts`
- **Core context**: `src/contexts/[ContextName]/` with provider in `src/providers/[ProviderName]/`
- **Page-scoped context**: `src/pages/[section]/[page-name]/contexts/[ContextName].ts` with local provider

### Best Practices

- Storybook stories for all core components
- Write Vitest tests for all components, hooks, and utilities
- Use JSDoc style comments for functions, components, hooks, and complex types
- Use Tailwind v4 classes with semantic color tokens from `src/index.css` theme
- Use `@/api/@tanstack/react-query.gen.ts` hooks for API calls
- Use path aliases (`@/`) over relative imports
- Use `clsx` for conditional classes
- Run `pnpm lint` and `pnpm build` before committing
- React `useMemo`/`memo` should only be used for genuinely expensive calculations

### Naming Conventions

- **Routes** (`.tsx`): lowercase — `index.tsx`, `slots.tsx`, `slots/$slot.tsx`
- **Pages** (`.tsx`): PascalCase — `IndexPage.tsx`, `DetailPage.tsx`
- **Components** (`.tsx`): PascalCase — `NetworkSelector.tsx`, `SelectMenu.tsx`
- **Providers/Contexts** (`.tsx`/`.ts`): PascalCase — `NetworkProvider.tsx`, `NetworkContext.ts`
- **Hooks** (`.ts`): camelCase with `use` prefix — `useNetwork.ts`, `useConfig.ts`
- **Utils** (`.ts`): kebab-case — `api-config.ts`, `format-time.ts`
- **Tests**: Match source file — `useNetwork.test.ts`, `Button.test.tsx`
- **Barrel exports**: Always `.ts` — `index.ts`

### Testing

- **Required for**: All hooks, utilities, and core components
- **Vitest** for hooks and utilities, **Storybook interactions** for components
- **Location**: Co-located with source files (`.test.ts(x)` for Vitest, `.stories.tsx` for Storybook)

### Loading States

- Use `LoadingContainer` from `src/components/Layout/LoadingContainer/` as base
- Create page-specific skeletons: `[PageName]Skeleton` or `[ComponentName]Skeleton`
- Place in `pages/[section]/[page-name]/components/` alongside other page components
- Show skeleton UI that matches actual content structure

## Slot & Epoch Display

**Never use locale formatting** (no commas) — slots/epochs are blockchain identifiers.

**UI displays** (tables, cards):

```tsx
import { Slot } from '@/components/Ethereum/Slot';
import { Epoch } from '@/components/Ethereum/Epoch';

<Slot slot={1234567} />        // Linked to detail page
<Epoch epoch={12345} noLink /> // Plain text
```

**String contexts** (titles, tooltips):

```tsx
import { formatSlot, formatEpoch } from '@/utils';
{formatSlot(slot)}   // "1234567"
{formatEpoch(epoch)} // "12345"
```

## Additional Rules

Detailed standards for specific topics are in `.claude/rules/`:

- [Charts](.claude/rules/charts.md) — Visual standards, axis formatting, grid padding, component architecture
- [Forms](.claude/rules/forms.md) — Zod search param validation, react-hook-form patterns
- [SEO](.claude/rules/seo.md) — Head meta hierarchy, feature images, route implementation
- [Theming](.claude/rules/theming.md) — Two-tier color architecture, semantic tokens
- [Storybook](.claude/rules/storybook.md) — Decorator pattern, story title convention
