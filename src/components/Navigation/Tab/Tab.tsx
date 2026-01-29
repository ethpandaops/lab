import { Tab as HeadlessTab } from '@headlessui/react';
import clsx from 'clsx';
import type { TabProps } from './Tab.types';

/**
 * Tab component - wraps HeadlessUI Tab with consistent styling
 *
 * Uses semantic color tokens and provides a consistent underline style
 * for active tabs. Supports badges for counts or labels.
 *
 * @example
 * ```tsx
 * <TabGroup>
 *   <TabList className="flex gap-2">
 *     <Tab>Overview</Tab>
 *     <Tab badge="12">Details</Tab>
 *     <Tab badge={<span className="text-success">New</span>}>Features</Tab>
 *   </TabList>
 *   <TabPanels>
 *     <TabPanel>Overview content</TabPanel>
 *     <TabPanel>Details content</TabPanel>
 *     <TabPanel>Features content</TabPanel>
 *   </TabPanels>
 * </TabGroup>
 * ```
 */
export function Tab({ children, badge, className, hash }: TabProps): React.JSX.Element {
  return (
    <HeadlessTab
      className={({ selected }) =>
        clsx(
          'px-4 py-2.5 text-sm font-medium transition-colors focus:outline-hidden',
          selected ? 'border-b-2 border-primary text-foreground' : 'text-muted hover:text-foreground',
          className
        )
      }
      onClick={() => {
        if (hash && window.location.hash !== `#${hash}`) {
          window.history.pushState(null, '', `#${hash}`);
        }
      }}
    >
      {children}
      {badge && <span className="text-2xs/3 ml-2 rounded-xs bg-background px-1.5 py-0.5 font-semibold">{badge}</span>}
    </HeadlessTab>
  );
}
