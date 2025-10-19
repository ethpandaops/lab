import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from './Header';

const meta = {
  title: 'Components/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithNetworkSelector: Story = {
  args: {
    showNetworkSelector: true,
  },
};

export const WithNetworkSummary: Story = {
  args: {
    showNetworkSummary: true,
  },
};

export const WithNetworkSelectorAndSummary: Story = {
  args: {
    showNetworkSelector: true,
    showNetworkSummary: true,
  },
};

export const BreadcrumbsOnly: Story = {
  args: {
    showBreadcrumbs: true,
    showNavLinks: false,
  },
};

export const NavLinksOnly: Story = {
  args: {
    showBreadcrumbs: false,
    showNavLinks: true,
  },
};

export const NoNavBar: Story = {
  args: {
    showBreadcrumbs: false,
    showNavLinks: false,
  },
};

export const FullFeatures: Story = {
  args: {
    showNetworkSelector: true,
    showNetworkSummary: true,
    showBreadcrumbs: true,
    showNavLinks: true,
  },
};
