/**
 * Attestation correctness data from fct_attestation_correctness_head endpoint
 */
export interface AttestationCorrectnessData {
  /**
   * Number of attestations voting for the head block (correct head)
   */
  votes_head: number;
  /**
   * Maximum number of scheduled votes (total expected validators)
   */
  votes_max: number;
  /**
   * Number of votes for other blocks (incorrect head)
   */
  votes_other: number;
  /**
   * Number of attestations with correct source checkpoint
   * @optional - May not be available in current API version
   */
  votes_source?: number;
  /**
   * Number of attestations with correct target checkpoint
   * @optional - May not be available in current API version
   */
  votes_target?: number;
}

/**
 * Props for AttestationParticipationCard component
 */
export interface AttestationParticipationCardProps {
  /**
   * Attestation correctness data for the slot
   */
  correctnessData: AttestationCorrectnessData | null;
}
