import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Button } from '@/components/Elements/Button';

const meta = {
  title: 'Components/Layout/Sidebar',
  component: Sidebar,
  decorators: [
    Story => (
      <div className="min-h-screen min-w-[600px]">
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

  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Mock header bar (mobile only) */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="group -m-2.5 flex h-10 w-10 flex-col items-center justify-center gap-1.5 p-2.5"
            aria-label="Toggle sidebar"
            aria-pressed={sidebarOpen}
          >
            <span className="h-0.5 w-6 origin-center rounded-full bg-muted transition-all duration-300 ease-out group-hover:bg-foreground group-[[aria-pressed=true]]:translate-y-2 group-[[aria-pressed=true]]:rotate-45" />
            <span className="h-0.5 w-6 origin-center rounded-full bg-muted transition-all duration-300 ease-out group-hover:bg-foreground group-[[aria-pressed=true]]:opacity-0" />
            <span className="h-0.5 w-6 origin-center rounded-full bg-muted transition-all duration-300 ease-out group-hover:bg-foreground group-[[aria-pressed=true]]:-translate-y-2 group-[[aria-pressed=true]]:-rotate-45" />
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
  render: () => <SidebarWrapper initialOpen showToggle />,
  parameters: {
    viewport: {
      defaultViewport: 'iphone14promax',
    },
  },
};

/**
 * Desktop view showing the fixed sidebar. The sidebar is always visible
 * on larger screens (≥lg breakpoint) and cannot be closed.
 */
export const DesktopView: Story = {
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
  render: () => <SidebarWrapper initialOpen={false} showToggle />,
  parameters: {
    viewport: {
      defaultViewport: 'responsive',
    },
  },
};
