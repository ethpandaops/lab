import { type JSX, createContext, use } from 'react';
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
    wrapper: 'overflow-hidden border border-border bg-panel',
    wrapperMobileFull: 'overflow-hidden border border-border bg-panel sm:rounded-sm',
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

export function ListItem({ children, className, onClick, as: Component = 'li' }: ListItemProps): JSX.Element {
  const { variant, fullWidthOnMobile, compact } = use(ListContainerContext);
  const styles = variantStyles[variant];
  const itemClass = fullWidthOnMobile && styles.itemMobileFull ? styles.itemMobileFull : styles.item;

  // Apply padding based on compact flag
  const paddingClass = compact ? 'py-0.5' : 'py-4';

  return (
    <Component className={clsx(itemClass, paddingClass, className)} onClick={onClick}>
      {children}
    </Component>
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

  // A div is not a list (its items carry another role, such as radio options)
  const role = Component === 'div' ? undefined : 'list';

  // Apply dividers based on withDividers prop and variant
  // Note: 'separate' variant doesn't use dividers
  const listClassName = clsx(styles.list, withDividers && variant !== 'separate' && styles.listWithDividers);

  // Variants with wrapper need an extra container
  if (styles.wrapper) {
    const list = (
      <Component role={role} className={listClassName}>
        {children}
      </Component>
    );

    const wrapperClass = fullWidthOnMobile && styles.wrapperMobileFull ? styles.wrapperMobileFull : styles.wrapper;

    return (
      <ListContainerContext value={contextValue}>
        <div className={clsx(wrapperClass, className)}>{list}</div>
      </ListContainerContext>
    );
  }

  // Simple variants render list directly
  const list = (
    <Component role={role} className={clsx(listClassName, className)}>
      {children}
    </Component>
  );

  return <ListContainerContext value={contextValue}>{list}</ListContainerContext>;
}
