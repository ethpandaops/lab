import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid';
import type { AlertProps } from './Alert.types';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const base = {
  container: 'bg-surface outline -outline-offset-1 outline-border',
  title: 'text-foreground',
  description: 'text-muted',
  descriptionBorder: 'text-muted',
  actionText: 'text-foreground',
  actionHover: 'hover:bg-muted/10',
  dismissText: 'text-muted hover:text-foreground',
  dismissHover: 'hover:bg-muted/10',
};

const variantConfig = {
  info: {
    ...base,
    containerBorder: 'border-l-4 border-primary bg-surface',
    icon: 'text-primary',
    iconBorder: 'text-primary',
    link: 'text-foreground underline underline-offset-2 hover:text-primary',
    defaultIcon: <InformationCircleIcon />,
  },
  success: {
    ...base,
    containerBorder: 'border-l-4 border-success bg-surface',
    icon: 'text-success',
    iconBorder: 'text-success',
    link: 'text-foreground underline underline-offset-2 hover:text-primary',
    defaultIcon: <CheckCircleIcon />,
  },
  warning: {
    ...base,
    containerBorder: 'border-l-4 border-warning bg-surface',
    icon: 'text-warning',
    iconBorder: 'text-warning',
    link: 'text-foreground underline underline-offset-2 hover:text-primary',
    defaultIcon: <ExclamationTriangleIcon />,
  },
  error: {
    ...base,
    containerBorder: 'border-l-4 border-danger bg-surface',
    icon: 'text-danger',
    iconBorder: 'text-danger',
    link: 'text-foreground underline underline-offset-2 hover:text-primary',
    defaultIcon: <XCircleIcon />,
  },
};

export function Alert({
  variant = 'info',
  icon,
  title,
  description,
  items,
  actions,
  link,
  onDismiss,
  accentBorder = false,
  className = '',
}: AlertProps): JSX.Element {
  const config = variantConfig[variant];
  const displayIcon = icon !== undefined ? icon : config.defaultIcon;

  // Determine container classes based on variant
  const containerClasses = accentBorder ? `${config.containerBorder} p-4` : `rounded-sm ${config.container} p-4`;

  const iconClasses = accentBorder ? config.iconBorder : config.icon;
  const descriptionClasses = accentBorder ? config.descriptionBorder : config.description;

  return (
    <div className={`${containerClasses} ${className}`.trim()}>
      <div className="flex">
        <div className="shrink-0">
          {displayIcon && (
            <div aria-hidden="true" className={`size-5 ${iconClasses}`}>
              {displayIcon}
            </div>
          )}
        </div>

        <div className={`${displayIcon ? 'ml-3' : ''} ${link ? 'flex-1 md:flex md:justify-between' : ''}`}>
          {/* Title and description section */}
          {title && !link && <h3 className={`text-sm/5 font-medium ${config.title}`}>{title}</h3>}

          {description && (
            <div className={`${title && !link ? 'mt-2' : ''} text-sm/5 ${descriptionClasses}`}>
              {typeof description === 'string' ? <p>{description}</p> : description}
            </div>
          )}

          {/* List items */}
          {items && items.length > 0 && (
            <div className={`mt-2 text-sm/5 ${descriptionClasses}`}>
              <ul role="list" className="list-disc space-y-1 pl-5">
                {items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Link on right */}
          {link && (
            <p className="mt-3 text-sm/5 md:mt-0 md:ml-6">
              <Link to={link.to} className={`font-medium whitespace-nowrap ${config.link}`}>
                {link.label}
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </p>
          )}

          {/* Actions */}
          {actions && actions.length > 0 && (
            <div className="mt-4">
              <div className="-mx-2 -my-1.5 flex gap-3">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={action.onClick}
                    className={`rounded-sm px-2 py-1.5 text-sm/5 font-medium ${config.actionText} ${config.actionHover} ${FOCUS}`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className={`inline-flex rounded-sm p-1.5 ${config.dismissText} ${config.dismissHover} ${FOCUS}`}
              >
                <span className="sr-only">Dismiss</span>
                <XMarkIcon aria-hidden="true" className="size-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
