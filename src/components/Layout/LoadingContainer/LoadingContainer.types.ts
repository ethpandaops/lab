export interface LoadingContainerProps {
  /**
   * Additional CSS classes to apply (e.g., "rounded-xl", "h-4", "w-full")
   */
  className?: string;
  /**
   * Whether to use the shimmer animation (default: true)
   * Set to false to use simple pulse animation instead
   */
  shimmer?: boolean;
}
