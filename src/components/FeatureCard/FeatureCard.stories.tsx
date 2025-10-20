import type { Meta, StoryObj } from '@storybook/react-vite';
import { FeatureCard } from './FeatureCard';
import { ChevronRightIcon, ArrowRightIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/20/solid';

const meta = {
  title: 'Components/Layout/FeatureCard',
  component: FeatureCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    ActionIcon: {
      control: false,
    },
    icon: {
      control: false,
    },
  },
} satisfies Meta<typeof FeatureCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic feature card with text content only.
 */
export const Default: Story = {
  args: {
    title: 'Feature Title',
    subtitle: 'Feature Category',
    description: 'This is a description of the feature that explains what it does.',
    href: '/feature',
  },
};

/**
 * Feature card with a logo image.
 */
export const WithLogo: Story = {
  args: {
    title: 'Ethereum Network',
    subtitle: 'Blockchain',
    description: 'Explore the Ethereum blockchain and its ecosystem.',
    logo: '/images/ethereum.png',
    href: '/ethereum',
  },
};

/**
 * Feature card with an icon component.
 */
export const WithIcon: Story = {
  args: {
    title: 'Documentation',
    subtitle: 'Resources',
    description: 'Access comprehensive documentation and guides.',
    icon: <ChevronRightIcon className="h-16 w-16 text-accent" />,
    href: '/docs',
  },
};

/**
 * Feature card with custom action text.
 */
export const CustomActionText: Story = {
  args: {
    title: 'Get Started',
    subtitle: 'Tutorial',
    description: 'Learn how to use the platform with step-by-step guides.',
    href: '/tutorial',
    actionText: 'Start Learning',
  },
};

/**
 * Feature card with custom action icon.
 */
export const CustomActionIcon: Story = {
  args: {
    title: 'API Reference',
    subtitle: 'Developer',
    description: 'Complete API documentation for developers.',
    href: '/api',
    actionText: 'View API',
    ActionIcon: ArrowRightIcon,
  },
};

/**
 * Feature card linking to an external URL.
 */
export const ExternalLink: Story = {
  args: {
    title: 'GitHub Repository',
    subtitle: 'Source Code',
    description: 'View the source code and contribute to the project.',
    href: 'https://github.com/example/repo',
    isExternal: true,
    actionText: 'Visit GitHub',
    ActionIcon: ArrowTopRightOnSquareIcon,
  },
};

/**
 * Feature card with all properties configured.
 */
export const FullyConfigured: Story = {
  args: {
    id: 'feature-1',
    title: 'Advanced Analytics',
    subtitle: 'Premium Feature',
    description: 'Get detailed insights and analytics for your network with advanced visualization tools.',
    logo: '/images/ethereum.png',
    href: '/analytics',
    actionText: 'View Analytics',
    ActionIcon: ArrowRightIcon,
  },
};

/**
 * Multiple feature cards in a grid layout.
 */
export const GridLayout: Story = {
  args: {
    title: '',
    subtitle: '',
    description: '',
    href: '',
  },
  render: () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FeatureCard
        title="Network Status"
        subtitle="Monitoring"
        description="Real-time network status and health monitoring."
        href="/status"
      />
      <FeatureCard
        title="Block Explorer"
        subtitle="Tools"
        description="Explore blocks, transactions, and addresses."
        href="/explorer"
      />
      <FeatureCard
        title="Validator Dashboard"
        subtitle="Staking"
        description="Monitor your validators and staking rewards."
        href="/validators"
      />
      <FeatureCard
        title="API Documentation"
        subtitle="Developer"
        description="Complete API reference and integration guides."
        href="/docs/api"
        actionText="Read Docs"
        ActionIcon={ArrowRightIcon}
      />
    </div>
  ),
};
