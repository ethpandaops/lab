import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, useState } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { NavPanel, type NavPanelProps } from '@/components/Navigation/NavPanel';

const meta = {
  title: 'Components/Navigation/NavPanel',
  component: NavPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NavPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component to demonstrate the panel with state management
function NavPanelDemo(props: Omit<NavPanelProps, 'isOpen' | 'onClose'>): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-surface">
      <div className="border-subtle/30 flex items-center gap-4 border-b bg-card p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-sm p-2 text-muted hover:bg-hover hover:text-white"
          aria-label="Open navigation menu"
        >
          <Bars3Icon className="size-6" />
        </button>
        <span className="text-sm/6 text-secondary">Click the hamburger icon to open the panel</span>
      </div>

      <NavPanel isOpen={isOpen} onClose={() => setIsOpen(false)} {...props} />
    </div>
  );
}

/**
 * Default panel with breadcrumbs and nav links (typical desktop-only selector setup)
 */
export const Default: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
  },
  render: () => <NavPanelDemo />,
};

/**
 * Full-featured panel with all sections visible
 */
export const AllSections: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
  },
  render: () => (
    <NavPanelDemo showNetworkSelector={true} showBreadcrumbs={true} showNavLinks={true} showNetworkSummary={true} />
  ),
};

/**
 * Panel with only network selector
 */
export const NetworkSelectorOnly: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
  },
  render: () => (
    <NavPanelDemo showNetworkSelector={true} showBreadcrumbs={false} showNavLinks={false} showNetworkSummary={false} />
  ),
};

/**
 * Panel with only breadcrumbs
 */
export const BreadcrumbsOnly: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
  },
  render: () => (
    <NavPanelDemo showNetworkSelector={false} showBreadcrumbs={true} showNavLinks={false} showNetworkSummary={false} />
  ),
};

/**
 * Panel with only nav links
 */
export const NavLinksOnly: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
  },
  render: () => (
    <NavPanelDemo showNetworkSelector={false} showBreadcrumbs={false} showNavLinks={true} showNetworkSummary={false} />
  ),
};

/**
 * Panel with only network summary
 */
export const NetworkSummaryOnly: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
  },
  render: () => (
    <NavPanelDemo showNetworkSelector={false} showBreadcrumbs={false} showNavLinks={false} showNetworkSummary={true} />
  ),
};

/**
 * Panel with network selector and summary (typical network-focused setup)
 */
export const NetworkFocused: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
  },
  render: () => (
    <NavPanelDemo showNetworkSelector={true} showBreadcrumbs={false} showNavLinks={false} showNetworkSummary={true} />
  ),
};

/**
 * Panel with breadcrumbs and nav links (typical navigation setup)
 */
export const NavigationFocused: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
  },
  render: () => (
    <NavPanelDemo showNetworkSelector={false} showBreadcrumbs={true} showNavLinks={true} showNetworkSummary={false} />
  ),
};
