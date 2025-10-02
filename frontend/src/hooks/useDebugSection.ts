import { useEffect } from 'react';
import { ReactNode } from 'react';
import { useDebug } from '@/contexts/debug';

/**
 * Hook to register a debug section with the global debug panel
 * @param id - Unique identifier for this debug section
 * @param title - Display title for the debug section
 * @param render - Function that returns the debug content to display
 * @param deps - Dependencies array that will trigger re-render when changed
 * @param priority - Optional priority for sorting (lower numbers appear first)
 */
export function useDebugSection(
  id: string,
  title: string,
  render: () => ReactNode,
  deps: any[] = [],
  priority?: number,
) {
  const { registerSection, unregisterSection, updateSection } = useDebug();

  useEffect(() => {
    // Initial registration
    registerSection({
      id,
      title,
      component: render(),
      priority,
    });

    // Cleanup on unmount
    return () => unregisterSection(id);
  }, []); // Only register/unregister on mount/unmount

  // Update content when dependencies change
  useEffect(() => {
    updateSection(id, render());
  }, deps); // Re-render when dependencies change
}
