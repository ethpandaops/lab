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

const variantConfig = {
  info: {
    container: 'bg-blue-50 dark:bg-blue-500/10 dark:outline dark:outline-blue-500/20',
    containerBorder: 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-500/10',
    icon: 'text-blue-400',
    iconBorder: 'text-blue-400 dark:text-blue-500',
    title: 'text-blue-800 dark:text-blue-200',
    description: 'text-blue-700 dark:text-blue-300',
    descriptionBorder: 'text-blue-700 dark:text-blue-300',
    link: 'text-blue-700 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200',
    actionBg: 'bg-blue-50 dark:bg-transparent',
    actionText: 'text-blue-800 dark:text-blue-200',
    actionHover: 'hover:bg-blue-100 dark:hover:bg-white/10',
    actionFocus: 'focus-visible:outline-blue-600 dark:focus-visible:outline-blue-500/50',
    dismissBg: 'bg-blue-50 dark:bg-transparent',
    dismissText: 'text-blue-500 dark:text-blue-400',
    dismissHover: 'hover:bg-blue-100 dark:hover:bg-blue-500/10',
    dismissRing:
      'focus-visible:ring-blue-600 focus-visible:ring-offset-blue-50 dark:focus-visible:ring-blue-500 dark:focus-visible:ring-offset-blue-900',
    defaultIcon: <InformationCircleIcon />,
  },
  success: {
    container: 'bg-green-50 dark:bg-green-500/10 dark:outline dark:outline-green-500/20',
    containerBorder: 'border-green-400 bg-green-50 dark:border-green-500 dark:bg-green-500/10',
    icon: 'text-green-400',
    iconBorder: 'text-green-400 dark:text-green-500',
    title: 'text-green-800 dark:text-green-200',
    description: 'text-green-700 dark:text-green-200/85',
    descriptionBorder: 'text-green-700 dark:text-green-300',
    link: 'text-green-700 hover:text-green-600 dark:text-green-300 dark:hover:text-green-200',
    actionBg: 'bg-green-50 dark:bg-transparent',
    actionText: 'text-green-800 dark:text-green-200',
    actionHover: 'hover:bg-green-100 dark:hover:bg-white/10',
    actionFocus: 'focus-visible:outline-green-600 dark:focus-visible:outline-green-500/50',
    dismissBg: 'bg-green-50 dark:bg-transparent',
    dismissText: 'text-green-500 dark:text-green-400',
    dismissHover: 'hover:bg-green-100 dark:hover:bg-green-500/10',
    dismissRing:
      'focus-visible:ring-green-600 focus-visible:ring-offset-green-50 dark:focus-visible:ring-green-500 dark:focus-visible:ring-offset-green-900',
    defaultIcon: <CheckCircleIcon />,
  },
  warning: {
    container: 'bg-yellow-50 dark:bg-yellow-500/10 dark:outline dark:outline-yellow-500/15',
    containerBorder: 'border-yellow-400 bg-yellow-50 dark:border-yellow-500 dark:bg-yellow-500/10',
    icon: 'text-yellow-400 dark:text-yellow-300',
    iconBorder: 'text-yellow-400 dark:text-yellow-500',
    title: 'text-yellow-800 dark:text-yellow-100',
    description: 'text-yellow-700 dark:text-yellow-100/80',
    descriptionBorder: 'text-yellow-700 dark:text-yellow-300',
    link: 'text-yellow-700 hover:text-yellow-600 dark:text-yellow-300 dark:hover:text-yellow-200',
    actionBg: 'bg-yellow-50 dark:bg-transparent',
    actionText: 'text-yellow-800 dark:text-yellow-200',
    actionHover: 'hover:bg-yellow-100 dark:hover:bg-white/10',
    actionFocus: 'focus-visible:outline-yellow-600 dark:focus-visible:outline-yellow-500/50',
    dismissBg: 'bg-yellow-50 dark:bg-transparent',
    dismissText: 'text-yellow-500 dark:text-yellow-400',
    dismissHover: 'hover:bg-yellow-100 dark:hover:bg-yellow-500/10',
    dismissRing:
      'focus-visible:ring-yellow-600 focus-visible:ring-offset-yellow-50 dark:focus-visible:ring-yellow-500 dark:focus-visible:ring-offset-yellow-900',
    defaultIcon: <ExclamationTriangleIcon />,
  },
  error: {
    container: 'bg-red-50 dark:bg-red-500/15 dark:outline dark:outline-red-500/25',
    containerBorder: 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-500/15',
    icon: 'text-red-400',
    iconBorder: 'text-red-400 dark:text-red-500',
    title: 'text-red-800 dark:text-red-200',
    description: 'text-red-700 dark:text-red-200/80',
    descriptionBorder: 'text-red-700 dark:text-red-300',
    link: 'text-red-700 hover:text-red-600 dark:text-red-300 dark:hover:text-red-200',
    actionBg: 'bg-red-50 dark:bg-transparent',
    actionText: 'text-red-800 dark:text-red-200',
    actionHover: 'hover:bg-red-100 dark:hover:bg-white/10',
    actionFocus: 'focus-visible:outline-red-600 dark:focus-visible:outline-red-500/50',
    dismissBg: 'bg-red-50 dark:bg-transparent',
    dismissText: 'text-red-500 dark:text-red-400',
    dismissHover: 'hover:bg-red-100 dark:hover:bg-red-500/10',
    dismissRing:
      'focus-visible:ring-red-600 focus-visible:ring-offset-red-50 dark:focus-visible:ring-red-500 dark:focus-visible:ring-offset-red-900',
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
  const displayIcon = icon || config.defaultIcon;

  // Determine container classes based on variant
  const containerClasses = accentBorder
    ? `border-l-4 ${config.containerBorder} p-4`
    : `rounded-md ${config.container} p-4`;

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

        <div className={`ml-3 ${link ? 'flex-1 md:flex md:justify-between' : ''}`}>
          {/* Title and description section */}
          {title && !link && <h3 className={`text-sm/5 font-medium ${config.title}`}>{title}</h3>}

          {description && (
            <div className={`${title && !link ? 'mt-2' : ''} text-sm/5 ${link ? descriptionClasses : ''}`}>
              {typeof description === 'string' ? (
                <p className={!link ? descriptionClasses : ''}>{description}</p>
              ) : (
                description
              )}
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
                    className={`rounded-md px-2 py-1.5 text-sm/5 font-medium ${config.actionBg} ${config.actionText} ${config.actionHover} focus-visible:outline-2 focus-visible:outline-offset-2 ${config.actionFocus} dark:focus-visible:outline-offset-1`}
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
                className={`inline-flex rounded-md p-1.5 ${config.dismissBg} ${config.dismissText} ${config.dismissHover} focus-visible:ring-2 ${config.dismissRing} focus-visible:ring-offset-2 focus-visible:outline-hidden dark:focus-visible:ring-offset-1`}
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
