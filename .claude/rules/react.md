---
paths:
  - '**/src/**/*.tsx'
  - '**/src/**/*.ts'
---

# React

- Components are function declarations returning `JSX.Element`, defined at module level (never inside another component), with props typed in `<Name>.types.ts`.
- Derive values during render. Don't copy props or query data into state, or set state in an effect to mirror something you can compute; to reset state when a prop changes, give the component a `key` or compare with the previous value during render.
- Keep render pure: no `Date.now()`, `Math.random()` or `ref.current` during render. Take the time from a clock hook or a prop, and read refs in effects and event handlers.
- Key list items by what identifies them in the data, never by their index.
- `useMemo`/`memo` only for expensive work or for an identity a downstream memo depends on. The React Compiler's rules run in lint only; the build does not memoize for you.
