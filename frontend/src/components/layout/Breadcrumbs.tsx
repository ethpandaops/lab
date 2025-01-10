import { Link, useLocation, useParams } from 'react-router-dom';
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
      { name: 'Contributors', path: '/xatu/contributors',
        children: [
          { name: ':name', path: '/xatu/contributors/:name' }
        ]
      }
    ],
  },
  {
    name: 'Beacon Chain',
    path: '/beacon-chain-timings',
    children: [
      { name: 'Blocks', path: '/beacon-chain-timings/blocks' },
    ],
  },
];

function findActivePath(pathname: string, items: NavItem[]): NavItem[] {
  // Special case for home page
  if (pathname === '/') {
    return items.filter((item) => item.path === '/');
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
    const isMatch = itemParts.every((part, i) => {
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

export function Breadcrumbs(): JSX.Element {
  const location = useLocation();
  const params = useParams();
  const activePath = findActivePath(location.pathname, breadcrumbs);

  // Replace dynamic parameters with actual values
  const processedPath = activePath.map(item => {
    if (item.name.startsWith(':')) {
      const paramName = item.name.slice(1);
      return { ...item, name: params[paramName] || item.name };
    }
    return item;
  });

  // Always include home unless we're already on the home page
  const finalPath = location.pathname === '/' 
    ? processedPath 
    : [breadcrumbs[0], ...processedPath];

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {finalPath.map((item, index) => (
          <li key={item.path} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-500 mx-2" />
            )}
            <Link
              to={item.path}
              className={`text-sm font-medium hover:text-cyan-400 transition-colors ${
                index === finalPath.length - 1
                  ? 'text-cyan-400'
                  : 'text-gray-400'
              }`}
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
} 