import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollAnchor } from './ScrollAnchor';
import { Header } from '@/components/Layout/Header';

const meta = {
  title: 'Components/Navigation/ScrollAnchor',
  component: ScrollAnchor,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof ScrollAnchor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHeader: Story = {
  args: {
    id: 'with-header',
    children: <Header size="xs" title="Example Header" showAccent={false} />,
  },
};

export const WithCustomContent: Story = {
  args: {
    id: 'custom-card',
    children: (
      <div className="rounded-sm border border-border bg-background p-4">
        <h3 className="text-base/7 font-semibold text-foreground">Custom Card</h3>
        <p className="text-sm/6 text-muted">This card is wrapped in a ScrollAnchor</p>
      </div>
    ),
  },
};

export const WithoutLinkIcon: Story = {
  args: {
    id: 'no-icon',
    showLinkIcon: false,
    children: <Header size="xs" title="No Link Icon" showAccent={false} />,
  },
};

export const DeepLinkingDemo: Story = {
  args: {
    id: 'deep-link-example',
    children: (
      <div>
        <Header size="xs" title="Deep Link Section" showAccent={false} />
        <p className="mt-2 text-sm/6 text-muted">Add #deep-link-example to the URL to jump here on page load.</p>
      </div>
    ),
  },
};

export const WithCallback: Story = {
  args: {
    id: 'callback-example',
    onClick: () => console.log('Anchor clicked!'),
    children: <Header size="xs" title="Click Me (Check Console)" showAccent={false} />,
  },
};

export const CustomOffset: Story = {
  args: {
    id: 'custom-offset',
    scrollOffset: 150,
    children: <Header size="xs" title="Custom Offset (150px)" showAccent={false} />,
  },
};

export const RealWorldExample: Story = {
  args: {
    id: 'real-world',
    children: <Header size="xs" title="Real World Section Example" showAccent={false} />,
  },
};
