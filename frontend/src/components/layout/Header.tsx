import { Menu, Github, Twitter, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

interface HeaderProps {
  onToggleSidebar: () => void
}

const socialLinks = [
  {
    name: 'Website',
    href: 'https://ethpandaops.io',
    icon: ExternalLink
  },
  {
    name: 'Twitter',
    href: 'https://twitter.com/ethpandaops',
    icon: Twitter
  },
  {
    name: 'GitHub',
    href: 'https://github.com/ethpandaops',
    icon: Github
  }
]

export const Header = ({ onToggleSidebar }: HeaderProps) => {
  return (
    <header className="bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex h-full items-center justify-between">
          <div className="flex items-center">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-600 lg:hidden"
              onClick={onToggleSidebar}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" />
            </button>
            <Link to="/" className="flex items-center space-x-3">
              <img
                src="/ethpandaops-logo.svg"
                alt="EthPandaOps Logo"
                className="h-8 w-8"
              />
              <div className="hidden lg:block">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  EthPandaOps Lab
                </h1>
              </div>
            </Link>
          </div>

          {/* Social Links */}
          <div className="flex items-center space-x-4">
            {socialLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
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
  )
} 