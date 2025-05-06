import { Github } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-white -t -gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-4 flex items-center justify-between">
          <p className="text-sm text-tertiary dark:text-secondary">
            © {new Date().getFullYear()} ethPandaOps. All rights reserved.
          </p>
          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/ethpandaops"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-tertiary dark:hover:text-primary"
            >
              <span className="sr-only">GitHub</span>
              <Github className="h-6 w-6" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
