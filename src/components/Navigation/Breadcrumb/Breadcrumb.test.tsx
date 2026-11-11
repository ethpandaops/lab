import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { Breadcrumb } from './Breadcrumb';

/** The parts of a matched route that Breadcrumb reads */
interface RouteMatch {
  pathname: string;
  context: { getBreadcrumb: () => { label: string; show?: boolean } };
}

// Breadcrumb selects the route matches from the router state; the mock returns them as selected
const useRouterState = vi.hoisted(() => vi.fn<() => RouteMatch[]>());

// Mock TanStack Router hooks
vi.mock('@tanstack/react-router', async importOriginal => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouterState,
}));

describe('Breadcrumb', () => {
  it('should not render when there are no breadcrumbs', () => {
    useRouterState.mockReturnValue([]);
    const { container } = render(<Breadcrumb />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when there is only one breadcrumb', () => {
    useRouterState.mockReturnValue([
      {
        pathname: '/ethereum',
        context: {
          getBreadcrumb: () => ({ label: 'Ethereum' }),
        },
      },
    ]);
    const { container } = render(<Breadcrumb />);
    expect(container.firstChild).toBeNull();
  });

  it('should render breadcrumbs when there are multiple items', () => {
    useRouterState.mockReturnValue([
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

    render(<Breadcrumb />);

    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
    expect(screen.getByText('Epochs')).toBeInTheDocument();
  });

  it('should render home icon when showHome is true', () => {
    useRouterState.mockReturnValue([
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

    render(<Breadcrumb showHome={true} />);
    expect(screen.getByLabelText('Home')).toBeInTheDocument();
  });

  it('should not render home icon when showHome is false', () => {
    useRouterState.mockReturnValue([
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

    render(<Breadcrumb showHome={false} />);
    expect(screen.queryByLabelText('Home')).not.toBeInTheDocument();
  });

  it('should mark the last breadcrumb as active', () => {
    useRouterState.mockReturnValue([
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

    render(<Breadcrumb />);
    const activeItem = screen.getByText('Epochs');
    expect(activeItem.tagName).toBe('SPAN');
    expect(activeItem).toHaveAttribute('aria-current', 'page');
  });

  it('should filter out breadcrumbs with show: false', () => {
    useRouterState.mockReturnValue([
      {
        pathname: '/ethereum',
        context: {
          getBreadcrumb: () => ({ label: 'Ethereum' }),
        },
      },
      {
        pathname: '/ethereum/live',
        context: {
          getBreadcrumb: () => ({ label: 'Live', show: false }),
        },
      },
    ]);

    const { container } = render(<Breadcrumb />);
    // Should not render because only one visible breadcrumb
    expect(container.firstChild).toBeNull();
  });

  it('should use custom separator', () => {
    useRouterState.mockReturnValue([
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

    render(<Breadcrumb separator=">" />);
    expect(screen.getAllByText('>').length).toBeGreaterThan(0);
  });

  it('should apply custom className', () => {
    useRouterState.mockReturnValue([
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

    render(<Breadcrumb className="custom-class" />);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('custom-class');
  });
});
