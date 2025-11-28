import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Avatar } from './Avatar';

const meta = {
  title: 'Components/Elements/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    rounded: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleImage = '/images/experiments.png';

export const Default: Story = {
  args: {
    src: sampleImage,
    alt: 'User avatar',
    size: 'md',
    rounded: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test that avatar renders
    const avatar = canvas.getByAltText('User avatar');
    await expect(avatar).toBeInTheDocument();

    // Test src attribute
    await expect(avatar).toHaveAttribute('src', sampleImage);

    // Test default size class (md = size-10)
    await expect(avatar).toHaveClass('size-10');

    // Test not rounded by default
    await expect(avatar).not.toHaveClass('rounded-full');

    // Test outline classes
    await expect(avatar).toHaveClass('outline');
    await expect(avatar).toHaveClass('-outline-offset-1');
  },
};

export const Rounded: Story = {
  args: {
    src: sampleImage,
    alt: 'User avatar',
    size: 'md',
    rounded: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test that avatar renders
    const avatar = canvas.getByAltText('User avatar');
    await expect(avatar).toBeInTheDocument();

    // Test rounded class
    await expect(avatar).toHaveClass('rounded-full');

    // Test size class (md = size-10)
    await expect(avatar).toHaveClass('size-10');
  },
};

export const SquareSizes: Story = {
  args: {
    src: sampleImage,
    alt: 'Avatar',
  },
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar src={sampleImage} alt="XS Avatar" size="xs" />
      <Avatar src={sampleImage} alt="SM Avatar" size="sm" />
      <Avatar src={sampleImage} alt="MD Avatar" size="md" />
      <Avatar src={sampleImage} alt="LG Avatar" size="lg" />
      <Avatar src={sampleImage} alt="XL Avatar" size="xl" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test that all sizes render
    const avatars = canvas.getAllByRole('img');
    await expect(avatars).toHaveLength(5);

    // Test individual size classes
    const xsAvatar = canvas.getByAltText('XS Avatar');
    await expect(xsAvatar).toHaveClass('size-6');

    const smAvatar = canvas.getByAltText('SM Avatar');
    await expect(smAvatar).toHaveClass('size-8');

    const mdAvatar = canvas.getByAltText('MD Avatar');
    await expect(mdAvatar).toHaveClass('size-10');

    const lgAvatar = canvas.getByAltText('LG Avatar');
    await expect(lgAvatar).toHaveClass('size-12');

    const xlAvatar = canvas.getByAltText('XL Avatar');
    await expect(xlAvatar).toHaveClass('size-14');

    // Test that none are rounded
    avatars.forEach(avatar => {
      expect(avatar).not.toHaveClass('rounded-full');
    });
  },
};

export const RoundedSizes: Story = {
  args: {
    src: sampleImage,
    alt: 'Avatar',
  },
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar src={sampleImage} alt="XS Avatar" size="xs" rounded />
      <Avatar src={sampleImage} alt="SM Avatar" size="sm" rounded />
      <Avatar src={sampleImage} alt="MD Avatar" size="md" rounded />
      <Avatar src={sampleImage} alt="LG Avatar" size="lg" rounded />
      <Avatar src={sampleImage} alt="XL Avatar" size="xl" rounded />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test that all sizes render
    const avatars = canvas.getAllByRole('img');
    await expect(avatars).toHaveLength(5);

    // Test individual size classes
    const xsAvatar = canvas.getByAltText('XS Avatar');
    await expect(xsAvatar).toHaveClass('size-6');
    await expect(xsAvatar).toHaveClass('rounded-full');

    const smAvatar = canvas.getByAltText('SM Avatar');
    await expect(smAvatar).toHaveClass('size-8');
    await expect(smAvatar).toHaveClass('rounded-full');

    const mdAvatar = canvas.getByAltText('MD Avatar');
    await expect(mdAvatar).toHaveClass('size-10');
    await expect(mdAvatar).toHaveClass('rounded-full');

    const lgAvatar = canvas.getByAltText('LG Avatar');
    await expect(lgAvatar).toHaveClass('size-12');
    await expect(lgAvatar).toHaveClass('rounded-full');

    const xlAvatar = canvas.getByAltText('XL Avatar');
    await expect(xlAvatar).toHaveClass('size-14');
    await expect(xlAvatar).toHaveClass('rounded-full');
  },
};

export const WithCustomClassName: Story = {
  args: {
    src: sampleImage,
    alt: 'User avatar',
    size: 'lg',
    rounded: true,
    className: 'ring-2 ring-primary',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test that avatar renders
    const avatar = canvas.getByAltText('User avatar');
    await expect(avatar).toBeInTheDocument();

    // Test custom className is applied
    await expect(avatar).toHaveClass('ring-2');
    await expect(avatar).toHaveClass('ring-primary');

    // Test that default classes are still applied
    await expect(avatar).toHaveClass('size-12');
    await expect(avatar).toHaveClass('rounded-full');
    await expect(avatar).toHaveClass('outline');
  },
};
