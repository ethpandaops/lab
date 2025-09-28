import { Share2, Database } from 'lucide-react';
import { useLocation } from '@tanstack/react-router';

interface SystemAlertProps {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  showOnPaths?: string[];
}

export const SystemAlert = ({ title, buttonText, buttonLink, showOnPaths = ['/beacon'] }: SystemAlertProps) => {
  const location = useLocation();

  // Check if current path starts with any of the paths in showOnPaths
  const shouldShow = showOnPaths.some(path => location.pathname.startsWith(path));

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 py-1.5 px-4 bg-accent/5 border border-accent/30 rounded-full shadow-sm">
      <div className="h-5 w-5 rounded-full bg-accent/10 p-1 flex items-center justify-center">
        <Share2 className="h-3 w-3 text-accent" />
      </div>
      <div className="flex-1 min-w-0 hidden sm:block">
        <p className="text-xs font-medium text-primary whitespace-nowrap">{title}</p>
      </div>
      <a
        href={buttonLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 inline-flex items-center justify-center px-3 py-1 text-xs font-medium text-primary bg-accent/10 hover:bg-accent/20 border border-accent/25 transition-all hover:scale-105 rounded-full"
      >
        {buttonText}
      </a>
    </div>
  );
};

// Default implementation with hardcoded Google Form alert
// Custom component with special styling for the Xatu contribution alert
export const GoogleFormSystemAlert = () => {
  const location = useLocation();
  const shouldShow =
    location.pathname.startsWith('/beacon') ||
    location.pathname.startsWith('/xatu') ||
    location.pathname.startsWith('/xatu-data');

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Database className="hidden xl:block h-4 w-4 text-accent" />
      <div className="flex-1 min-w-0 hidden xl:block">
        <p className="text-xs font-medium text-primary whitespace-nowrap">Add your node to The Lab</p>
      </div>
      <a
        href="https://ethpandaops.io/contribute-data/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 inline-flex items-center justify-center px-3 py-1 text-xs font-medium text-primary bg-accent/10 hover:bg-accent/20 transition-all hover:scale-105"
      >
        <span className="hidden xl:inline">Contribute Data</span>
        <span className="xl:hidden">Contribute</span>
        <Share2 className="ml-1.5 h-3 w-3 text-accent" />
      </a>
    </div>
  );
};
