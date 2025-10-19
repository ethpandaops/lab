import type { Meta, StoryObj } from '@storybook/react-vite';
import { Standard } from './Standard';

const meta = {
  component: Standard,
  title: 'Layouts/Standard',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Single column layout with header (enabled by default). Header includes network selector, network summary, breadcrumbs, and navigation links (all enabled by default). Supports full-width content.',
      },
      story: {
        inline: false,
        iframeHeight: 600,
      },
    },
  },
  decorators: [
    Story => (
      <div className="relative h-[600px] w-full">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    showHeader: {
      control: 'boolean',
      description: 'Show the header with navigation',
    },
    showNetworkSelector: {
      control: 'boolean',
      description: 'Show network selector in header (only works if showHeader is true)',
    },
    showNetworkSummary: {
      control: 'boolean',
      description: 'Show network summary in header (only works if showHeader is true)',
    },
    showBreadcrumbs: {
      control: 'boolean',
      description: 'Show breadcrumbs in navbar (only works if showHeader is true)',
    },
    showNavLinks: {
      control: 'boolean',
      description: 'Show navigation links in navbar (only works if showHeader is true)',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Use full width instead of max-width container',
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Standard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default layout with all features enabled
 */
export const Default: Story = {
  args: {
    fullWidth: true,
    children: (
      <div className="border-subtle rounded-lg border bg-card p-8">
        <h1 className="mb-4 text-3xl font-bold text-white">Page Content</h1>
        <p className="text-secondary">
          This is the default Standard layout with header, network selector, network summary, breadcrumbs, and
          navigation links all enabled.
        </p>
      </div>
    ),
  },
};

/**
 * Minimal layout without header
 */
export const WithoutHeader: Story = {
  args: {
    showHeader: false,
    fullWidth: true,
    children: (
      <div className="border-subtle rounded-lg border bg-card p-8">
        <h1 className="mb-4 text-3xl font-bold text-white">Page Content</h1>
        <p className="text-secondary">This layout has no header - just content in a full width container.</p>
      </div>
    ),
  },
};

/**
 * Layout with header but without network features
 */
export const WithoutNetworkFeatures: Story = {
  args: {
    showNetworkSelector: false,
    showNetworkSummary: false,
    fullWidth: true,
    children: (
      <div className="border-subtle rounded-lg border bg-card p-8">
        <h1 className="mb-4 text-3xl font-bold text-white">Page without Network Features</h1>
        <p className="text-secondary">
          This layout has header with breadcrumbs and nav links, but no network selector or summary.
        </p>
      </div>
    ),
  },
};

/**
 * Full width layout without max-width constraint
 */
export const FullWidth: Story = {
  args: {
    fullWidth: true,
    children: (
      <div className="border-subtle rounded-lg border bg-card p-8">
        <h1 className="mb-4 text-3xl font-bold text-white">Full Width Layout</h1>
        <p className="text-secondary">
          This layout uses the full width of the viewport instead of a max-width container.
        </p>
      </div>
    ),
  },
};

/**
 * Complex content example with multiple sections
 */
export const WithComplexContent: Story = {
  args: {
    fullWidth: true,
    children: (
      <div className="space-y-6">
        <div className="border-subtle rounded-lg border bg-card p-8">
          <h1 className="mb-4 text-3xl font-bold text-white">Main Section</h1>
          <p className="text-secondary">This demonstrates the Standard layout with more complex content structure.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="border-subtle rounded-lg border bg-card p-6">
              <h3 className="mb-2 text-lg font-semibold text-white">Card {i}</h3>
              <p className="text-muted">Sample card content</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
};

/**
 * Layout with only breadcrumbs (no nav links)
 */
export const BreadcrumbsOnly: Story = {
  args: {
    showNavLinks: false,
    showNetworkSelector: false,
    showNetworkSummary: false,
    fullWidth: true,
    children: (
      <div className="border-subtle rounded-lg border bg-card p-8">
        <h1 className="mb-4 text-3xl font-bold text-white">Page with Breadcrumbs Only</h1>
        <p className="text-secondary">This layout shows only breadcrumbs in the navbar, no navigation links.</p>
      </div>
    ),
  },
};

/**
 * Layout with only nav links (no breadcrumbs)
 */
export const NavLinksOnly: Story = {
  args: {
    showBreadcrumbs: false,
    showNetworkSelector: false,
    showNetworkSummary: false,
    fullWidth: true,
    children: (
      <div className="border-subtle rounded-lg border bg-card p-8">
        <h1 className="mb-4 text-3xl font-bold text-white">Page with Nav Links Only</h1>
        <p className="text-secondary">This layout shows only navigation links in the navbar, no breadcrumbs.</p>
      </div>
    ),
  },
};

/**
 * Layout with network summary but no selector
 */
export const WithNetworkSummaryOnly: Story = {
  args: {
    showNetworkSelector: false,
    showNetworkSummary: true,
    fullWidth: true,
    children: (
      <div className="border-subtle rounded-lg border bg-card p-8">
        <h1 className="mb-4 text-3xl font-bold text-white">Page with Network Summary</h1>
        <p className="text-secondary">This layout shows the network summary but not the selector.</p>
      </div>
    ),
  },
};
