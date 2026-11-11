import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Sidebar } from './Sidebar';
import { Button } from '@/components/Elements/Button';

const meta = {
  title: 'Components/Layout/Sidebar',
  component: Sidebar,
  decorators: [
    Story => (
      <div className="min-h-screen min-w-150">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Navigation sidebar that adapts to different viewport sizes. On desktop (≥lg), shows as a fixed sidebar. On mobile/tablet, appears as a slide-out drawer that can be toggled.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component for interactive state with toggle button
function SidebarWrapper(props: { initialOpen?: boolean; showToggle?: boolean }): JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(props.initialOpen ?? false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Mock header bar (mobile only) */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-4 py-4 lg:hidden">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="group -m-2.5 flex h-10 w-10 flex-col items-center justify-center gap-1.5 p-2.5"
            aria-label="Toggle sidebar"
            aria-pressed={sidebarOpen}
          >
            <span className="h-0.5 w-6 origin-center rounded-full bg-muted transition-all duration-300 ease-out group-hover:bg-foreground group-aria-pressed:translate-y-2 group-aria-pressed:rotate-45" />
            <span className="h-0.5 w-6 origin-center rounded-full bg-muted transition-all duration-300 ease-out group-hover:bg-foreground group-aria-pressed:opacity-0" />
            <span className="h-0.5 w-6 origin-center rounded-full bg-muted transition-all duration-300 ease-out group-hover:bg-foreground group-aria-pressed:-translate-y-2 group-aria-pressed:-rotate-45" />
          </button>
          <span className="text-lg font-semibold text-foreground">The Lab</span>
        </div>
      </div>

      {/* Main content area */}
      <main className="p-6 lg:pl-80">
        <div className="rounded-lg bg-surface p-6">
          <h1 className="mb-4 text-2xl font-bold text-foreground">Main Content Area</h1>
          <p className="mb-4 text-muted">
            This demonstrates how the sidebar integrates with page content. On mobile, use the hamburger menu to toggle
            the sidebar. On desktop (≥lg breakpoint), the sidebar is always visible.
          </p>
          {props.showToggle && (
            <Button variant="primary" onClick={() => setSidebarOpen(!sidebarOpen)}>
              Toggle Sidebar (Any Viewport)
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Default sidebar view on mobile. Click the hamburger icon to open the sidebar.
 * The sidebar slides in from the left and appears below the header bar.
 */
export const MobileView: Story = {
  args: {} as never,
  render: () => <SidebarWrapper initialOpen={false} showToggle />,
  parameters: {
    viewport: {
      defaultViewport: 'iphone14promax',
    },
  },
};

/**
 * Mobile view with sidebar open. The sidebar covers the full screen width
 * and slides in smoothly. Click outside or navigate to close.
 */
export const MobileOpen: Story = {
  args: {} as never,
  render: () => <SidebarWrapper initialOpen showToggle />,
  parameters: {
    viewport: {
      defaultViewport: 'iphone14promax',
    },
  },
};

/**
 * Items with `children` (here Clients) get a chevron that opens a flyout of their nested pages, grouped into
 * columns, while the item itself stays a link. In the drawer the flyout opens below the item; Escape closes the
 * flyout and leaves the drawer open.
 */
export const ItemWithChildren: Story = {
  args: {} as never,
  render: () => <SidebarWrapper initialOpen />,
  parameters: {
    viewport: {
      defaultViewport: 'iphone14promax',
    },
  },
  play: async () => {
    const body = within(document.body);
    const drawer = within(await body.findByRole('dialog'));
    await userEvent.click(drawer.getByRole('button', { name: 'Clients pages' }));
    await expect(await body.findByRole('link', { name: /Lighthouse/ })).toHaveAttribute(
      'href',
      '/ethereum/clients/lighthouse'
    );
    await expect(body.queryByRole('link', { name: /Trin Execution/ })).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('link', { name: /Lighthouse/ })).not.toBeInTheDocument());
    await expect(drawer.getByRole('link', { name: 'Clients' })).toBeVisible();
  },
};

/**
 * Desktop view showing the fixed sidebar. The sidebar is always visible
 * on larger screens (≥lg breakpoint) and cannot be closed.
 */
export const DesktopView: Story = {
  args: {} as never,
  render: () => <SidebarWrapper initialOpen={false} showToggle />,
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
  },
};

/**
 * Responsive demonstration. Use Storybook's viewport toolbar to test
 * how the sidebar adapts between mobile and desktop layouts.
 */
export const Responsive: Story = {
  args: {} as never,
  render: () => <SidebarWrapper initialOpen={false} showToggle />,
  parameters: {
    viewport: {
      defaultViewport: 'responsive',
    },
  },
};
