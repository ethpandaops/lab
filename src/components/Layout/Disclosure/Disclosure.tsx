import type { JSX } from 'react';
import { Disclosure as HeadlessDisclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import type { DisclosureProps } from './Disclosure.types';

/**
 * Disclosure component with collapsible content
 * Uses simple arrow indicators (▶/▼) and bordered styling
 */
export function Disclosure({
  title,
  children,
  defaultOpen = false,
  className,
  rightContent,
  panelClassName = 'border border-border bg-surface p-4',
}: DisclosureProps): JSX.Element {
  return (
    <HeadlessDisclosure as="div" className={className} defaultOpen={defaultOpen}>
      {({ open }) => (
        <>
          <DisclosureButton className="mb-2 flex w-full items-center justify-between border border-border bg-surface px-3 py-2 text-sm transition-colors hover:bg-muted/20 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/75">
            <div className="flex items-center gap-2">
              <span>{open ? '▼' : '▶'}</span>
              <span className="font-medium">{title}</span>
            </div>
            {rightContent}
          </DisclosureButton>
          <DisclosurePanel className={panelClassName}>{children}</DisclosurePanel>
        </>
      )}
    </HeadlessDisclosure>
  );
}
