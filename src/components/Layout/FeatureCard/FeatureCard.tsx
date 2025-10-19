import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import { Card, CardBody } from '@/components/Layout/Card';
import type { FeatureCardProps } from './FeatureCard.types';

export function FeatureCard({
  title,
  subtitle,
  description,
  icon,
  logo,
  href,
  actionText = 'Explore',
  ActionIcon = ChevronRightIcon,
  isExternal = false,
}: FeatureCardProps): JSX.Element {
  // Card content
  const cardContent = (
    <>
      {/* Card content container */}
      <CardBody className="relative overflow-hidden p-0">
        <div className="flex flex-col md:h-full md:flex-row">
          {/* Logo/Icon section - fixed to 3/12 width on desktop */}
          {logo || icon ? (
            <div className="relative flex items-center justify-center md:w-3/12">
              {/* Logo or icon */}
              {logo ? (
                <div className="flex h-32 w-full items-center justify-center p-4 md:h-full">
                  <img src={logo} alt="" className="max-h-[60%] max-w-full object-contain" />
                </div>
              ) : icon ? (
                <div className="flex h-32 w-full items-center justify-center p-4 md:h-full">
                  <div className="max-h-[60%]">{icon}</div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Card text content */}
          <div
            className={`flex min-w-0 flex-1 flex-col justify-center p-2 text-center md:p-8 ${logo || icon ? 'md:text-left' : ''}`}
          >
            <div className="mb-1 font-mono text-xs tracking-wide text-accent/80 uppercase">{subtitle}</div>

            <h3 className="mb-2 font-sans text-xl font-bold text-primary transition-colors duration-300 group-hover:text-accent md:text-2xl">
              {title}
            </h3>

            <p className="md:text-md mb-4 font-mono text-sm text-secondary">{description}</p>

            {/* Action button with subtle animation */}
            <div className="inline-flex items-center rounded-full border border-accent/10 bg-accent/5 px-3 py-1.5 transition-all duration-300 group-hover:border-accent/20 group-hover:bg-accent/10">
              <span className="font-mono text-sm text-accent">{actionText}</span>
              <ActionIcon className="ml-1 h-4 w-4 text-accent transition-transform duration-300 group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </CardBody>
    </>
  );

  // Wrapper with appropriate class names - simplified with fewer effects
  const cardClasses =
    'card card-secondary card-interactive card card-secondary card-interactive group relative overflow-hidden rounded-lg transition-colors duration-300 hover:shadow-sm';

  return (
    <Card isInteractive className={cardClasses}>
      {isExternal ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
          {cardContent}
        </a>
      ) : (
        <Link to={href} className="block h-full w-full">
          {cardContent}
        </Link>
      )}
    </Card>
  );
}
