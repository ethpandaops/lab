import { Link } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { BeakerIcon, HomeIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

interface NavigationProps {
  showLinks?: boolean
}

export function Navigation({ showLinks = true }: NavigationProps): JSX.Element {
  const location = useLocation()

  const linkClasses = (path: string) => {
    const isActive = location.pathname === path
    return `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full ${
      isActive
        ? 'bg-active text-accent'
        : 'hover:bg-hover text-primary hover:text-accent'
    }`
  }

  if (!showLinks) {
    return null
  }

  return (
    <nav className="flex lg:flex-row flex-col lg:items-center gap-2">
      <Link to="/" className={linkClasses('/')}>
        <HomeIcon className="w-4 h-4" />
        Home
      </Link>
      <Link to="/experiments" className={linkClasses('/experiments')}>
        <BeakerIcon className="w-4 h-4" />
        Experiments
      </Link>
      <Link to="/about" className={linkClasses('/about')}>
        <InformationCircleIcon className="w-4 h-4" />
        About
      </Link>
    </nav>
  )
} 