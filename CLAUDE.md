# Lab

## Commands

```bash
pnpm dev                    # Dev server proxying to local backend (localhost:8080)
BACKEND=production pnpm dev # Dev server proxying to production (lab.ethpandaops.io)
pnpm lint                   # ESLint; warnings fail too
pnpm typecheck              # tsc -b over the app, the tests and stories, and the config files
pnpm format:check           # Prettier over the whole repo; pnpm format rewrites
pnpm knip                   # Unused files, exports and dependencies
pnpm test                   # Unit tests (jsdom), then every story in Chromium under each theme
pnpm test:unit              # jsdom only; pnpm test:storybook for stories only
pnpm test:coverage          # Unit tests with a v8 coverage report in coverage/
pnpm build
pnpm storybook
```

Story tests need Chromium once: `pnpm exec playwright install chromium`.

The `BACKEND` env var controls the API proxy target. Values: `local` (default), `production`, or any custom URL.

## Libraries

- pnpm v12, node v26, vite v7, react v19, typescript v5
- tailwindcss v4, headlessui v2, heroicons v2
- @tanstack/react-query v5, @tanstack/router-plugin v1
- zod v4, react-hook-form v7, clsx
- echarts v6, echarts-for-react v3, echarts-gl v2
- storybook v10, vitest v5, msw v3

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
  api/                                # Generated CBT API client (do not edit)
    @tanstack/react-query.gen.ts      # TanStack Query options - USE THIS for all API calls
  lab-api/                            # Generated lab-backend client from openapi/lab-backend.yaml (do not edit)
  utils/                              # Utility functions and helpers
  index.css                           # Entry stylesheet: fonts, tokens, utilities, base styles; Tailwind scans src
  styles/                             # tokens.css (every design token), base.css, utilities.css, token tests
  design-docs/                        # Foundations MDX pages generated from the tokens
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
- Use Tailwind v4 classes with semantic color tokens from `src/styles/tokens.css`
- Read API data through the generated query options (see [Data](#data))
- Import through `@/`, never `../`; lint rejects parent-relative imports
- Use `clsx` for conditional classes
- Run `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm knip` and `pnpm build` before committing
- Test-only code (tests, stories, `src/test-utils`, `src/design-docs`, `src/styles/**/*.ts`) is excluded from `tsconfig.app.json` and type-checked by `tsconfig.test.json`; a new test-only path goes in both

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
- `vitest.config.ts` holds both projects: `unit` (jsdom) and `storybook` (Chromium, once per theme: `storybook:light`, `storybook:dark`, `storybook:star`, each in UTC, `en-US` and reduced motion). Mocks and stubbed globals are restored before every test.
- Unit tests render through `@/test-utils` and mock the API with MSW; fixtures and time come from `@/test-utils` too. See [Tests](.claude/rules/tests.md).
- Vitest caps jsdom at four workers, then runs Storybook with two Chromium pages per theme. The test scripts raise `VITEST_CHROMIUM_GC_DISK_THRESHOLD_GB` so Vitest's Linux workaround collects Chromium garbage after each file.

## Data

- Read server data with `useQuery(<operation>Options(...))` from the generated clients: `@/api/@tanstack/react-query.gen` for the CBT tables, `@/lab-api/@tanstack/react-query.gen` for lab-backend's own routes (config, bounds, downloads, gas profiler). Types come from `@/api` and `@/lab-api`, schemas from their `zod.gen`. Never `fetch` in a component or an effect.
- Actions, such as a download or a simulation, run the generated SDK function or `<operation>Mutation()` through `useMutation`.
- A lab-backend route the UI needs goes into `openapi/lab-backend.yaml`, matching the backend's handler in `internal/api`; `pnpm generate:api` regenerates both clients. The CBT client validates requests and responses against its spec. The lab-backend client doesn't: its spec is written by hand, and a field it gets wrong must not stop the app from loading.
- The generated clients throw the response body, not an `Error`. Read lab-backend's message with `apiErrorMessage` from `@/utils/api-error`.
- `createQueryClient` (`@/utils/query-client`) makes the app's query client; tests and stories use it too, with `{ retry: false }`.
- Read configuration with `useConfig()` and bounds with `useBounds()`, never `window.__CONFIG__` or `window.__BOUNDS__`. lab-backend injects both into the page, and `createQueryClient` seeds the cache with them before the first render.

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

Detailed standards for specific topics are in `.claude/rules/`. Claude Code loads each for the paths in its front matter; other agents read the matching file before editing those files.

- [Charts](.claude/rules/charts.md) — Visual standards, axis formatting, grid padding, component architecture
- [Forms](.claude/rules/forms.md) — Zod search param validation, react-hook-form patterns
- [Loading states](.claude/rules/loading-states.md) — Loading, error, empty and stale states for async data
- [React](.claude/rules/react.md) — Components, hooks and the React Compiler rules lint enforces
- [SEO](.claude/rules/seo.md) — Head meta hierarchy, feature images, route implementation
- [Styling](.claude/rules/styling.md) — Tokens, themes, Tailwind classes, adding a token
- [Storybook](.claude/rules/storybook.md) — Stories as tests, API mocks, decorator pattern, story title convention
- [Tests](.claude/rules/tests.md) — `@/test-utils`, MSW handlers, fixtures and time in unit tests

## Layout

Give every value its own place. Don't run separate values together in one line of text (`5 · 7,638 ETH`, `Head 99% · Target 98%`, a root and a percentage in one cell). Each value gets a label and a slot: a table column, a `<dl>` term and definition, a stat, its own line. If you're reaching for a `·`, `|` or `/` separator, the layout probably needs structure instead.

## Time Ranges

A page's time range applies to everything under it. When a page has a range control (`?t=`, a period selector, date pickers), every stat, chart, card and table column it governs covers that range. Never put a value over some other window (the last 50 epochs, the last 30 days, `now - 6h`) under a selector that says 1y.

Make every value cover the range before reaching for anything else: read a coarser table, or sample evenly across the range when per-slot data is too large, and say so where it's shown ("64 epochs spread across the range"). A second range control for one section is not a fix. If a value truly can't cover the selected range (no table holds it at all), don't quietly swap in a shorter window. Move it out of the range's scope, into its own section or card, and name its window where it's shown: "Last 50 epochs", "Latest day", in the title or the column header. Point-in-time values (current stake, validator count) are the range's end; where it's cheap, show how they changed over the range.

Scope the control to what it drives: if only part of the page follows the range, put the control on that section, not above the whole page.

## Clients

Every client looks the same everywhere. Wherever a client appears — table cell, stat, badge, tooltip, chart legend, dropdown — render its logo (`ClientLogo`) beside the name, and draw any mark that stands for it (series, bar, dot, swatch) in its colour from `getClientColor` (`getExecutionClientColor` / `getConsensusClientColor` when the layer is known). Never colour a client from a chart palette or by index.

Chart legends already do this for any series named after a known client (`isKnownClient`): `MultiLineChart` and `StackedBar` render the logo, and native ECharts legends get it through `legendItem` in `chartChrome.ts`. Name client series by the client (`reth`, not `Reth P50`) so they're recognised, and pass `color: getClientColor(name)`.

Angles are not clients. Where Lab's views of adoption are compared side by side (proposed blocks, P2P peers, nodes in the ENR crawl, Xatu nodes), a series or column header that represents an angle takes its fixed colour from `ANGLE_COLORS` in `src/pages/ethereum/clients/utils/angle-colors.ts`, even when every series is about one client. Per-client rows keep their client colours: in a table of clients, each row's bars are drawn in that client's colour, and only the column headers carry the angle swatches.

## Copy

Every user-facing string (titles, descriptions, hints, tooltips, empty states, toasts, button text) must pass the clean-copy skill:

@.claude/skills/clean-copy/SKILL.md
