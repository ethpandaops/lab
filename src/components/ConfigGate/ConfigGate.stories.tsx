import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import { ConfigGate } from './ConfigGate';
import { BASE_URL, PATH_PREFIX } from '@/utils/api-config';

const meta: Meta = {
  title: 'Components/ConfigGate',
  component: ConfigGate,
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
 * ConfigGate successfully loads config and renders children
 */
export const Success: Story = {
  render: () => (
    <ConfigGate>
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">App Loaded Successfully</h1>
          <p className="mt-2 text-slate-400">Configuration has been loaded</p>
        </div>
      </div>
    </ConfigGate>
  ),
};

/**
 * ConfigGate shows loading screen while config is being fetched
 */
export const Loading: Story = {
  parameters: {
    hydration: false, // Disable hydration to show loading state
    msw: {
      handlers: {
        config: http.get(`${BASE_URL}${PATH_PREFIX}/config`, async () => {
          await delay('infinite');
        }),
      },
    },
  },
  render: () => (
    <ConfigGate>
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">This should not be visible</h1>
        </div>
      </div>
    </ConfigGate>
  ),
};

/**
 * ConfigGate shows error state when config fetch fails
 * Note: We explicitly set retry: 0 to show the error state immediately without retrying
 */
export const Error: Story = {
  parameters: {
    hydration: false, // Disable hydration to show error state
    msw: {
      handlers: {
        config: http.get(`${BASE_URL}${PATH_PREFIX}/config`, () => {
          return HttpResponse.json(
            { error: 'Internal Server Error' },
            { status: 500, statusText: 'Internal Server Error' }
          );
        }),
      },
    },
    tanstackQuery: {
      queries: {
        retry: 0,
      },
    },
  },
  render: () => (
    <ConfigGate>
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">This should not be visible</h1>
        </div>
      </div>
    </ConfigGate>
  ),
};

/**
 * ConfigGate shows error state when network request fails
 * Note: We explicitly set retry: 0 to show the error state immediately without retrying
 */
export const NetworkError: Story = {
  parameters: {
    hydration: false, // Disable hydration to show error state
    msw: {
      handlers: {
        config: http.get(`${BASE_URL}${PATH_PREFIX}/config`, () => {
          return HttpResponse.error();
        }),
      },
    },
    tanstackQuery: {
      queries: {
        retry: 0,
      },
    },
  },
  render: () => (
    <ConfigGate>
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">This should not be visible</h1>
        </div>
      </div>
    </ConfigGate>
  ),
};

/**
 * Example: Error state WITH retries enabled (takes ~7 seconds to show error)
 * This demonstrates how to override the global retry: false on a per-story basis
 */
export const ErrorWithRetries: Story = {
  parameters: {
    hydration: false, // Disable hydration to show error state
    msw: {
      handlers: {
        config: http.get(`${BASE_URL}${PATH_PREFIX}/config`, () => {
          return HttpResponse.json(
            { error: 'Internal Server Error' },
            { status: 500, statusText: 'Internal Server Error' }
          );
        }),
      },
    },
    // Override global retry settings for this story
    tanstackQuery: {
      queries: {
        retry: 3,
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  },
  render: () => (
    <ConfigGate>
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">This should not be visible</h1>
        </div>
      </div>
    </ConfigGate>
  ),
};
