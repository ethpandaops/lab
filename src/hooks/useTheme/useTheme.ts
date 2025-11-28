import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from '@/contexts/ThemeContext';

/**
 * Hook to access and control the application theme.
 *
 * Provides access to the current theme ('light' or 'dark') and functions
 * to change or clear the theme preference.
 *
 * Must be used within a ThemeProvider. Theme preference is persisted
 * to localStorage and applied to the document root.
 *
 * @throws {Error} If used outside of ThemeProvider
 *
 * @example
 * ```tsx
 * function ThemeToggle() {
 *   const { theme, setTheme } = useTheme();
 *
 *   return (
 *     <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
 *       Current theme: {theme}
 *     </button>
 *   );
 * }
 * ```
 *
 * @example Clear theme (use system preference)
 * ```tsx
 * function ResetTheme() {
 *   const { clearTheme } = useTheme();
 *
 *   return (
 *     <button onClick={clearTheme}>
 *       Reset to system preference
 *     </button>
 *   );
 * }
 * ```
 *
 * @returns {ThemeContextValue} Object containing:
 *   - `theme`: Current theme ('light' or 'dark')
 *   - `setTheme`: Function to set theme preference
 *   - `clearTheme`: Function to clear theme preference (reverts to system)
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
