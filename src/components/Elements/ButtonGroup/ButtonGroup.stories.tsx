import type { Meta, StoryObj } from '@storybook/react-vite';
import { ButtonGroup } from './ButtonGroup';
import { Button } from '@/components/Elements/Button';
import { ChevronLeftIcon, ChevronRightIcon, BookmarkIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';

const meta = {
  title: 'Components/Elements/ButtonGroup',
  component: ButtonGroup,
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
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic text buttons
export const Basic: Story = {
  args: {} as never,
  render: () => (
    <ButtonGroup>
      <Button>Years</Button>
      <Button>Months</Button>
      <Button>Days</Button>
    </ButtonGroup>
  ),
};

// Icon-only buttons
export const IconsOnly: Story = {
  args: {} as never,
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Secondary</p>
        <ButtonGroup>
          <Button variant="secondary" iconOnly leadingIcon={<ChevronLeftIcon />} aria-label="Previous" />
          <Button variant="secondary" iconOnly leadingIcon={<ChevronRightIcon />} aria-label="Next" />
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Outline</p>
        <ButtonGroup>
          <Button variant="outline" iconOnly leadingIcon={<ChevronLeftIcon />} aria-label="Previous" />
          <Button variant="outline" iconOnly leadingIcon={<ChevronRightIcon />} aria-label="Next" />
        </ButtonGroup>
      </div>
    </div>
  ),
};

// Button with icon and stat
export const WithStat: Story = {
  args: {} as never,
  render: () => (
    <ButtonGroup>
      <Button variant="soft" leadingIcon={<BookmarkIcon className="text-gray-400 dark:text-gray-500" />}>
        Bookmark
      </Button>
      <Button variant="soft">12k</Button>
    </ButtonGroup>
  ),
};

// With dropdown menu
const items = [
  { name: 'Save and schedule', href: '#' },
  { name: 'Save and publish', href: '#' },
  { name: 'Export PDF', href: '#' },
];

export const WithDropdown: Story = {
  args: {} as never,
  render: () => (
    <div className="inline-flex rounded-md shadow-xs dark:shadow-none">
      <Button className="rounded-l-md !rounded-r-none !bg-white !text-gray-900 !shadow-none !inset-ring !inset-ring-gray-300 hover:!bg-gray-50 dark:!bg-white/10 dark:!text-white dark:!inset-ring-gray-700 dark:hover:!bg-white/20">
        Save changes
      </Button>
      <Menu as="div" className="relative -ml-px block">
        <MenuButton className="relative inline-flex items-center rounded-r-md bg-white px-2 py-2 text-gray-400 inset-ring inset-ring-gray-300 hover:bg-gray-50 focus:z-10 dark:bg-white/10 dark:inset-ring-gray-700 dark:hover:bg-white/20">
          <span className="sr-only">Open options</span>
          <ChevronDownIcon aria-hidden="true" className="size-5" />
        </MenuButton>
        <MenuItems
          transition
          className="absolute right-0 z-10 mt-2 -mr-1 w-56 origin-top-right rounded-md bg-white shadow-lg outline outline-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10"
        >
          <div className="py-1">
            {items.map(item => (
              <MenuItem key={item.name}>
                <a
                  href={item.href}
                  className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden dark:text-gray-300 dark:data-focus:bg-white/5 dark:data-focus:text-white"
                >
                  {item.name}
                </a>
              </MenuItem>
            ))}
          </div>
        </MenuItems>
      </Menu>
    </div>
  ),
};

// Two button group with different variants
export const TwoButtons: Story = {
  args: {} as never,
  render: () => (
    <ButtonGroup>
      <Button variant="secondary">Cancel</Button>
      <Button variant="primary">Confirm</Button>
    </ButtonGroup>
  ),
};

// Four button group
export const FourButtons: Story = {
  args: {} as never,
  render: () => (
    <ButtonGroup>
      <Button>First</Button>
      <Button>Second</Button>
      <Button>Third</Button>
      <Button>Fourth</Button>
    </ButtonGroup>
  ),
};

// With different sizes
export const DifferentSizes: Story = {
  args: {} as never,
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Small</p>
        <ButtonGroup>
          <Button size="sm">Years</Button>
          <Button size="sm">Months</Button>
          <Button size="sm">Days</Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Medium (default)</p>
        <ButtonGroup>
          <Button size="md">Years</Button>
          <Button size="md">Months</Button>
          <Button size="md">Days</Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Large</p>
        <ButtonGroup>
          <Button size="lg">Years</Button>
          <Button size="lg">Months</Button>
          <Button size="lg">Days</Button>
        </ButtonGroup>
      </div>
    </div>
  ),
};

// Rounded prop variants
export const RoundedProp: Story = {
  args: {} as never,
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Square (default, rounded=false)</p>
        <ButtonGroup>
          <Button>Years</Button>
          <Button>Months</Button>
          <Button>Days</Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Rounded (rounded=true)</p>
        <ButtonGroup rounded>
          <Button>Years</Button>
          <Button>Months</Button>
          <Button>Days</Button>
        </ButtonGroup>
      </div>
    </div>
  ),
};

// Rounded/pill-shaped buttons
export const RoundedButtons: Story = {
  args: {} as never,
  render: () => (
    <ButtonGroup>
      <Button rounded="full">Years</Button>
      <Button rounded="full">Months</Button>
      <Button rounded="full">Days</Button>
    </ButtonGroup>
  ),
};

// Mixed variants
export const MixedVariants: Story = {
  args: {} as never,
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Primary + Secondary</p>
        <ButtonGroup>
          <Button variant="secondary">Back</Button>
          <Button variant="primary">Continue</Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">All Soft</p>
        <ButtonGroup>
          <Button variant="soft">Draft</Button>
          <Button variant="soft">Preview</Button>
          <Button variant="soft">Publish</Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">All Outline</p>
        <ButtonGroup>
          <Button variant="outline">Years</Button>
          <Button variant="outline">Months</Button>
          <Button variant="outline">Days</Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">All Primary</p>
        <ButtonGroup>
          <Button variant="primary">Jan</Button>
          <Button variant="primary">Feb</Button>
          <Button variant="primary">Mar</Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">All Blank</p>
        <ButtonGroup>
          <Button variant="blank">Option 1</Button>
          <Button variant="blank">Option 2</Button>
          <Button variant="blank">Option 3</Button>
        </ButtonGroup>
      </div>
    </div>
  ),
};

// With icons (leading and trailing)
export const WithIcons: Story = {
  args: {} as never,
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Leading icons</p>
        <ButtonGroup>
          <Button variant="secondary" leadingIcon={<ChevronLeftIcon />}>
            Previous
          </Button>
          <Button variant="secondary" leadingIcon={<ChevronRightIcon />}>
            Next
          </Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm/6 text-muted">Trailing icons</p>
        <ButtonGroup>
          <Button variant="soft" trailingIcon={<ChevronLeftIcon />}>
            Prev
          </Button>
          <Button variant="soft" trailingIcon={<ChevronRightIcon />}>
            Next
          </Button>
        </ButtonGroup>
      </div>
    </div>
  ),
};

// Full width button group
export const FullWidth: Story = {
  args: {} as never,
  render: () => (
    <div className="flex w-full flex-col gap-6">
      <ButtonGroup className="w-full">
        <Button className="flex-1 justify-center">Years</Button>
        <Button className="flex-1 justify-center">Months</Button>
        <Button className="flex-1 justify-center">Days</Button>
      </ButtonGroup>
      <ButtonGroup className="w-full">
        <Button variant="secondary" className="flex-1 justify-center">
          Cancel
        </Button>
        <Button variant="primary" className="flex-1 justify-center">
          Confirm
        </Button>
      </ButtonGroup>
      <ButtonGroup className="w-full">
        <Button variant="soft" className="flex-1 justify-center">
          Draft
        </Button>
        <Button variant="soft" className="flex-1 justify-center">
          Preview
        </Button>
        <Button variant="soft" className="flex-1 justify-center">
          Publish
        </Button>
      </ButtonGroup>
    </div>
  ),
};

// Disabled states
export const DisabledStates: Story = {
  args: {} as never,
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm/6 text-muted">All disabled</p>
        <ButtonGroup>
          <Button disabled>Years</Button>
          <Button disabled>Months</Button>
          <Button disabled>Days</Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm/6 text-muted">One disabled (Cancel disabled)</p>
        <ButtonGroup>
          <Button variant="secondary" disabled>
            Cancel
          </Button>
          <Button variant="primary">Confirm</Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm/6 text-muted">One disabled (Confirm disabled)</p>
        <ButtonGroup>
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary" disabled>
            Confirm
          </Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm/6 text-muted">Mixed with icon - one disabled</p>
        <ButtonGroup>
          <Button variant="soft" disabled leadingIcon={<BookmarkIcon className="text-gray-400 dark:text-gray-500" />}>
            Bookmark
          </Button>
          <Button variant="soft">12k</Button>
        </ButtonGroup>
      </div>
    </div>
  ),
};

// All examples
export const AllVariants: Story = {
  args: {} as never,
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm/6 text-muted">Basic text buttons</p>
        <ButtonGroup>
          <Button>Years</Button>
          <Button>Months</Button>
          <Button>Days</Button>
        </ButtonGroup>
      </div>

      <div className="flex flex-col items-start gap-2">
        <p className="text-sm/6 text-muted">Icon-only buttons (secondary)</p>
        <ButtonGroup>
          <Button variant="secondary" iconOnly leadingIcon={<ChevronLeftIcon />} aria-label="Previous" />
          <Button variant="secondary" iconOnly leadingIcon={<ChevronRightIcon />} aria-label="Next" />
        </ButtonGroup>
      </div>

      <div className="flex flex-col items-start gap-2">
        <p className="text-sm/6 text-muted">Icon-only buttons (outline)</p>
        <ButtonGroup>
          <Button variant="outline" iconOnly leadingIcon={<ChevronLeftIcon />} aria-label="Previous" />
          <Button variant="outline" iconOnly leadingIcon={<ChevronRightIcon />} aria-label="Next" />
        </ButtonGroup>
      </div>

      <div className="flex flex-col items-start gap-2">
        <p className="text-sm/6 text-muted">With stat (soft variant)</p>
        <ButtonGroup>
          <Button variant="soft" leadingIcon={<BookmarkIcon className="text-gray-400 dark:text-gray-500" />}>
            Bookmark
          </Button>
          <Button variant="soft">12k</Button>
        </ButtonGroup>
      </div>

      <div className="flex flex-col items-start gap-2">
        <p className="text-sm/6 text-muted">Outline variant</p>
        <ButtonGroup>
          <Button variant="outline">Years</Button>
          <Button variant="outline">Months</Button>
          <Button variant="outline">Days</Button>
        </ButtonGroup>
      </div>

      <div className="flex flex-col items-start gap-2">
        <p className="text-sm/6 text-muted">Mixed variants</p>
        <ButtonGroup>
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary">Confirm</Button>
        </ButtonGroup>
      </div>

      <div className="flex flex-col items-start gap-2">
        <p className="text-sm/6 text-muted">Rounded buttons</p>
        <ButtonGroup>
          <Button rounded="full">Jan</Button>
          <Button rounded="full">Feb</Button>
          <Button rounded="full">Mar</Button>
        </ButtonGroup>
      </div>

      <div className="flex flex-col items-start gap-2">
        <p className="text-sm/6 text-muted">Blank variant</p>
        <ButtonGroup>
          <Button variant="blank">Option 1</Button>
          <Button variant="blank">Option 2</Button>
          <Button variant="blank">Option 3</Button>
        </ButtonGroup>
      </div>
    </div>
  ),
};
