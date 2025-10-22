import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChevronDownIcon, Cog6ToothIcon } from '@heroicons/react/20/solid';
import { Popover, PopoverButton, PopoverPanel } from './Popover';

const meta: Meta<typeof Popover> = {
  title: 'Components/Overlays/Popover',
  component: Popover,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Popover>;

/**
 * Basic popover - no padding on panel
 */
export const Default: Story = {
  render: () => (
    <Popover className="relative">
      <PopoverButton variant="primary">Solutions</PopoverButton>
      <PopoverPanel anchor="bottom" className="flex flex-col">
        <a href="#analytics" className="px-3 py-2 text-sm text-foreground hover:bg-primary/10">
          Analytics
        </a>
        <a href="#engagement" className="px-3 py-2 text-sm text-foreground hover:bg-primary/10">
          Engagement
        </a>
        <a href="#security" className="px-3 py-2 text-sm text-foreground hover:bg-primary/10">
          Security
        </a>
      </PopoverPanel>
    </Popover>
  ),
};

/**
 * Popover with Button variants and icons
 */
export const WithButtonVariants: Story = {
  render: () => (
    <Popover className="relative">
      <PopoverButton variant="secondary" trailingIcon={<ChevronDownIcon />}>
        Menu
      </PopoverButton>
      <PopoverPanel anchor="bottom" className="w-48">
        <button type="button" className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-primary/10">
          Profile
        </button>
        <button type="button" className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-primary/10">
          Settings
        </button>
        <button type="button" className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-primary/10">
          Sign out
        </button>
      </PopoverPanel>
    </Popover>
  ),
};

/**
 * Popover with icon button
 */
export const WithIconButton: Story = {
  render: () => (
    <Popover className="relative">
      <PopoverButton variant="secondary" leadingIcon={<Cog6ToothIcon />}>
        Settings
      </PopoverButton>
      <PopoverPanel anchor="bottom" className="w-48">
        <button type="button" className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-primary/10">
          Account
        </button>
        <button type="button" className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-primary/10">
          Privacy
        </button>
        <button type="button" className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-primary/10">
          Notifications
        </button>
      </PopoverPanel>
    </Popover>
  ),
};

/**
 * Popover with custom panel positioning
 */
export const PositionedTop: Story = {
  render: () => (
    <div className="flex h-64 items-end justify-center">
      <Popover className="relative">
        <PopoverButton variant="outline">Open Above</PopoverButton>
        <PopoverPanel anchor="top" className="mb-2 flex flex-col">
          <a href="#item1" className="px-3 py-2 text-sm text-foreground hover:bg-primary/10">
            Item 1
          </a>
          <a href="#item2" className="px-3 py-2 text-sm text-foreground hover:bg-primary/10">
            Item 2
          </a>
        </PopoverPanel>
      </Popover>
    </div>
  ),
};

/**
 * Popover with different button sizes
 */
export const ButtonSizes: Story = {
  render: () => (
    <div className="flex gap-4">
      <Popover className="relative">
        <PopoverButton variant="primary" size="sm">
          Small
        </PopoverButton>
        <PopoverPanel anchor="bottom">
          <a href="#option1" className="block px-3 py-2 text-xs text-foreground hover:bg-primary/10">
            Option 1
          </a>
          <a href="#option2" className="block px-3 py-2 text-xs text-foreground hover:bg-primary/10">
            Option 2
          </a>
        </PopoverPanel>
      </Popover>

      <Popover className="relative">
        <PopoverButton variant="primary" size="md">
          Medium
        </PopoverButton>
        <PopoverPanel anchor="bottom">
          <a href="#option1" className="block px-3 py-2 text-sm text-foreground hover:bg-primary/10">
            Option 1
          </a>
          <a href="#option2" className="block px-3 py-2 text-sm text-foreground hover:bg-primary/10">
            Option 2
          </a>
        </PopoverPanel>
      </Popover>

      <Popover className="relative">
        <PopoverButton variant="primary" size="lg">
          Large
        </PopoverButton>
        <PopoverPanel anchor="bottom">
          <a href="#option1" className="block px-3 py-2 text-sm text-foreground hover:bg-primary/10">
            Option 1
          </a>
          <a href="#option2" className="block px-3 py-2 text-sm text-foreground hover:bg-primary/10">
            Option 2
          </a>
        </PopoverPanel>
      </Popover>
    </div>
  ),
};

/**
 * Popover with rich content
 */
export const RichContent: Story = {
  render: () => (
    <Popover className="relative">
      <PopoverButton variant="soft" trailingIcon={<ChevronDownIcon />}>
        Products
      </PopoverButton>
      <PopoverPanel anchor="bottom" className="w-80">
        <div className="border-b border-border px-3 py-2">
          <h3 className="font-semibold text-foreground">Products</h3>
          <p className="text-xs text-muted">Explore our product offerings</p>
        </div>
        <div>
          <a href="#product1" className="group flex flex-col px-3 py-2 hover:bg-primary/10">
            <span className="text-sm font-medium text-foreground group-hover:text-primary">Analytics</span>
            <span className="text-xs text-muted">Get insights into your data</span>
          </a>
          <a href="#product2" className="group flex flex-col px-3 py-2 hover:bg-primary/10">
            <span className="text-sm font-medium text-foreground group-hover:text-primary">Automation</span>
            <span className="text-xs text-muted">Streamline your workflows</span>
          </a>
          <a href="#product3" className="group flex flex-col px-3 py-2 hover:bg-primary/10">
            <span className="text-sm font-medium text-foreground group-hover:text-primary">Reports</span>
            <span className="text-xs text-muted">Create beautiful reports</span>
          </a>
        </div>
      </PopoverPanel>
    </Popover>
  ),
};

/**
 * Multiple popovers demonstrating independent state
 */
export const MultiplePopovers: Story = {
  render: () => (
    <div className="flex gap-4">
      <Popover className="relative">
        <PopoverButton variant="primary">Menu 1</PopoverButton>
        <PopoverPanel anchor="bottom">
          <a href="#item1" className="block px-3 py-2 text-sm text-foreground hover:bg-primary/10">
            Item 1A
          </a>
          <a href="#item2" className="block px-3 py-2 text-sm text-foreground hover:bg-primary/10">
            Item 1B
          </a>
        </PopoverPanel>
      </Popover>

      <Popover className="relative">
        <PopoverButton variant="secondary">Menu 2</PopoverButton>
        <PopoverPanel anchor="bottom">
          <a href="#item1" className="block px-3 py-2 text-sm text-foreground hover:bg-primary/10">
            Item 2A
          </a>
          <a href="#item2" className="block px-3 py-2 text-sm text-foreground hover:bg-primary/10">
            Item 2B
          </a>
        </PopoverPanel>
      </Popover>

      <Popover className="relative">
        <PopoverButton variant="outline">Menu 3</PopoverButton>
        <PopoverPanel anchor="bottom">
          <a href="#item1" className="block px-3 py-2 text-sm text-foreground hover:bg-primary/10">
            Item 3A
          </a>
          <a href="#item2" className="block px-3 py-2 text-sm text-foreground hover:bg-primary/10">
            Item 3B
          </a>
        </PopoverPanel>
      </Popover>
    </div>
  ),
};
