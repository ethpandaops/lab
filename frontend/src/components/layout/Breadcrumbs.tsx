import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  children?: NavItem[];
}

export const breadcrumbs = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
  {
    name: 'Xatu',
    path: '/xatu',
    children: [
      { name: 'Community Nodes', path: '/xatu/community-nodes' },
      { name: 'Networks', path: '/xatu/networks' },
      {
        name: 'Contributors',
        path: '/xatu/contributors',
        children: [{ name: ':name', path: '/xatu/contributors/:name' }],
      },
    ],
  },
  {
    name: 'Beacon',
    path: '/beacon',
    children: [
      {
        name: 'Slot',
        path: '/beacon/slot',
        children: [
          { name: 'Live View', path: '/beacon/slot/live' },
          { name: ':slot', path: '/beacon/slot/:slot' },
        ],
      },
      {
        name: 'Timings',
        path: '/beacon/timings',
        children: [{ name: 'Blocks', path: '/beacon/timings/blocks' }],
      },
    ],
  },
];

function findActivePath(pathname: string, items: NavItem[]): NavItem[] {
  // Special case for home page
  if (pathname === '/') {
    return items.filter(item => item.path === '/');
  }

  for (const item of items) {
    // Exact match
    if (item.path === pathname) {
      return [item];
    }

    // Check if this is a dynamic route or a parent route
    const pathParts = pathname.split('/');
    const itemParts = item.path.split('/');

    // Check if paths match accounting for parameters
    const isMatch =
      itemParts.every((part, i) => {
        if (part.startsWith(':')) return true;
        return part === pathParts[i];
      }) && pathParts.length === itemParts.length;

    if (isMatch) {
      return [item];
    }

    // Check for parent routes
    const isParentRoute = pathname.startsWith(item.path + '/');

    if (isParentRoute && item.children) {
      const childPath = findActivePath(pathname, item.children);
      if (childPath.length > 0) {
        return [item, ...childPath];
      }
    }
  }
  return [];
}

interface BreadcrumbsProps {
  className?: string;
}

export function Breadcrumbs({ className = '' }: BreadcrumbsProps) {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(Boolean);

  return (
    <nav className={`flex flex-wrap items-center gap-2 text-sm font-mono ${className}`}>
      <Link to="/" className="text-tertiary hover:text-primary transition-colors">
        Home
      </Link>

      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;

        return (
          <div key={routeTo} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-muted" />
            {isLast ? (
              <span className="text-primary">
                {name
                  .split('-')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
              </span>
            ) : (
              <Link to={routeTo} className="text-tertiary hover:text-primary transition-colors">
                {name
                  .split('-')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
