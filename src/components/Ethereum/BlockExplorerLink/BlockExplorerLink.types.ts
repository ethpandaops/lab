export type BlockExplorerType = 'beaconchain' | 'etherscan' | 'dora' | 'tracoor';

export interface BlockExplorerLinkProps {
  type: BlockExplorerType;
  slot?: number;
  epoch?: number;
  blockNumber?: number;
  blockRoot?: string;
  className?: string;
}
