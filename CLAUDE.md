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
  images/
    [section]/                        # Section-specific images
      [page-name].png                 # Feature images for social sharing
.storybook/                           # Storybook configuration
src/
  routes/                             # Route definitions using TanStack Router
    __root.tsx                        # Root layout with sidebar, providers, navigation
    index.tsx                         # "/" - Landing page route
    [section].tsx                     # Layout routes for sections
    [section]/                        # Section-specific routes
      [page-name].tsx                 # Page route
      [page-name]/                    # Nested page routes
        index.tsx                     # Default nested route
        $param.tsx                    # Dynamic parameter route

  pages/                              # Page components (actual UI implementation)
    IndexPage.tsx                     # Landing page component
    [section]/                        # Section-specific pages
      [page-name]/                    # Individual page folder
        IndexPage.tsx                 # Main page component
        [OtherPage].tsx               # Additional page components (e.g., DetailPage)
        index.ts                      # Barrel export
        components/                   # Page-specific components
          [ComponentName]/
            [ComponentName].tsx
            [ComponentName].test.tsx
            index.ts
        hooks/                        # Page-specific hooks (optional)
          use[HookName].ts
        contexts/                     # Page-specific contexts (optional)
          [ContextName].ts
        providers/                    # Page-specific providers (optional)
          [ProviderName].tsx

  components/                         # Core, app-wide reusable UI components
    [Category]/                       # Component category folder
      [ComponentName]/                # Individual component folder
        [ComponentName].tsx           # Component implementation
        [ComponentName].test.tsx      # Vitest tests
        [ComponentName].types.ts      # TypeScript types (optional)
        [ComponentName].stories.tsx   # Storybook stories
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
    [util-name].ts                    # Utility functions
    [util-name].test.ts               # Vitest tests
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

Page sections in `src/pages/`:

- **ethereum**: Ethereum-focused blockchain visualizations and data
- **xatu**: Xatu-specific data, metrics, and contributor insights
- **experiments**: Legacy experiments index page (shows all experiments with links to new structure)

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

- **New page**: Route in `src/routes/[section]/`, page in `src/pages/[section]/[page-name]/`
- **Feature image**: `public/images/[section]/[page-name].png` for social sharing
- **Skeleton component**: `src/pages/[section]/[page-name]/components/[PageName]Skeleton/` using `LoadingContainer`
- **Core component**: `src/components/[Category]/[ComponentName]/` - reusable, generic
- **Page-scoped component**: `src/pages/[section]/[page-name]/components/[ComponentName]/` - page-specific
- **Core hook**: `src/hooks/use[HookName]/` - app-wide logic
- **Page-scoped hook**: `src/pages/[section]/[page-name]/hooks/use[HookName].ts` - page-specific logic
- **Utility function**: `src/utils/[util-name].ts` - helper functions
- **Core context**: `src/contexts/[ContextName]/` with provider in `src/providers/[ProviderName]/`
- **Page-scoped context**: `src/pages/[section]/[page-name]/contexts/[ContextName].ts` with local provider

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
- **Framework**:
  - Vitest for hooks and utilities
  - Storybook interactions for components
- **Location**: Co-located with source files (`.test.ts` or `.test.tsx` for Vitest, `.stories.tsx` for Storybook)
- **Coverage**: Aim for high coverage of business logic and edge cases
- **Naming**: Test files match source files with `.test.ts(x)` or `.stories.tsx` extension

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
- Reusable filter components across pages
- Form state and handlers in page component
- **Always use Zod for validation** - provides type-safe schemas and runtime validation

### Implementation

```tsx
// In page component (e.g., pages/[section]/[page-name]/IndexPage.tsx)
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Define Zod schema
const formSchema = z.object({
  email: z.string().email('Invalid email'),
  username: z.string().min(3, 'Min 3 characters'),
});

type FormData = z.infer<typeof formSchema>;

// Manual Zod resolver (no need for @hookform/resolvers)
const methods = useForm<FormData>({
  defaultValues,
  resolver: async (data) => {
    try {
      const validData = formSchema.parse(data);
      return { values: validData, errors: {} };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          values: {},
          errors: error.issues.reduce((acc, issue) => {
            const path = issue.path[0] as string;
            acc[path] = { type: 'validation', message: issue.message };
            return acc;
          }, {} as Record<string, { type: string; message: string }>),
        };
      }
      return { values: {}, errors: {} };
    }
  },
});

<FormProvider {...methods}>
  <FilterForm />  // Reusable core component
  <CustomFields /> // Page-specific fields
</FormProvider>

// In reusable filter component (e.g., components/Forms/[FilterForm]/)
const { register, watch } = useFormContext(); // Access parent form
```

### Best Practices

- **Always use Zod with react-hook-form** - type-safe validation
- Use manual Zod resolver (shown above) - no need for `@hookform/resolvers` package
- Define schema with `z.object()` and infer types with `z.infer<typeof schema>`
- Single `useForm()` per page via FormProvider
- Child components use `useFormContext()`
- Validation schemas with types in `FormData.types.ts`
- Generic filters in `components/Forms/`, page-specific in `pages/[section]/[page-name]/components/`

## Head Meta & SEO

### Meta Hierarchy

- Base meta tags defined in `src/routes/__root.tsx`
- Routes override with `head: () => ({ meta: [...] })`
- Child routes inherit and can extend parent meta
- **No variables in head**: Only use literals and `import.meta.env.VITE_*` (processed by build plugin)

### Page Feature Images

**Standard**: Each page should have a feature image at:

```
public/images/[section]/[page-name].png
```

**Route Implementation**:

```tsx
// In routes/[section]/[page-name].tsx
head: () => ({
  meta: [
    { title: `Page Name | ${import.meta.env.VITE_BASE_TITLE}` },
    { name: 'description', content: 'Unique description of what this page does' },
    { property: 'og:image', content: '/images/[section]/[page-name].png' },
    { property: 'og:description', content: 'Unique description of what this page does' },
    { name: 'twitter:image', content: '/images/[section]/[page-name].png' },
    { name: 'twitter:description', content: 'Unique description of what this page does' },
  ],
})
```

### Best Practices

- Always include page-specific title
- Write unique description for each page
- Update all three descriptions (meta, og:description, twitter:description)
- Provide unique feature image per page
- Set og:image and twitter:image for social sharing

## Theming

Theme uses a **two-tier color architecture** defined in `src/index.css`:

**Tier 1:** Primitive scales (terracotta, sand, neutral) with 50-950 shades
**Tier 2:** Semantic tokens that reference Tier 1

**Available semantic tokens:**
- `primary`, `secondary`, `accent` - Brand colors
- `background`, `surface`, `foreground`, `muted`, `border` - UI colors
- `success`, `warning`, `danger` - State colors

**Usage in components:**
```tsx
// ✅ Always use semantic tokens
className="bg-primary text-foreground border-border"
className="hover:bg-accent text-muted"

// ✅ Programmatic access
import { useThemeColors } from '@/hooks/useThemeColors';
const colors = useThemeColors(); // { primary, background, ... }
```

**Never use primitive scales directly** (`bg-terracotta-500`, `bg-sand-100`) - only semantic tokens.

**Modify theme:** Edit semantic mappings in `src/index.css` at `@layer base` (`:root` for light, `html.dark` for dark).

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
