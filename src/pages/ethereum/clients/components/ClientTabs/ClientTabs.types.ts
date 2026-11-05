import type { DimClientRelease, FctNodeActiveLast24h } from '@/api/types.gen';
import type { ShareWindow, VersionWindow } from '../../constants';
import type { ClientLayer } from '../../utils/client-share';
import type { VersionCount } from '../../utils/client-versions';
import type { ForkRequirement } from '../../utils/fork-requirements';

/** Data the client page loads once and its tabs share */
export interface ClientTabProps {
  client: string;
  layer: ClientLayer;
  /** Every release, newest first */
  releases: DimClientRelease[];
  latest?: DimClientRelease;
  releasesLoading: boolean;
  /** Hourly version counts over the last 24 hours */
  last24h: VersionCount[];
  window: VersionWindow;
  /** Start of the window (unix seconds); all history when undefined */
  since?: number;
  onWindowChange: (window: VersionWindow) => void;
  /** Window of the share charts, from daily counts */
  shareWindow: ShareWindow;
  onShareWindowChange: (window: ShareWindow) => void;
  /** Xatu nodes running the client */
  nodes: FctNodeActiveLast24h[];
  /** Every node that reported in the last 24 hours */
  allNodes: FctNodeActiveLast24h[];
  nodesLoading: boolean;
  /** Fork requirements for the client from the network config */
  requirements: ForkRequirement[];
  /** Requirement of the fork in ?fork */
  requirement?: ForkRequirement;
}
