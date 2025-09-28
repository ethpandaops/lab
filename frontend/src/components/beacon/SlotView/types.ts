export interface WinningBid {
  blockHash: string;
  value: number;
  valueInEth: number;
  formattedEth: string;
  formattedTime: string;
  relay: string;
  builderPubkey?: string;
}

export interface SlotAnalysis {
  firstBlockTime: number | null;
  firstBlobTime: number | null;
  blobCount: number;
  gasUsagePercent: number | null;
  participation: number | null;
  hasMevRelay: boolean;
  totalAttestations: number;
}

export interface SlotViewSharedProps {
  slot?: number;
  network: string;
  slotData: any;
  isLoading: boolean;
  isMissingData: boolean;
}
