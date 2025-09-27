import React, { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { Card, CardBody } from '@/components/common/Card';

export interface FeatureCardProps {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  icon?: ReactNode;
  logo?: string;
  href: string;
  accentColor?: {
    light: string;
    medium: string;
  };
  actionText?: string;
  ActionIcon?: React.ElementType;
  isExternal?: boolean;
}

/**
 * FeatureCard - An enhanced card component for showcasing features or experiments
 *
 * This component provides a visually rich card with hover animations and decorative elements
 * designed for highlighting important features, experiments, or product offerings.
 *
 * @usage
 *
 * ✅ WHEN TO USE:
 * - For highlighted/featured content on landing or marketing pages
 * - When showcasing key features or experiments that need visual impact
 * - For product or service cards that benefit from visual differentiation
 * - On pages where drawing visual attention to specific options is desired
 *
 * ❌ WHEN NOT TO USE:
 * - For regular data display or dense information (use the standard Card component)
 * - When multiple cards are needed in tight layouts (use simpler cards)
 * - For administrative interfaces or data-heavy applications
 * - When performance is a concern (animations can be costly)
 *
 * @example
 * // Basic usage
 * <FeatureCard
 *   title="Feature Name"
 *   subtitle="Category"
 *   description="This feature does something amazing."
 *   logo="/path/to/logo.png" // OR icon={<YourIcon />}
 *   href="/feature-details"
 * />
 *
 * // With custom accent colors
 * <FeatureCard
 *   title="Feature Name"
 *   subtitle="Category"
 *   description="This feature does something amazing."
 *   logo="/path/to/logo.png"
 *   href="/feature-details"
 *   accentColor={{
 *     light: 'rgba(142, 45, 226, 0.05)',
 *     medium: 'rgba(142, 45, 226, 0.15)'
 *   }}
 *   actionText="Learn More"
 *   isExternal={true}
 * />
 */
export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  subtitle,
  description,
  icon,
  logo,
  href,
  actionText = 'Explore',
  ActionIcon = ChevronRight,
  isExternal = false,
}) => {
  // Card content
  const cardContent = (
    <>
      {/* Card content container */}
      <CardBody className="relative p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row md:h-full">
          {/* Logo/Icon section - fixed to 3/12 width on desktop */}
          {logo || icon ? (
            <div className="relative md:w-3/12 flex items-center justify-center bg-surface/30">
              {/* Logo or icon */}
              {logo ? (
                <div className="flex items-center justify-center w-full h-32 md:h-full p-4">
                  <img src={logo} alt="" className="max-w-full max-h-[60%] object-contain" />
                </div>
              ) : icon ? (
                <div className="flex items-center justify-center w-full h-32 md:h-full p-4">
                  <div className="max-h-[60%]">{icon}</div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Card text content */}
          <div
            className={`flex-1 p-2 md:p-8 flex flex-col justify-center min-w-0 text-center ${logo || icon ? 'md:text-left' : ''}`}
          >
            <div className="mb-1 text-xs font-mono text-accent/80 tracking-wide uppercase">
              {subtitle}
            </div>

            <h3 className="text-xl md:text-2xl font-sans font-bold text-primary group-hover:text-accent transition-colors duration-300 mb-2">
              {title}
            </h3>

            <p className="text-sm md:text-md font-mono text-secondary mb-4">{description}</p>

            {/* Action button with subtle animation */}
            <div className="inline-flex items-center text-accent bg-accent/5 border border-accent/10 px-3 py-1.5 rounded-full group-hover:bg-accent/10 group-hover:border-accent/20 transition-all duration-300">
              <span className="text-sm font-mono">{actionText}</span>
              <ActionIcon className="ml-1 w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
            </div>
          </div>
        </div>
      </CardBody>
    </>
  );

  // Wrapper with appropriate class names - simplified with fewer effects
  const cardClasses =
    'group relative overflow-hidden rounded-lg bg-surface border border-subtle hover:border-accent/30 transition-colors duration-300 hover:shadow-sm';

  return (
    <Card isInteractive className={cardClasses}>
      {isExternal ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
          {cardContent}
        </a>
      ) : (
        <Link to={href} className="block w-full h-full">
          {cardContent}
        </Link>
      )}
    </Card>
  );
};

export default FeatureCard;
