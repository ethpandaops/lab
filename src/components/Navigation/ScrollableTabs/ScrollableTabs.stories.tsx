import type { Meta, StoryObj } from '@storybook/react-vite';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import { ScrollableTabs } from './ScrollableTabs';
import { Tab } from '@/components/Navigation/Tab';

const meta = {
  title: 'Components/Navigation/ScrollableTabs',
  component: ScrollableTabs,
  args: {
    children: <Tab>Overview</Tab>,
  },
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className="min-w-150 rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScrollableTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const manyTabs = [
  'Overview',
  'Block',
  'Attestations',
  'Propagation',
  'Execution',
  'MEV',
  'Validators',
  'Committees',
  'Sync',
  'Advanced',
  'Metrics',
  'Performance',
];

const longLabelTabs = [
  'Very Long Tab Label That Extends',
  'Another Long Label Here',
  'More Extended Content',
  'Additional Information',
  'Extra Details Section',
];

const constrainedTabs = ['Overview', 'Block', 'Attestations', 'Propagation', 'Execution', 'MEV'];

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
        {manyTabs.map(label => (
          <Tab key={label}>{label}</Tab>
        ))}
      </ScrollableTabs>
      <TabPanels className="mt-6">
        {manyTabs.map((label, index) => (
          <TabPanel key={label}>
            <div className="rounded-sm bg-background p-4">Tab {index + 1} content goes here</div>
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
        {longLabelTabs.map(label => (
          <Tab key={label}>{label}</Tab>
        ))}
      </ScrollableTabs>
      <TabPanels className="mt-6">
        {longLabelTabs.map((label, index) => (
          <TabPanel key={label}>
            <div className="rounded-sm bg-background p-4">Tab {index + 1} content goes here</div>
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
          {constrainedTabs.map(label => (
            <Tab key={label}>{label}</Tab>
          ))}
        </ScrollableTabs>
        <TabPanels className="mt-6">
          {constrainedTabs.map((label, index) => (
            <TabPanel key={label}>
              <div className="rounded-sm bg-background p-4">Tab {index + 1} content goes here</div>
            </TabPanel>
          ))}
        </TabPanels>
      </TabGroup>
    </div>
  ),
};

/**
 * The last tab selected on load scrolls into view, clear of the arrows
 */
export const SelectedOnLoad: Story = {
  render: () => (
    <div className="w-80">
      <TabGroup defaultIndex={11}>
        <ScrollableTabs>
          {manyTabs.map(label => (
            <Tab key={label}>{label}</Tab>
          ))}
        </ScrollableTabs>
      </TabGroup>
    </div>
  ),
};
