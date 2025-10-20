export interface HeaderProps {
  /**
   * Main heading text
   */
  title: string;
  /**
   * Optional description text below the title
   */
  description?: string;
  /**
   * Whether to show the gradient accent bar
   * @default true
   */
  showAccent?: boolean;
  /**
   * Additional CSS classes for the container
   */
  className?: string;
}
