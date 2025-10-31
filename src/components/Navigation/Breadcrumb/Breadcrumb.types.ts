/**
 * Breadcrumb item representing a single navigation level
 */
export interface BreadcrumbItem {
  /**
   * Display label for the breadcrumb
   */
  label: string;

  /**
   * Full path for navigation (e.g., "/ethereum/epochs")
   */
  path: string;

  /**
   * Whether this is the current/active breadcrumb
   */
  isActive: boolean;

  /**
   * Whether the breadcrumb should be clickable (default: true)
   */
  clickable: boolean;
}

/**
 * Props for the Breadcrumb component
 */
export interface BreadcrumbProps {
  /**
   * Additional CSS classes to apply to the breadcrumb container
   */
  className?: string;

  /**
   * Separator character/element between breadcrumb items
   * @default "/"
   */
  separator?: string;

  /**
   * Whether to show the home icon as the first breadcrumb
   * @default true
   */
  showHome?: boolean;
}
