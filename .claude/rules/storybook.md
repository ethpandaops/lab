# Storybook

When creating a new story, add the following decorators:

```tsx
decorators: [
  Story => (
    <div className="min-w-[600px] rounded-sm bg-surface p-6">
      <Story />
    </div>
  ),
],
```

When choosing a title, use the full nested path to the story, e.g. `Components/Layout/Container`.

## Stories are tests

Every story is a test in Chromium under the light, dark and star themes (`pnpm test:storybook`). A failed `play`, a console error, an accessibility violation or an unmocked `/api/` request fails it. Fix the story or the component; the `test-exclude` tag is only for stories that never settle (endless timers, WebGL).

- Mock the API per story with `parameters.msw.handlers`, reusing `@/test-utils/handlers`: the pending handler for loading, the failing one for errors. A keyed handler (`config`, `bounds`) replaces the preview's default for that key.
- Fixture times come from `NOW_MS` in `@/test-utils/time`. A component that shows times relative to now gets `beforeEach: freezeNow` on its meta.
- Each `play` awaits the state its story shows, with `findBy…` for async data. Await every `expect` and `userEvent`.
