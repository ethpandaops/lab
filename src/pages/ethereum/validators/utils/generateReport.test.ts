import { describe, it, expect } from 'vitest';
import type { AggregateSummary } from '../hooks';
import type { ThresholdValues } from '../components';
import { generateValidatorReport } from './generateReport';

const summary: AggregateSummary = {
  totalValidators: 0,
  attestation: {
    totalDuties: 0,
    attestedCount: 0,
    missedCount: 0,
    headCorrectCount: 0,
    targetCorrectCount: 0,
    sourceCorrectCount: 0,
    inclusionRate: 0,
    headCorrectRate: 0,
    targetCorrectRate: 0,
    sourceCorrectRate: 0,
  },
  syncCommittee: { totalSlots: 0, participatedCount: 0, missedCount: 0, participationRate: 0, validatorsWithDuties: 0 },
  blockProposal: {
    totalProposals: 0,
    canonicalCount: 0,
    missedCount: 0,
    orphanedCount: 0,
    proposalRate: 0,
    validatorsWithDuties: 0,
  },
  balance: { minBalance: null, maxBalance: null, avgEndBalance: null },
};

const thresholds: ThresholdValues = {
  inclusionRate: 95,
  correctnessRate: 98,
  syncParticipation: 95,
  minBalance: 31.95,
  inclusionDelay: 1.5,
  blockProductionRate: 95,
};

describe('generateValidatorReport', () => {
  it('should report the network it was generated for', () => {
    const report = generateValidatorReport({
      validators: [],
      summary,
      thresholds,
      timeRange: { from: 1760918400, to: 1761523200 },
      network: 'hoodi',
      url: 'https://lab.ethpandaops.io/ethereum/validators?network=hoodi',
    });

    expect(report).toContain('- **Network**: hoodi');
    expect(report).not.toContain('mainnet');
  });
});
