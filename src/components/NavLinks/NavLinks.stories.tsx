import type { Meta, StoryObj } from '@storybook/react-vite';
import { NavLinks } from './NavLinks';

const meta: Meta<typeof NavLinks> = {
  title: 'Components/Navigation/NavLinks',
  component: NavLinks,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    Story => (
      <div className="border-subtle/30 border-b bg-card">
        <div className="border-subtle/20 w-full border-t px-4 py-2 md:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <Story />
        </div>
      </div>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default horizontal layout - typically used in the desktop navbar.
 */
export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
  },
};

/**
 * Vertical layout - typically used in the mobile navigation panel.
 */
export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
  decorators: [
    Story => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
};
