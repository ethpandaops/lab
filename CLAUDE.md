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
      index.tsx                       # Barrel exports
      [experiment-name]/              # Individual experiment pages (most development happens here)
        IndexPage.tsx
        index.tsx
        components/                   # Experiment-specific components (optional)
          [ComponentName]/
    [other-section]/                  # Other page sections (rarely used)
      IndexPage.tsx                   # Section list/index page
      DetailPage.tsx                  # Detail page (if applicable)
      index.tsx                       # Barrel exports
      components/                     # Page-scoped components (optional)
        [ComponentName]/              # Same structure as core components

  components/                         # Core, app-wide reusable UI components
    [Category]/                       # Component category folder
      [ComponentName]/                # Individual component folder
        [ComponentName].tsx           # Component implementation
        [ComponentName].types.ts      # TypeScript types (optional)
        [ComponentName].stories.tsx   # Storybook stories (optional)
        index.ts                      # Barrel export

  providers/                          # React Context Providers
    [ProviderName]/                   # e.g., NetworkProvider, ThemeProvider
      [ProviderName].tsx
      index.tsx

  contexts/                           # React Context definitions
    [ContextName]/                    # e.g., NetworkContext, ThemeContext
      [ContextName].ts
      [ContextName].types.ts
      index.ts

  hooks/                              # Custom React hooks
    use[HookName]/                    # e.g., useNetwork, useConfig, useBeaconClock
      use[HookName].ts
      use[HookName].types.ts          # Optional: for complex hooks
      index.ts

  api/                                # Generated API client (do not edit)
    @tanstack/
      react-query.gen.ts              # TanStack Query hooks - USE THIS for all API calls
    [other generated files]           # Auto-generated client, types, schemas, etc.

  utils/                              # Utility functions and helpers
    api-config.ts                     # API configuration
    colour.ts                         # Color utilities
    index.ts                          # Utility exports

  main.tsx                            # Application entry point
  index.css                           # Global styles and Tailwind config
  routeTree.gen.ts                    # Generated route tree (auto-generated)
  vite-env.d.ts                       # Vite environment types
```

## Architecture Patterns

### Component Philosophy
**Core Components** (`src/components/`):
- App-wide, reusable UI building blocks
- Generic and configurable for multiple use cases
- Should work in any context without page-specific logic
- Compose from other core components when logical (e.g., ButtonGroup uses Button, Divider uses Button/ButtonGroup)
- Always have Storybook stories for documentation

**Page-Scoped Components** (`src/pages/[section]/components/`):
- Only used within a specific page/section
- Often compose multiple core components into page-specific aggregations
- Highly specialized for that page's requirements
- May contain business logic specific to that page

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
  - Current experiments: block-production-flow, live-slots, networks, geographical-checklist, fork-readiness, locally-built-blocks
  - Future experiments should follow the same pattern
- **contributors**: Contributor list and detail pages with page-scoped components

### Standard Component Structure
```
ComponentName/
  ComponentName.tsx                     # Main implementation
  ComponentName.types.ts                # TypeScript types (when needed)
  ComponentName.stories.tsx             # Storybook stories (for components)
  index.ts                              # Barrel export
```

### Routing & Page Pattern
- **Route files** (`src/routes/`): Thin route definitions using TanStack Router
- **Page components** (`src/pages/`): Actual UI implementations
- **Page-scoped components**: Located in `pages/[section]/components/` with same structure as shared components
- **Dynamic routes**: Use `$param.tsx` syntax (e.g., `$id.tsx`)
- **Page exports**: Always use barrel exports via `index.tsx`

### State Management Pattern
- **Contexts** (`src/contexts/`): React Context definitions with types
- **Providers** (`src/providers/`): Context providers that wrap the app/features
- **Hooks** (`src/hooks/`): Custom hooks for accessing context and shared logic

### API Integration
- All API code is auto-generated in `src/api/` (do not manually edit)
- **Always use hooks from `src/api/@tanstack/react-query.gen.ts`** for API calls
- These hooks handle fetching, caching, and state management automatically

## Development Guidelines

### Quick Reference
- **Add new experiment**: Create route in `src/routes/experiments/`, page in `src/pages/experiments/[name]/`
- **Add other route**: Create in `src/routes/[section]/`, reference page from `src/pages/[section]/`
- **Add core component**: Place in `src/components/[category]/[ComponentName]/` (must be reusable, generic)
- **Add page-scoped component**: Place in `src/pages/[section]/components/[ComponentName]/` (page-specific aggregations)
- **Add new hook**: Create in `src/hooks/use[Name]/` with types and barrel export
- **Add context**: Define in `src/contexts/`, implement provider in `src/providers/`

**Component Decision Tree**:
- Will it be used across multiple pages? → Core component (`src/components/`)
- Is it composing core components for a specific page? → Page-scoped (`src/pages/[section]/components/`)
- Does it contain page-specific business logic? → Page-scoped (`src/pages/[section]/components/`)

### Best Practices
- Create Storybook stories for all core components (not needed for page-scoped)
- Keep core components generic and reusable without page-specific logic
- Compose core components in page-scoped components for specialized UI
- Use `pnpm storybook` with Playwright MCP for rapid iteration
- Write tests using Vitest for components and utilities
- Use Tailwind CSS classes for styling (v4 syntax)
- **Always use semantic color tokens from theme in `src/index.css`** (e.g., `bg-primary`, `text-foreground`)
- Use TanStack Router for navigation
- **Always use hooks from `@/api/@tanstack/react-query.gen.ts` for API calls** (never raw fetch)
- Use path aliases (`@components/`, `@hooks/`, etc.) instead of relative imports
- Run `pnpm lint` and `pnpm build` before committing
- use `clsx` for conditional class names

### Naming Conventions

- **Routes** (`.tsx`): PascalCase - `index.tsx`, `users.tsx`, `users/$userId.tsx`
- **Pages** (`.tsx`, `.ts`): PascalCase - `UsersPage.tsx`, `UserTable.tsx`
- **Components** (`.tsx`, `.ts`): PascalCase - `NetworkSelector.tsx`, `SelectMenu.tsx`
- **Providers** (`.tsx`): PascalCase - `NetworkProvider.tsx` (in `src/providers/`)
- **Context** (`.ts`): PascalCase - `NetworkContext.ts` (in `src/contexts/`)
- **Hooks** (`.ts`): camelCase starting with `use` - `useNetwork.ts`, `useConfig.ts`
- **Utils** (`.ts`): kebab-case - `api-config.ts`, `auth-service.ts`

## Form Management

### Form Architecture
- **One form context per page**: Each experiment page has its own FormProvider
- **Reusable filter components**: Generic filter forms can be shared across experiments
- **Page-scoped form logic**: Form state and submission handlers stay in the page component

### Implementation Pattern
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
- Use single `useForm()` instance per page, pass via FormProvider
- Access form in child components with `useFormContext()`
- Keep validation schemas with form types (e.g., `FormData.types.ts`)
- Generic filters go in `components/Forms/`, page-specific in `pages/[section]/components/`

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
