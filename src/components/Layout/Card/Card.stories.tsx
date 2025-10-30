import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card';

const meta = {
  title: 'Components/Layout/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-96 rounded-sm bg-background p-8">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic card with simple content.
 */
export const Basic: Story = {
  args: {
    children: <p>This is a basic card with just body content</p>,
  },
};

/**
 * Card with rounded corners.
 * Uses the `rounded` prop to apply rounded-sm class.
 */
export const Rounded: Story = {
  args: {
    rounded: true,
    children: <p>This card has rounded corners</p>,
  },
};

/**
 * Comparison of rounded vs non-rounded cards.
 */
export const RoundedComparison: Story = {
  args: {
    children: null,
  },
  decorators: [
    Story => (
      <div className="min-w-[800px] rounded-sm bg-background p-8">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card header={<h3 className="text-base/7 font-semibold text-foreground">No Rounded Corners</h3>}>
        <p className="text-sm/6 text-muted">Default card without rounded corners (rounded=false)</p>
      </Card>

      <Card rounded header={<h3 className="text-base/7 font-semibold text-foreground">Rounded Corners</h3>}>
        <p className="text-sm/6 text-muted">Card with rounded corners (rounded=true)</p>
      </Card>
    </div>
  ),
};

/**
 * Interactive card with onClick handler.
 * Click the card to see the interaction.
 */
export const Interactive: Story = {
  args: {
    isInteractive: true,
    onClick: () => alert('Card clicked!'),
    children: <p>Click me! I&apos;m an interactive card</p>,
  },
};

/**
 * Card with header slot.
 * The header prop provides a dedicated top section.
 */
export const WithHeader: Story = {
  args: {
    header: <h3 className="text-base/7 font-semibold text-accent">Card Title</h3>,
    children: <p className="text-sm/6 text-muted">This is the main content area.</p>,
  },
};

/**
 * Card with footer slot.
 * The footer prop provides a dedicated bottom section.
 */
export const WithFooter: Story = {
  args: {
    children: <p className="text-sm/6 text-muted">This is the main content area.</p>,
    footer: <div className="text-sm/6 text-muted">Footer content</div>,
  },
};

/**
 * Card with all sections using slots.
 * Demonstrates header, children (main content), and footer slots.
 */
export const AllSections: Story = {
  args: {
    header: <h3 className="text-base/7 font-semibold">Card Title</h3>,
    children: <p className="text-sm/6 text-muted">This is a card with header, body, and footer sections.</p>,
    footer: (
      <div className="flex items-center justify-between">
        <span className="text-sm/6 text-muted">Updated 2 hours ago</span>
        <button className="text-sm/6 font-semibold text-primary hover:text-accent">View details</button>
      </div>
    ),
  },
};

/**
 * Interactive card with sections using slots.
 * Click the card to see the interaction.
 */
export const InteractiveWithSections: Story = {
  args: {
    isInteractive: true,
    onClick: () => alert('Card clicked!'),
    header: <h3 className="text-base/7 font-semibold">Interactive Card</h3>,
    children: <p className="text-sm/6 text-muted">Click anywhere on this card to trigger the action.</p>,
    footer: <span className="text-sm/6 text-primary">Click me!</span>,
  },
};

/**
 * Card with custom className.
 */
export const CustomStyled: Story = {
  args: {
    className: 'border-4 border-blue-500',
    children: <p>This card has a custom blue border</p>,
  },
};

/**
 * Stats card example showing real-world usage.
 */
export const StatsCard: Story = {
  args: {
    header: (
      <div className="flex items-center justify-between">
        <h3 className="text-base/7 font-semibold text-foreground">Total Validators</h3>
        <span className="rounded-sm bg-success/10 px-2 py-1 text-xs/5 font-semibold text-success">+12.5%</span>
      </div>
    ),
    children: (
      <div>
        <p className="text-3xl/9 font-bold text-foreground">1,234,567</p>
        <p className="mt-1 text-sm/6 text-muted">Active on mainnet</p>
      </div>
    ),
    footer: (
      <div className="flex items-center justify-between">
        <span className="text-sm/6 text-muted">Last updated: 2 min ago</span>
        <button className="text-sm/6 font-semibold text-primary hover:text-accent">View details →</button>
      </div>
    ),
  },
};

/**
 * User profile card example.
 */
export const ProfileCard: Story = {
  args: {
    header: (
      <div className="flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <span className="text-lg/6 font-bold text-primary">JD</span>
        </div>
        <div>
          <h3 className="text-base/7 font-semibold text-foreground">John Doe</h3>
          <p className="text-sm/6 text-muted">john.doe@example.com</p>
        </div>
      </div>
    ),
    children: (
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm/6 text-muted">Role</span>
          <span className="text-sm/6 font-medium text-foreground">Administrator</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm/6 text-muted">Team</span>
          <span className="text-sm/6 font-medium text-foreground">DevOps</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm/6 text-muted">Status</span>
          <span className="inline-flex items-center gap-1 text-sm/6 font-medium text-success">
            <span className="size-1.5 rounded-full bg-success"></span>
            Active
          </span>
        </div>
      </div>
    ),
    footer: (
      <div className="flex gap-2">
        <button className="flex-1 rounded-sm bg-primary px-3 py-2 text-sm/6 font-semibold text-white hover:bg-accent">
          Edit Profile
        </button>
        <button className="flex-1 rounded-sm border border-border px-3 py-2 text-sm/6 font-semibold text-foreground hover:bg-surface">
          View Activity
        </button>
      </div>
    ),
  },
};

/**
 * Empty state card example.
 */
export const EmptyState: Story = {
  args: {
    children: (
      <div className="py-8 text-center">
        <svg
          className="mx-auto size-12 text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          />
        </svg>
        <h3 className="mt-2 text-sm/6 font-semibold text-foreground">No data available</h3>
        <p className="mt-1 text-sm/6 text-muted">Get started by creating a new item.</p>
        <div className="mt-6">
          <button className="inline-flex items-center rounded-sm bg-primary px-3 py-2 text-sm/6 font-semibold text-white hover:bg-accent">
            + New Item
          </button>
        </div>
      </div>
    ),
  },
};

/**
 * Multiple cards in a grid layout.
 */
export const GridLayout: Story = {
  args: {
    children: null,
  },
  decorators: [
    Story => (
      <div className="min-w-[1200px] rounded-sm bg-background p-8">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card
        header={
          <div className="flex items-center justify-between">
            <h3 className="text-base/7 font-semibold text-foreground">Validators</h3>
            <span className="rounded-sm bg-success/10 px-2 py-1 text-xs/5 font-semibold text-success">+5.2%</span>
          </div>
        }
        footer={<span className="text-sm/6 text-muted">Last 24 hours</span>}
      >
        <p className="text-3xl/9 font-bold text-foreground">12,543</p>
        <p className="mt-1 text-sm/6 text-muted">Active validators</p>
      </Card>

      <Card
        header={
          <div className="flex items-center justify-between">
            <h3 className="text-base/7 font-semibold text-foreground">Blocks</h3>
            <span className="rounded-sm bg-primary/10 px-2 py-1 text-xs/5 font-semibold text-primary">Live</span>
          </div>
        }
        footer={<span className="text-sm/6 text-muted">Updated just now</span>}
      >
        <p className="text-3xl/9 font-bold text-foreground">8,234,567</p>
        <p className="mt-1 text-sm/6 text-muted">Total blocks</p>
      </Card>

      <Card
        header={
          <div className="flex items-center justify-between">
            <h3 className="text-base/7 font-semibold text-foreground">Network Health</h3>
            <span className="rounded-sm bg-success/10 px-2 py-1 text-xs/5 font-semibold text-success">Healthy</span>
          </div>
        }
        footer={<button className="text-sm/6 font-semibold text-primary hover:text-accent">View details →</button>}
      >
        <p className="text-3xl/9 font-bold text-foreground">99.9%</p>
        <p className="mt-1 text-sm/6 text-muted">Uptime</p>
      </Card>
    </div>
  ),
};

/**
 * Card with muted variant.
 * Adds subtle gray backgrounds to header and footer for visual separation.
 */
export const VariantMuted: Story = {
  args: {
    variant: 'muted',
    header: <h3 className="text-base/7 font-semibold text-foreground">Muted Variant</h3>,
    children: <p className="text-sm/6 text-muted">The header and footer have subtle gray backgrounds.</p>,
    footer: <span className="text-sm/6 text-muted">Footer with muted background</span>,
  },
};

/**
 * Card with primary variant.
 * Adds a primary color tint to the header.
 */
export const VariantPrimary: Story = {
  args: {
    variant: 'primary',
    header: <h3 className="text-base/7 font-semibold text-foreground">Primary Variant</h3>,
    children: <p className="text-sm/6 text-muted">The header has a subtle primary color background.</p>,
    footer: <span className="text-sm/6 text-muted">Standard footer</span>,
  },
};

/**
 * Card with accent variant.
 * Adds accent color tint to header and footer.
 */
export const VariantAccent: Story = {
  args: {
    variant: 'accent',
    header: <h3 className="text-base/7 font-semibold text-foreground">Accent Variant</h3>,
    children: <p className="text-sm/6 text-muted">The header and footer have subtle accent color backgrounds.</p>,
    footer: <span className="text-sm/6 text-muted">Footer with accent background</span>,
  },
};

/**
 * Card with elevated variant.
 * Darker header creates visual hierarchy.
 */
export const VariantElevated: Story = {
  args: {
    variant: 'elevated',
    header: <h3 className="text-base/7 font-semibold text-foreground">Elevated Variant</h3>,
    children: <p className="text-sm/6 text-muted">The header has a darker background for emphasis.</p>,
    footer: <span className="text-sm/6 text-muted">Standard footer</span>,
  },
};

/**
 * Card with surface variant.
 * All sections have distinct surface colors for maximum separation.
 */
export const VariantSurface: Story = {
  args: {
    variant: 'surface',
    header: <h3 className="text-base/7 font-semibold text-foreground">Surface Variant</h3>,
    children: <p className="text-sm/6 text-muted">All sections have distinct background colors.</p>,
    footer: <span className="text-sm/6 text-muted">Footer with surface background</span>,
  },
};

/**
 * All variants showcased side by side for comparison.
 */
export const AllVariants: Story = {
  args: {
    children: null,
  },
  decorators: [
    Story => (
      <div className="min-w-[1400px] rounded-sm bg-background p-8">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card
        variant="default"
        header={<h3 className="text-base/7 font-semibold text-foreground">Default</h3>}
        footer={<span className="text-sm/6 text-muted">No color variation</span>}
      >
        <p className="text-sm/6 text-muted">Standard white background with no section differentiation.</p>
      </Card>

      <Card
        variant="muted"
        header={<h3 className="text-base/7 font-semibold text-foreground">Muted</h3>}
        footer={<span className="text-sm/6 text-muted">Subtle separation</span>}
      >
        <p className="text-sm/6 text-muted">Header and footer with subtle gray backgrounds.</p>
      </Card>

      <Card
        variant="primary"
        header={<h3 className="text-base/7 font-semibold text-foreground">Primary</h3>}
        footer={<span className="text-sm/6 text-muted">Standard footer</span>}
      >
        <p className="text-sm/6 text-muted">Header with primary color tint for emphasis.</p>
      </Card>

      <Card
        variant="accent"
        header={<h3 className="text-base/7 font-semibold text-foreground">Accent</h3>}
        footer={<span className="text-sm/6 text-muted">Accent footer</span>}
      >
        <p className="text-sm/6 text-muted">Header and footer with accent color tint.</p>
      </Card>

      <Card
        variant="elevated"
        header={<h3 className="text-base/7 font-semibold text-foreground">Elevated</h3>}
        footer={<span className="text-sm/6 text-muted">Standard footer</span>}
      >
        <p className="text-sm/6 text-muted">Darker header creates clear visual hierarchy.</p>
      </Card>

      <Card
        variant="surface"
        header={<h3 className="text-base/7 font-semibold text-foreground">Surface</h3>}
        footer={<span className="text-sm/6 text-muted">Surface footer</span>}
      >
        <p className="text-sm/6 text-muted">All sections with distinct surface colors.</p>
      </Card>
    </div>
  ),
};

/**
 * Tall card with feature image.
 * Demonstrates how object-cover prioritizes height in tall cards.
 */
export const TallCard: Story = {
  args: {
    header: <h3 className="text-base/7 font-semibold text-foreground">Fork Readiness</h3>,
    children: (
      <div className="space-y-4">
        <div>
          <p className="text-3xl/9 font-bold text-foreground">98.5%</p>
          <p className="mt-1 text-sm/6 text-muted">Clients ready for next fork</p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm/6">
            <span className="text-muted">Lighthouse</span>
            <span className="font-medium text-foreground">100%</span>
          </div>
          <div className="flex justify-between text-sm/6">
            <span className="text-muted">Prysm</span>
            <span className="font-medium text-foreground">100%</span>
          </div>
          <div className="flex justify-between text-sm/6">
            <span className="text-muted">Teku</span>
            <span className="font-medium text-foreground">97%</span>
          </div>
          <div className="flex justify-between text-sm/6">
            <span className="text-muted">Nimbus</span>
            <span className="font-medium text-foreground">95%</span>
          </div>
        </div>
      </div>
    ),
    footer: (
      <div className="flex items-center justify-between">
        <span className="text-sm/6 text-muted">Updated 5 min ago</span>
        <button className="text-sm/6 font-semibold text-primary hover:text-accent">View details →</button>
      </div>
    ),
    featureImage: <img src="/images/experiments/fork-readiness.png" alt="Fork Readiness" />,
  },
  decorators: [
    Story => (
      <div className="flex min-w-96 items-center justify-center rounded-sm bg-background p-8">
        <div className="w-80">
          <Story />
        </div>
      </div>
    ),
  ],
};

/**
 * Wide card with feature image.
 * Demonstrates how object-cover prioritizes width in wide cards.
 */
export const WideCard: Story = {
  args: {
    header: (
      <div className="flex items-center justify-between">
        <h3 className="text-base/7 font-semibold text-foreground">Block Production Flow</h3>
        <span className="rounded-sm bg-success/10 px-2 py-1 text-xs/5 font-semibold text-success">Live</span>
      </div>
    ),
    children: (
      <div className="flex items-center gap-6">
        <div>
          <p className="text-3xl/9 font-bold text-foreground">2.3s</p>
          <p className="mt-1 text-sm/6 text-muted">Avg block time</p>
        </div>
        <div>
          <p className="text-3xl/9 font-bold text-foreground">45</p>
          <p className="mt-1 text-sm/6 text-muted">Proposers</p>
        </div>
        <div>
          <p className="text-3xl/9 font-bold text-foreground">12.4k</p>
          <p className="mt-1 text-sm/6 text-muted">Blocks/day</p>
        </div>
      </div>
    ),
    footer: <span className="text-sm/6 text-muted">Real-time data from beacon chain</span>,
    featureImage: <img src="/images/experiments/block-production-flow.png" alt="Block Production Flow" />,
  },
  decorators: [
    Story => (
      <div className="min-w-[800px] rounded-sm bg-background p-8">
        <Story />
      </div>
    ),
  ],
};

/**
 * Multiple cards with different images.
 * Shows various experiment images in a grid.
 */
export const MultipleExperimentImages: Story = {
  args: {
    children: null,
  },
  decorators: [
    Story => (
      <div className="min-w-[1200px] rounded-sm bg-background p-8">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card
        header={<h3 className="text-base/7 font-semibold text-foreground">Networks</h3>}
        featureImage={<img src="/images/experiments/networks.png" alt="Networks" />}
      >
        <p className="text-3xl/9 font-bold text-foreground">12</p>
        <p className="mt-1 text-sm/6 text-muted">Active networks</p>
      </Card>

      <Card
        header={<h3 className="text-base/7 font-semibold text-foreground">Live Slots</h3>}
        featureImage={<img src="/images/experiments/live-slots.png" alt="Live Slots" />}
      >
        <p className="text-3xl/9 font-bold text-foreground">8,234</p>
        <p className="mt-1 text-sm/6 text-muted">Current slot</p>
      </Card>

      <Card
        header={<h3 className="text-base/7 font-semibold text-foreground">Locally Built Blocks</h3>}
        featureImage={<img src="/images/experiments/locally-built-blocks.png" alt="Locally Built Blocks" />}
      >
        <p className="text-3xl/9 font-bold text-foreground">67%</p>
        <p className="mt-1 text-sm/6 text-muted">Local block rate</p>
      </Card>

      <Card
        header={<h3 className="text-base/7 font-semibold text-foreground">Block Production</h3>}
        featureImage={<img src="/images/experiments/block-production-flow.png" alt="Block Production Flow" />}
      >
        <p className="text-3xl/9 font-bold text-foreground">2.1s</p>
        <p className="mt-1 text-sm/6 text-muted">Block time</p>
      </Card>

      <Card
        header={<h3 className="text-base/7 font-semibold text-foreground">Fork Readiness</h3>}
        featureImage={<img src="/images/experiments/fork-readiness.png" alt="Fork Readiness" />}
      >
        <p className="text-3xl/9 font-bold text-foreground">98.5%</p>
        <p className="mt-1 text-sm/6 text-muted">Clients ready</p>
      </Card>

      <Card
        header={<h3 className="text-base/7 font-semibold text-foreground">Lab Overview</h3>}
        featureImage={<img src="/images/experiments.png" alt="ethPandaOps Lab" />}
      >
        <p className="text-3xl/9 font-bold text-foreground">42</p>
        <p className="mt-1 text-sm/6 text-muted">Active experiments</p>
      </Card>
    </div>
  ),
};
