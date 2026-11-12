import type { Meta, StoryObj } from '@storybook/react-vite';
import { TokenTable } from './blocks/TokenTable';

const meta = {
  title: 'Foundations/Layout',
  tags: ['!autodocs', '!dev'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Spacing: Story = {
  render: () => (
    <TokenTable
      namespace="spacing"
      usage={() => 'p-1, gap-4, h-75'}
      notes={{ '': 'the step every spacing and sizing class multiplies: p-1 is 4px, h-75 is 300px' }}
    />
  ),
};

export const Widths: Story = {
  render: () => (
    <TokenTable
      namespace="container"
      usage={name => `max-w-${name}`}
      notes={{ md: 'dialogs: md, lg, 4xl and 7xl are its sizes' }}
    />
  ),
};

export const Radii: Story = {
  render: () => (
    <TokenTable
      namespace="radius"
      usage={name => `rounded-${name}`}
      notes={{
        '2xs': 'the tiniest marks: country flags',
        xs: 'inline marks: badges, tags, skeleton bars',
        sm: 'every container and control; md to 3xl alias it',
      }}
    />
  ),
};

export const Breakpoints: Story = {
  render: () => (
    <TokenTable
      namespace="breakpoint"
      usage={name => `${name}:`}
      notes={{ '3xl': 'ultrawide monitors', '4xl': 'larger ultrawide monitors' }}
    />
  ),
};

export const Shadows: Story = {
  render: () => (
    <TokenTable
      namespace="shadow"
      usage={name => `shadow-${name}`}
      notes={{ divider: 'a line below and to the right', edge: 'a line on the right edge of sticky columns' }}
    />
  ),
};

export const Easing: Story = {
  render: () => <TokenTable namespace="ease" usage={name => `ease-${name}`} notes={{}} />,
};

export const Animations: Story = {
  render: () => (
    <TokenTable
      namespace="animate"
      usage={name => `animate-${name}`}
      notes={{
        pulse: 'skeletons while loading',
        shimmer: 'loading bars',
        'highlight-new': 'a new item fading in',
        'row-new': 'a new row in a live table',
      }}
    />
  ),
};

export const Defaults: Story = {
  render: () => (
    <TokenTable
      namespace="default"
      usage={name => (name.startsWith('transition') ? 'transition-colors' : 'preflight')}
      notes={{
        'transition-duration': 'any transition-* class without a duration-*',
        'font-family': 'the root font, before body sets it',
      }}
    />
  ),
};
