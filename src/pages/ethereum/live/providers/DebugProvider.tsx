import { type JSX, useState, useCallback, useMemo } from 'react';
import { DebugContext, type DebugContextValue } from '../contexts/DebugContext';

export interface DebugProviderProps {
  children: React.ReactNode;
}

/**
 * Provider for debug context - manages API query toggle state.
 *
 * Wraps the live page to provide debug controls for performance diagnosis.
 */
export function DebugProvider({ children }: DebugProviderProps): JSX.Element {
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  const [enabledQueries, setEnabledQueries] = useState<DebugContextValue['enabledQueries']>({
    blockHead: true,
    blockProposer: true,
    blockMev: true,
    blobCount: true,
    blockFirstSeen: true,
    blobFirstSeen: true,
    attestation: true,
    committee: true,
    mevBidding: true,
    relayBids: true,
  });

  const [enabledSections, setEnabledSections] = useState<DebugContextValue['enabledSections']>({
    blockDetails: true,
    map: true,
    sidebar: true,
    blobAvailability: true,
    attestationArrivals: true,
  });

  const toggleDebugPanel = useCallback(() => {
    setIsDebugVisible(prev => !prev);
  }, []);

  const toggleQuery = useCallback((queryName: keyof DebugContextValue['enabledQueries']) => {
    setEnabledQueries(prev => ({
      ...prev,
      [queryName]: !prev[queryName],
    }));
  }, []);

  const toggleSection = useCallback((sectionName: keyof DebugContextValue['enabledSections']) => {
    setEnabledSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  }, []);

  const enableAllQueries = useCallback(() => {
    setEnabledQueries({
      blockHead: true,
      blockProposer: true,
      blockMev: true,
      blobCount: true,
      blockFirstSeen: true,
      blobFirstSeen: true,
      attestation: true,
      committee: true,
      mevBidding: true,
      relayBids: true,
    });
  }, []);

  const disableAllQueries = useCallback(() => {
    setEnabledQueries({
      blockHead: false,
      blockProposer: false,
      blockMev: false,
      blobCount: false,
      blockFirstSeen: false,
      blobFirstSeen: false,
      attestation: false,
      committee: false,
      mevBidding: false,
      relayBids: false,
    });
  }, []);

  const enableAllSections = useCallback(() => {
    setEnabledSections({
      blockDetails: true,
      map: true,
      sidebar: true,
      blobAvailability: true,
      attestationArrivals: true,
    });
  }, []);

  const disableAllSections = useCallback(() => {
    setEnabledSections({
      blockDetails: false,
      map: false,
      sidebar: false,
      blobAvailability: false,
      attestationArrivals: false,
    });
  }, []);

  const value = useMemo<DebugContextValue>(
    () => ({
      isDebugVisible,
      toggleDebugPanel,
      enabledQueries,
      enabledSections,
      toggleQuery,
      toggleSection,
      enableAllQueries,
      disableAllQueries,
      enableAllSections,
      disableAllSections,
    }),
    [
      isDebugVisible,
      toggleDebugPanel,
      enabledQueries,
      enabledSections,
      toggleQuery,
      toggleSection,
      enableAllQueries,
      disableAllQueries,
      enableAllSections,
      disableAllSections,
    ]
  );

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>;
}
