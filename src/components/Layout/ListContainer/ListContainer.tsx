import { type JSX, createContext, useContext } from 'react';
import clsx from 'clsx';
import type { ListContainerProps, ListItemProps, ListContainerVariant } from './ListContainer.types';

interface ListContainerContextValue {
  variant: ListContainerVariant;
  fullWidthOnMobile: boolean;
  compact: boolean;
}

const ListContainerContext = createContext<ListContainerContextValue>({
  variant: 'simple',
  fullWidthOnMobile: false,
  compact: false,
});

const variantStyles: Record<
  ListContainerVariant,
  {
    wrapper?: string;
    wrapperMobileFull?: string;
    list: string;
    item: string;
    itemMobileFull?: string;
  }
> = {
  simple: {
    list: 'divide-y divide-border dark:divide-white/10',
    item: '',
    itemMobileFull: 'px-4 sm:px-0',
  },
  card: {
    wrapper:
      'overflow-hidden bg-white shadow-sm dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10',
    wrapperMobileFull:
      'overflow-hidden bg-white shadow-sm sm:rounded-sm dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10',
    list: 'divide-y divide-border dark:divide-white/10',
    item: 'px-6',
    itemMobileFull: 'px-4 sm:px-6',
  },
  flat: {
    wrapper: 'overflow-hidden border border-border bg-white dark:border-white/10 dark:bg-zinc-900',
    wrapperMobileFull:
      'overflow-hidden border border-border bg-white sm:rounded-sm dark:border-white/10 dark:bg-zinc-900',
    list: 'divide-y divide-border dark:divide-white/10',
    item: 'px-6',
    itemMobileFull: 'px-4 sm:px-6',
  },
  separate: {
    list: 'space-y-3',
    item: 'overflow-hidden bg-white px-6 shadow-sm dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10',
    itemMobileFull:
      'overflow-hidden bg-white px-4 shadow-sm sm:rounded-sm sm:px-6 dark:bg-zinc-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10',
  },
};

export function ListItem({ children, className, onClick }: ListItemProps): JSX.Element {
  const { variant, fullWidthOnMobile, compact } = useContext(ListContainerContext);
  const styles = variantStyles[variant];
  const itemClass = fullWidthOnMobile && styles.itemMobileFull ? styles.itemMobileFull : styles.item;

  // Apply padding based on compact flag
  const paddingClass = compact ? 'py-0.5' : 'py-4';

  return (
    <li className={clsx(itemClass, paddingClass, className)} onClick={onClick}>
      {children}
    </li>
  );
}

export function ListContainer({
  children,
  variant = 'simple',
  fullWidthOnMobile = false,
  compact = false,
  className,
  as: Component = 'ul',
}: ListContainerProps): JSX.Element {
  const styles = variantStyles[variant];
  const contextValue: ListContainerContextValue = { variant, fullWidthOnMobile, compact };

  // Variants with wrapper need an extra container
  if (styles.wrapper) {
    const list = (
      <Component role="list" className={styles.list}>
        {children}
      </Component>
    );

    const wrapperClass = fullWidthOnMobile && styles.wrapperMobileFull ? styles.wrapperMobileFull : styles.wrapper;

    return (
      <ListContainerContext.Provider value={contextValue}>
        <div className={clsx(wrapperClass, className)}>{list}</div>
      </ListContainerContext.Provider>
    );
  }

  // Simple variants render list directly
  const list = (
    <Component role="list" className={clsx(styles.list, className)}>
      {children}
    </Component>
  );

  return <ListContainerContext.Provider value={contextValue}>{list}</ListContainerContext.Provider>;
}
