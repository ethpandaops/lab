---
paths:
  - '**/src/**/*.test.ts'
  - '**/src/**/*.test.tsx'
  - '**/src/test-utils/**'
---

# Tests

- Unit tests render through `@/test-utils` (`render`, `renderHook`: the app's query client without retries and a router; pass `client`, `wrapper` or `initialProps` when a test needs them) and mock the API with `server.use(...)` MSW handlers. A request no handler answers fails the test. Don't stub `fetch`; lint rejects importing `@testing-library/react` directly.
- `src/test-utils/handlers/<domain>.ts` holds a fixture typed with the app's types and a `<domain>Handlers` object with one handler per state (`success`, `failure`, and `pending`, which never resolves), re-exported from `handlers/index.ts`. Unit tests and stories share them.
- Fixtures, tests and stories take the current time from `@/test-utils/time` (`NOW_MS`), never `Date.now()` or `new Date()`, and random data from `seededRandom` in `@/test-utils/random`, never `Math.random()`.
- A generated query key holds the client's base URL, which the test setup sets after test modules load, so build keys inside a test, not at module level.
- Fix a flaky or failing test; lint fails on `.only` and `.skip`.
