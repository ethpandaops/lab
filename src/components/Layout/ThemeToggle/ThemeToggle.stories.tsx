import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeToggle } from './ThemeToggle';
import { ThemeProvider } from '@/providers/ThemeProvider';

const meta = {
  title: 'Components/Layout/ThemeToggle',
  component: ThemeToggle,
  decorators: [
    Story => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A theme toggle button that cycles through light, dark, and star themes. Click to switch between themes.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LightMode: Story = {};

export const DarkMode: Story = {
  decorators: [
    Story => (
      <div className="dark bg-gray-900 p-8">
        <Story />
      </div>
    ),
  ],
};

export const StarMode: Story = {
  decorators: [
    Story => (
      <div className="star p-8">
        <Story />
      </div>
    ),
  ],
};

export const Interactive: Story = {
  decorators: [
    Story => (
      <div className="flex flex-col gap-4 p-8">
        <div className="bg-white p-4">
          <p className="mb-4 text-sm/6 text-gray-700">Light theme:</p>
          <Story />
        </div>
        <div className="dark bg-gray-900 p-4">
          <p className="mb-4 text-sm/6 text-gray-300">Dark theme:</p>
          <Story />
        </div>
        <div className="star p-4">
          <p className="mb-4 text-sm/6">Star theme:</p>
          <Story />
        </div>
      </div>
    ),
  ],
};
