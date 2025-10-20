import { clsx } from 'clsx';
import type { DividerProps } from './Divider.types';

export function Divider({
  children,
  alignment = 'center',
  variant,
  button,
  toolbarButtons,
  className,
}: DividerProps): React.JSX.Element {
  // Plain divider with no content
  if (!children && !button && !toolbarButtons) {
    return <div aria-hidden="true" className={clsx('w-full border-t border-border', className)} />;
  }

  // Toolbar variant
  if (variant === 'toolbar' && toolbarButtons) {
    return (
      <div className={clsx('flex items-center', className)}>
        <div aria-hidden="true" className="w-full border-t border-border" />
        <div className="relative flex justify-center">{toolbarButtons}</div>
        <div aria-hidden="true" className="w-full border-t border-border" />
      </div>
    );
  }

  // Button variant (with or without title)
  if (variant === 'button' && button) {
    // Title + button on same line
    if (children) {
      return (
        <div className={clsx('relative flex items-center justify-between', className)}>
          <span className="pr-3 text-base font-semibold text-foreground">{children}</span>
          <div className="flex w-full items-center">
            <div aria-hidden="true" className="w-full border-t border-border" />
            {button}
          </div>
        </div>
      );
    }

    // Just button centered
    return (
      <div className={clsx('flex items-center', className)}>
        <div aria-hidden="true" className="w-full border-t border-border" />
        <div className="relative flex justify-center">{button}</div>
        <div aria-hidden="true" className="w-full border-t border-border" />
      </div>
    );
  }

  // Title variant (larger, bold)
  if (variant === 'title') {
    if (alignment === 'left') {
      return (
        <div className={clsx('flex items-center', className)}>
          <div className="relative flex justify-start">
            <span className="pr-3 text-base font-semibold text-foreground">{children}</span>
          </div>
          <div aria-hidden="true" className="w-full border-t border-border" />
        </div>
      );
    }

    return (
      <div className={clsx('flex items-center', className)}>
        <div aria-hidden="true" className="w-full border-t border-border" />
        <div className="relative flex justify-center">
          <span className="px-3 text-base font-semibold text-foreground">{children}</span>
        </div>
        <div aria-hidden="true" className="w-full border-t border-border" />
      </div>
    );
  }

  // Label/Icon variant (default)
  if (alignment === 'left') {
    return (
      <div className={clsx('flex items-center', className)}>
        <div className="relative flex justify-start">
          <span className="pr-2 text-sm text-muted">{children}</span>
        </div>
        <div aria-hidden="true" className="w-full border-t border-border" />
      </div>
    );
  }

  // Center aligned label/icon
  return (
    <div className={clsx('flex items-center', className)}>
      <div aria-hidden="true" className="w-full border-t border-border" />
      <div className="relative flex justify-center">
        <span className="px-2 text-sm text-muted">{children}</span>
      </div>
      <div aria-hidden="true" className="w-full border-t border-border" />
    </div>
  );
}
