# Lab

## Commands

```bash
pnpm dev
pnpm lint
pnpm test
pnpm build
pnpm storybook
```

## Libraries

- pnpm v10
- node v22
- vite v7
- react v19
- typescript v5
- tailwindcss v4
- @tanstack/react-query v5
- @tanstack/router-plugin v1
- zod v4
- heroicons v2
- headlessui v2
- storybook v9
- react-hook-form v7
- echarts v6
- echarts-for-react v3
- echarts-gl v2

## Project Structure

```bash
vite.config.ts                        # Vite configuration
package.json                          # Dependencies and scripts
public/                               # Public assets
.storybook/                           # Storybook configuration
src/
  routes/                             # Route definitions using TanStack Router
    __root.tsx                        # Root layout with sidebar, providers, navigation
    index.tsx                         # "/" - Landing page route
    [section].tsx                     # Layout routes for sections (optional)
    [section]/                        # Section-specific routes
      index.tsx                       # Section list page
      $[param].tsx                    # Dynamic routes (e.g., $id.tsx)
      [route-name].tsx                # Named routes within section
    experiments/                      # Main route directory - 95% of new routes go here
      index.tsx                       # Experiments list
      [experiment-name].tsx           # Individual experiment routes (most development happens here)

  pages/                              # Page components (actual UI implementation)
    IndexPage.tsx                     # Landing page component
    experiments/                      # Main page directory - 95% of new pages go here
      IndexPage.tsx                   # Experiments list page
      index.ts                        # Barrel exports
      [experiment-name]/              # Individual experiment pages (most development happens here)
        IndexPage.tsx
        index.tsx
        components/                   # Page-specific components (optional)
          [ComponentName]/
        hooks/                        # Page-specific hooks (optional)
          use[HookName].ts
        contexts/                     # Page-specific contexts (optional)
          [ContextName].tsx
        providers/                    # Page-specific providers (optional)
          [ProviderName].tsx
    [other-section]/                  # Other page sections (rarely used)
      IndexPage.tsx                   # Section list/index page
      DetailPage.tsx                  # Detail page (if applicable)
      index.ts                        # Barrel exports
      components/                     # Page-specific components (optional)
      hooks/                          # Page-specific hooks (optional)
      contexts/                       # Page-specific contexts (optional)
      providers/                      # Page-specific providers (optional)

  components/                         # Core, app-wide reusable UI components
    [Category]/                       # Component category folder
      [ComponentName]/                # Individual component folder
        [ComponentName].tsx           # Component implementation
        [ComponentName].test.tsx      # Vitest tests
        [ComponentName].types.ts      # TypeScript types (optional)
        [ComponentName].stories.tsx   # Storybook stories (optional)
        index.ts                      # Barrel export

  providers/                          # React Context Providers
    [ProviderName]/                   # e.g., NetworkProvider, ThemeProvider
      [ProviderName].tsx
      index.ts

  contexts/                           # React Context definitions
    [ContextName]/                    # e.g., NetworkContext, ThemeContext
      [ContextName].ts
      [ContextName].types.ts
      index.ts

  hooks/                              # Custom React hooks
    use[HookName]/                    # e.g., useNetwork, useConfig, useBeaconClock
      use[HookName].ts
      use[HookName].test.ts           # Vitest tests
      use[HookName].types.ts          # Optional: for complex hooks
      index.ts

  api/                                # Generated API client (do not edit)
    @tanstack/
      react-query.gen.ts              # TanStack Query hooks - USE THIS for all API calls
    [other generated files]           # Auto-generated client, types, schemas, etc.

  utils/                              # Utility functions and helpers
    [UtilName].ts                     # API configuration
    [UtilName].test.ts                # Vitest tests
    index.ts                          # Barrel export

  main.tsx                            # Application entry point
  index.css                           # Global styles and Tailwind config
  routeTree.gen.ts                    # Generated route tree (auto-generated)
  vite-env.d.ts                       # Vite environment types
```

## Architecture Patterns

### Component & State Philosophy

**Core/Shared** (`src/components/`, `src/hooks/`, `src/contexts/`):

- App-wide reusable building blocks
- Generic and configurable
- Work in any context without page logic
- Compose from other core items when logical
- Core components include Storybook stories

**Page-Scoped** (`src/pages/[section]/components|hooks|contexts|providers/`):

- Used within specific page/section only
- Compose/extend core items for page needs
- Contain page-specific business logic
- Specialized for page requirements
- Keep complex page state isolated

### Core Component Categories

Current categories in `src/components/`:

- **Charts**: Data visualization (Globe, Line, Map)
- **DataDisplay**: Data presentation (Stats)
- **Elements**: Basic UI building blocks (Badge, Button, ButtonGroup)
- **Ethereum**: Blockchain-specific (ClientLogo, NetworkIcon, NetworkSelect)
- **Feedback**: User feedback (Alert)
- **Forms**: Form controls (Checkbox, CheckboxGroup, InputGroup, RadioGroup, SelectMenu, Toggle)
- **Layout**: Structure and layout (Card, Container, Divider, Header, LoadingContainer, Sidebar, ThemeToggle)
- **Lists**: Tables and lists (Table)
- **Navigation**: Navigation elements (ProgressBar, ProgressSteps)
- **Overlays**: Modals and overlays (ConfigGate, FatalError)

### Page Sections

Current page sections in `src/pages/`:

- **experiments**: Main section for experiment pages - most new pages will be added here
  - Current experiments: block-production-flow, slot-view, networks, geographical-checklist, fork-readiness, locally-built-blocks
  - Future experiments should follow the same pattern
- **contributors**: Contributor list and detail pages with page-scoped components

### Standard Component Structure

```
ComponentName/
  ComponentName.tsx                     # Main implementation
  ComponentName.test.tsx                # Vitest tests
  ComponentName.types.ts                # TypeScript types (when needed)
  ComponentName.stories.tsx             # Storybook stories
  index.ts                              # Barrel export
```

### Routing & Pages

- Route files in `src/routes/` - thin TanStack Router definitions
- Page components in `src/pages/` - UI implementations
- Page-scoped components in `pages/[section]/components/`
- Dynamic routes use `$param.tsx` syntax
- Always barrel export via `index.tsx`

### State Management

- Contexts in `src/contexts/` with types
- Providers in `src/providers/` wrap app/features
- Hooks in `src/hooks/` for context access and shared logic

### API Integration

- Auto-generated code in `src/api/` - do not edit
- Use hooks from `@/api/@tanstack/react-query.gen.ts`
- Hooks handle fetching, caching, state management

## Development Guidelines

### Quick Reference

- **New experiment**: Route in `src/routes/experiments/`, page in `src/pages/experiments/[name]/`
- **Experiment image**: `public/images/experiments/[name].png` for social sharing
- **Skeleton component**: `src/pages/[section]/components/[PageName]Skeleton/` using `LoadingContainer`
- **Other route**: Route in `src/routes/[section]/`, page in `src/pages/[section]/`
- **Core component**: `src/components/[category]/[ComponentName]/` - reusable, generic
- **Page-scoped component**: `src/pages/[section]/components/[ComponentName]/` - page-specific
- **Core hook**: `src/hooks/use[Name]/` - app-wide logic
- **Page-scoped hook**: `src/pages/[section]/hooks/use[Name].ts` - page-specific logic
- **Utility function**: `src/utils/[name].ts` - helper functions
- **Core context**: `src/contexts/` with provider in `src/providers/`
- **Page-scoped context**: `src/pages/[section]/contexts/` with local provider

### Placement Decision

**Components/Hooks/Contexts:**

- Used across pages → Core (`src/components/`, `src/hooks/`, `src/contexts/`)
- Page-specific logic → Page-scoped (`src/pages/[section]/components|hooks|contexts/`)
- Complex page state → Page-scoped providers

### Best Practices

- Storybook stories for all core components
- Keep core components generic and reusable
- Compose core components in page-scoped components
- Use `pnpm storybook` with Playwright MCP for iteration
- Write Vitest tests for all components, hooks, and utilities
- Use JSDoc style comments for functions, components, hooks, and complex types
- Use Tailwind v4 classes
- Use semantic color tokens from `src/index.css` theme
- Use TanStack Router for navigation
- Use `@/api/@tanstack/react-query.gen.ts` hooks for API calls
- Use path aliases over relative imports
- Run `pnpm lint` and `pnpm build` before committing
- Use `clsx` for conditional classes

### Naming Conventions

- **Routes** (`.tsx`): PascalCase - `index.tsx`, `users.tsx`, `users/$userId.tsx`
- **Pages** (`.tsx`, `.ts`): PascalCase - `UsersPage.tsx`, `UserTable.tsx`
- **Components** (`.tsx`, `.ts`): PascalCase - `NetworkSelector.tsx`, `SelectMenu.tsx`
- **Providers** (`.tsx`): PascalCase - `NetworkProvider.tsx` (in `src/providers/`)
- **Context** (`.ts`): PascalCase - `NetworkContext.ts` (in `src/contexts/`)
- **Hooks** (`.ts`): camelCase starting with `use` - `useNetwork.ts`, `useConfig.ts`
- **Utils** (`.ts`): kebab-case - `api-config.ts`, `auth-service.ts`
- **Tests** (`.test.ts(x)`): Match source file name - `useNetwork.test.ts`, `colour.test.ts`

### Testing

- **Required for**: All hooks, utilities, and core components
- **Framework**: Vitest with React Testing Library for components
- **Location**: Co-located with source files (`.test.ts` or `.test.tsx`)
- **Coverage**: Aim for high coverage of business logic and edge cases
- **Naming**: Test files match source files with `.test.ts(x)` extension

## Loading States

### Shimmer/Skeleton Loading Pattern

- Use `LoadingContainer` from `src/components/Layout/LoadingContainer/` as base
- Create page-specific skeletons: `[PageName]Skeleton` or `[ComponentName]Skeleton`
- Place in `pages/[section]/components/` alongside other page components
- Show skeleton UI that matches actual content structure

### Best Practices

- Match loading skeleton to actual content layout
- Don't overuse - only for significant data fetches
- Keep loading states brief and informative
- Consider error states alongside loading

## Form Management

### Form Architecture

- One FormProvider per page
- Reusable filter components across experiments
- Form state and handlers in page component

### Implementation

```tsx
// In experiment page (e.g., pages/experiments/[name]/IndexPage.tsx)
const methods = useForm<FormData>({ defaultValues });
<FormProvider {...methods}>
  <FilterForm />  // Reusable core component
  <CustomFields /> // Page-specific fields
</FormProvider>

// In reusable filter component (e.g., components/Forms/FilterForm/)
const { register, watch } = useFormContext(); // Access parent form
```

### Best Practices

- Single `useForm()` per page via FormProvider
- Child components use `useFormContext()`
- Validation schemas with types in `FormData.types.ts`
- Generic filters in `components/Forms/`, page-specific in `pages/[section]/components/`

## Head Meta & SEO

### Meta Hierarchy

- Base meta tags defined in `src/routes/__root.tsx`
- Routes override with `head: () => ({ meta: [...] })`
- Child routes inherit and can extend parent meta
- **No variables in head**: Only use literals and `import.meta.env.VITE_*` (processed by build plugin)

### Experiment Feature Images

**Standard**: Each experiment should have a feature image at:

```
public/images/experiments/[experiment-name].png
```

**Route Implementation**:

```tsx
// In routes/experiments/[experiment-name].tsx
head: () => ({
  meta: [
    { title: `Experiment Name | ${import.meta.env.VITE_BASE_TITLE}` },
    { name: 'description', content: 'Unique description of what this experiment does' },
    { property: 'og:image', content: '/images/experiments/[experiment-name].png' },
    { property: 'og:description', content: 'Unique description of what this experiment does' },
    { name: 'twitter:image', content: '/images/experiments/[experiment-name].png' },
    { name: 'twitter:description', content: 'Unique description of what this experiment does' },
  ],
})
```

### Best Practices

- Always include experiment-specific title
- Write unique description for each experiment
- Update all three descriptions (meta, og:description, twitter:description)
- Provide unique feature image per experiment
- Set og:image and twitter:image for social sharing

## Theming

Theme is defined in `src/index.css` using Tailwind CSS v4's `@theme inline` directive with semantic color tokens.

**Available semantic colors:**

- `primary`, `secondary`, `accent` - Brand colors (cyan/sky palette)
- `background`, `surface`, `foreground`, `muted`, `border` - UI colors
- `success`, `warning`, `error` - State colors

**Usage:** `bg-primary`, `text-foreground`, `border-border`, etc.

**Dark mode:** Automatically switches when `.dark` class is on `<html>` element.

**To modify theme:** Edit `@layer base` in `src/index.css` - change `:root` for light mode or `html.dark` for dark mode.

## Storybook

- when creating a new story, add the following decorators:

```tsx
decorators: [
  Story => (
    <div className="min-w-[600px] rounded-sm bg-surface p-6">
      <Story />
    </div>
  ),
],
```

- When choosing a title, use the full nested path to the story, e.g. `Components/Layout/Container`
