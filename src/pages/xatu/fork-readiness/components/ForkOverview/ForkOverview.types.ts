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
}
