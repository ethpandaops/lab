import { Users, BarChart2, X, Home, Info } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavSection {
  name: string
  items: {
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
  }[]
}

const navigation: NavSection[] = [
  {
    name: 'General',
    items: [
      {
        name: 'Home',
        href: '/',
        icon: Home
      },
      {
        name: 'About',
        href: '/about',
        icon: Info
      }
    ]
  },
  {
    name: 'Xatu',
    items: [
      {
        name: 'Contributors',
        href: '/xatu/contributors',
        icon: Users
      },
      {
        name: 'Client Versions',
        href: '/xatu/client-versions',
        icon: BarChart2
      }
    ]
  }
]

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation()

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-gray-900/80 lg:hidden ${
          isOpen ? 'block' : 'hidden'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white dark:bg-gray-800 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex h-16 items-center justify-between px-6 lg:hidden">
          <span className="text-xl font-semibold">Menu</span>
          <button
            type="button"
            className="text-gray-500 hover:text-gray-600"
            onClick={onClose}
          >
            <span className="sr-only">Close sidebar</span>
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 space-y-8 px-4 py-4">
          {navigation.map((section) => (
            <div key={section.name}>
              <h3 className="px-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                {section.name}
              </h3>
              <div className="mt-2 space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                          : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      <item.icon
                        className={`mr-3 h-5 w-5 ${
                          isActive
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-400 dark:text-gray-300'
                        }`}
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </>
  )
} 