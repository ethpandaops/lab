import type { Meta, StoryObj } from '@storybook/react-vite';
import { TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { Tab } from './Tab';

const meta = {
  title: 'Components/Navigation/Tab',
  component: Tab,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tab>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic tabs without badges
 */
export const Default: Story = {
  render: () => (
    <TabGroup>
      <TabList className="flex gap-2 border-b border-border">
        <Tab>Overview</Tab>
        <Tab>Details</Tab>
        <Tab>Settings</Tab>
      </TabList>
      <TabPanels className="mt-4">
        <TabPanel>
          <div className="rounded-sm border border-border bg-background p-4 text-sm text-foreground">
            Overview content goes here
          </div>
        </TabPanel>
        <TabPanel>
          <div className="rounded-sm border border-border bg-background p-4 text-sm text-foreground">
            Details content goes here
          </div>
        </TabPanel>
        <TabPanel>
          <div className="rounded-sm border border-border bg-background p-4 text-sm text-foreground">
            Settings content goes here
          </div>
        </TabPanel>
      </TabPanels>
    </TabGroup>
  ),
};

/**
 * Tabs with numeric badges
 */
export const WithBadges: Story = {
  render: () => (
    <TabGroup>
      <TabList className="flex gap-2 border-b border-border">
        <Tab badge="4">Standard</Tab>
        <Tab badge="6">Beacon Chain</Tab>
        <Tab badge="7">Discord</Tab>
      </TabList>
      <TabPanels className="mt-4">
        <TabPanel>
          <div className="rounded-sm border border-border bg-background p-4 text-sm text-foreground">
            Standard formats (4 items)
          </div>
        </TabPanel>
        <TabPanel>
          <div className="rounded-sm border border-border bg-background p-4 text-sm text-foreground">
            Beacon Chain formats (6 items)
          </div>
        </TabPanel>
        <TabPanel>
          <div className="rounded-sm border border-border bg-background p-4 text-sm text-foreground">
            Discord formats (7 items)
          </div>
        </TabPanel>
      </TabPanels>
    </TabGroup>
  ),
};

/**
 * Full width tabs (like in mobile views)
 */
export const FullWidth: Story = {
  render: () => (
    <TabGroup>
      <TabList className="flex border-b border-border">
        <Tab className="flex-1">Propagation</Tab>
        <Tab className="flex-1">Attestations</Tab>
        <Tab className="flex-1">Analysis</Tab>
      </TabList>
      <TabPanels className="mt-4">
        <TabPanel>
          <div className="rounded-sm border border-border bg-background p-4 text-sm text-foreground">
            Propagation data visualization
          </div>
        </TabPanel>
        <TabPanel>
          <div className="rounded-sm border border-border bg-background p-4 text-sm text-foreground">
            Attestation arrivals chart
          </div>
        </TabPanel>
        <TabPanel>
          <div className="rounded-sm border border-border bg-background p-4 text-sm text-foreground">
            Analysis and metrics
          </div>
        </TabPanel>
      </TabPanels>
    </TabGroup>
  ),
};

/**
 * Tabs with custom badge content
 */
export const CustomBadges: Story = {
  render: () => (
    <TabGroup>
      <TabList className="flex gap-2 border-b border-border">
        <Tab badge={<span className="text-success">New</span>}>Features</Tab>
        <Tab badge={<span className="text-warning">Beta</span>}>Beta</Tab>
        <Tab>Stable</Tab>
      </TabList>
      <TabPanels className="mt-4">
        <TabPanel>
          <div className="rounded-sm border border-border bg-background p-4 text-sm text-foreground">
            New features content
          </div>
        </TabPanel>
        <TabPanel>
          <div className="rounded-sm border border-border bg-background p-4 text-sm text-foreground">Beta features</div>
        </TabPanel>
        <TabPanel>
          <div className="rounded-sm border border-border bg-background p-4 text-sm text-foreground">
            Stable features
          </div>
        </TabPanel>
      </TabPanels>
    </TabGroup>
  ),
};
