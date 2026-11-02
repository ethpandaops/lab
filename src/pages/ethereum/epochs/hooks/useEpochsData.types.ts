/**
 * Missed attestation by entity for a single epoch
 */
export interface MissedAttestationByEntity {
  /** Entity name */
  entity: string;
  /** Epoch number */
  epoch: number;
  /** Total missed attestations for this entity in this epoch */
  count: number;
}
