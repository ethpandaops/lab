import { type JSX, createContext, useContext } from 'react';
import clsx from 'clsx';
import type { ListContainerProps, ListItemProps, ListContainerVariant } from './ListContainer.types';

interface ListContainerContextValue {
  variant: ListContainerVariant;
  fullWidthOnMobile: boolean;
  compact: boolean;
  withDividers: boolean;
}

const ListContainerContext = createContext<ListContainerContextValue>({
  variant: 'simple',
  fullWidthOnMobile: false,
  compact: false,
  withDividers: true,
});

const variantStyles: Record<
  ListContainerVariant,
  {
    wrapper?: string;
    wrapperMobileFull?: string;
    list: string;
    listWithDividers?: string;
    item: string;
    itemMobileFull?: string;
  }
> = {
  simple: {
    list: '',
    listWithDividers: 'divide-y divide-border',
    item: '',
    itemMobileFull: 'px-4 sm:px-0',
  },
  card: {
    wrapper: 'overflow-hidden rounded-sm bg-surface outline -outline-offset-1 outline-border',
    wrapperMobileFull: 'overflow-hidden bg-surface outline -outline-offset-1 outline-border sm:rounded-sm',
    list: '',
    listWithDividers: 'divide-y divide-border',
    item: 'px-6',
    itemMobileFull: 'px-4 sm:px-6',
  },
  flat: {
    wrapper: 'overflow-hidden border border-border bg-surface dark:border-border dark:bg-background',
    wrapperMobileFull:
      'overflow-hidden border border-border bg-surface sm:rounded-sm dark:border-border dark:bg-background',
    list: '',
    listWithDividers: 'divide-y divide-border',
    item: 'px-6',
    itemMobileFull: 'px-4 sm:px-6',
  },
  separate: {
    list: 'space-y-3',
    item: 'overflow-hidden rounded-sm bg-surface px-6 outline -outline-offset-1 outline-border',
    itemMobileFull: 'overflow-hidden bg-surface px-4 outline -outline-offset-1 outline-border sm:rounded-sm sm:px-6',
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
  withDividers = true,
  className,
  as: Component = 'ul',
}: ListContainerProps): JSX.Element {
  const styles = variantStyles[variant];
  const contextValue: ListContainerContextValue = { variant, fullWidthOnMobile, compact, withDividers };

  // Apply dividers based on withDividers prop and variant
  // Note: 'separate' variant doesn't use dividers
  const listClassName = clsx(styles.list, withDividers && variant !== 'separate' && styles.listWithDividers);

  // Variants with wrapper need an extra container
  if (styles.wrapper) {
    const list = (
      <Component role="list" className={listClassName}>
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
    <Component role="list" className={clsx(listClassName, className)}>
      {children}
    </Component>
  );

  return <ListContainerContext.Provider value={contextValue}>{list}</ListContainerContext.Provider>;
}
