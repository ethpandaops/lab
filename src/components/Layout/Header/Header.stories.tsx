import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from './Header';

const meta = {
  title: 'Components/Layout/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default header with breadcrumbs and nav links.
 * NavPanel shows breadcrumbs and nav links on mobile.
 */
export const Default: Story = {
  args: {},
};

/**
 * Full-featured header with all sections enabled.
 * NavPanel shows all sections on mobile.
 */
export const AllFeatures: Story = {
  args: {
    showNetworkSelector: true,
    showNetworkSummary: true,
    showBreadcrumbs: true,
    showNavLinks: true,
  },
};

/**
 * Header with network selector (desktop shows selector, mobile shows icon).
 * NavPanel shows network selector, breadcrumbs, and nav links on mobile.
 */
export const WithNetworkSelector: Story = {
  args: {
    showNetworkSelector: true,
  },
};

/**
 * Header with network summary on desktop only.
 * NavPanel shows breadcrumbs and nav links on mobile.
 */
export const WithNetworkSummary: Story = {
  args: {
    showNetworkSummary: true,
  },
};

/**
 * Header with network selector and summary.
 * NavPanel shows network selector, breadcrumbs, and nav links on mobile.
 */
export const NetworkFocused: Story = {
  args: {
    showNetworkSelector: true,
    showNetworkSummary: true,
  },
};

/**
 * Header with breadcrumbs only (no nav links).
 * NavPanel shows only breadcrumbs on mobile.
 */
export const BreadcrumbsOnly: Story = {
  args: {
    showBreadcrumbs: true,
    showNavLinks: false,
  },
};

/**
 * Header with nav links only (no breadcrumbs).
 * NavPanel shows only nav links on mobile.
 */
export const NavLinksOnly: Story = {
  args: {
    showBreadcrumbs: false,
    showNavLinks: true,
  },
};

/**
 * Header with network selector only - no navigation.
 * NavPanel shows only network selector on mobile.
 * Hamburger menu still shows because NavPanel has content.
 */
export const NetworkSelectorOnly: Story = {
  args: {
    showNetworkSelector: true,
    showBreadcrumbs: false,
    showNavLinks: false,
  },
};

/**
 * Minimal header with no NavBar and no NavPanel content.
 * IMPORTANT: Hamburger menu is HIDDEN because NavPanel would be empty.
 */
export const NoNavigation: Story = {
  args: {
    showNetworkSelector: false,
    showNetworkSummary: false,
    showBreadcrumbs: false,
    showNavLinks: false,
  },
};
