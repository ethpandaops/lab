import type { ReactNode } from 'react';

export interface ListSectionProps {
  /**
   * The section title
   */
  title: string;

  /**
   * The content of the section (typically ListItems or nested ListSections)
   */
  children?: ReactNode;

  /**
   * Whether this is a nested subsection
   * @default false
   */
  nested?: boolean;

  /**
   * Whether the section can be collapsed/expanded
   * @default false
   */
  collapsible?: boolean;

  /**
   * Initial collapsed state (only applies if collapsible is true)
   * @default false
   */
  defaultCollapsed?: boolean;

  /**
   * Additional CSS classes for the section container
   */
  className?: string;

  /**
   * Additional CSS classes for the section header
   */
  headerClassName?: string;

  /**
   * Additional CSS classes for the section content
   */
  contentClassName?: string;
}
