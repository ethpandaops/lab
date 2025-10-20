import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, useState } from 'react';
import { Sidebar } from './Sidebar';
import { ThemeProvider } from '@/providers/ThemeProvider';

const meta = {
  title: 'Components/Layout/Sidebar',
  component: Sidebar,
  decorators: [
    Story => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component for interactive state
function SidebarWrapper(props: { initialOpen?: boolean }): JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(props.initialOpen ?? false);
  return <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />;
}

/**
 * Interactive sidebar that adapts to different viewport sizes.
 * - On desktop (lg breakpoint): Fixed sidebar is always visible
 * - On mobile/tablet: Sidebar can be toggled via the hamburger menu
 *
 * Use the viewport toolbar to test responsive behavior.
 */
export const Default: Story = {
  args: {} as never,
  render: () => <SidebarWrapper initialOpen={false} />,
  parameters: {
    viewport: {
      defaultViewport: 'iphone14promax',
    },
  },
};
