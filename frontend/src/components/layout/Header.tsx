import { Menu, Github, Twitter, ExternalLink } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import useApiMode from '@/contexts/apiMode';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const socialLinks = [
  {
    name: 'Website',
    href: 'https://ethpandaops.io',
    icon: ExternalLink,
  },
  {
    name: 'Twitter',
    href: 'https://twitter.com/ethpandaops',
    icon: Twitter,
  },
  {
    name: 'GitHub',
    href: 'https://github.com/ethpandaops',
    icon: Github,
  },
];

export const Header = ({ onToggleSidebar }: HeaderProps) => {
  const { useRestApi, toggleApiMode } = useApiMode();

  return (
    <header className="bg-white -b -gray-200">
      <div className="h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex h-full items-center justify-between">
          <div className="flex items-center">
            <button
              type="button"
              className="text-tertiary hover:text-gray-600 lg:hidden"
              onClick={onToggleSidebar}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" />
            </button>
            <Link to="/" className="flex items-center space-x-3">
              <img src="/ethpandaops.png" alt="ethPandaOps Logo" className="h-8 w-8" />
              <div className="hidden lg:block">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-primary">
                  ethPandaOps Lab
                </h1>
              </div>
            </Link>
          </div>

          {/* Social Links and API Toggle */}
          <div className="flex items-center space-x-4">
            {/* API Mode Toggle */}
            <button
              onClick={toggleApiMode}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-secondary hover:bg-hover transition-colors"
              title={`Switch to ${useRestApi ? 'gRPC' : 'REST'} API`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full ${useRestApi ? 'bg-green-500' : 'bg-blue-500'}`}
              />
              {useRestApi ? 'REST' : 'gRPC'}
            </button>
            {socialLinks.map(link => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-tertiary hover:text-gray-600 dark:text-secondary dark:hover:text-primary"
                title={link.name}
              >
                <link.icon className="h-5 w-5" />
                <span className="sr-only">{link.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
