import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotFound } from './NotFound';

/**
 * NotFound displays a 404 error page when a route is not found.
 * It shows a friendly message with a link to return to the home page.
 */
const meta: Meta = {
  title: 'Components/Overlays/NotFound',
  component: NotFound,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: {
        inline: false,
        iframeHeight: 600,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

/**
 * Default 404 Not Found page
 */
export const Default: Story = {
  render: () => <NotFound />,
};
