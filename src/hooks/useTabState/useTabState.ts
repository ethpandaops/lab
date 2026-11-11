import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { TabConfig, UseTabStateReturn } from './useTabState.types';

/** Whether a tab id from the URL names this tab, by its id or an old alias */
function matchesTab(tab: TabConfig, id: string): boolean {
  return tab.id === id || !!tab.aliases?.includes(id);
}

/**
 * Hook for URL-based tab state management with automatic anchor scrolling
 *
 * Manages tab state using TanStack Router search params and handles:
 * - Setting initial tab from URL search params or hash (for backward compatibility)
 * - Updating URL when tabs change
 * - Deep linking to anchors within tabs (scrolls after content loads)
 * - Browser back/forward navigation
 * - Automatic migration from hash-based to search-param-based URLs
 *
 * **Developer-friendly API**: Just define your tabs and get back state management.
 * All URL complexity is handled internally.
 *
 * @example
 * ```tsx
 * // 1. In your route file, add search param validation:
 * validateSearch: zodValidator(
 *   z.object({
 *     tab: z.enum(['overview', 'blocks', 'mev']).default('overview')
 *   })
 * )
 *
 * // 2. In your page component, use the hook:
 * const { selectedIndex, onChange } = useTabState([
 *   { id: 'overview' },
 *   { id: 'blocks', anchors: ['blob-count-chart', 'gas-chart'] },
 *   { id: 'mev', anchors: ['mev-adoption-chart'] },
 * ]);
 *
 * // 3. Wire it up to HeadlessUI:
 * <TabGroup selectedIndex={selectedIndex} onChange={onChange}>
 *   <TabList>
 *     <Tab>Overview</Tab>
 *     <Tab>Blocks</Tab>
 *     <Tab>MEV</Tab>
 *   </TabList>
 *   <TabPanels>...</TabPanels>
 * </TabGroup>
 *
 * // That's it! The hook handles:
 * // - URL updates: /slots/123?tab=blocks
 * // - Anchor scrolling: /slots/123?tab=blocks#blob-count-chart
 * // - Backward compat: /slots/123#blocks → redirects to ?tab=blocks
 * ```
 */
export function useTabState(tabs: TabConfig[]): UseTabStateReturn {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { tab?: string };
  // Bumped to scroll to the URL's anchor once the selected tab's content has rendered
  const [anchorScrollRequest, setAnchorScrollRequest] = useState(0);

  /**
   * Determine initial tab index from URL
   * Priority: search param > hash (for backward compat) > default (0)
   */
  const getInitialTab = (): number => {
    // First, check search params (new format)
    const tabId = searchParams.tab;
    if (tabId) {
      const index = tabs.findIndex(tab => matchesTab(tab, tabId));
      if (index >= 0) return index;
    }

    // Fallback: check hash for backward compatibility
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      // Check if it's a direct tab hash
      const directIndex = tabs.findIndex(tab => tab.id === hash);
      if (directIndex >= 0) {
        // Migrate to new format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigate as any)({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          search: (prev: any) => ({ ...prev, tab: hash }),
          replace: true,
          hash: undefined,
        });
        return directIndex;
      }

      // Check if it's an anchor within a tab
      const anchorIndex = tabs.findIndex(tab => tab.anchors?.includes(hash));
      const anchorTab = tabs[anchorIndex];
      if (anchorTab) {
        // Migrate to new format, preserving the anchor
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigate as any)({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          search: (prev: any) => ({ ...prev, tab: anchorTab.id }),
          replace: true,
          hash,
        });
        setAnchorScrollRequest(request => request + 1);
        return anchorIndex;
      }
    }

    return 0;
  };

  const [selectedIndex, setSelectedIndex] = useState(getInitialTab);

  /**
   * Scroll to anchor after content has loaded
   * Uses retry logic to handle async data loading
   */
  useEffect(() => {
    if (anchorScrollRequest === 0) return;

    const hash = window.location.hash.replace('#', '');
    if (!hash) return;

    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max (50 * 100ms)
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const tryScroll = (): void => {
      const element = document.getElementById(hash);
      if (element) {
        // Element found - scroll to it
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (attempts < maxAttempts) {
        // Element not found yet - retry
        attempts++;
        timeoutId = setTimeout(tryScroll, 100);
      }
      // Otherwise give up after max attempts
    };

    // Start scrolling attempts after a brief delay to let the tab panel render
    timeoutId = setTimeout(tryScroll, 100);

    return () => clearTimeout(timeoutId);
  }, [anchorScrollRequest]);

  /**
   * Sync with URL changes (browser back/forward), and with tabs that move or appear under the URL's tab
   */
  const urlTabId = searchParams.tab;
  const urlIndex = urlTabId ? tabs.findIndex(tab => matchesTab(tab, urlTabId)) : -1;
  const [prevUrlIndex, setPrevUrlIndex] = useState(urlIndex);
  if (urlIndex !== prevUrlIndex) {
    setPrevUrlIndex(urlIndex);
    if (urlIndex >= 0 && urlIndex !== selectedIndex) {
      setSelectedIndex(urlIndex);
      // Scroll to the URL's anchor too, if it has one
      setAnchorScrollRequest(request => request + 1);
    }
  }

  /**
   * Handle tab changes - update URL and manage scrolling
   */
  const onChange = (index: number): void => {
    const newTab = tabs[index];
    if (!newTab) return;
    setSelectedIndex(index);

    const currentHash = window.location.hash.replace('#', '');

    // Check if current hash is an anchor within the NEW tab
    const hashBelongsToNewTab = newTab.anchors?.includes(currentHash);

    // Store current scroll position before navigation
    const scrollY = window.scrollY;

    if (hashBelongsToNewTab) {
      // Keep the anchor and scroll to it
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigate as any)({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        search: (prev: any) => ({ ...prev, tab: newTab.id }),
        replace: true,
        hash: currentHash,
      });
      setAnchorScrollRequest(request => request + 1);
    } else {
      // Clear the hash when switching tabs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigate as any)({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        search: (prev: any) => ({ ...prev, tab: newTab.id }),
        replace: true,
        hash: undefined,
      });

      // Restore scroll position after navigation to prevent scroll to top
      // This prevents the jarring scroll behavior on both desktop and mobile
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    }
  };

  return { selectedIndex, onChange };
}
