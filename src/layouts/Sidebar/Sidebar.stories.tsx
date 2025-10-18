import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sidebar } from './Sidebar';

const meta = {
  component: Sidebar,
  title: 'Layouts/Sidebar',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Two column layout with main content and sidebar. Supports optional header, network selector, and configurable sidebar position.',
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
    children: {
      table: { disable: true },
    },
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
    sidebarPosition: {
      control: 'radio',
      options: ['left', 'right'],
      description: 'Position of the sidebar',
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default two-column layout with left sidebar using compound components pattern
 */
export const Default: Story = {
  args: {
    children: <></>,
    showHeader: false,
    showNetworkSelector: false,
    fullWidth: false,
    sidebarPosition: 'left',
  },
  render: args => (
    <Sidebar {...args}>
      <Sidebar.Aside>
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Sidebar</h2>
          <nav className="space-y-2">
            <a href="#" className="block rounded-md px-3 py-2 text-slate-300 hover:bg-slate-700">
              Navigation Item 1
            </a>
            <a href="#" className="block rounded-md px-3 py-2 text-slate-300 hover:bg-slate-700">
              Navigation Item 2
            </a>
            <a href="#" className="block rounded-md px-3 py-2 text-slate-300 hover:bg-slate-700">
              Navigation Item 3
            </a>
          </nav>
        </div>
      </Sidebar.Aside>
      <Sidebar.Main>
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-8">
          <h1 className="mb-4 text-3xl font-bold text-white">Main Content</h1>
          <p className="text-slate-300">This is the main content area with sidebar on the left.</p>
        </div>
      </Sidebar.Main>
    </Sidebar>
  ),
};

/**
 * Two-column layout with right sidebar using compound components pattern
 */
export const RightSidebar: Story = {
  args: {
    children: <></>,
    showHeader: false,
    showNetworkSelector: false,
    fullWidth: false,
    sidebarPosition: 'right',
  },
  render: args => (
    <Sidebar {...args}>
      <Sidebar.Main>
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-8">
          <h1 className="mb-4 text-3xl font-bold text-white">Main Content</h1>
          <p className="text-slate-300">This is the main content area with sidebar on the right.</p>
        </div>
      </Sidebar.Main>
      <Sidebar.Aside>
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Sidebar</h2>
          <div className="space-y-4">
            <div className="rounded-md bg-slate-700 p-4">
              <p className="text-sm text-slate-300">Widget 1</p>
            </div>
            <div className="rounded-md bg-slate-700 p-4">
              <p className="text-sm text-slate-300">Widget 2</p>
            </div>
          </div>
        </div>
      </Sidebar.Aside>
    </Sidebar>
  ),
};

/**
 * Layout with header and left sidebar using compound components pattern
 */
export const WithHeader: Story = {
  args: {
    children: <></>,
    showHeader: true,
    showNetworkSelector: false,
    fullWidth: false,
    sidebarPosition: 'left',
  },
  render: args => (
    <Sidebar {...args}>
      <Sidebar.Aside>
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Sidebar</h2>
          <nav className="space-y-2">
            <a href="#" className="block rounded-md px-3 py-2 text-slate-300 hover:bg-slate-700">
              Navigation Item 1
            </a>
            <a href="#" className="block rounded-md px-3 py-2 text-slate-300 hover:bg-slate-700">
              Navigation Item 2
            </a>
          </nav>
        </div>
      </Sidebar.Aside>
      <Sidebar.Main>
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-8">
          <h1 className="mb-4 text-3xl font-bold text-white">Page with Header</h1>
          <p className="text-slate-300">This layout includes the header with navigation.</p>
        </div>
      </Sidebar.Main>
    </Sidebar>
  ),
};

/**
 * Layout with header and network selector using compound components pattern
 */
export const WithHeaderAndNetworkSelector: Story = {
  args: {
    children: <></>,
    showHeader: true,
    showNetworkSelector: true,
    fullWidth: false,
    sidebarPosition: 'left',
  },
  render: args => (
    <Sidebar {...args}>
      <Sidebar.Aside>
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Filters</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Category</label>
              <select className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-300">
                <option>All</option>
                <option>Category 1</option>
                <option>Category 2</option>
              </select>
            </div>
          </div>
        </div>
      </Sidebar.Aside>
      <Sidebar.Main>
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-8">
          <h1 className="mb-4 text-3xl font-bold text-white">Content with Network Selector</h1>
          <p className="text-slate-300">This layout includes both header and network selector.</p>
        </div>
      </Sidebar.Main>
    </Sidebar>
  ),
};

/**
 * Full width two-column layout using compound components pattern
 */
export const FullWidth: Story = {
  args: {
    children: <></>,
    showHeader: true,
    showNetworkSelector: false,
    fullWidth: true,
    sidebarPosition: 'left',
  },
  render: args => (
    <Sidebar {...args}>
      <Sidebar.Aside>
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Sidebar</h2>
          <p className="text-slate-300">Fixed width sidebar</p>
        </div>
      </Sidebar.Aside>
      <Sidebar.Main>
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-8">
          <h1 className="mb-4 text-3xl font-bold text-white">Full Width Layout</h1>
          <p className="text-slate-300">This layout uses full viewport width.</p>
        </div>
      </Sidebar.Main>
    </Sidebar>
  ),
};

/**
 * Complex content with data visualization using compound components pattern
 */
export const WithComplexContent: Story = {
  args: {
    children: <></>,
    showHeader: true,
    showNetworkSelector: true,
    fullWidth: false,
    sidebarPosition: 'right',
  },
  render: args => (
    <Sidebar {...args}>
      <Sidebar.Main>
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-8">
            <h1 className="mb-4 text-3xl font-bold text-white">Dashboard</h1>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-lg bg-slate-700 p-6">
                  <h3 className="mb-2 text-lg font-semibold text-white">Metric {i}</h3>
                  <p className="text-2xl font-bold text-blue-400">123,456</p>
                  <p className="text-sm text-slate-400">+12.5% from last month</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Sidebar.Main>
      <Sidebar.Aside>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">Activity Feed</h2>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-md bg-slate-700 p-3">
                  <p className="text-sm text-slate-300">Activity {i}</p>
                  <p className="text-xs text-slate-500">2 hours ago</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Sidebar.Aside>
    </Sidebar>
  ),
};
