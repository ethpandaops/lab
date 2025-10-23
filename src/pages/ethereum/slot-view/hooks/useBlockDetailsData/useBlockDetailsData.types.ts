export interface BlockDetailsData {
  slot: number;
  blockRoot: string;
  blockVersion: string;
  proposerIndex: number | null;
  proposerPubkey: string | null;
  executionBlockNumber: number | null;
  executionBlockHash: string | null;
  gasLimit: number | null;
  gasUsed: number | null;
  baseFeePerGas: string | null; // BigInt as string
  blobGasUsed: number | null;
  transactionCount: number | null;
  mevValue: string | null; // Wei as string
  mevRelays: string[] | null;
  builderPubkey: string | null;
  wasOnTime: boolean;
  status: 'canonical' | 'orphaned' | 'missed';
}
