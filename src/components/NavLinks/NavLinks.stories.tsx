import type { Meta, StoryObj } from '@storybook/react-vite';
import { NavLinks } from './NavLinks';

const meta: Meta<typeof NavLinks> = {
  title: 'Components/NavLinks',
  component: NavLinks,
  parameters: {
    layout: 'padded',
  },
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
};
