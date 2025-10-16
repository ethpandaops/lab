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

- vite.config.ts - Vite configuration
- package.json - Dependencies and scripts
- public - Public assets
- .storybook - Storybook configuration
- src/ - Source code
  - api/ - Generated API openapi code
    - @tanstack/react-query.gen.ts - Generated tanstack query code
  - components/ - React components (PascalCase.tsx)
  - contexts/ - React contexts (PascalCase.ts)
  - providers/ - React providers (PascalCase.tsx)
  - hooks/ - Custom hooks (camelCase.ts)
  - routes/ - Routes
  - stories/ - Storybook stories
  - types/ - TypeScript types (kebab-case.ts)
  - utils/ - Utilities (kebab-case.ts)
  - index.css - Global styles
  - main.tsx - Entry point

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

- **Components** (`.tsx`): PascalCase - `NetworkSelector.tsx`, `SelectMenu.tsx`
- **Providers** (`.tsx`): PascalCase - `NetworkProvider.tsx` (in `src/providers/`)
- **Context** (`.ts`): PascalCase - `NetworkContext.ts` (in `src/contexts/`)
- **Hooks** (`.ts`): camelCase starting with `use` - `useNetwork.ts`, `useConfig.ts`
- **Utils/Services** (`.ts`): kebab-case - `api-config.ts`, `auth-service.ts`
- **Types** (`.ts`): kebab-case - `config.ts`, `network.ts`
