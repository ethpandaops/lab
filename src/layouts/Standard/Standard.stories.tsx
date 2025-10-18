import type { Meta, StoryObj } from '@storybook/react-vite';
import { Standard } from './Standard';

const meta = {
  component: Standard,
  title: 'Layouts/Standard',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Single column layout with optional header and network selector. Supports full-width content.',
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
 * Default layout with minimal content
 */
export const Default: Story = {
  args: {
    showHeader: false,
    showNetworkSelector: false,
    fullWidth: false,
    children: (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-8">
        <h1 className="mb-4 text-3xl font-bold text-white">Page Content</h1>
        <p className="text-slate-300">This is the default Standard layout with no header and constrained width.</p>
      </div>
    ),
  },
};

/**
 * Layout with header navigation
 */
export const WithHeader: Story = {
  args: {
    showHeader: true,
    showNetworkSelector: false,
    fullWidth: false,
    children: (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-8">
        <h1 className="mb-4 text-3xl font-bold text-white">Page with Header</h1>
        <p className="text-slate-300">This layout includes the header with navigation links.</p>
      </div>
    ),
  },
};

/**
 * Layout with header and network selector
 */
export const WithHeaderAndNetworkSelector: Story = {
  args: {
    showHeader: true,
    showNetworkSelector: true,
    fullWidth: false,
    children: (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-8">
        <h1 className="mb-4 text-3xl font-bold text-white">Page with Network Selector</h1>
        <p className="text-slate-300">This layout includes both the header and network selector.</p>
      </div>
    ),
  },
};

/**
 * Full width layout without max-width constraint
 */
export const FullWidth: Story = {
  args: {
    showHeader: true,
    showNetworkSelector: false,
    fullWidth: true,
    children: (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-8">
        <h1 className="mb-4 text-3xl font-bold text-white">Full Width Layout</h1>
        <p className="text-slate-300">
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
    showHeader: true,
    showNetworkSelector: true,
    fullWidth: false,
    children: (
      <div className="space-y-6">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-8">
          <h1 className="mb-4 text-3xl font-bold text-white">Main Section</h1>
          <p className="text-slate-300">This demonstrates the Standard layout with more complex content structure.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-lg border border-slate-700 bg-slate-800 p-6">
              <h3 className="mb-2 text-lg font-semibold text-white">Card {i}</h3>
              <p className="text-slate-400">Sample card content</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
};
