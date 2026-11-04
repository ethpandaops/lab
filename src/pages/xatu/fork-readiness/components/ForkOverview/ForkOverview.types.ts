export interface ForkOverviewProps {
  forkName: string;
  forkEpoch: number;
  timeRemaining: string;
  overallReadyPercentage: number;
  totalNodes: number;
  readyNodes: number;
  actionNeededCount: number;
  readyClientsCount: number;
  totalClientsCount: number;
  /** Nodes whose client has no minimum version for the fork */
  noMinimumCount: number;
}
