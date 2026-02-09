import type {
  FctAttestationVoteCorrectnessByValidatorDaily,
  FctBlockProposerByValidator,
  FctSyncCommitteeParticipationByValidatorDaily,
  FctValidatorBalanceDaily,
} from '@/api/types.gen';

/**
 * Aggregated attestation metrics for a validator
 */
export interface ValidatorAttestationMetrics {
  validatorIndex: number;
  totalDuties: number;
  attestedCount: number;
  missedCount: number;
  headCorrectCount: number;
  targetCorrectCount: number;
  sourceCorrectCount: number;
  avgInclusionDistance: number | null;
  inclusionRate: number;
  headCorrectRate: number;
  targetCorrectRate: number;
  sourceCorrectRate: number;
}

/**
 * Aggregated sync committee metrics for a validator
 */
export interface ValidatorSyncCommitteeMetrics {
  validatorIndex: number;
  totalSlots: number;
  participatedCount: number;
  missedCount: number;
  participationRate: number;
}

/**
 * Aggregated balance metrics for a validator
 */
export interface ValidatorBalanceMetrics {
  validatorIndex: number;
  startBalance: number | null;
  endBalance: number | null;
  minBalance: number | null;
  maxBalance: number | null;
  effectiveBalance: number | null;
  status: string;
  slashed: boolean;
}

/**
 * Per-validator block proposal metrics
 */
export interface ValidatorBlockProposalMetrics {
  validatorIndex: number;
  totalProposals: number;
  canonicalCount: number;
  missedCount: number;
  orphanedCount: number;
  proposalRate: number;
}

/**
 * Individual block proposal record
 */
export interface BlockProposalDataPoint {
  slot: number;
  slotTimestamp: number;
  validatorIndex: number;
  status: 'canonical' | 'orphaned' | 'missed';
}

/**
 * Combined metrics for a single validator
 */
export interface ValidatorMetrics {
  validatorIndex: number;
  attestation: ValidatorAttestationMetrics;
  syncCommittee: ValidatorSyncCommitteeMetrics | null;
  blockProposal: ValidatorBlockProposalMetrics | null;
  balance: ValidatorBalanceMetrics;
}

/**
 * Daily data point for time series charts
 */
export interface DailyDataPoint {
  timestamp: number;
  validatorIndex: number;
}

/**
 * Attestation data point for charts
 */
export interface AttestationDailyDataPoint extends DailyDataPoint {
  inclusionRate: number;
  headCorrectRate: number;
  targetCorrectRate: number;
  sourceCorrectRate: number;
  avgInclusionDistance: number | null;
}

/**
 * Sync committee data point for charts
 */
export interface SyncCommitteeDailyDataPoint extends DailyDataPoint {
  participationRate: number;
}

/**
 * Balance data point for charts
 */
export interface BalanceDailyDataPoint extends DailyDataPoint {
  balance: number | null;
  minBalance: number | null;
  maxBalance: number | null;
}

/**
 * Aggregate summary across all validators
 */
export interface AggregateSummary {
  totalValidators: number;
  attestation: {
    totalDuties: number;
    attestedCount: number;
    missedCount: number;
    headCorrectCount: number;
    targetCorrectCount: number;
    sourceCorrectCount: number;
    inclusionRate: number;
    headCorrectRate: number;
    targetCorrectRate: number;
    sourceCorrectRate: number;
  };
  syncCommittee: {
    totalSlots: number;
    participatedCount: number;
    missedCount: number;
    participationRate: number;
    validatorsWithDuties: number;
  };
  blockProposal: {
    totalProposals: number;
    canonicalCount: number;
    missedCount: number;
    orphanedCount: number;
    proposalRate: number;
    validatorsWithDuties: number;
  };
  balance: {
    minBalance: number | null;
    maxBalance: number | null;
    avgEndBalance: number | null;
  };
}

/**
 * Return type for the useValidatorsData hook
 */
export interface UseValidatorsDataReturn {
  /** Combined metrics per validator */
  validators: ValidatorMetrics[];
  /** Aggregate summary across all validators */
  summary: AggregateSummary | null;
  /** Daily attestation data for charts */
  attestationDaily: AttestationDailyDataPoint[];
  /** Daily sync committee data for charts */
  syncCommitteeDaily: SyncCommitteeDailyDataPoint[];
  /** Daily balance data for charts */
  balanceDaily: BalanceDailyDataPoint[];
  /** Block proposal data points */
  blockProposals: BlockProposalDataPoint[];
  /** Raw API responses */
  raw: {
    attestation: FctAttestationVoteCorrectnessByValidatorDaily[];
    syncCommittee: FctSyncCommitteeParticipationByValidatorDaily[];
    balance: FctValidatorBalanceDaily[];
    blockProposal: FctBlockProposerByValidator[];
  };
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether any data has been fetched */
  hasData: boolean;
}
