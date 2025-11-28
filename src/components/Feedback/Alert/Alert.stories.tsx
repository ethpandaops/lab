import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from './Alert';

const meta = {
  title: 'Components/Feedback/Alert',
  component: Alert,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className="min-w-80 rounded-lg bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic variants
export const Info: Story = {
  args: {
    variant: 'info',
    title: 'Information',
    description: 'This is an informational alert message.',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Success',
    description: 'Your action was completed successfully.',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Warning',
    description: 'Please review this warning message.',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    title: 'Error',
    description: 'An error occurred while processing your request.',
  },
};

// With description (warning variant from examples)
export const WithDescription: Story = {
  args: {
    variant: 'warning',
    title: 'Attention needed',
    description:
      'Lorem ipsum dolor sit amet consectetur adipisicing elit. Aliquid pariatur, ipsum similique veniam quo totam eius aperiam dolorum.',
  },
};

// With list (error variant from examples)
export const WithList: Story = {
  args: {
    variant: 'error',
    title: 'There were 2 errors with your submission',
    items: [
      'Your password must be at least 8 characters',
      'Your password must include at least one pro wrestling finishing move',
    ],
  },
};

// With actions (success variant from examples)
export const WithActions: Story = {
  args: {
    variant: 'success',
    title: 'Order completed',
    description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Aliquid pariatur, ipsum similique veniam.',
    actions: [
      {
        label: 'View status',
        onClick: () => console.log('View status clicked'),
      },
      {
        label: 'Dismiss',
        onClick: () => console.log('Dismiss clicked'),
      },
    ],
  },
};

// With link on right (info variant from examples)
export const WithLinkOnRight: Story = {
  args: {
    variant: 'info',
    description: "A new software update is available. See what's new in version 2.0.4.",
    link: {
      label: 'Details',
      to: '/about',
    },
  },
};

// With accent border (warning variant from examples)
export const WithAccentBorder: Story = {
  args: {
    variant: 'warning',
    description: (
      <>
        You have no credits left.{' '}
        <a href="#" className="font-medium underline hover:text-yellow-600 dark:hover:text-yellow-200">
          Upgrade your account to add more credits.
        </a>
      </>
    ),
    accentBorder: true,
  },
};

// With dismiss button (success variant from examples)
export const WithDismissButton: Story = {
  args: {
    variant: 'success',
    title: 'Successfully uploaded',
    onDismiss: () => console.log('Dismissed'),
  },
};

// All accent border variants
export const AccentBorderInfo: Story = {
  args: {
    variant: 'info',
    description: 'This is an info alert with accent border.',
    accentBorder: true,
  },
};

export const AccentBorderSuccess: Story = {
  args: {
    variant: 'success',
    description: 'This is a success alert with accent border.',
    accentBorder: true,
  },
};

export const AccentBorderWarning: Story = {
  args: {
    variant: 'warning',
    description: 'This is a warning alert with accent border.',
    accentBorder: true,
  },
};

export const AccentBorderError: Story = {
  args: {
    variant: 'error',
    description: 'This is an error alert with accent border.',
    accentBorder: true,
  },
};

// Complex combination
export const ComplexExample: Story = {
  args: {
    variant: 'error',
    title: 'Account verification failed',
    description: 'We encountered issues while verifying your account. Please review the errors below and try again.',
    items: ['Email address format is invalid', 'Phone number must include country code', 'Date of birth is required'],
    actions: [
      {
        label: 'Update details',
        onClick: () => console.log('Update details clicked'),
      },
      {
        label: 'Contact support',
        onClick: () => console.log('Contact support clicked'),
      },
    ],
  },
};

// With custom icon
export const WithCustomIcon: Story = {
  args: {
    variant: 'info',
    icon: (
      <svg className="size-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
    title: 'Custom icon',
    description: 'This alert uses a custom icon instead of the default.',
  },
};
