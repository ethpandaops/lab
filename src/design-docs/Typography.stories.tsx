import type { Meta, StoryObj } from '@storybook/react-vite';
import { TokenTable } from './blocks/TokenTable';
import { TypeScale } from './blocks/TypeScale';

const meta = {
  title: 'Foundations/Typography',
  tags: ['!autodocs', '!dev'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Families: Story = {
  render: () => (
    <TokenTable
      namespace="font"
      usage={name => `font-${name}`}
      notes={{
        sans: 'all UI text and numbers (the default, set on body)',
        mono: 'identifiers: hashes, graffiti, code',
        display: 'the wordmark and the landing hero only',
      }}
    />
  ),
};

export const Scale: Story = {
  render: () => <TypeScale sample="The quick brown fox jumps over the lazy dog" />,
};

export const Sizes: Story = {
  render: () => (
    <TokenTable
      namespace="text"
      usage={name => `text-${name}`}
      notes={{
        '2xs': 'dense labels: axis ticks, HUD keys, badges in tight cells',
        sm: 'running text and controls',
        '8xl': "a fork's emoji in the forks header",
      }}
    />
  ),
};

export const Weights: Story = {
  render: () => <TokenTable namespace="font-weight" usage={name => `font-${name}`} notes={{}} />,
};

export const Tracking: Story = {
  render: () => (
    <TokenTable
      namespace="tracking"
      usage={name => `tracking-${name}`}
      notes={{ tight: 'large numbers and headings', wider: 'uppercase labels' }}
    />
  ),
};

export const LineHeights: Story = {
  render: () => (
    <TokenTable
      namespace="leading"
      usage={name => `text-sm/${name}`}
      notes={{ tight: 'stacked labels', relaxed: 'long prose' }}
    />
  ),
};
