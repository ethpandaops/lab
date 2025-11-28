import type { Meta, StoryObj } from '@storybook/react-vite';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import { ScrollableTabs } from './ScrollableTabs';
import { Tab } from '../Tab';

const meta = {
  title: 'Components/Navigation/ScrollableTabs',
  component: ScrollableTabs,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScrollableTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic scrollable tabs with a few items
 */
export const Default: Story = {
  render: () => (
    <TabGroup>
      <ScrollableTabs>
        <Tab>Overview</Tab>
        <Tab>Details</Tab>
        <Tab>Settings</Tab>
        <Tab>Advanced</Tab>
      </ScrollableTabs>
      <TabPanels className="mt-6">
        <TabPanel>
          <div className="rounded-sm bg-background p-4">Overview content goes here</div>
        </TabPanel>
        <TabPanel>
          <div className="rounded-sm bg-background p-4">Details content goes here</div>
        </TabPanel>
        <TabPanel>
          <div className="rounded-sm bg-background p-4">Settings content goes here</div>
        </TabPanel>
        <TabPanel>
          <div className="rounded-sm bg-background p-4">Advanced content goes here</div>
        </TabPanel>
      </TabPanels>
    </TabGroup>
  ),
};

/**
 * Many tabs that require scrolling (resize viewport to see arrows)
 */
export const ManyTabs: Story = {
  render: () => (
    <TabGroup>
      <ScrollableTabs>
        <Tab>Overview</Tab>
        <Tab>Block</Tab>
        <Tab>Attestations</Tab>
        <Tab>Propagation</Tab>
        <Tab>Execution</Tab>
        <Tab>MEV</Tab>
        <Tab>Validators</Tab>
        <Tab>Committees</Tab>
        <Tab>Sync</Tab>
        <Tab>Advanced</Tab>
        <Tab>Metrics</Tab>
        <Tab>Performance</Tab>
      </ScrollableTabs>
      <TabPanels className="mt-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <TabPanel key={i}>
            <div className="rounded-sm bg-background p-4">Tab {i + 1} content goes here</div>
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  ),
};

/**
 * Tabs with very long labels
 */
export const LongLabels: Story = {
  render: () => (
    <TabGroup>
      <ScrollableTabs>
        <Tab>Very Long Tab Label That Extends</Tab>
        <Tab>Another Long Label Here</Tab>
        <Tab>More Extended Content</Tab>
        <Tab>Additional Information</Tab>
        <Tab>Extra Details Section</Tab>
      </ScrollableTabs>
      <TabPanels className="mt-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <TabPanel key={i}>
            <div className="rounded-sm bg-background p-4">Tab {i + 1} content goes here</div>
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  ),
};

/**
 * Tabs in a constrained width container
 */
export const ConstrainedWidth: Story = {
  render: () => (
    <div className="max-w-md">
      <TabGroup>
        <ScrollableTabs>
          <Tab>Overview</Tab>
          <Tab>Block</Tab>
          <Tab>Attestations</Tab>
          <Tab>Propagation</Tab>
          <Tab>Execution</Tab>
          <Tab>MEV</Tab>
        </ScrollableTabs>
        <TabPanels className="mt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <TabPanel key={i}>
              <div className="rounded-sm bg-background p-4">Tab {i + 1} content goes here</div>
            </TabPanel>
          ))}
        </TabPanels>
      </TabGroup>
    </div>
  ),
};
