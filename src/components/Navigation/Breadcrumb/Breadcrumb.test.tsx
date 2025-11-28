import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumb } from './Breadcrumb';

// Mock TanStack Router hooks
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouterState: vi.fn(),
}));

// Import after mocking
import { useRouterState } from '@tanstack/react-router';

describe('Breadcrumb', () => {
  it('should not render when there are no breadcrumbs', () => {
    vi.mocked(useRouterState).mockReturnValue([]);
    const { container } = render(<Breadcrumb />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when there is only one breadcrumb', () => {
    vi.mocked(useRouterState).mockReturnValue([
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
    vi.mocked(useRouterState).mockReturnValue([
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
    vi.mocked(useRouterState).mockReturnValue([
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
    vi.mocked(useRouterState).mockReturnValue([
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
    vi.mocked(useRouterState).mockReturnValue([
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
    vi.mocked(useRouterState).mockReturnValue([
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
    vi.mocked(useRouterState).mockReturnValue([
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
    vi.mocked(useRouterState).mockReturnValue([
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
