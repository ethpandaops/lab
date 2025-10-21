import type { JSX } from 'react';
import { Disclosure as HeadlessDisclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { DisclosureProps } from './Disclosure.types';

export function Disclosure({ title, children, defaultOpen = false, className }: DisclosureProps): JSX.Element {
  return (
    <HeadlessDisclosure as="div" className={className} defaultOpen={defaultOpen}>
      {({ open }) => (
        <>
          <DisclosureButton className="flex w-full items-center justify-between rounded-sm bg-surface px-4 py-3 text-left text-sm/6 font-medium text-foreground transition-colors hover:bg-primary/10 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-primary/75">
            <span>{title}</span>
            <ChevronDownIcon className={clsx('size-5 text-muted transition-transform', open && 'rotate-180')} />
          </DisclosureButton>
          <DisclosurePanel className="px-4 pt-4 pb-2 text-sm/6 text-foreground">{children}</DisclosurePanel>
        </>
      )}
    </HeadlessDisclosure>
  );
}
