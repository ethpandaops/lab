import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterContextProvider,
  type AnyRoute,
  type AnyRouter,
} from '@tanstack/react-router';
import { expect } from 'storybook/test';
import { Breadcrumb } from './Breadcrumb';

/** A matched route: its full path and the label its `getBreadcrumb()` returns. */
type Crumb = [path: string, label: string];

/**
 * Loads a memory router at the last crumb's path. Each crumb is a route nested in the one before
 * it that names itself in `beforeLoad`, as the app's routes do.
 */
async function loadTrail(crumbs: Crumb[]): Promise<{ router: AnyRouter }> {
  const rootRoute = createRootRoute();
  let parent: AnyRoute = rootRoute;
  const routes = crumbs.map(([path, label]) => {
    const parentRoute = parent;
    parent = createRoute({
      getParentRoute: () => parentRoute,
      path: path.slice(path.lastIndexOf('/') + 1),
      beforeLoad: () => ({ getBreadcrumb: () => ({ label }) }),
    });
    return parent;
  });
  routes.forEach((route, index) => {
    (routes[index - 1] ?? rootRoute).addChildren([route]);
  });

  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: [crumbs.at(-1)?.[0] ?? '/'] }),
  });
  await router.load();
  return { router };
}

const meta = {
  title: 'Components/Navigation/Breadcrumb',
  component: Breadcrumb,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    Story => (
      <div className="min-w-150 rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  render: (args, { loaded }) => (
    <RouterContextProvider router={loaded.router}>
      <Breadcrumb {...args} />
    </RouterContextProvider>
  ),
  tags: ['autodocs'],
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic breadcrumb navigation with two levels
 */
export const TwoLevels: Story = {
  loaders: [
    () =>
      loadTrail([
        ['/ethereum', 'Ethereum'],
        ['/ethereum/epochs', 'Epochs'],
      ]),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Ethereum' })).toHaveAttribute('href', '/ethereum');
    await expect(canvas.getByText('Epochs')).toHaveAttribute('aria-current', 'page');
  },
};

/**
 * Deep breadcrumb hierarchy with multiple levels
 */
export const DeepHierarchy: Story = {
  loaders: [
    () =>
      loadTrail([
        ['/ethereum', 'Ethereum'],
        ['/ethereum/data-availability', 'Data Availability'],
        ['/ethereum/data-availability/custody', 'Custody'],
      ]),
  ],
};

/**
 * Breadcrumb with dynamic parameter (e.g., epoch number)
 */
export const WithDynamicParam: Story = {
  loaders: [
    () =>
      loadTrail([
        ['/ethereum', 'Ethereum'],
        ['/ethereum/epochs', 'Epochs'],
        ['/ethereum/epochs/12345', 'Epoch 12345'],
      ]),
  ],
};

/**
 * Breadcrumb without home icon
 */
export const WithoutHomeIcon: Story = {
  args: { showHome: false },
  loaders: [
    () =>
      loadTrail([
        ['/ethereum', 'Ethereum'],
        ['/ethereum/epochs', 'Epochs'],
      ]),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
  },
};

/**
 * Custom separator character
 */
export const CustomSeparator: Story = {
  args: { separator: '>' },
  loaders: [
    () =>
      loadTrail([
        ['/ethereum', 'Ethereum'],
        ['/ethereum/epochs', 'Epochs'],
        ['/ethereum/epochs/12345', 'Epoch 12345'],
      ]),
  ],
};

/**
 * Long breadcrumb labels to test wrapping behavior
 */
export const LongLabels: Story = {
  loaders: [
    () =>
      loadTrail([
        ['/ethereum', 'Ethereum Network Statistics'],
        ['/ethereum/data-availability', 'Data Availability Sampling'],
        ['/ethereum/data-availability/custody', 'Custody Analysis Dashboard'],
      ]),
  ],
};

/**
 * Empty state - no breadcrumbs (should render nothing)
 */
export const NoBreadcrumbs: Story = {
  loaders: [() => loadTrail([])],
  render: (args, { loaded }) => (
    <div>
      <p className="mb-4 text-sm text-muted">When there are no breadcrumbs, nothing renders (check below):</p>
      <RouterContextProvider router={loaded.router}>
        <Breadcrumb {...args} />
      </RouterContextProvider>
      <p className="mt-4 text-sm text-muted">(Nothing should appear between these two paragraphs)</p>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('navigation')).not.toBeInTheDocument();
  },
};

/**
 * Single breadcrumb - should not render (minimum 2 required)
 */
export const SingleBreadcrumb: Story = {
  loaders: [() => loadTrail([['/ethereum', 'Ethereum']])],
  render: (args, { loaded }) => (
    <div>
      <p className="mb-4 text-sm text-muted">With only one breadcrumb, nothing renders (minimum 2 required):</p>
      <RouterContextProvider router={loaded.router}>
        <Breadcrumb {...args} />
      </RouterContextProvider>
      <p className="mt-4 text-sm text-muted">(Nothing should appear between these two paragraphs)</p>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('navigation')).not.toBeInTheDocument();
  },
};
