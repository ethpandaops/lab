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
  routes/                             # TanStack route modules only
    __root.tsx                        # app shell/providers/outlet
    index.tsx                         # "/"
    experiments/
      index.tsx                       # "/experiments"
      $slug.tsx                       # "/experiments/:slug"
  pages/                              # Route-level components (screens)
    index/
      IndexPage.tsx
    experiments/
      ExperimentsPage.tsx
      hooks/                          # Hooks used ONLY by this page
        useExperiments/
          useExperiments.ts
          index.ts
      components/                     # Components used ONLY by this page
        ExperimentList/
          ExperimentList.tsx
          index.ts
      LiveSlot/                       # Live slot page (/experiments/live-slot)
        LiveSlot.tsx
        components/
          SlotDetail/
            SlotDetail.tsx
            index.ts
  components/                         # Shared, generic, design-system components
    Select/
      Select.tsx
      Select.types.ts
      Select.stories.tsx
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
  lib/                                # Utilities, constants, helpers, services
    api-config.ts
  assets/
  main.tsx
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
