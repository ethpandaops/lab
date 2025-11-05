import { useEffect, useState } from 'react';
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

  const [selectedIndex, setSelectedIndex] = useState(getInitialTab);

  /**
   * Handle hash changes (browser back/forward)
   */
  useEffect(() => {
    const handleHashChange = (): void => {
      const newIndex = getInitialTab();
      setSelectedIndex(newIndex);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
