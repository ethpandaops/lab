import { Link, useLocation } from '@tanstack/react-router';
import { BeakerIcon, HomeIcon, InformationCircleIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface NavigationProps {
  showLinks?: boolean;
  className?: string;
}

export function Navigation({ showLinks = true, className = '' }: NavigationProps) {
  const location = useLocation();

  const linkClasses = (path: string) => {
    const isActive = location.pathname === path;
    return `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full ${
      isActive ? 'bg-active text-accent' : 'hover:bg-hover text-primary hover:text-accent'
    }`;
  };

  if (!showLinks) {
    return null;
  }

  return (
    <nav className={`flex lg:flex-row flex-col lg:items-center gap-2 ${className}`}>
      <Link to="/" className={linkClasses('/')}>
        <HomeIcon className="w-4 h-4" />
        Home
      </Link>
      <Link to="/experiments" className={linkClasses('/experiments')}>
        <BeakerIcon className="w-4 h-4" />
        Experiments
      </Link>
      <Link to="/state-analyzer" className={linkClasses('/state-analyzer')}>
        <ChartBarIcon className="w-4 h-4" />
        State Analyzer
      </Link>
      <Link to="/about" className={linkClasses('/about')}>
        <InformationCircleIcon className="w-4 h-4" />
        About
      </Link>
    </nav>
  );
}
