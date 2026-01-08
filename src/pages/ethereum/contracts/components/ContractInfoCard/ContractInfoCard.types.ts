import type { DimContractOwner } from '@/api/types.gen';

export interface ContractInfoCardProps {
  /** Contract address */
  address: string;
  /** Contract owner metadata (optional) */
  contractOwner?: DimContractOwner;
}
