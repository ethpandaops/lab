export type HeaderSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface HeaderProps {
  /**
   * Main heading text
   */
  title: string;
  /**
   * Optional description text or content below the title
   */
  description?: React.ReactNode;
  /**
   * The size of the header
   * @default 'md'
   */
  size?: HeaderSize;
  /**
   * Additional CSS classes for the container
   */
  className?: string;
}
