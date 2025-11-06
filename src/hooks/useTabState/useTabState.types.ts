/**
 * Configuration for a tab with URL-based routing
 */
export interface TabConfig {
  /** Unique identifier for this tab (used in URL search params) */
  id: string;
  /** Optional array of anchor IDs that belong to this tab for deep linking */
  anchors?: string[];
}

/**
 * Return type for useTabState hook
 */
export interface UseTabStateReturn {
  /** Current selected tab index */
  selectedIndex: number;
  /** Handler for tab change - automatically updates URL */
  onChange: (index: number) => void;
}
