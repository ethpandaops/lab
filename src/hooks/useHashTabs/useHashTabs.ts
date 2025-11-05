import { useEffect, useState, useCallback } from 'react';
import type { TabConfig, UseHashTabsReturn } from './useHashTabs.types';

/**
 * Hook for hash-based tab routing
 *
 * Automatically handles:
 * - Setting initial tab from URL hash
 * - Updating URL when tabs change
 * - Deep linking to anchors within tabs
 * - Browser back/forward navigation
 *
 * @example
 * ```tsx
 * const { selectedIndex, onChange } = useHashTabs([
 *   { hash: 'slots' },
 *   { hash: 'blocks', anchors: ['blob-count-chart', 'gas-chart'] },
 *   { hash: 'mev', anchors: ['mev-adoption-chart'] },
 * ]);
 *
 * <TabGroup selectedIndex={selectedIndex} onChange={onChange}>
 *   <TabList>
 *     <Tab hash="slots">Slots</Tab>
 *     <Tab hash="blocks">Blocks</Tab>
 *     <Tab hash="mev">MEV</Tab>
 *   </TabList>
 *   <TabPanels>...</TabPanels>
 * </TabGroup>
 * ```
 */
export function useHashTabs(tabs: TabConfig[]): UseHashTabsReturn {
  /**
   * Determine initial tab index from URL hash
   */
  const getInitialTab = (): number => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return 0;

    // First check if it's a direct tab hash
    const directIndex = tabs.findIndex(tab => tab.hash === hash);
    if (directIndex >= 0) return directIndex;

    // Check if it's an anchor within a tab
    const anchorIndex = tabs.findIndex(tab => tab.anchors?.includes(hash));
    if (anchorIndex >= 0) return anchorIndex;

    return 0;
  };

  const [selectedIndex, setSelectedIndex] = useState(() => getInitialTab());

  /**
   * Scroll to anchor if present in URL
   */
  const scrollToAnchor = useCallback(
    (hash: string, tabIndex: number): void => {
      const currentTab = tabs[tabIndex];
      if (currentTab?.anchors?.includes(hash)) {
        // Use setTimeout to ensure tab content is rendered before scrolling
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    },
    [tabs]
  );

  /**
   * Handle initial anchor scroll on mount
   */
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      scrollToAnchor(hash, selectedIndex);
    }
  }, [scrollToAnchor, selectedIndex]);

  /**
   * Handle hash changes (browser back/forward and link clicks)
   */
  useEffect(() => {
    const handleHashChange = (): void => {
      const hash = window.location.hash.replace('#', '');
      if (!hash) {
        setSelectedIndex(0);
        return;
      }

      // First check if it's a direct tab hash
      const directIndex = tabs.findIndex(tab => tab.hash === hash);
      if (directIndex >= 0) {
        setSelectedIndex(directIndex);
        return;
      }

      // Check if it's an anchor within a tab
      const anchorIndex = tabs.findIndex(tab => tab.anchors?.includes(hash));
      if (anchorIndex >= 0) {
        setSelectedIndex(anchorIndex);
        scrollToAnchor(hash, anchorIndex);
        return;
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [tabs, scrollToAnchor]);

  /**
   * Update hash when tab changes
   */
  const onChange = (index: number): void => {
    setSelectedIndex(index);
    const currentHash = window.location.hash.replace('#', '');
    const tabConfig = tabs[index];

    // Only update hash if current hash is not an anchor within this tab
    if (!tabConfig.anchors?.includes(currentHash)) {
      window.history.replaceState(null, '', `#${tabConfig.hash}`);
    }
  };

  return { selectedIndex, onChange };
}
