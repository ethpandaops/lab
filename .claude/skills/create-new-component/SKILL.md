---
name: Create New Component
description: Create a new React component following Lab's architecture patterns. Determines component scope (core vs. page-scoped), generates proper structure with TypeScript types, creates Storybook stories for core components, and ensures composability with existing components.
---

# Create New Component

This skill creates React components following Lab's established architecture patterns.

## Technology Stack

- **React**: v19 (`ref` as a prop, JSX.Element)
- **TypeScript**: v5 (strict typing)
- **Tailwind CSS**: v4 (semantic color tokens)
- **Storybook**: v9 (autodocs with decorators)
- **Icons**: Heroicons v2 (`@heroicons/react/20/solid`, `@heroicons/react/16/solid`)
- **UI Library**: Headless UI v2 (for interactive components)
- **Utilities**: `clsx` for conditional classes
- **Forms**: react-hook-form v7 (when applicable)

## Before You Begin

**STOP AND ASK QUESTIONS** unless the user has provided complete specifications.

Ask the user to clarify:

1. **Component scope**: Is this reusable across pages (core) or page-specific?
2. **Category**: Which category fits best? (see Component Categories below)
3. **Functionality**: What should this component do? What props are needed?
4. **Composition**: Should it use existing components internally?
5. **Variants**: Does it need size/variant/color options?

Only proceed after understanding the requirements.

## Component Architecture

### Core Components (`src/components/`)

**When**: Reusable across multiple pages/sections
**Requirements**:

- Generic and configurable via props
- No page-specific business logic
- No direct API calls (accept data via props)
- Semantic Tailwind tokens (`bg-surface`, `text-foreground`)
- **MUST include Storybook stories**
- Compose from other core components when logical

### Page-Scoped Components (`src/pages/[section]/components/`)

**When**: Used within specific page/section only
**Requirements**:

- Page-specific business logic allowed
- Can use hooks (useNetwork, API hooks, etc.)
- Compose/extend core components
- May contain specialized state management
- **NO Storybook stories required**

## Component Categories

### Core Component Categories (src/components/)

- Use `ls` to list the components in the `src/components/` directory.

### Page Sections (src/pages/)

- Use `ls` to list the pages in the `src/pages/` directory.

## Standard Component Structure

```
ComponentName/
  ComponentName.tsx              # Implementation
  ComponentName.types.ts         # TypeScript types (when needed)
  ComponentName.stories.tsx      # Storybook stories (core components only)
  index.ts                       # Barrel export
```

## Implementation Steps

### 1. Research Existing Components

Before implementing, examine similar existing components:

- Check category for existing patterns
- Review how props are structured
- Observe Tailwind class patterns
- Note composability approach

### 2. Create Component Structure

**For Core Components:**

```
src/components/[Category]/[ComponentName]/
```

**For Page-Scoped Components:**

```
src/pages/[section]/components/[ComponentName]/
```

### 3. Implement Component File

**Key Patterns:**

```tsx
import type { JSX } from 'react';
import clsx from 'clsx';
import type { ComponentNameProps } from './ComponentName.types';

// Inline Tailwind class definitions (not objects)
const baseClasses = 'inline-flex items-center font-semibold';

// Variant classes when needed
const variantClasses = {
  primary: 'bg-primary text-on-fill hover:bg-primary-hover',
  secondary: 'bg-surface text-foreground hover:bg-surface-hover',
};

// React 19 passes ref as a prop, so there is no forwardRef or displayName
export function ComponentName({
  variant = 'primary',
  className,
  children,
  ref,
  ...props
}: ComponentNameProps): JSX.Element {
  return (
    <div ref={ref} className={clsx(baseClasses, variantClasses[variant], className)} {...props}>
      {children}
    </div>
  );
}
```

**Semantic Colors:**

- Use tokens: `bg-surface`, `text-foreground`, `text-muted`, `border-border`
- Brand: `bg-primary`, `text-primary`, `bg-secondary`, `bg-accent`
- States: `text-success`, `text-warning`, `text-danger`
- Only token classes: no hard-coded colors (`text-gray-500`) or arbitrary values (`min-w-[600px]`); see
  [Styling](../../rules/styling.md)

**Conditional Classes:**

```tsx
import { clsx } from 'clsx';

className={clsx(
  'base-classes',
  variant === 'primary' && 'primary-classes',
  disabled && 'opacity-50 cursor-not-allowed',
  className
)}
```

### 4. Create Types File (when needed)

```tsx
import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react';

// Export a type only once another module imports it; pnpm knip fails on unused exports
type ComponentVariant = 'primary' | 'secondary';

export interface ComponentNameProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * Ref to the rendered element
   */
  ref?: Ref<HTMLDivElement>;

  /**
   * The visual style variant
   * @default 'primary'
   */
  variant?: ComponentVariant;

  /**
   * Component content
   */
  children?: ReactNode;
}
```

### 5. Create Storybook Stories (Core Components Only)

**Required Template:**

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentName } from './ComponentName';

const meta = {
  title: 'Components/[Category]/ComponentName',
  component: ComponentName,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-150 rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
  },
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Example',
    variant: 'primary',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <ComponentName variant="primary">Primary</ComponentName>
      <ComponentName variant="secondary">Secondary</ComponentName>
    </div>
  ),
};
```

**Story Best Practices:**

- Use full nested path: `Components/[Category]/ComponentName`
- Include `decorators` with `bg-surface` wrapper
- Show all variants/states
- Use realistic content
- Include complex examples

### 6. Create Barrel Export

Export what other modules import, usually just the component. Add a type only once a consumer imports it: `pnpm knip` fails on exports that nothing imports.

```tsx
export { ComponentName } from './ComponentName';
```

## Composition Patterns

### Core Composing Core

```tsx
// NetworkSelect composes SelectMenu
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { NetworkIcon } from '@/components/Ethereum/NetworkIcon';

export function NetworkSelect({ showLabel = true }: Props) {
  const options = networks.map(network => ({
    value: network,
    label: network.display_name,
    icon: <NetworkIcon networkName={network.name} />,
  }));

  return <SelectMenu options={options} showLabel={showLabel} />;
}
```

### Page-Scoped Composing Core

```tsx
// UserCard composes Card, Badge, ClientLogo
import { Card } from '@/components/Layout/Card';
import { Badge } from '@/components/Elements/Badge';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';

export function UserCard({ username, clients }: Props) {
  return (
    <Card>
      <h3>{username}</h3>
      <Badge color="gray">{classification}</Badge>
      {clients.map(c => <ClientLogo key={c} client={c} />)}
    </Card>
  );
}
```

## Common Component Patterns

### Icon Handling (Heroicons)

```tsx
// Size the icon from a box-less wrapper, as Button does: the icon keeps its own classes and stays a flex item
{leadingIcon && (
  <span aria-hidden="true" className="contents *:size-5">
    {leadingIcon}
  </span>
)}
```

### Size Variants

```tsx
const sizeClasses = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-2.5 py-1.5 text-sm',
  lg: 'px-3 py-2 text-sm',
};
```

### Interactive States

```tsx
// primary-hover is a light-dark() token, so no dark: variant is needed
const baseClasses = `
  inline-flex items-center
  hover:bg-primary-hover
  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
  disabled:cursor-not-allowed disabled:opacity-50
`;
```

### Headless UI Integration

```tsx
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';

<Listbox value={value} onChange={onChange}>
  <ListboxButton className="relative cursor-pointer rounded-sm">
    {/* Button content */}
  </ListboxButton>

  <ListboxOptions className="absolute z-9999 mt-1 rounded-sm border">
    {options.map(option => (
      <ListboxOption
        key={option.value}
        value={option.value}
        className="data-focus:bg-primary-10 data-selected:text-primary"
      >
        {option.label}
      </ListboxOption>
    ))}
  </ListboxOptions>
</Listbox>
```

## Validation Checklist

Before completing:

- [ ] Matches existing component patterns in category
- [ ] Uses semantic Tailwind tokens (not hard-coded colors)
- [ ] TypeScript types properly defined
- [ ] Props have JSDoc comments with defaults
- [ ] Barrel export created
- [ ] Core components have Storybook stories
- [ ] Stories include all variants/states
- [ ] Component composes existing components when appropriate
- [ ] No page-specific logic in core components
- [ ] Accessibility attributes included (aria-\*, role)
- [ ] Dark mode handled via semantic tokens
- [ ] Icons are sized from a wrapper, never with cloneElement
- [ ] `pnpm lint` passes
- [ ] `pnpm knip` passes
- [ ] `pnpm build` passes

## Testing in Storybook

For core components, use Storybook for iteration:

```bash
pnpm storybook
```

Use Playwright MCP tools to:

1. Navigate to component story
2. Take screenshots of variants
3. Test interactions
4. Verify responsive behavior

## Common Mistakes to Avoid

❌ **DON'T**:

- Create new component without asking scope questions
- Hard-code colors (`text-gray-500` instead of `text-muted`)
- Skip Storybook stories for core components
- Add API calls in core components
- Duplicate existing component functionality
- Use relative imports (use `@/` path aliases)
- Create standalone files (use folder structure)

✅ **DO**:

- Research existing patterns first
- Ask clarifying questions
- Use semantic color tokens
- Compose from existing components
- Follow established naming conventions
- Create comprehensive Storybook stories
- Document props with JSDoc
- Test with `pnpm lint` and `pnpm build`

## Example Workflow

1. **User Request**: "Create a tooltip component"

2. **Ask Questions**:
   - "Should this be reusable across pages (core) or page-specific?"
   - "Which category fits best? I'm thinking Overlays."
   - "What trigger should it support? Hover, click, or both?"
   - "Should it have different positions (top, bottom, left, right)?"

3. **Research**:
   - Examine `src/components/Overlays/` for patterns
   - Check if similar component exists
   - Review Headless UI tooltip docs

4. **Implement**:
   - Create `src/components/Overlays/Tooltip/`
   - Implement `Tooltip.tsx` with Headless UI
   - Create `Tooltip.types.ts` with variants
   - Create comprehensive `Tooltip.stories.tsx`
   - Create barrel export `index.ts`

5. **Validate**:
   - Test in Storybook
   - Run `pnpm lint`
   - Run `pnpm knip`
   - Run `pnpm build`
   - Verify all checklist items

6. **Report**: "Created core Tooltip component in src/components/Overlays/Tooltip with 4 position variants and comprehensive Storybook stories. Ready to use across all pages."
