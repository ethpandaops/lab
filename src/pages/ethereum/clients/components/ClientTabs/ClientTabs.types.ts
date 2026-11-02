import type { DimClientRelease, FctNodeActiveLast24h } from '@/api/types.gen';
import type { VersionWindow } from '../../constants';
import type { ClientLayer } from '../../utils/client-share';
import type { ResolvedBlock } from '../../utils/client-versions';
import type { ForkRequirement } from '../../utils/fork-requirements';

/** Data the client page loads once and its tabs share */
export interface ClientTabProps {
  client: string;
  layer: ClientLayer;
  /** Every release, newest first */
  releases: DimClientRelease[];
  latest?: DimClientRelease;
  releasesLoading: boolean;
  /** The client's blocks over the window, oldest first */
  blocks: ResolvedBlock[];
  blocksLoading: boolean;
  window: VersionWindow;
  /** Start of the window (unix seconds) */
  since: number;
  onWindowChange: (window: VersionWindow) => void;
  /** Our nodes running the client */
  nodes: FctNodeActiveLast24h[];
  /** Every node that reported in the last 24 hours */
  allNodes: FctNodeActiveLast24h[];
  nodesLoading: boolean;
  /** Fork requirements for the client from the network config */
  requirements: ForkRequirement[];
  /** Requirement of the fork in ?fork */
  requirement?: ForkRequirement;
}
