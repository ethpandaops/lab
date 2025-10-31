import type { Meta, StoryObj } from '@storybook/react-vite';
import { Breadcrumb } from './Breadcrumb';
import { useRouterState } from '@tanstack/react-router';

const meta = {
  title: 'Components/Navigation/Breadcrumb',
  component: Breadcrumb,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic breadcrumb navigation with two levels
 */
export const TwoLevels: Story = {
  render: () => {
    // Mock router state
    (useRouterState as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        pathname: '/ethereum',
        context: {
          getBreadcrumb: () => ({ label: 'Ethereum' }),
        },
      },
      {
        pathname: '/ethereum/epochs',
        context: {
          getBreadcrumb: () => ({ label: 'Epochs' }),
        },
      },
    ]);

    return <Breadcrumb />;
  },
};

/**
 * Deep breadcrumb hierarchy with multiple levels
 */
export const DeepHierarchy: Story = {
  render: () => {
    (useRouterState as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        pathname: '/ethereum',
        context: {
          getBreadcrumb: () => ({ label: 'Ethereum' }),
        },
      },
      {
        pathname: '/ethereum/data-availability',
        context: {
          getBreadcrumb: () => ({ label: 'Data Availability' }),
        },
      },
      {
        pathname: '/ethereum/data-availability/das-custody',
        context: {
          getBreadcrumb: () => ({ label: 'DAS Custody' }),
        },
      },
    ]);

    return <Breadcrumb />;
  },
};

/**
 * Breadcrumb with dynamic parameter (e.g., epoch number)
 */
export const WithDynamicParam: Story = {
  render: () => {
    (useRouterState as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        pathname: '/ethereum',
        context: {
          getBreadcrumb: () => ({ label: 'Ethereum' }),
        },
      },
      {
        pathname: '/ethereum/epochs',
        context: {
          getBreadcrumb: () => ({ label: 'Epochs' }),
        },
      },
      {
        pathname: '/ethereum/epochs/12345',
        context: {
          getBreadcrumb: () => ({ label: 'Epoch 12345' }),
        },
      },
    ]);

    return <Breadcrumb />;
  },
};

/**
 * Breadcrumb without home icon
 */
export const WithoutHomeIcon: Story = {
  render: () => {
    (useRouterState as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        pathname: '/ethereum',
        context: {
          getBreadcrumb: () => ({ label: 'Ethereum' }),
        },
      },
      {
        pathname: '/ethereum/epochs',
        context: {
          getBreadcrumb: () => ({ label: 'Epochs' }),
        },
      },
    ]);

    return <Breadcrumb showHome={false} />;
  },
};

/**
 * Custom separator character
 */
export const CustomSeparator: Story = {
  render: () => {
    (useRouterState as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        pathname: '/ethereum',
        context: {
          getBreadcrumb: () => ({ label: 'Ethereum' }),
        },
      },
      {
        pathname: '/ethereum/epochs',
        context: {
          getBreadcrumb: () => ({ label: 'Epochs' }),
        },
      },
      {
        pathname: '/ethereum/epochs/12345',
        context: {
          getBreadcrumb: () => ({ label: 'Epoch 12345' }),
        },
      },
    ]);

    return <Breadcrumb separator=">" />;
  },
};

/**
 * Long breadcrumb labels to test wrapping behavior
 */
export const LongLabels: Story = {
  render: () => {
    (useRouterState as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        pathname: '/ethereum',
        context: {
          getBreadcrumb: () => ({ label: 'Ethereum Network Statistics' }),
        },
      },
      {
        pathname: '/ethereum/data-availability',
        context: {
          getBreadcrumb: () => ({ label: 'Data Availability Sampling' }),
        },
      },
      {
        pathname: '/ethereum/data-availability/das-custody',
        context: {
          getBreadcrumb: () => ({ label: 'DAS Custody Analysis Dashboard' }),
        },
      },
    ]);

    return <Breadcrumb />;
  },
};

/**
 * Empty state - no breadcrumbs (should render nothing)
 */
export const NoBreadcrumbs: Story = {
  render: () => {
    (useRouterState as unknown as ReturnType<typeof vi.fn>).mockReturnValue([]);

    return (
      <div>
        <p className="mb-4 text-sm text-muted">When there are no breadcrumbs, nothing renders (check below):</p>
        <Breadcrumb />
        <p className="mt-4 text-sm text-muted">(Nothing should appear between these two paragraphs)</p>
      </div>
    );
  },
};

/**
 * Single breadcrumb - should not render (minimum 2 required)
 */
export const SingleBreadcrumb: Story = {
  render: () => {
    (useRouterState as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        pathname: '/ethereum',
        context: {
          getBreadcrumb: () => ({ label: 'Ethereum' }),
        },
      },
    ]);

    return (
      <div>
        <p className="mb-4 text-sm text-muted">With only one breadcrumb, nothing renders (minimum 2 required):</p>
        <Breadcrumb />
        <p className="mt-4 text-sm text-muted">(Nothing should appear between these two paragraphs)</p>
      </div>
    );
  },
};
