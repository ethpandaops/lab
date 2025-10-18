import type { Meta, StoryObj } from '@storybook/react-vite';
import { FatalError } from './FatalError';

const meta: Meta = {
  title: 'Components/FatalError',
  component: FatalError,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: {
        inline: false,
        iframeHeight: 600,
      },
    },
  },
  decorators: [
    Story => (
      <div className="relative h-[600px] w-full">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

/**
 * Default fatal error display with a generic error message
 */
export const Default: Story = {
  args: {
    error: new Error('An unexpected error occurred'),
  },
};

/**
 * Fatal error with a network-related error message
 */
export const NetworkError: Story = {
  args: {
    error: new Error('Failed to fetch data from the server'),
  },
};

/**
 * Fatal error with a long error message
 */
export const LongErrorMessage: Story = {
  args: {
    error: new Error(
      'Failed to initialize application: Unable to connect to the backend API at https://api.example.com/v1/config. Please check your network connection and try again.'
    ),
  },
};

/**
 * Fatal error with a route-specific error
 */
export const RouteError: Story = {
  args: {
    error: new Error('Route not found: /invalid/path'),
  },
};

/**
 * Fatal error with a type error
 */
export const TypeErrorExample: Story = {
  args: {
    error: new TypeError("Cannot read property 'map' of undefined"),
  },
};
