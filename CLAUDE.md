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
  routes/                             # Route definitions - wrap pages in layouts
    __root.tsx                        # Minimal providers only
    index.tsx                         # "/" - Root landing page
    about.tsx                         # "/about" - wraps AboutPage in Standard layout
    experiments/
      index.tsx                       # "/experiments" - experiments list
      $id.tsx                         # "/experiments/$id" - dynamic experiment route
      -experiments.config.ts          # Config for all experiments

  layouts/                            # Layout components
    Standard/                         # Single column layout
      Standard.tsx
      Standard.types.ts
      index.ts
    Sidebar/                          # Two column layout (main + sidebar)
      Sidebar.tsx
      Sidebar.types.ts
      index.ts
    index.ts

  pages/                              # Page implementations (pure content)
    root/
      Root.tsx                        # Landing page
    about/
      AboutPage.tsx                   # About page content
    experiments/
      Experiments.tsx                 # Experiments list
      FullWidth/
        FullWidth.tsx                 # Full width experiment
      NavbarOnly/
        NavbarOnly.tsx                # Navbar-only experiment
      WithSelector/
        WithSelector.tsx              # With network selector
        components/                   # Page-specific components
          BlockList/
      TwoColumnBasic/
        TwoColumnBasic.tsx            # Two column example
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

## Routes and Layouts

### Layout System

**Available Layouts:**
- `Standard` - Single column layout (navbar optional, network selector optional, fullWidth optional)
- `Sidebar` - Two column layout with main content + sidebar (same options as Standard)

**How it works:**
- Routes wrap page components in layout components
- Layouts accept props: `showNavbar`, `showNetworkSelector`, `fullWidth`
- Pages are pure content - no layout imports
- `__root.tsx` provides minimal providers only (QueryClient, ConfigGate, NetworkProvider)

**Example Route:**
```tsx
// routes/about.tsx
import { Standard } from '@/layouts/Standard';
import { AboutPage } from '@/pages/about';

export const Route = createFileRoute('/about')({
  component: () => (
    <Standard showNavbar>
      <AboutPage />
    </Standard>
  ),
});
```

**Example Page:**
```tsx
// pages/about/AboutPage.tsx
export function AboutPage() {
  return <div>Content here - no layout wrapper needed</div>;
}
```

### Experiments System

Experiments use a config-driven approach in `routes/experiments/-experiments.config.ts`:

```tsx
export const experiments = {
  'my-experiment': {
    id: 'my-experiment',
    title: 'My Experiment',
    description: 'Description here',
    color: 'border-blue-500',
    component: MyExperimentPage,
    layout: {
      type: 'standard',  // or 'sidebar' or 'none'
      showNavbar: true,
      showNetworkSelector: false,
      fullWidth: false,
    },
  },
};
```

The `experiments/$id` route dynamically wraps the page in the correct layout based on config.

**For Sidebar layouts**, pages export multiple parts:
```tsx
// pages/experiments/TwoColumnExample.tsx
export function TwoColumnExample() {
  return (
    <>
      <div>Main content</div>
      <aside>Sidebar content</aside>
    </>
  );
}
```

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
