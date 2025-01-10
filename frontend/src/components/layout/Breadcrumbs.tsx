import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  items?: NavItem[];
}

const navItems: NavItem[] = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
  { 
    name: 'Experiments', 
    path: '/experiments',
    items: [
      { 
        name: 'Xatu Contributors',
        path: '/experiments/xatu-contributors',
        items: [
          { name: 'Community Nodes', path: '/experiments/xatu-contributors/community-nodes' },
          { name: 'Networks', path: '/experiments/xatu-contributors/networks' },
          { 
            name: 'Contributors', 
            path: '/experiments/xatu-contributors/contributors',
            items: [
              { name: ':name', path: '/experiments/xatu-contributors/contributors/:name' }
            ]
          },
        ],
      },
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
    
    if (isParentRoute && item.items) {
      const childPath = findActivePath(pathname, item.items);
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
  const activePath = findActivePath(location.pathname, navItems);
  const home = navItems.find(item => item.path === '/');

  return (
    <div className="flex items-center gap-2 text-sm mb-6">
      <div className="flex items-center">
        <Link
          to="/"
          className={`transition-colors ${
            location.pathname === '/'
              ? 'text-cyan-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Home
        </Link>
      </div>

      {activePath.filter(item => item.path !== '/').map((item, index) => (
        <div key={item.path} className="flex items-center">
          <ChevronRight className="w-4 h-4 mx-2 text-gray-600" />
          <Link
            to={item.path.includes(':') ? item.path.replace(':name', params.name || '') : item.path}
            className={`transition-colors ${
              index === activePath.filter(i => i.path !== '/').length - 1
                ? 'text-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {item.path.includes(':') ? params.name : item.name}
          </Link>
        </div>
      ))}
    </div>
  );
} 