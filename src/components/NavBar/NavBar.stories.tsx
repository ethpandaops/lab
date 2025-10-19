import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { NavBar } from './NavBar';

interface MyRouterContext {
  getTitle?: () => string;
}

const meta = {
  title: 'Components/NavBar',
  component: NavBar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NavBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Create mock router for stories
const createMockRouter = (
  pathname: string,
  showBreadcrumbs = true,
  showNavLinks = true
): ReturnType<typeof createRouter> => {
  const rootRoute = createRootRouteWithContext<MyRouterContext>()({
    component: () => <NavBar showBreadcrumbs={showBreadcrumbs} showNavLinks={showNavLinks} />,
  });

  const aboutRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/about',
    component: () => <NavBar showBreadcrumbs={showBreadcrumbs} showNavLinks={showNavLinks} />,
    beforeLoad: () => ({
      getTitle: () => 'About',
    }),
  });

  const experimentsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/experiments',
    component: () => <NavBar showBreadcrumbs={showBreadcrumbs} showNavLinks={showNavLinks} />,
    beforeLoad: () => ({
      getTitle: () => 'Experiments',
    }),
  });

  const heroRoute = createRoute({
    getParentRoute: () => experimentsRoute,
    path: '/hero-demo',
    component: () => <NavBar showBreadcrumbs={showBreadcrumbs} showNavLinks={showNavLinks} />,
    beforeLoad: () => ({
      getTitle: () => 'Hero Demo',
    }),
  });

  const fullwidthNavbarRoute = createRoute({
    getParentRoute: () => experimentsRoute,
    path: '/fullwidth-navbar',
    component: () => <NavBar showBreadcrumbs={showBreadcrumbs} showNavLinks={showNavLinks} />,
    beforeLoad: () => ({
      getTitle: () => 'Fullwidth Navbar',
    }),
  });

  const routeTree = rootRoute.addChildren([
    aboutRoute,
    experimentsRoute.addChildren([heroRoute, fullwidthNavbarRoute]),
  ]);

  const memoryHistory = createMemoryHistory({
    initialEntries: [pathname],
  });

  return createRouter({
    routeTree,
    history: memoryHistory,
  });
};

export const Default: Story = {
  render: () => {
    const router = createMockRouter('/');
    return <RouterProvider router={router} />;
  },
};

export const WithoutNavLinks: Story = {
  render: () => {
    const router = createMockRouter('/', true, false);
    return <RouterProvider router={router} />;
  },
};

export const WithoutBreadcrumbs: Story = {
  render: () => {
    const router = createMockRouter('/', false, true);
    return <RouterProvider router={router} />;
  },
};

export const BreadcrumbsOnly: Story = {
  render: () => {
    const router = createMockRouter('/experiments/hero-demo', true, false);
    return <RouterProvider router={router} />;
  },
};

export const NavLinksOnly: Story = {
  render: () => {
    const router = createMockRouter('/experiments/hero-demo', false, true);
    return <RouterProvider router={router} />;
  },
};

export const SingleLevelRoute: Story = {
  render: () => {
    const router = createMockRouter('/about');
    return <RouterProvider router={router} />;
  },
};

export const TwoLevelNestedRoute: Story = {
  render: () => {
    const router = createMockRouter('/experiments/hero-demo');
    return <RouterProvider router={router} />;
  },
};

export const DeepNestedRoute: Story = {
  render: () => {
    const router = createMockRouter('/experiments/fullwidth-navbar');
    return <RouterProvider router={router} />;
  },
};
