import type { Meta, StoryObj } from '@storybook/react-vite';
import { CopyToClipboard } from './CopyToClipboard';

const meta = {
  title: 'Components/Elements/CopyToClipboard',
  component: CopyToClipboard,
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
} satisfies Meta<typeof CopyToClipboard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default clipboard icon button with text content
 */
export const Default: Story = {
  args: {
    content: 'Hello World! This text will be copied to your clipboard.',
  },
};

/**
 * Copy with a custom success message
 */
export const CustomSuccessMessage: Story = {
  args: {
    content: 'Custom message example',
    successMessage: 'Text copied successfully!',
  },
};

/**
 * Custom trigger button with text content
 */
export const CustomTrigger: Story = {
  args: {
    content: 'This is copied when you click the custom button',
    children: (
      <button
        type="button"
        className="rounded-sm bg-primary px-4 py-2 text-sm/6 font-medium text-white transition-colors hover:bg-primary/90"
      >
        Copy Text
      </button>
    ),
  },
};

/**
 * Disabled state
 */
export const Disabled: Story = {
  args: {
    content: 'This cannot be copied',
    disabled: true,
  },
};

/**
 * With callbacks for success and error
 */
export const WithCallbacks: Story = {
  args: {
    content: 'Text with callbacks',
    onSuccess: () => console.log('Successfully copied!'),
    onError: (error: Error) => console.error('Copy failed:', error),
  },
};

/**
 * Copy URL example
 */
export const CopyURL: Story = {
  args: {
    content: 'https://github.com/ethpandaops/lab',
    successMessage: 'URL copied to clipboard!',
  },
};

/**
 * Copy JSON data
 */
export const CopyJSON: Story = {
  args: {
    content: JSON.stringify(
      {
        network: 'mainnet',
        slot: 1234567,
        epoch: 38580,
      },
      null,
      2
    ),
    successMessage: 'JSON data copied!',
    children: (
      <button
        type="button"
        className="rounded-sm bg-accent px-3 py-1.5 text-xs/5 font-medium text-white transition-colors hover:bg-accent/90"
      >
        Copy JSON
      </button>
    ),
  },
};

/**
 * Async content preparation (e.g., for generating images)
 * Simulates preparing content asynchronously before copying
 */
export const AsyncContent: Story = {
  args: {
    content: async () => {
      // Simulate async content preparation (e.g., image generation)
      await new Promise(resolve => setTimeout(resolve, 500));
      return 'Asynchronously prepared content!';
    },
    successMessage: 'Async content copied!',
    children: (
      <button
        type="button"
        className="rounded-sm bg-secondary px-4 py-2 text-sm/6 font-medium text-white transition-colors hover:bg-secondary/90"
      >
        Copy Async Content
      </button>
    ),
  },
};
