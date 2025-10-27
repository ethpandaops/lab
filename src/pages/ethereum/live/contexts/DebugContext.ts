import { createContext } from 'react';

/**
 * Debug context for toggling API requests and UI sections on/off to diagnose performance issues.
 *
 * API toggles control whether queries are enabled in useSlotViewData.
 * UI toggles control whether components are rendered in SlotViewLayout.
 */
export interface DebugContextValue {
  /** Whether the debug panel is visible */
  isDebugVisible: boolean;
  /** Toggle debug panel visibility */
  toggleDebugPanel: () => void;

  /** API Query Toggles - control which queries are enabled */
  enabledQueries: {
    blockHead: boolean;
    blockProposer: boolean;
    blockMev: boolean;
    blobCount: boolean;
    blockFirstSeen: boolean;
    blobFirstSeen: boolean;
    attestation: boolean;
    committee: boolean;
    mevBidding: boolean;
    relayBids: boolean;
  };

  /** UI Section Toggles - control which components are rendered */
  enabledSections: {
    blockDetails: boolean;
    map: boolean;
    sidebar: boolean;
    blobAvailability: boolean;
    attestationArrivals: boolean;
  };

  /** Toggle a specific query on/off */
  toggleQuery: (queryName: keyof DebugContextValue['enabledQueries']) => void;

  /** Toggle a specific UI section on/off */
  toggleSection: (sectionName: keyof DebugContextValue['enabledSections']) => void;

  /** Enable all queries */
  enableAllQueries: () => void;

  /** Disable all queries */
  disableAllQueries: () => void;

  /** Enable all UI sections */
  enableAllSections: () => void;

  /** Disable all UI sections */
  disableAllSections: () => void;
}

export const DebugContext = createContext<DebugContextValue | undefined>(undefined);
