import type { ClientValidationRow } from '../../hooks/useSlotViewData/useSlotViewData.types';
import type { BlockDetailsData } from '../../hooks/useBlockDetailsData/useBlockDetailsData.types';

export interface SlotHudProps {
  /** Live time within the slot, in milliseconds (0–12000) — gates fade-ins. */
  currentTime: number;
  /** EL client block-validation timings (7870 reference nodes), sorted fastest first. */
  clientValidation: ClientValidationRow[];
  /** Named staking entity that proposed the block, when known. */
  proposerEntity: string | null;
  /** Block propagation across the sentry network. */
  propagationMinMs: number | null;
  propagationP50Ms: number | null;
  propagationP90Ms: number | null;
  propagationMaxMs: number | null;
  propagationNodeCount: number;
  /** Attestation arrival timing + expected validator count. */
  attestationFirstMs: number | null;
  attestationPeakMs: number | null;
  attestationExpected: number;
  /** Full block details (status, gas, MEV, proposer, fork, …). */
  blockDetails: BlockDetailsData | null;
  /** MEV auction depth for the slot. */
  auctionBuilders: number;
  auctionRelays: number;
  auctionBids: number;
  auctionTopRelay: string | null;
  auctionTopBidWei: string | null;
  /** Blob counts (PeerDAS columns + legacy blob count). */
  blobCount: number;
  dataColumnBlobCount: number;
  /** Optional CSS class name. */
  className?: string;
}
