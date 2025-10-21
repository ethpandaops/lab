import type { Meta, StoryObj } from '@storybook/react-vite';
import { CheckboxGroup } from './CheckboxGroup';

const meta = {
  title: 'Components/Forms/CheckboxGroup',
  component: CheckboxGroup,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-80 rounded-lg bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof CheckboxGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const notificationOptions = [
  {
    id: 'comments',
    name: 'comments',
    label: 'Comments',
    description: 'Get notified when someone posts a comment on a posting.',
    defaultChecked: true,
  },
  {
    id: 'candidates',
    name: 'candidates',
    label: 'Candidates',
    description: 'Get notified when a candidate applies for a job.',
  },
  {
    id: 'offers',
    name: 'offers',
    label: 'Offers',
    description: 'Get notified when a candidate accepts or rejects an offer.',
  },
];

const inlineOptions = [
  {
    id: 'comments-inline',
    name: 'comments',
    label: 'New comments',
    description: "so you always know what's happening.",
    defaultChecked: true,
  },
  {
    id: 'candidates-inline',
    name: 'candidates',
    label: 'New candidates',
    description: 'who apply for any open postings.',
  },
  {
    id: 'offers-inline',
    name: 'offers',
    label: 'Offers',
    description: 'when they are accepted or rejected by candidates.',
  },
];

const peopleOptions = [
  { id: 'person-1', name: 'person-1', label: 'Annette Black', defaultChecked: true },
  { id: 'person-2', name: 'person-2', label: 'Cody Fisher', defaultChecked: true },
  { id: 'person-3', name: 'person-3', label: 'Courtney Henry' },
  { id: 'person-4', name: 'person-4', label: 'Kathryn Murphy' },
  { id: 'person-5', name: 'person-5', label: 'Theresa Webb' },
];

export const ListWithDescription: Story = {
  args: {
    legend: 'Notifications',
    srOnlyLegend: true,
    options: notificationOptions,
    variant: 'list',
  },
};

export const ListWithInlineDescription: Story = {
  args: {
    legend: 'Notifications',
    srOnlyLegend: true,
    options: inlineOptions,
    variant: 'list-inline',
  },
};

export const ListWithCheckboxRight: Story = {
  args: {
    legend: 'Notifications',
    srOnlyLegend: true,
    options: notificationOptions,
    variant: 'list-right',
  },
};

export const SimpleListWithHeading: Story = {
  args: {
    legend: 'Members',
    srOnlyLegend: false,
    options: peopleOptions,
    variant: 'simple',
  },
};

export const WithIndeterminate: Story = {
  args: {
    legend: 'Select options',
    srOnlyLegend: false,
    options: [
      {
        id: 'option-1',
        name: 'option-1',
        label: 'Option 1',
        description: 'This option is checked',
        defaultChecked: true,
      },
      {
        id: 'option-2',
        name: 'option-2',
        label: 'Option 2',
        description: 'This option is indeterminate',
        indeterminate: true,
      },
      {
        id: 'option-3',
        name: 'option-3',
        label: 'Option 3',
        description: 'This option is unchecked',
      },
    ],
    variant: 'list',
  },
};

export const WithDisabled: Story = {
  args: {
    legend: 'Options',
    srOnlyLegend: false,
    options: [
      {
        id: 'enabled',
        name: 'enabled',
        label: 'Enabled option',
        description: 'This option is enabled',
        defaultChecked: true,
      },
      {
        id: 'disabled-unchecked',
        name: 'disabled-unchecked',
        label: 'Disabled unchecked',
        description: 'This option is disabled and unchecked',
        disabled: true,
      },
      {
        id: 'disabled-checked',
        name: 'disabled-checked',
        label: 'Disabled checked',
        description: 'This option is disabled and checked',
        disabled: true,
        defaultChecked: true,
      },
    ],
    variant: 'list',
  },
};

export const AllVariantsComparison: Story = {
  args: {} as never,
  render: () => (
    <div className="space-y-12">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-foreground">List with Description</h3>
        <CheckboxGroup legend="Notifications" srOnlyLegend={true} options={notificationOptions} variant="list" />
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-foreground">List with Inline Description</h3>
        <CheckboxGroup legend="Notifications" srOnlyLegend={true} options={inlineOptions} variant="list-inline" />
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-foreground">List with Checkbox Right</h3>
        <CheckboxGroup legend="Notifications" srOnlyLegend={true} options={notificationOptions} variant="list-right" />
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-foreground">Simple List with Heading</h3>
        <CheckboxGroup legend="Members" srOnlyLegend={false} options={peopleOptions} variant="simple" />
      </div>
    </div>
  ),
};
