/**
 * Configuration for a tab with hash routing
 */
export interface TabConfig {
  /** Hash for this tab (e.g., "overview" for #overview) */
  hash: string;
  /** Optional array of anchor IDs that belong to this tab for deep linking */
  anchors?: string[];
}

/**
 * Return type for useHashTabs hook
 */
export interface UseHashTabsReturn {
  /** Current selected tab index */
  selectedIndex: number;
  /** Handler for tab change */
  onChange: (index: number) => void;
}
