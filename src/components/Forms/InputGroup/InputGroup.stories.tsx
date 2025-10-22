import type { Meta, StoryObj } from '@storybook/react-vite';
import { InputGroup } from './InputGroup';
import { Button } from '@/components/Elements/Button';
import { ButtonGroup } from '@/components/Elements/ButtonGroup';
import {
  EnvelopeIcon,
  QuestionMarkCircleIcon,
  BarsArrowUpIcon,
  UsersIcon,
  ChevronDownIcon,
  FunnelIcon,
} from '@heroicons/react/16/solid';

const meta = {
  title: 'Components/Forms/InputGroup',
  component: InputGroup,
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
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'you@example.com',
  },
};

export const WithHelpText: Story = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'you@example.com',
    helpText: "We'll only use this for spam.",
  },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'you@example.com',
    defaultValue: 'adamwathan',
    error: 'Not a valid email address.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'you@example.com',
    defaultValue: 'you@example.com',
    disabled: true,
  },
};

export const WithCornerHint: Story = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'you@example.com',
    cornerHint: 'Optional',
  },
};

export const WithLeadingIcon: Story = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'you@example.com',
    leadingIcon: <EnvelopeIcon />,
  },
};

export const WithTrailingIcon: Story = {
  args: {
    label: 'Account number',
    type: 'text',
    placeholder: '000-00-0000',
    trailingIcon: <QuestionMarkCircleIcon />,
  },
};

export const WithLeadingAddon: Story = {
  args: {
    label: 'Company website',
    type: 'text',
    placeholder: 'www.example.com',
    leadingAddon: 'https://',
  },
};

export const WithInlineLeadingAddon: Story = {
  args: {
    label: 'Company website',
    type: 'text',
    placeholder: 'www.example.com',
    inlineLeadingAddon: 'https://',
  },
};

export const WithInlineLeadingAndTrailingAddons: Story = {
  args: {
    label: 'Price',
    type: 'text',
    placeholder: '0.00',
    inlineLeadingAddon: '$',
    inlineTrailingAddon: 'USD',
  },
};

export const WithLeadingDropdown: Story = {
  args: {
    label: 'Phone number',
    type: 'text',
    placeholder: '123-456-7890',
    leadingDropdown: (
      <>
        <select
          id="country"
          name="country"
          autoComplete="country"
          aria-label="Country"
          className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-7 pl-3 text-base text-gray-500 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 dark:bg-transparent dark:text-gray-400 dark:*:bg-gray-800 dark:placeholder:text-gray-500 dark:focus:outline-primary"
        >
          <option>US</option>
          <option>CA</option>
          <option>EU</option>
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4 dark:text-gray-400"
        />
      </>
    ),
  },
};

export const WithInlineLeadingAddonAndTrailingDropdown: Story = {
  args: {
    label: 'Price',
    type: 'text',
    placeholder: '0.00',
    inlineLeadingAddon: '$',
    trailingDropdown: (
      <>
        <select
          id="currency"
          name="currency"
          aria-label="Currency"
          className="col-start-1 row-start-1 w-full appearance-none rounded-md py-1.5 pr-7 pl-3 text-base text-gray-500 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6 dark:bg-gray-800 dark:text-gray-400 dark:*:bg-gray-800 dark:placeholder:text-gray-500 dark:focus:outline-primary"
        >
          <option>USD</option>
          <option>CAD</option>
          <option>EUR</option>
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4 dark:text-gray-400"
        />
      </>
    ),
  },
};

export const WithLeadingIconAndTrailingButton: Story = {
  args: {
    label: 'Search candidates',
    type: 'text',
    placeholder: 'John Smith',
    leadingIcon: <UsersIcon />,
    trailingButton: (
      <Button variant="secondary" size="md" leadingIcon={<BarsArrowUpIcon />} className="rounded-l-none rounded-r-md">
        Sort
      </Button>
    ),
  },
};

export const WithLeadingIconAndTrailingButtonGroup: Story = {
  args: {
    label: 'Search candidates',
    type: 'text',
    placeholder: 'John Smith',
    leadingIcon: <UsersIcon />,
    trailingButton: (
      <ButtonGroup>
        <Button variant="secondary" size="md" leadingIcon={<FunnelIcon />} className="rounded-l-none">
          Filter
        </Button>
        <Button variant="secondary" size="md" leadingIcon={<BarsArrowUpIcon />} className="rounded-r-md">
          Sort
        </Button>
      </ButtonGroup>
    ),
  },
};

export const InsetLabel: Story = {
  args: {
    label: 'Name',
    type: 'text',
    placeholder: 'Jane Smith',
    variant: 'inset',
  },
};

export const OverlappingLabel: Story = {
  args: {
    label: 'Name',
    type: 'text',
    placeholder: 'Jane Smith',
    variant: 'overlapping',
  },
};

export const PillShape: Story = {
  args: {
    label: 'Name',
    type: 'text',
    placeholder: 'Jane Smith',
    variant: 'pill',
  },
};

export const BottomBorder: Story = {
  args: {
    label: 'Name',
    type: 'text',
    placeholder: 'Jane Smith',
    variant: 'bottom-border',
  },
};

export const WithKeyboardShortcut: Story = {
  args: {
    label: 'Quick search',
    type: 'text',
    keyboardShortcut: '⌘K',
  },
};
