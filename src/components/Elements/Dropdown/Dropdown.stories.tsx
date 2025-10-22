import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  ArchiveBoxIcon,
  ArrowRightCircleIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  EllipsisVerticalIcon,
  HeartIcon,
  PencilSquareIcon,
  TrashIcon,
  UserPlusIcon,
} from '@heroicons/react/20/solid';
import { Dropdown, DropdownItem, DropdownHeader, DropdownSection } from './Dropdown';
import { Button } from '../Button';

const meta: Meta<typeof Dropdown> = {
  title: 'Components/Elements/Dropdown',
  component: Dropdown,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Dropdown>;

/**
 * A simple dropdown with basic menu items
 */
export const Simple: Story = {
  args: {
    trigger: (
      <Button variant="secondary" trailingIcon={<ChevronDownIcon />}>
        Options
      </Button>
    ),
    children: (
      <DropdownSection>
        <DropdownItem>Account settings</DropdownItem>
        <DropdownItem>Support</DropdownItem>
        <DropdownItem>License</DropdownItem>
        <DropdownItem>Sign out</DropdownItem>
      </DropdownSection>
    ),
  },
};

/**
 * Dropdown with dividers separating sections of menu items
 */
export const WithDividers: Story = {
  args: {
    trigger: (
      <Button variant="secondary" trailingIcon={<ChevronDownIcon />}>
        Options
      </Button>
    ),
    withDividers: true,
    children: (
      <>
        <DropdownSection>
          <DropdownItem>Edit</DropdownItem>
          <DropdownItem>Duplicate</DropdownItem>
        </DropdownSection>
        <DropdownSection>
          <DropdownItem>Archive</DropdownItem>
          <DropdownItem>Move</DropdownItem>
        </DropdownSection>
        <DropdownSection>
          <DropdownItem>Share</DropdownItem>
          <DropdownItem>Add to favorites</DropdownItem>
        </DropdownSection>
        <DropdownSection>
          <DropdownItem variant="danger">Delete</DropdownItem>
        </DropdownSection>
      </>
    ),
  },
};

/**
 * Dropdown with icons alongside menu items
 */
export const WithIcons: Story = {
  args: {
    trigger: (
      <Button variant="secondary" trailingIcon={<ChevronDownIcon />}>
        Options
      </Button>
    ),
    withDividers: true,
    children: (
      <>
        <DropdownSection>
          <DropdownItem icon={<PencilSquareIcon />}>Edit</DropdownItem>
          <DropdownItem icon={<DocumentDuplicateIcon />}>Duplicate</DropdownItem>
        </DropdownSection>
        <DropdownSection>
          <DropdownItem icon={<ArchiveBoxIcon />}>Archive</DropdownItem>
          <DropdownItem icon={<ArrowRightCircleIcon />}>Move</DropdownItem>
        </DropdownSection>
        <DropdownSection>
          <DropdownItem icon={<UserPlusIcon />}>Share</DropdownItem>
          <DropdownItem icon={<HeartIcon />}>Add to favorites</DropdownItem>
        </DropdownSection>
        <DropdownSection>
          <DropdownItem icon={<TrashIcon />} variant="danger">
            Delete
          </DropdownItem>
        </DropdownSection>
      </>
    ),
  },
};

/**
 * Dropdown with a minimal icon button trigger
 */
export const WithMinimalMenuIcon: Story = {
  args: {
    trigger: (
      <button
        type="button"
        className="flex items-center rounded-full text-gray-400 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-gray-400 dark:hover:text-gray-300 dark:focus-visible:outline-primary"
      >
        <span className="sr-only">Open options</span>
        <EllipsisVerticalIcon aria-hidden="true" className="size-5" />
      </button>
    ),
    children: (
      <DropdownSection>
        <DropdownItem>Account settings</DropdownItem>
        <DropdownItem>Support</DropdownItem>
        <DropdownItem>License</DropdownItem>
        <DropdownItem>Sign out</DropdownItem>
      </DropdownSection>
    ),
  },
};

/**
 * Dropdown with a header section showing user information
 */
export const WithHeader: Story = {
  args: {
    trigger: (
      <Button variant="secondary" trailingIcon={<ChevronDownIcon />}>
        Options
      </Button>
    ),
    withDividers: true,
    children: (
      <>
        <DropdownHeader>
          <p className="text-sm text-muted">Signed in as</p>
          <p className="truncate text-sm font-medium text-foreground">tom@example.com</p>
        </DropdownHeader>
        <DropdownSection>
          <DropdownItem>Account settings</DropdownItem>
          <DropdownItem>Support</DropdownItem>
          <DropdownItem>License</DropdownItem>
        </DropdownSection>
        <DropdownSection>
          <DropdownItem>Sign out</DropdownItem>
        </DropdownSection>
      </>
    ),
  },
};

/**
 * Dropdown aligned to the left
 */
export const AlignedLeft: Story = {
  args: {
    trigger: (
      <Button variant="secondary" trailingIcon={<ChevronDownIcon />}>
        Options
      </Button>
    ),
    align: 'left',
    children: (
      <DropdownSection>
        <DropdownItem icon={<PencilSquareIcon />}>Edit</DropdownItem>
        <DropdownItem icon={<DocumentDuplicateIcon />}>Duplicate</DropdownItem>
        <DropdownItem icon={<TrashIcon />} variant="danger">
          Delete
        </DropdownItem>
      </DropdownSection>
    ),
  },
};

/**
 * Dropdown with disabled items
 */
export const WithDisabledItems: Story = {
  args: {
    trigger: (
      <Button variant="secondary" trailingIcon={<ChevronDownIcon />}>
        Options
      </Button>
    ),
    children: (
      <DropdownSection>
        <DropdownItem icon={<PencilSquareIcon />}>Edit</DropdownItem>
        <DropdownItem icon={<DocumentDuplicateIcon />} disabled>
          Duplicate (disabled)
        </DropdownItem>
        <DropdownItem icon={<TrashIcon />} variant="danger">
          Delete
        </DropdownItem>
      </DropdownSection>
    ),
  },
};

/**
 * Dropdown with links instead of buttons
 */
export const WithLinks: Story = {
  args: {
    trigger: (
      <Button variant="secondary" trailingIcon={<ChevronDownIcon />}>
        Navigation
      </Button>
    ),
    children: (
      <DropdownSection>
        <DropdownItem href="#home">Home</DropdownItem>
        <DropdownItem href="#about">About</DropdownItem>
        <DropdownItem href="#contact">Contact</DropdownItem>
      </DropdownSection>
    ),
  },
};

/**
 * Dropdown using different button variants
 */
export const DifferentButtonVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <Dropdown
        trigger={
          <Button variant="primary" trailingIcon={<ChevronDownIcon />}>
            Primary
          </Button>
        }
      >
        <DropdownSection>
          <DropdownItem>Option 1</DropdownItem>
          <DropdownItem>Option 2</DropdownItem>
        </DropdownSection>
      </Dropdown>

      <Dropdown
        trigger={
          <Button variant="soft" trailingIcon={<ChevronDownIcon />}>
            Soft
          </Button>
        }
      >
        <DropdownSection>
          <DropdownItem>Option 1</DropdownItem>
          <DropdownItem>Option 2</DropdownItem>
        </DropdownSection>
      </Dropdown>

      <Dropdown
        trigger={
          <Button variant="outline" trailingIcon={<ChevronDownIcon />}>
            Outline
          </Button>
        }
      >
        <DropdownSection>
          <DropdownItem>Option 1</DropdownItem>
          <DropdownItem>Option 2</DropdownItem>
        </DropdownSection>
      </Dropdown>
    </div>
  ),
};
