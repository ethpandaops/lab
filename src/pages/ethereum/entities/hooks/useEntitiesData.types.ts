/**
 * Summary data for a single entity
 */
export interface EntitySummary {
  /** Entity name */
  entity: string;
  /** Total attestations made by this entity */
  totalAttestations: number;
  /** Total missed attestations by this entity */
  missedAttestations: number;
  /** Attestation success rate (0-1) */
  rate: number;
  /** Total blocks proposed by this entity */
  blocksProposed: number;
  /** Number of validators in this entity */
  validatorCount: number;
  /** Whether the entity is online (rate >= 95%) */
  isOnline: boolean;
  /** Last active timestamp (Unix seconds) */
  lastActive: number;
}

/**
 * Return type for useEntitiesData hook
 */
export interface UseEntitiesDataReturn {
  /** Array of entity summaries */
  entities: EntitySummary[];
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
}
