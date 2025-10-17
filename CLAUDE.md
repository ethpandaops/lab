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
  routes/                             # THIN - TanStack route config only (3-6 lines each)
    __root.tsx                        # Minimal providers only (QueryClient, ConfigGate, NetworkProvider)
    index.tsx                         # "/" - imports HeroPage
    _app/                             # Pathless layout WITH navbar
      route.tsx                       # Navbar layout component
      about.tsx                       # "/about" - imports AboutPage
      experiments/
        index.tsx                     # "/experiments" - imports ExperimentsPage
      experiments.navbar-only.tsx     # "/experiments/navbar-only" - imports NavbarOnlyPage
      experiments.with-selector.tsx   # "/experiments/with-selector" - imports WithSelectorPage
    experiments.hero-demo.tsx         # "/experiments/hero-demo" - imports HeroDemoPage (no navbar)

  pages/                              # FAT - Route-level components (actual implementations)
    index/
      HeroPage.tsx                    # Landing page hero
      IndexPage.tsx                   # Original index (uses BlockList)
      components/                     # Components ONLY for this page
        BlockList/
          BlockList.tsx
          index.ts
    about/
      AboutPage.tsx                   # About page implementation
    experiments/
      ExperimentsPage.tsx             # Experiments list page
      HeroDemoPage.tsx                # Hero layout experiment
      NavbarOnlyPage.tsx              # Navbar-only experiment
      WithSelectorPage/               # Experiment with controls
        WithSelectorPage.tsx          # Main component
        components/                   # Page-specific components
          BlockList/                  # Moved from index
            BlockList.tsx
            index.ts
        hooks/                        # Page-specific hooks (when needed)
          useExperiment/
            useExperiment.ts
            index.ts

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

### Route Pattern: Thin Routes, Fat Pages

Routes should be **THIN** (3-6 lines) - just import the page component and configure routing options:

```tsx
// routes/_app/experiments/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ExperimentsPage } from '@/pages/experiments';

export const Route = createFileRoute('/_app/experiments/')({
  component: ExperimentsPage,
  staticData: {
    showNetworkSelector: true,
  },
});
```

Pages should be **FAT** - contain the actual implementation, hooks, and page-specific components:

```tsx
// pages/experiments/ExperimentsPage.tsx
import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';

export function ExperimentsPage(): JSX.Element {
  // Implementation here
  return <div>...</div>;
}
```

### Layout Composition with Pathless Routes

Use pathless routes (prefixed with `_`) to compose layouts without affecting the URL:

**`__root.tsx`** - Minimal providers only:
```tsx
<QueryClientProvider>
  <ConfigGate>
    <NetworkProvider>
      <Outlet /> {/* No UI wrapper */}
    </NetworkProvider>
  </ConfigGate>
</QueryClientProvider>
```

**`_app/route.tsx`** - Navbar layout:
```tsx
<div>
  <nav>
    <Logo />
    <NavLinks />
    {shouldShowNetworkSelector && <NetworkSelector />}
  </nav>
  <main>
    <Outlet /> {/* Child routes render here */}
  </main>
</div>
```

Routes opt into layouts by their file location:
- `routes/index.tsx` → No layout (just providers)
- `routes/_app/about.tsx` → Navbar layout
- `routes/_app/_withSidebar/experiment.tsx` → Navbar + Sidebar layout

### Route Configuration with staticData

Use `staticData` to configure route-specific features that layouts read:

```tsx
// Route declares what it needs
export const Route = createFileRoute('/_app/experiments/')({
  component: ExperimentsPage,
  staticData: {
    showNetworkSelector: true,  // ✅ Opt in
  },
});

// Layout reads staticData from matched routes
function AppLayout() {
  const matches = useMatches();
  const shouldShowNetworkSelector = matches.some(
    (match) => match.staticData?.showNetworkSelector === true,
  );

  return (
    <div>
      <nav>
        {shouldShowNetworkSelector && <NetworkSelector />}
      </nav>
      <Outlet />
    </div>
  );
}
```

**Benefits:**
- Declarative - routes declare what they need
- Type-safe - can extend `StaticDataRouteOption` interface
- Layout-agnostic - routes don't need to know about layout implementation

### Experiment Layout Patterns

Different experiments can have different layouts by their route location:

1. **Hero Layout** (no navbar):
   ```
   routes/experiments.hero-demo.tsx
   pages/experiments/HeroDemoPage.tsx
   ```
   Full-screen experience, no chrome.

2. **Navbar Only**:
   ```
   routes/_app/experiments.navbar-only.tsx
   pages/experiments/NavbarOnlyPage.tsx
   ```
   Has navbar, no network selector.

3. **Navbar + Network Selector**:
   ```
   routes/_app/experiments.with-selector.tsx
   pages/experiments/WithSelectorPage/
     WithSelectorPage.tsx
     components/
       BlockList/
   ```
   Uses `staticData: { showNetworkSelector: true }`

**Creating a New Experiment:**

1. Choose layout by file location:
   - No layout: `routes/experiments.my-experiment.tsx`
   - With navbar: `routes/_app/experiments.my-experiment.tsx`

2. Create page implementation:
   ```bash
   pages/experiments/MyExperimentPage.tsx
   ```

3. Configure features in route:
   ```tsx
   export const Route = createFileRoute('/_app/experiments/my-experiment')({
     component: MyExperimentPage,
     staticData: {
       showNetworkSelector: true,  // If needed
     },
   });
   ```

4. Add page-specific components/hooks:
   ```bash
   pages/experiments/MyExperimentPage/
     MyExperimentPage.tsx
     components/
       MyControl/
     hooks/
       useMyData/
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
