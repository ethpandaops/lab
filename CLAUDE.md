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

## Project Structure

```bash
vite.config.ts                        # Vite configuration
package.json                          # Dependencies and scripts
public/                               # Public assets
.storybook/                           # Storybook configuration
src/
  routes/                             # Route definitions - reference page components directly
    __root.tsx                        # Root layout with sidebar, providers, navigation
    index.tsx                         # "/" - Root landing page
    about.tsx                         # "/about" - About page
    experiments/
      index.tsx                       # "/experiments" - experiments list
      block-production-flow.tsx       # Experiment routes
      live-slots.tsx
      locally-built-blocks.tsx

  pages/                              # Page implementations (pure content)
    root/
      Root.tsx                        # Landing page
    about/
      AboutPage.tsx                   # About page content
    experiments/
      Experiments.tsx                 # Experiments list
      BlockProductionFlow/
        BlockProductionFlow.tsx
      LiveSlots/
        LiveSlots.tsx
      LocallyBuiltBlocks/
        LocallyBuiltBlocks.tsx
      ... (other experiments)

  components/                         # Shared, generic, design-system components
    Select/
      Select.tsx
      Select.types.ts
      Select.stories.tsx
      index.ts
    NetworkSelector/
      NetworkSelector.tsx
      index.ts

  providers/                          # Global or feature-specific context providers
    NetworkProvider/
      NetworkProvider.tsx
      NetworkProvider.types.ts
      index.ts

  contexts/                           # React Context definitions
    NetworkContext/
      NetworkContext.tsx
      NetworkContext.types.ts
      index.ts

  hooks/                              # Truly generic hooks
    useConfig/
      useConfig.ts
      useConfig.types.ts
      index.ts
    useNetwork/
      useNetwork.ts
      useNetwork.types.ts
      index.ts
    useBounds/
      useBounds.ts
      index.ts

  lib/                                # Utilities, constants, helpers, services
    api-config.ts

  assets/
  main.tsx
```

## Routes and Layout

### Layout System

**Architecture:**
- **`__root.tsx`** - Contains the global sidebar layout with:
  - Logo and branding
  - Navigation links (Home, Experiments, About)
  - Network selector
  - Mobile responsive sidebar (drawer on mobile, fixed on desktop)
  - Global providers (QueryClient, ConfigGate, NetworkProvider)
  - `<Outlet />` for page content

**How it works:**
- All routes render into the `<Outlet />` in `__root.tsx`
- Routes reference page components directly - no layout wrappers needed
- Pages are pure content components
- Sidebar navigation is consistent across all pages

**Example Route:**
```tsx
// routes/about.tsx
import { createFileRoute } from '@tanstack/react-router';
import { AboutPage } from '@/pages/about';

export const Route = createFileRoute('/about')({
  component: AboutPage,
});
```

**Example Page:**
```tsx
// pages/about/AboutPage.tsx
export function AboutPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <h1>About</h1>
      <p>Page content here</p>
    </div>
  );
}
```

**Note:** Pages should add their own padding/spacing as needed. The main content area has `lg:pl-72` to account for the fixed sidebar on desktop.

## React

- When creating a new component, create a storybook story for it
- When updating a component, run `pnpm storybook` and use the playwright MCP to iterate quickly. Add new stories as needed
- Write tests for components using interactions with vitest
- Write tests for utils using vitest
- Use tailwind css classes for styling
- Use tanstack router for navigation
- When using the API, always use the generated tanstack query code helper functions
- use the aliases in vite.config.ts for imports instead of relative paths (e.g. `@components/`, `@hooks/`, etc.)
- run `pnpm lint` and `pnpm build` at the end of a set of changes

### Naming Conventions

- **Routes** (`.tsx`): PascalCase - `index.tsx`, `users.tsx`, `users/$userId.tsx`
- **Pages** (`.tsx`, `.ts`): PascalCase - `UsersPage.tsx`, `UserTable.tsx`
- **Components** (`.tsx`, `.ts`): PascalCase - `NetworkSelector.tsx`, `SelectMenu.tsx`
- **Providers** (`.tsx`): PascalCase - `NetworkProvider.tsx` (in `src/providers/`)
- **Context** (`.ts`): PascalCase - `NetworkContext.ts` (in `src/contexts/`)
- **Hooks** (`.ts`): camelCase starting with `use` - `useNetwork.ts`, `useConfig.ts`
- **Utils/Services** (`.ts`): kebab-case - `api-config.ts`, `auth-service.ts`
- **Types** (`.ts`): kebab-case - `config.ts`, `network.ts`

## Theming

Theme is defined in `src/index.css` using Tailwind CSS v4's `@theme inline` directive with semantic color tokens.

**Available semantic colors:**
- `primary`, `secondary`, `accent` - Brand colors (cyan/sky palette)
- `background`, `surface`, `foreground`, `muted`, `border` - UI colors
- `success`, `warning`, `error` - State colors

**Usage:** `bg-primary`, `text-foreground`, `border-border`, etc.

**Dark mode:** Automatically switches when `.dark` class is on `<html>` element.

**To modify theme:** Edit `@layer base` in `src/index.css` - change `:root` for light mode or `html.dark` for dark mode.
