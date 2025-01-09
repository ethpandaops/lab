import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface SidebarItem {
  name: string
  path: string
  items: {
    name: string
    path: string
    items?: {
      name: string
      path: string
    }[]
  }[]
}

const sidebarItems: SidebarItem[] = [
  {
    name: 'Experiments',
    path: '/experiments',
    items: [
      { 
        name: 'Xatu Contributors',
        path: '/experiments/xatu-contributors',
        items: [
          { name: 'Community Nodes', path: '/experiments/xatu/community-nodes' },
          { name: 'Client Versions', path: '/experiments/xatu/client-versions' },
        ]
      }
    ],
  },
]

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation()
  const showSidebar = location.pathname.startsWith('/experiments')

  if (!showSidebar) {
    return null
  }

  return (
    <>
      {/* Mobile Sidebar */}
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="absolute right-0 top-0 -mr-16 flex pt-4 pr-2">
                  <button
                    type="button"
                    className="relative ml-1 flex h-10 w-10 items-center justify-center rounded-md text-gray-300 focus:outline-none"
                    onClick={onClose}
                  >
                    <span className="absolute -inset-2.5" />
                    <span className="sr-only">Close sidebar</span>
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <SidebarContent />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:top-16 lg:inset-y-0 lg:z-20 lg:flex lg:w-72">
        <SidebarContent />
      </div>
    </>
  )
}

const SidebarContent = () => {
  const location = useLocation()

  return (
    <div className="flex grow flex-col gap-y-5 bg-gray-900/90 backdrop-blur-md border-r border-white/5 px-6 pb-4">
      <nav className="flex flex-1 flex-col pt-4">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          {sidebarItems.map((section) => (
            <li key={section.name}>
              <Link to={section.path} className="block">
                <div className="text-xs font-semibold leading-6 text-cyan-400 hover:text-cyan-300 transition-colors">{section.name}</div>
              </Link>
              <ul role="list" className="mt-2 space-y-1">
                {section.items.map((group) => (
                  <li key={group.name}>
                    <Link
                      to={group.path}
                      className={`block text-sm font-medium text-gray-400 px-2 py-1.5 hover:text-cyan-400 transition-colors
                        ${location.pathname.startsWith(group.path) ? 'text-cyan-400' : ''}`}
                    >
                      {group.name}
                    </Link>
                    {group.items && (
                      <ul className="ml-3 space-y-1">
                        {group.items.map((item) => {
                          const isActive = location.pathname === item.path
                          return (
                            <li key={item.name}>
                              <Link
                                to={item.path}
                                className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 transition-all
                                  ${isActive
                                    ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/50'
                                    : 'text-gray-300 hover:text-cyan-400 hover:bg-cyan-500/10'
                                  }`}
                              >
                                {item.name}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
} 