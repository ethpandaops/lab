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
