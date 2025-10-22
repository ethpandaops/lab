import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  EnvelopeIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  UsersIcon,
  BarsArrowUpIcon,
} from '@heroicons/react/20/solid';
import { Input } from './Input';

const meta = {
  title: 'Components/Forms/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'The size of the input',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    variant: {
      control: 'select',
      options: ['default', 'error', 'gray'],
      description: 'The visual variant of the input',
      table: {
        defaultValue: { summary: 'default' },
      },
    },
    error: {
      control: 'boolean',
      description: 'Whether the input has an error state',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
    },
    readOnly: {
      control: 'boolean',
      description: 'Whether the input is read-only',
    },
    grayBackground: {
      control: 'boolean',
      description: 'Use gray background with bottom border only',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    label: {
      control: 'text',
      description: 'Label text for the input',
    },
    helperText: {
      control: 'text',
      description: 'Helper text displayed below the input',
    },
    errorMessage: {
      control: 'text',
      description: 'Error message to display below the input',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    insetLabel: {
      control: 'text',
      description: 'Inset label displayed inside the input at the top',
    },
    overlappingLabel: {
      control: 'text',
      description: 'Overlapping label displayed above the input border',
    },
    keyboardShortcut: {
      control: 'text',
      description: 'Keyboard shortcut hint displayed on the right inside the input',
    },
    type: {
      control: 'text',
      description: 'Input type attribute',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic input with placeholder
 */
export const Basic: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input type="email" placeholder="you@example.com" size="sm" />
      <Input type="email" placeholder="you@example.com" size="md" />
      <Input type="email" placeholder="you@example.com" size="lg" />
    </div>
  ),
};

/**
 * Input with label
 */
export const WithLabel: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Email address" type="email" placeholder="you@example.com" size="sm" />
      <Input label="Email address" type="email" placeholder="you@example.com" size="md" />
      <Input label="Email address" type="email" placeholder="you@example.com" size="lg" />
    </div>
  ),
};

/**
 * Input with helper text
 */
export const WithHelperText: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        helperText="We'll never share your email with anyone else."
        size="sm"
      />
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        helperText="We'll never share your email with anyone else."
        size="md"
      />
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        helperText="We'll never share your email with anyone else."
        size="lg"
      />
    </div>
  ),
};

/**
 * Input in error state with error message
 */
export const Error: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        defaultValue="invalid-email"
        error
        errorMessage="Please enter a valid email address"
        size="sm"
      />
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        defaultValue="invalid-email"
        error
        errorMessage="Please enter a valid email address"
        size="md"
      />
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        defaultValue="invalid-email"
        error
        errorMessage="Please enter a valid email address"
        size="lg"
      />
    </div>
  ),
};

/**
 * Input with a leading icon
 */
export const LeadingIcon: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        leadingIcon={<EnvelopeIcon />}
        size="sm"
      />
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        leadingIcon={<EnvelopeIcon />}
        size="md"
      />
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        leadingIcon={<EnvelopeIcon />}
        size="lg"
      />
    </div>
  ),
};

/**
 * Input with a trailing icon (add-on)
 */
export const TrailingIcon: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input
        label="Account number"
        type="text"
        placeholder="000-00-0000"
        trailingIcon={<QuestionMarkCircleIcon />}
        size="sm"
      />
      <Input
        label="Account number"
        type="text"
        placeholder="000-00-0000"
        trailingIcon={<QuestionMarkCircleIcon />}
        size="md"
      />
      <Input
        label="Account number"
        type="text"
        placeholder="000-00-0000"
        trailingIcon={<QuestionMarkCircleIcon />}
        size="lg"
      />
    </div>
  ),
};

/**
 * Input with both leading and trailing icons
 */
export const LeadingAndTrailingIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input
        label="Search"
        type="text"
        placeholder="Search..."
        leadingIcon={<MagnifyingGlassIcon />}
        trailingIcon={<QuestionMarkCircleIcon />}
        size="sm"
      />
      <Input
        label="Search"
        type="text"
        placeholder="Search..."
        leadingIcon={<MagnifyingGlassIcon />}
        trailingIcon={<QuestionMarkCircleIcon />}
        size="md"
      />
      <Input
        label="Search"
        type="text"
        placeholder="Search..."
        leadingIcon={<MagnifyingGlassIcon />}
        trailingIcon={<QuestionMarkCircleIcon />}
        size="lg"
      />
    </div>
  ),
};

/**
 * Input with external leading add-on (separate box)
 */
export const ExternalLeadingAddon: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input
        label="Company website"
        type="text"
        placeholder="www.example.com"
        leadingAddon={{ content: 'https://' }}
        size="sm"
      />
      <Input
        label="Company website"
        type="text"
        placeholder="www.example.com"
        leadingAddon={{ content: 'https://' }}
        size="md"
      />
      <Input
        label="Company website"
        type="text"
        placeholder="www.example.com"
        leadingAddon={{ content: 'https://' }}
        size="lg"
      />
    </div>
  ),
};

/**
 * Input with external trailing add-on
 */
export const ExternalTrailingAddon: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Username" type="text" placeholder="johndoe" trailingAddon={{ content: '@example.com' }} size="sm" />
      <Input label="Username" type="text" placeholder="johndoe" trailingAddon={{ content: '@example.com' }} size="md" />
      <Input label="Username" type="text" placeholder="johndoe" trailingAddon={{ content: '@example.com' }} size="lg" />
    </div>
  ),
};

/**
 * Input with inline leading add-on (inside border)
 */
export const InlineLeadingAddon: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input
        label="Company website"
        type="text"
        placeholder="www.example.com"
        leadingAddonInline={{ content: 'https://' }}
        size="sm"
      />
      <Input
        label="Company website"
        type="text"
        placeholder="www.example.com"
        leadingAddonInline={{ content: 'https://' }}
        size="md"
      />
      <Input
        label="Company website"
        type="text"
        placeholder="www.example.com"
        leadingAddonInline={{ content: 'https://' }}
        size="lg"
      />
    </div>
  ),
};

/**
 * Input with inline trailing add-on
 */
export const InlineTrailingAddon: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Domain" type="text" placeholder="example" trailingAddonInline={{ content: '.com' }} size="sm" />
      <Input label="Domain" type="text" placeholder="example" trailingAddonInline={{ content: '.com' }} size="md" />
      <Input label="Domain" type="text" placeholder="example" trailingAddonInline={{ content: '.com' }} size="lg" />
    </div>
  ),
};

/**
 * Input with inline leading and trailing add-ons
 */
export const InlineLeadingAndTrailingAddons: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input
        label="Price"
        type="text"
        placeholder="0.00"
        leadingAddonInline={{ content: '$' }}
        trailingAddonInline={{ content: 'USD' }}
        size="sm"
      />
      <Input
        label="Price"
        type="text"
        placeholder="0.00"
        leadingAddonInline={{ content: '$' }}
        trailingAddonInline={{ content: 'USD' }}
        size="md"
      />
      <Input
        label="Price"
        type="text"
        placeholder="0.00"
        leadingAddonInline={{ content: '$' }}
        trailingAddonInline={{ content: 'USD' }}
        size="lg"
      />
    </div>
  ),
};

/**
 * Input with leading select dropdown
 */
export const InlineLeadingDropdown: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input
        label="Phone number"
        type="text"
        placeholder="123-456-7890"
        leadingSelect={{
          id: 'country-sm',
          name: 'country-sm',
          'aria-label': 'Country',
          options: [
            { value: 'US', label: 'US' },
            { value: 'CA', label: 'CA' },
            { value: 'EU', label: 'EU' },
          ],
          defaultValue: 'US',
        }}
        size="sm"
      />
      <Input
        label="Phone number"
        type="text"
        placeholder="123-456-7890"
        leadingSelect={{
          id: 'country-md',
          name: 'country-md',
          'aria-label': 'Country',
          options: [
            { value: 'US', label: 'US' },
            { value: 'CA', label: 'CA' },
            { value: 'EU', label: 'EU' },
          ],
          defaultValue: 'US',
        }}
        size="md"
      />
      <Input
        label="Phone number"
        type="text"
        placeholder="123-456-7890"
        leadingSelect={{
          id: 'country-lg',
          name: 'country-lg',
          'aria-label': 'Country',
          options: [
            { value: 'US', label: 'US' },
            { value: 'CA', label: 'CA' },
            { value: 'EU', label: 'EU' },
          ],
          defaultValue: 'US',
        }}
        size="lg"
      />
    </div>
  ),
};

/**
 * Input with inline leading add-on and trailing dropdown
 */
export const InlineLeadingAddonTrailingDropdown: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input
        label="Price"
        type="text"
        placeholder="0.00"
        leadingAddonInline={{ content: '$' }}
        trailingSelect={{
          id: 'currency-sm',
          name: 'currency-sm',
          'aria-label': 'Currency',
          options: [
            { value: 'USD', label: 'USD' },
            { value: 'CAD', label: 'CAD' },
            { value: 'EUR', label: 'EUR' },
          ],
          defaultValue: 'USD',
        }}
        size="sm"
      />
      <Input
        label="Price"
        type="text"
        placeholder="0.00"
        leadingAddonInline={{ content: '$' }}
        trailingSelect={{
          id: 'currency-md',
          name: 'currency-md',
          'aria-label': 'Currency',
          options: [
            { value: 'USD', label: 'USD' },
            { value: 'CAD', label: 'CAD' },
            { value: 'EUR', label: 'EUR' },
          ],
          defaultValue: 'USD',
        }}
        size="md"
      />
      <Input
        label="Price"
        type="text"
        placeholder="0.00"
        leadingAddonInline={{ content: '$' }}
        trailingSelect={{
          id: 'currency-lg',
          name: 'currency-lg',
          'aria-label': 'Currency',
          options: [
            { value: 'USD', label: 'USD' },
            { value: 'CAD', label: 'CAD' },
            { value: 'EUR', label: 'EUR' },
          ],
          defaultValue: 'USD',
        }}
        size="lg"
      />
    </div>
  ),
};

/**
 * Input with leading icon and trailing button
 */
export const LeadingIconTrailingButton: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input
        label="Search"
        type="text"
        placeholder="John Smith"
        leadingIcon={<UsersIcon />}
        trailingButton={{
          variant: 'secondary',
          leadingIcon: <BarsArrowUpIcon />,
          children: 'Sort',
        }}
        size="sm"
      />
      <Input
        label="Search"
        type="text"
        placeholder="John Smith"
        leadingIcon={<UsersIcon />}
        trailingButton={{
          variant: 'secondary',
          leadingIcon: <BarsArrowUpIcon />,
          children: 'Sort',
        }}
        size="md"
      />
      <Input
        label="Search"
        type="text"
        placeholder="John Smith"
        leadingIcon={<UsersIcon />}
        trailingButton={{
          variant: 'secondary',
          leadingIcon: <BarsArrowUpIcon />,
          children: 'Sort',
        }}
        size="lg"
      />
    </div>
  ),
};

/**
 * Input with inset label
 */
export const InsetLabel: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input type="text" placeholder="Jane Smith" insetLabel="Name" size="sm" />
      <Input type="text" placeholder="Jane Smith" insetLabel="Name" size="md" />
      <Input type="text" placeholder="Jane Smith" insetLabel="Name" size="lg" />
    </div>
  ),
};

/**
 * Input with overlapping label
 */
export const OverlappingLabel: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input type="text" placeholder="Jane Smith" overlappingLabel="Name" size="sm" />
      <Input type="text" placeholder="Jane Smith" overlappingLabel="Name" size="md" />
      <Input type="text" placeholder="Jane Smith" overlappingLabel="Name" size="lg" />
    </div>
  ),
};

/**
 * Input with gray background and bottom border
 */
export const GrayBackground: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Name" type="text" placeholder="Jane Smith" grayBackground size="sm" />
      <Input label="Name" type="text" placeholder="Jane Smith" grayBackground size="md" />
      <Input label="Name" type="text" placeholder="Jane Smith" grayBackground size="lg" />
    </div>
  ),
};

/**
 * Input with keyboard shortcut hint
 */
export const KeyboardShortcut: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Search" type="text" placeholder="Search..." keyboardShortcut="⌘K" size="sm" />
      <Input label="Search" type="text" placeholder="Search..." keyboardShortcut="⌘K" size="md" />
      <Input label="Search" type="text" placeholder="Search..." keyboardShortcut="⌘K" size="lg" />
    </div>
  ),
};

/**
 * Disabled input
 */
export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        disabled
        defaultValue="user@example.com"
        size="sm"
      />
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        disabled
        defaultValue="user@example.com"
        size="md"
      />
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        disabled
        defaultValue="user@example.com"
        size="lg"
      />
    </div>
  ),
};

/**
 * Read-only input
 */
export const ReadOnly: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Email address" type="email" defaultValue="user@example.com" readOnly size="sm" />
      <Input label="Email address" type="email" defaultValue="user@example.com" readOnly size="md" />
      <Input label="Email address" type="email" defaultValue="user@example.com" readOnly size="lg" />
    </div>
  ),
};

/**
 * Showcase of all input variations
 */
export const AllVariations: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <Input type="email" placeholder="you@example.com" label="Basic" />

      <Input type="email" placeholder="you@example.com" label="With Icon" leadingIcon={<EnvelopeIcon />} />

      <Input
        type="email"
        placeholder="you@example.com"
        label="Error State"
        error
        errorMessage="This field is required"
      />

      <Input type="text" placeholder="www.example.com" label="External Add-on" leadingAddon={{ content: 'https://' }} />

      <Input
        type="text"
        placeholder="0.00"
        label="Inline Add-ons"
        leadingAddonInline={{ content: '$' }}
        trailingAddonInline={{ content: 'USD' }}
      />

      <Input type="text" placeholder="Jane Smith" insetLabel="Name" />

      <Input type="text" placeholder="Jane Smith" overlappingLabel="Name" />

      <Input type="text" placeholder="Jane Smith" label="Gray Background" grayBackground />

      <Input type="text" placeholder="Search..." label="Keyboard Shortcut" keyboardShortcut="⌘K" />
    </div>
  ),
};

/**
 * Form example with multiple inputs
 */
export const FormExample: Story = {
  render: () => (
    <form className="flex flex-col gap-4">
      <Input label="Full name" type="text" placeholder="Jane Smith" helperText="Enter your full legal name" required />

      <Input label="Email address" type="email" placeholder="you@example.com" leadingIcon={<EnvelopeIcon />} required />

      <Input
        label="Website"
        type="text"
        placeholder="www.example.com"
        leadingAddon={{ content: 'https://' }}
        helperText="Your personal or company website"
      />

      <Input
        label="Price"
        type="text"
        placeholder="0.00"
        leadingAddonInline={{ content: '$' }}
        trailingSelect={{
          id: 'currency',
          name: 'currency',
          'aria-label': 'Currency',
          options: [
            { value: 'USD', label: 'USD' },
            { value: 'CAD', label: 'CAD' },
            { value: 'EUR', label: 'EUR' },
          ],
          defaultValue: 'USD',
        }}
      />
    </form>
  ),
};
