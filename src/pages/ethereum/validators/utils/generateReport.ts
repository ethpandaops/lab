import type { ValidatorMetrics, AggregateSummary, BlockProposalDataPoint } from '../hooks';
import type { ThresholdValues } from '../components';

export interface ReportParams {
  validators: ValidatorMetrics[];
  summary: AggregateSummary;
  thresholds: ThresholdValues;
  timeRange: { from: number; to: number };
  url: string;
  blockProposals?: BlockProposalDataPoint[];
  validatorMap?: Map<number, string>;
}

/** Format a number as a percentage with specified decimal places */
function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(decimals)}%`;
}

/** Format ETH value with specified decimal places */
function formatEth(value: number | null | undefined, decimals = 4): string {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(decimals)} ETH`;
}

/** Format a Unix timestamp to a human-readable date */
function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().split('T')[0];
}

/** Format a Unix timestamp to a human-readable datetime */
function formatDateTime(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().replace('T', ' ').replace('Z', ' UTC');
}

/** Check if a metric passes the threshold */
function checkPass(value: number | null | undefined, threshold: number, isMinThreshold = true): boolean {
  if (value === null || value === undefined) return false;
  return isMinThreshold ? value >= threshold : value <= threshold;
}

/** Get pass/fail status emoji */
function getStatus(pass: boolean): string {
  return pass ? '✅ Pass' : '❌ Fail';
}

/** Generate a markdown report for validator performance analysis */
export function generateValidatorReport({
  validators,
  summary,
  thresholds,
  timeRange,
  url,
  blockProposals = [],
  validatorMap,
}: ReportParams): string {
  const generatedAt = formatDateTime(Math.floor(Date.now() / 1000));
  const fromDate = formatDate(timeRange.from);
  const toDate = formatDate(timeRange.to);
  const days = Math.ceil((timeRange.to - timeRange.from) / 86400);

  const sections: string[] = [];

  // ── Section 1: Title ──────────────────────────────────────────────────
  sections.push('# Validator Performance Analysis Report');
  sections.push('');

  // ── Section 2: Configuration ──────────────────────────────────────────
  sections.push('## Configuration');
  sections.push('');
  sections.push(`- **Generated**: ${generatedAt}`);
  sections.push(`- **Network**: mainnet`);
  sections.push(`- **Validators Analyzed**: ${summary.totalValidators}`);
  sections.push(`- **Time Range**: ${fromDate} to ${toDate}`);
  sections.push('');

  // ── Section 3: Performance Requirements ───────────────────────────────
  sections.push('## Performance Requirements');
  sections.push('');
  sections.push('### Aggregate Performance Metrics');
  sections.push('');
  sections.push(`- **Attestation Inclusion Rate**: >${thresholds.inclusionRate.toFixed(1)}%`);
  sections.push(`- **Attestation Correctness Rate**: >${thresholds.correctnessRate.toFixed(1)}%`);
  sections.push(`- **Block Production**: >${thresholds.blockProductionRate.toFixed(1)}%`);
  sections.push('');
  sections.push('### Minimum Balance & Slashings');
  sections.push('');
  sections.push(
    `- **Minimum Balance**: Each individual validator must maintain a minimum balance of ${thresholds.minBalance.toFixed(2)} ETH`
  );
  sections.push('- **Slashing Events**: Not allowed and considered critical');
  sections.push('');

  // ── Section 4: Aggregated Performance ─────────────────────────────────
  const slashingCount = validators.filter(v => v.balance.slashed).length;
  const slashingPass = slashingCount === 0;
  const balancePass = checkPass(summary.balance.minBalance, thresholds.minBalance);
  const inclusionPass = checkPass(summary.attestation.inclusionRate, thresholds.inclusionRate);

  // Correctness = average of head + target + source correct rates
  const correctnessAvg =
    (summary.attestation.headCorrectRate +
      summary.attestation.targetCorrectRate +
      summary.attestation.sourceCorrectRate) /
    3;
  const correctnessPass = checkPass(correctnessAvg, thresholds.correctnessRate);

  const hasProposalDuties = summary.blockProposal.totalProposals > 0;
  const blockProductionRate = hasProposalDuties ? summary.blockProposal.proposalRate : null;
  const blockProductionPass = hasProposalDuties ? checkPass(blockProductionRate, thresholds.blockProductionRate) : true;

  sections.push('## Aggregated Performance');
  sections.push('');
  sections.push('| Metric | Value | Threshold | Status |');
  sections.push('|--------|-------|-----------|--------|');
  sections.push(`| Total Slashings | ${slashingCount} | 0 | ${getStatus(slashingPass)} |`);
  sections.push(
    `| Minimum Balance | ${formatEth(summary.balance.minBalance)} | >=${thresholds.minBalance.toFixed(2)} ETH | ${getStatus(balancePass)} |`
  );
  sections.push(
    `| Attestation Inclusion Rate | ${formatPercent(summary.attestation.inclusionRate)} | >${thresholds.inclusionRate.toFixed(1)}% | ${getStatus(inclusionPass)} |`
  );
  sections.push(
    `| Attestation Correctness | ${formatPercent(correctnessAvg)} | >${thresholds.correctnessRate.toFixed(1)}% | ${getStatus(correctnessPass)} |`
  );
  sections.push(
    `| Block Production Rate | ${hasProposalDuties ? formatPercent(blockProductionRate) : 'N/A'} | >${thresholds.blockProductionRate.toFixed(1)}% | ${hasProposalDuties ? getStatus(blockProductionPass) : '➖ N/A'} |`
  );
  sections.push('');

  // ── Section 5: Detailed Performance Metrics ───────────────────────────

  sections.push('## Detailed Performance Metrics');
  sections.push('');

  // Overview -- raw event counts
  sections.push('### Overview');
  sections.push('');
  sections.push(`- **Proposed Blocks**: ${summary.blockProposal.canonicalCount}`);
  sections.push(`- **Missed Blocks**: ${summary.blockProposal.missedCount}`);
  sections.push(`- **Missed Attestations**: ${summary.attestation.missedCount}`);
  sections.push(`- **Missed Sync**: ${summary.syncCommittee.missedCount}`);
  sections.push(`- **Total Slashings**: ${slashingCount}`);
  sections.push('');

  // Effectiveness Metrics
  const avgUptime = summary.attestation.inclusionRate;

  // Weighted average inclusion delay across validators
  let totalWeightedDelay = 0;
  let totalDelayWeight = 0;
  for (const v of validators) {
    if (v.attestation.avgInclusionDistance !== null && v.attestation.attestedCount > 0) {
      totalWeightedDelay += v.attestation.avgInclusionDistance * v.attestation.attestedCount;
      totalDelayWeight += v.attestation.attestedCount;
    }
  }
  const avgInclusionDelay = totalDelayWeight > 0 ? totalWeightedDelay / totalDelayWeight : null;

  sections.push('### Effectiveness Metrics');
  sections.push('');
  sections.push(`- **Avg Uptime**: ${formatPercent(avgUptime)}`);
  sections.push(`- **Avg Correctness**: ${formatPercent(correctnessAvg)}`);
  sections.push(
    `- **Avg Inclusion Delay**: ${avgInclusionDelay !== null ? avgInclusionDelay.toFixed(2) + ' slots' : 'N/A'}`
  );
  sections.push('');

  // Attestation Performance
  const wrongHeadVotes = summary.attestation.attestedCount - summary.attestation.headCorrectCount;
  const wrongTargetVotes = summary.attestation.attestedCount - summary.attestation.targetCorrectCount;

  sections.push('### Attestation Performance');
  sections.push('');
  sections.push(`- **Total Missed**: ${summary.attestation.missedCount}`);
  sections.push(`- **Wrong Head Votes**: ${wrongHeadVotes}`);
  sections.push(`- **Wrong Target Votes**: ${wrongTargetVotes}`);
  sections.push(`- **Avg Head Correctness**: ${formatPercent(summary.attestation.headCorrectRate)}`);
  sections.push(`- **Avg Target Correctness**: ${formatPercent(summary.attestation.targetCorrectRate)}`);
  sections.push(`- **Avg Source Correctness**: ${formatPercent(summary.attestation.sourceCorrectRate)}`);
  sections.push('');

  // Block Proposal Performance
  sections.push('### Block Proposal Performance');
  sections.push('');
  sections.push(`- **Total Duties**: ${summary.blockProposal.totalProposals}`);
  sections.push(`- **Blocks Proposed**: ${summary.blockProposal.canonicalCount}`);
  sections.push(`- **Block Production Rate**: ${hasProposalDuties ? formatPercent(blockProductionRate) : 'N/A'}`);
  sections.push(`- **Missed Proposals**: ${summary.blockProposal.missedCount}`);
  sections.push('');

  // ── Section 6: Per-Validator Table ────────────────────────────────────

  sections.push('## Detailed Analysis');
  sections.push('');
  sections.push('### Per-Validator Performance');
  sections.push('');
  sections.push(
    '| Pubkey | Index | Inclusion % | Head % | Target % | Source % | Correctness % | Avg Delay | Sync % | Missed Att | Missed Sync | Proposed | Slashings | Days | Min Bal |'
  );
  sections.push(
    '|--------|-------|-------------|--------|----------|----------|---------------|-----------|--------|------------|-------------|----------|-----------|------|---------|'
  );

  const sortedValidators = [...validators].sort((a, b) => a.validatorIndex - b.validatorIndex);

  // Build a lookup for block proposals per validator
  const proposalsByValidator = new Map<number, { canonical: number; total: number }>();
  for (const p of blockProposals) {
    const existing = proposalsByValidator.get(p.validatorIndex);
    if (existing) {
      existing.total++;
      if (p.status === 'canonical') existing.canonical++;
    } else {
      proposalsByValidator.set(p.validatorIndex, {
        canonical: p.status === 'canonical' ? 1 : 0,
        total: 1,
      });
    }
  }

  for (const v of sortedValidators) {
    const pubkey = validatorMap?.get(v.validatorIndex);
    const pubkeyDisplay = pubkey ? `\`${pubkey}\`` : '-';
    const inclusionPct = v.attestation.inclusionRate.toFixed(2);
    const headPct = v.attestation.headCorrectRate.toFixed(2);
    const targetPct = v.attestation.targetCorrectRate.toFixed(2);
    const sourcePct = v.attestation.sourceCorrectRate.toFixed(2);
    const correctnessPct = (
      (v.attestation.headCorrectRate + v.attestation.targetCorrectRate + v.attestation.sourceCorrectRate) /
      3
    ).toFixed(2);
    const avgDelay =
      v.attestation.avgInclusionDistance !== null ? v.attestation.avgInclusionDistance.toFixed(2) : 'N/A';
    const syncPct = v.syncCommittee ? v.syncCommittee.participationRate.toFixed(2) : 'N/A';
    const missedAtt = v.attestation.missedCount;
    const missedSync = v.syncCommittee?.missedCount ?? 0;

    const proposals = proposalsByValidator.get(v.validatorIndex);
    const proposedDisplay = proposals ? `${proposals.canonical}/${proposals.total}` : '-';

    const slashings = v.balance.slashed ? 1 : 0;
    const minBal = v.balance.minBalance !== null ? v.balance.minBalance.toFixed(4) : 'N/A';

    sections.push(
      `| ${pubkeyDisplay} | ${v.validatorIndex} | ${inclusionPct} | ${headPct} | ${targetPct} | ${sourcePct} | ${correctnessPct} | ${avgDelay} | ${syncPct} | ${missedAtt} | ${missedSync} | ${proposedDisplay} | ${slashings} | ${days} | ${minBal} |`
    );
  }

  sections.push('');

  // ── Section 7: Understanding Metrics ──────────────────────────────────

  sections.push('## Understanding Metrics');
  sections.push('');
  sections.push('### Attestation Inclusion Rate');
  sections.push(
    'The percentage of assigned attestation duties that were successfully included on-chain. A high inclusion rate indicates the validator is consistently online and producing attestations.'
  );
  sections.push('');
  sections.push('### Attestation Correctness');
  sections.push(
    'The average correctness across head, target, and source votes. This measures how accurately the validator votes on the state of the beacon chain.'
  );
  sections.push('');
  sections.push('### Head Vote Correctness');
  sections.push(
    'The percentage of attestations where the validator correctly identified the head of the chain. Incorrect head votes may indicate latency or configuration issues.'
  );
  sections.push('');
  sections.push('### Target Vote Correctness');
  sections.push(
    'The percentage of attestations where the validator correctly voted for the target checkpoint. Target votes are important for chain finalization.'
  );
  sections.push('');
  sections.push('### Source Vote Correctness');
  sections.push(
    'The percentage of attestations where the validator correctly voted for the source checkpoint. Source votes are critical for the justification and finalization process.'
  );
  sections.push('');
  sections.push('### Inclusion Delay');
  sections.push(
    'The average number of slots between when an attestation was due and when it was included on-chain. An ideal inclusion delay is 1.0 slots. Higher values indicate network latency or propagation issues.'
  );
  sections.push('');
  sections.push('### Block Production Rate');
  sections.push(
    'The percentage of assigned block proposal duties that resulted in a canonical (accepted) block. Missed proposals represent lost rewards and indicate potential issues with the validator setup.'
  );
  sections.push('');
  sections.push('### Sync Committee Participation');
  sections.push(
    'The percentage of sync committee duties fulfilled when the validator was assigned to a sync committee. Sync committees help light clients verify the chain state.'
  );
  sections.push('');
  sections.push('### Minimum Balance');
  sections.push(
    'The lowest balance observed for a validator during the analysis period. Validators must maintain a minimum balance to remain active. A balance below 16 ETH results in ejection from the validator set.'
  );
  sections.push('');
  sections.push('### Slashing');
  sections.push(
    'Slashing is a penalty imposed on validators that violate protocol rules (e.g., double voting or surround voting). Slashed validators lose a portion of their stake and are forcibly exited from the validator set.'
  );
  sections.push('');
  sections.push('### Uptime');
  sections.push(
    'Equivalent to the attestation inclusion rate. Represents the overall availability of the validator during the analysis period.'
  );
  sections.push('');

  // ── Section 8: Footer ─────────────────────────────────────────────────

  sections.push('---');
  sections.push(`*Generated by [The Lab - Validator Report](${url})*`);

  return sections.join('\n');
}
