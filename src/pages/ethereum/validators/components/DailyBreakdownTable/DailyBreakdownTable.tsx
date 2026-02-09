import { useState, useMemo, type JSX, type ReactNode } from 'react';
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { formatSlot } from '@/utils';
import type {
  AttestationDailyDataPoint,
  BalanceDailyDataPoint,
  SyncCommitteeDailyDataPoint,
  BlockProposalDataPoint,
} from '../../hooks/useValidatorsData.types';
import { useHourlyData, useSlotData } from '../../hooks';
import { getStatusIconConfig } from '../../hooks/useValidatorStatus';

interface DailyBreakdownTableProps {
  /** Daily attestation data for the validator */
  attestationData: AttestationDailyDataPoint[];
  /** Daily balance data for the validator */
  balanceData: BalanceDailyDataPoint[];
  /** Daily sync committee data for the validator */
  syncCommitteeData: SyncCommitteeDailyDataPoint[];
  /** Block proposal data points for the validator */
  blockProposals?: BlockProposalDataPoint[];
  /** Validator index for hourly data fetching */
  validatorIndex: number;
  /** Start of the selected date range (Unix seconds) */
  from?: number;
  /** End of the selected date range (Unix seconds) */
  to?: number;
  /** Look up validator status at a given timestamp */
  getStatusAtTimestamp?: (validatorIndex: number, timestamp: number) => string | null;
  /** Controlled: which day timestamp to expand (null = none) */
  selectedDayTimestamp?: number | null;
  /** Controlled: which hour timestamp to expand (null = none) */
  selectedHourTimestamp?: number | null;
  /** Callback when a day row is toggled */
  onDaySelect?: (dayTimestamp: number | null) => void;
  /** Callback when an hour row is toggled */
  onHourSelect?: (hourTimestamp: number | null) => void;
}

interface DailyRow {
  date: string;
  timestamp: number;
  inclusionRate: number | null;
  headCorrectRate: number | null;
  targetCorrectRate: number | null;
  sourceCorrectRate: number | null;
  avgInclusionDistance: number | null;
  syncParticipationRate: number | null;
  balance: number | null;
  proposals: { canonical: number; total: number } | null;
}

interface HourlyRow {
  hour: string;
  inclusionRate: number | null;
  headCorrectRate: number | null;
  targetCorrectRate: number | null;
  sourceCorrectRate: number | null;
  avgInclusionDistance: number | null;
  syncParticipationRate: number | null;
  balance: number | null;
  proposals: { canonical: number; total: number } | null;
}

interface SlotRow {
  slot: number;
  attested: boolean | null;
  headCorrect: boolean | null;
  targetCorrect: boolean | null;
  sourceCorrect: boolean | null;
  inclusionDistance: number | null;
  participated: boolean | null;
  proposalStatus: 'canonical' | 'orphaned' | 'missed' | null;
}

/**
 * Format a Unix timestamp to YYYY-MM-DD
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

/**
 * Format a percentage with color coding
 */
function formatPercent(value: number | null, threshold = 95): ReactNode {
  if (value === null) return <span className="text-muted">-</span>;
  return (
    <span
      className={clsx(
        'tabular-nums',
        value >= threshold ? 'text-success' : value >= 90 ? 'text-warning' : 'text-danger'
      )}
    >
      {value.toFixed(2)}%
    </span>
  );
}

/**
 * Format a boolean value as a check/cross indicator
 */
function formatBoolean(value: boolean | null): ReactNode {
  if (value === null) return <span className="text-muted">-</span>;
  return value ? <span className="text-success">✓</span> : <span className="text-danger">✗</span>;
}

/**
 * Format a block proposal status as an icon
 */
function formatProposalStatus(status: 'canonical' | 'orphaned' | 'missed' | null): ReactNode {
  if (status === null) return <span className="text-muted">-</span>;
  if (status === 'canonical') return <span className="text-success">✓</span>;
  if (status === 'missed') return <span className="text-danger">✗</span>;
  return <span className="text-warning">⚠</span>;
}

/**
 * Format proposal counts for daily/hourly rows
 */
function formatProposalCounts(proposals: { canonical: number; total: number } | null): ReactNode {
  if (proposals === null) return <span className="text-muted">-</span>;
  const hasIssues = proposals.canonical < proposals.total;
  return (
    <span className={clsx('tabular-nums', hasIssues ? 'text-danger' : 'text-success')}>
      {proposals.canonical}/{proposals.total}
    </span>
  );
}

/**
 * Slot-level sub-rows component that renders when an hourly row is expanded
 */
function SlotBreakdownRows({
  validatorIndex,
  hourTimestamp,
  blockProposals = [],
}: {
  validatorIndex: number;
  hourTimestamp: number;
  blockProposals?: BlockProposalDataPoint[];
}): JSX.Element {
  const { attestationSlot, syncCommitteeSlot, isLoading } = useSlotData([validatorIndex], hourTimestamp);

  // Build proposal lookup for this hour's slots
  const proposalBySlot = useMemo(() => {
    const hourEnd = hourTimestamp + 3600;
    const map = new Map<number, 'canonical' | 'orphaned' | 'missed'>();
    for (const p of blockProposals) {
      if (p.slotTimestamp >= hourTimestamp && p.slotTimestamp < hourEnd) {
        map.set(p.slot, p.status);
      }
    }
    return map;
  }, [blockProposals, hourTimestamp]);

  const rows = useMemo(() => {
    if (isLoading) return [];

    const bySlot = new Map<number, SlotRow>();

    for (const a of attestationSlot) {
      bySlot.set(a.slot, {
        slot: a.slot,
        attested: a.attested,
        headCorrect: a.headCorrect,
        targetCorrect: a.targetCorrect,
        sourceCorrect: a.sourceCorrect,
        inclusionDistance: a.inclusionDistance,
        participated: null,
        proposalStatus: proposalBySlot.get(a.slot) ?? null,
      });
    }

    for (const s of syncCommitteeSlot) {
      const existing = bySlot.get(s.slot);
      if (existing) {
        existing.participated = s.participated;
      } else {
        bySlot.set(s.slot, {
          slot: s.slot,
          attested: null,
          headCorrect: null,
          targetCorrect: null,
          sourceCorrect: null,
          inclusionDistance: null,
          participated: s.participated,
          proposalStatus: proposalBySlot.get(s.slot) ?? null,
        });
      }
    }

    // Also add slots that only have proposal data
    for (const [slot, status] of proposalBySlot) {
      if (!bySlot.has(slot)) {
        bySlot.set(slot, {
          slot,
          attested: null,
          headCorrect: null,
          targetCorrect: null,
          sourceCorrect: null,
          inclusionDistance: null,
          participated: null,
          proposalStatus: status,
        });
      }
    }

    return Array.from(bySlot.values()).sort((a, b) => a.slot - b.slot);
  }, [attestationSlot, syncCommitteeSlot, proposalBySlot, isLoading]);

  if (isLoading) {
    return (
      <tr>
        <td colSpan={9} className="px-3 py-2">
          <div className="flex gap-2">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="h-4 grow animate-pulse rounded-xs bg-muted/15" />
            ))}
          </div>
        </td>
      </tr>
    );
  }

  if (rows.length === 0) {
    return (
      <tr>
        <td colSpan={9} className="px-3 py-2 text-center text-xs text-muted">
          No slot data available
        </td>
      </tr>
    );
  }

  return (
    <>
      {rows.map(row => (
        <tr key={row.slot} className="border-b border-border/10 bg-background/15">
          <td className="py-1 pr-3 pl-12 font-mono text-xs text-muted">{formatSlot(row.slot)}</td>
          <td className="px-3 py-1 text-right text-xs">{formatBoolean(row.attested)}</td>
          <td className="px-3 py-1 text-right text-xs">{formatBoolean(row.headCorrect)}</td>
          <td className="px-3 py-1 text-right text-xs">{formatBoolean(row.targetCorrect)}</td>
          <td className="px-3 py-1 text-right text-xs">{formatBoolean(row.sourceCorrect)}</td>
          <td className="px-3 py-1 text-right text-xs text-foreground tabular-nums">
            {row.inclusionDistance !== null ? row.inclusionDistance : '-'}
          </td>
          <td className="px-3 py-1 text-right text-xs">{formatBoolean(row.participated)}</td>
          <td className="px-3 py-1 text-right text-xs">{formatProposalStatus(row.proposalStatus)}</td>
          <td className="px-3 py-1 text-right text-xs text-muted">-</td>
        </tr>
      ))}
    </>
  );
}

/**
 * Hourly sub-rows component that renders when a date row is expanded.
 * Each hourly row is itself expandable to show slot-level data.
 */
function HourlyBreakdownRows({
  validatorIndex,
  dayTimestamp,
  blockProposals = [],
  getStatusAtTimestamp,
  selectedHourTimestamp,
  onHourSelect,
}: {
  validatorIndex: number;
  dayTimestamp: number;
  blockProposals?: BlockProposalDataPoint[];
  getStatusAtTimestamp?: (validatorIndex: number, timestamp: number) => string | null;
  selectedHourTimestamp?: number | null;
  onHourSelect?: (hourTimestamp: number | null) => void;
}): JSX.Element {
  const [internalExpandedHour, setInternalExpandedHour] = useState<string | null>(null);

  // Derive controlled expanded hour from timestamp
  const controlledHour =
    selectedHourTimestamp != null
      ? `${String(new Date(selectedHourTimestamp * 1000).getUTCHours()).padStart(2, '0')}:00`
      : null;
  const expandedHour = selectedHourTimestamp !== undefined ? controlledHour : internalExpandedHour;
  const { attestationHourly, syncCommitteeHourly, balanceHourly, isLoading } = useHourlyData(
    [validatorIndex],
    dayTimestamp
  );

  // Aggregate proposals by hour for this day
  const proposalsByHour = useMemo(() => {
    const dayEnd = dayTimestamp + 86400;
    const map = new Map<string, { canonical: number; total: number }>();
    for (const p of blockProposals) {
      if (p.slotTimestamp >= dayTimestamp && p.slotTimestamp < dayEnd) {
        const hour = `${String(new Date(p.slotTimestamp * 1000).getUTCHours()).padStart(2, '0')}:00`;
        const existing = map.get(hour);
        if (existing) {
          existing.total += 1;
          if (p.status === 'canonical') existing.canonical += 1;
        } else {
          map.set(hour, { canonical: p.status === 'canonical' ? 1 : 0, total: 1 });
        }
      }
    }
    return map;
  }, [blockProposals, dayTimestamp]);

  const rows = useMemo(() => {
    if (isLoading) return [];

    const byHour = new Map<string, HourlyRow>();

    for (const a of attestationHourly) {
      const hour = `${String(new Date(a.timestamp * 1000).getUTCHours()).padStart(2, '0')}:00`;
      byHour.set(hour, {
        hour,
        inclusionRate: a.inclusionRate,
        headCorrectRate: a.headCorrectRate,
        targetCorrectRate: a.targetCorrectRate,
        sourceCorrectRate: a.sourceCorrectRate,
        avgInclusionDistance: a.avgInclusionDistance,
        syncParticipationRate: null,
        balance: null,
        proposals: proposalsByHour.get(hour) ?? null,
      });
    }

    for (const s of syncCommitteeHourly) {
      const hour = `${String(new Date(s.timestamp * 1000).getUTCHours()).padStart(2, '0')}:00`;
      const existing = byHour.get(hour);
      if (existing) {
        existing.syncParticipationRate = s.participationRate;
      } else {
        byHour.set(hour, {
          hour,
          inclusionRate: null,
          headCorrectRate: null,
          targetCorrectRate: null,
          sourceCorrectRate: null,
          avgInclusionDistance: null,
          syncParticipationRate: s.participationRate,
          balance: null,
          proposals: proposalsByHour.get(hour) ?? null,
        });
      }
    }

    for (const b of balanceHourly) {
      const hour = `${String(new Date(b.timestamp * 1000).getUTCHours()).padStart(2, '0')}:00`;
      const existing = byHour.get(hour);
      if (existing) {
        existing.balance = b.balance;
      } else {
        byHour.set(hour, {
          hour,
          inclusionRate: null,
          headCorrectRate: null,
          targetCorrectRate: null,
          sourceCorrectRate: null,
          avgInclusionDistance: null,
          syncParticipationRate: null,
          balance: b.balance,
          proposals: proposalsByHour.get(hour) ?? null,
        });
      }
    }

    // Also add hours that only have proposal data
    for (const [hour, counts] of proposalsByHour) {
      if (!byHour.has(hour)) {
        byHour.set(hour, {
          hour,
          inclusionRate: null,
          headCorrectRate: null,
          targetCorrectRate: null,
          sourceCorrectRate: null,
          avgInclusionDistance: null,
          syncParticipationRate: null,
          balance: null,
          proposals: counts,
        });
      }
    }

    // Fill all 24 hours with empty rows for missing hours
    for (let h = 0; h < 24; h++) {
      const hour = `${String(h).padStart(2, '0')}:00`;
      if (!byHour.has(hour)) {
        byHour.set(hour, {
          hour,
          inclusionRate: null,
          headCorrectRate: null,
          targetCorrectRate: null,
          sourceCorrectRate: null,
          avgInclusionDistance: null,
          syncParticipationRate: null,
          balance: null,
          proposals: null,
        });
      }
    }

    return Array.from(byHour.values()).sort((a, b) => a.hour.localeCompare(b.hour));
  }, [attestationHourly, syncCommitteeHourly, balanceHourly, proposalsByHour, isLoading]);

  if (isLoading) {
    return (
      <tr>
        <td colSpan={9} className="px-3 py-2">
          <div className="flex gap-2">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="h-4 grow animate-pulse rounded-xs bg-muted/15" />
            ))}
          </div>
        </td>
      </tr>
    );
  }

  if (rows.length === 0) {
    return (
      <tr>
        <td colSpan={9} className="px-3 py-2 text-center text-xs text-muted">
          No hourly data available
        </td>
      </tr>
    );
  }

  return (
    <>
      {rows.map(row => {
        const isExpanded = expandedHour === row.hour;
        const hourTimestamp = dayTimestamp + parseInt(row.hour) * 3600;
        return (
          <HourlyRow
            key={row.hour}
            row={row}
            isExpanded={isExpanded}
            validatorIndex={validatorIndex}
            hourTimestamp={hourTimestamp}
            blockProposals={blockProposals}
            getStatusAtTimestamp={getStatusAtTimestamp}
            onToggle={() => {
              const hourTs = dayTimestamp + parseInt(row.hour) * 3600;
              if (onHourSelect) {
                onHourSelect(expandedHour === row.hour ? null : hourTs);
              } else {
                setInternalExpandedHour(prev => (prev === row.hour ? null : row.hour));
              }
            }}
          />
        );
      })}
    </>
  );
}

/**
 * Single hourly row with optional slot expansion
 */
function HourlyRow({
  row,
  isExpanded,
  validatorIndex,
  hourTimestamp,
  blockProposals = [],
  getStatusAtTimestamp,
  onToggle,
}: {
  row: HourlyRow;
  isExpanded: boolean;
  validatorIndex: number;
  hourTimestamp: number;
  blockProposals?: BlockProposalDataPoint[];
  getStatusAtTimestamp?: (validatorIndex: number, timestamp: number) => string | null;
  onToggle: () => void;
}): JSX.Element {
  return (
    <>
      <tr
        className={clsx(
          'cursor-pointer border-b border-border/20 bg-background/30 transition-colors hover:bg-surface/40',
          isExpanded && 'bg-surface/20'
        )}
        onClick={onToggle}
      >
        <td className="py-1 pr-3 pl-8 font-mono text-xs text-muted">
          <span className="flex items-center gap-1.5">
            {isExpanded ? (
              <ChevronDownIcon className="size-2.5 text-primary" />
            ) : (
              <ChevronRightIcon className="size-2.5 text-muted" />
            )}
            {row.hour}
            {getStatusAtTimestamp &&
              (() => {
                const config = getStatusIconConfig(getStatusAtTimestamp(validatorIndex, hourTimestamp + 3599));
                const Icon = config.icon;
                return (
                  <span className={clsx('ml-1', config.colorClass)} title={config.label}>
                    <Icon className="size-3" />
                  </span>
                );
              })()}
          </span>
        </td>
        <td className="px-3 py-1 text-right text-xs">{formatPercent(row.inclusionRate)}</td>
        <td className="px-3 py-1 text-right text-xs">{formatPercent(row.headCorrectRate, 98)}</td>
        <td className="px-3 py-1 text-right text-xs">{formatPercent(row.targetCorrectRate, 98)}</td>
        <td className="px-3 py-1 text-right text-xs">{formatPercent(row.sourceCorrectRate, 98)}</td>
        <td className="px-3 py-1 text-right text-xs text-foreground tabular-nums">
          {row.avgInclusionDistance !== null ? row.avgInclusionDistance.toFixed(2) : '-'}
        </td>
        <td className="px-3 py-1 text-right text-xs">
          {row.syncParticipationRate !== null ? (
            formatPercent(row.syncParticipationRate)
          ) : (
            <span className="text-muted">-</span>
          )}
        </td>
        <td className="px-3 py-1 text-right text-xs">{formatProposalCounts(row.proposals)}</td>
        <td className="px-3 py-1 text-right text-xs text-foreground tabular-nums">
          {row.balance !== null ? row.balance.toFixed(4) : '-'}
        </td>
      </tr>
      {isExpanded && (
        <SlotBreakdownRows
          validatorIndex={validatorIndex}
          hourTimestamp={hourTimestamp}
          blockProposals={blockProposals}
        />
      )}
    </>
  );
}

/**
 * Per-day breakdown sub-table for a single validator.
 *
 * Renders daily attestation and balance metrics, joining the two
 * data sources by timestamp. Click a date row to expand hourly sub-rows,
 * then click an hourly row to expand slot-level sub-rows.
 */
export function DailyBreakdownTable({
  attestationData,
  balanceData,
  syncCommitteeData,
  blockProposals = [],
  validatorIndex,
  from,
  to,
  getStatusAtTimestamp,
  selectedDayTimestamp,
  selectedHourTimestamp,
  onDaySelect,
  onHourSelect,
}: DailyBreakdownTableProps): JSX.Element {
  const [internalExpandedDate, setInternalExpandedDate] = useState<string | null>(null);

  // Derive controlled expanded date from timestamp
  const controlledDate =
    selectedDayTimestamp != null ? new Date(selectedDayTimestamp * 1000).toISOString().slice(0, 10) : null;
  const expandedDate = selectedDayTimestamp !== undefined ? controlledDate : internalExpandedDate;

  // Aggregate proposals by day
  const proposalsByDay = useMemo(() => {
    const map = new Map<string, { canonical: number; total: number }>();
    for (const p of blockProposals) {
      const date = formatDate(p.slotTimestamp);
      const existing = map.get(date);
      if (existing) {
        existing.total += 1;
        if (p.status === 'canonical') existing.canonical += 1;
      } else {
        map.set(date, { canonical: p.status === 'canonical' ? 1 : 0, total: 1 });
      }
    }
    return map;
  }, [blockProposals]);

  const rows = useMemo(() => {
    const byDate = new Map<string, DailyRow>();

    for (const a of attestationData) {
      const date = formatDate(a.timestamp);
      byDate.set(date, {
        date,
        timestamp: a.timestamp,
        inclusionRate: a.inclusionRate,
        headCorrectRate: a.headCorrectRate,
        targetCorrectRate: a.targetCorrectRate,
        sourceCorrectRate: a.sourceCorrectRate,
        avgInclusionDistance: a.avgInclusionDistance,
        syncParticipationRate: null,
        balance: null,
        proposals: proposalsByDay.get(date) ?? null,
      });
    }

    for (const s of syncCommitteeData) {
      const date = formatDate(s.timestamp);
      const existing = byDate.get(date);
      if (existing) {
        existing.syncParticipationRate = s.participationRate;
      } else {
        byDate.set(date, {
          date,
          timestamp: s.timestamp,
          inclusionRate: null,
          headCorrectRate: null,
          targetCorrectRate: null,
          sourceCorrectRate: null,
          avgInclusionDistance: null,
          syncParticipationRate: s.participationRate,
          balance: null,
          proposals: proposalsByDay.get(date) ?? null,
        });
      }
    }

    for (const b of balanceData) {
      const date = formatDate(b.timestamp);
      const existing = byDate.get(date);
      if (existing) {
        existing.balance = b.balance;
      } else {
        byDate.set(date, {
          date,
          timestamp: b.timestamp,
          inclusionRate: null,
          headCorrectRate: null,
          targetCorrectRate: null,
          sourceCorrectRate: null,
          avgInclusionDistance: null,
          syncParticipationRate: null,
          balance: b.balance,
          proposals: proposalsByDay.get(date) ?? null,
        });
      }
    }

    // Also add days that only have proposal data
    for (const [date, counts] of proposalsByDay) {
      if (!byDate.has(date)) {
        const timestamp = Math.floor(new Date(date + 'T00:00:00Z').getTime() / 1000);
        byDate.set(date, {
          date,
          timestamp,
          inclusionRate: null,
          headCorrectRate: null,
          targetCorrectRate: null,
          sourceCorrectRate: null,
          avgInclusionDistance: null,
          syncParticipationRate: null,
          balance: null,
          proposals: counts,
        });
      }
    }

    // Fill all days from→to with empty rows for missing dates
    if (from != null && to != null) {
      const startDate = new Date(from * 1000);
      startDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(to * 1000);
      endDate.setUTCHours(0, 0, 0, 0);
      const current = new Date(startDate);
      while (current <= endDate) {
        const ts = Math.floor(current.getTime() / 1000);
        const date = formatDate(ts);
        if (!byDate.has(date)) {
          byDate.set(date, {
            date,
            timestamp: ts,
            inclusionRate: null,
            headCorrectRate: null,
            targetCorrectRate: null,
            sourceCorrectRate: null,
            avgInclusionDistance: null,
            syncParticipationRate: null,
            balance: null,
            proposals: null,
          });
        }
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [attestationData, balanceData, syncCommitteeData, proposalsByDay, from, to]);

  if (rows.length === 0) {
    return <div className="py-4 text-center text-xs text-muted">No daily data available</div>;
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border/50 text-muted">
          <th className="px-3 py-1.5 text-left font-medium">Date</th>
          <th className="px-3 py-1.5 text-right font-medium">Inclusion %</th>
          <th className="px-3 py-1.5 text-right font-medium">Head %</th>
          <th className="px-3 py-1.5 text-right font-medium">Target %</th>
          <th className="px-3 py-1.5 text-right font-medium">Source %</th>
          <th className="px-3 py-1.5 text-right font-medium">Avg Delay</th>
          <th className="px-3 py-1.5 text-right font-medium">Sync %</th>
          <th className="px-3 py-1.5 text-right font-medium">Proposals</th>
          <th className="px-3 py-1.5 text-right font-medium">Balance (ETH)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => {
          const isExpanded = expandedDate === row.date;
          return (
            <DailyDateRow
              key={row.date}
              row={row}
              isExpanded={isExpanded}
              validatorIndex={validatorIndex}
              blockProposals={blockProposals}
              getStatusAtTimestamp={getStatusAtTimestamp}
              selectedHourTimestamp={isExpanded ? selectedHourTimestamp : undefined}
              onHourSelect={onHourSelect}
              onToggle={() => {
                if (onDaySelect) {
                  onDaySelect(expandedDate === row.date ? null : row.timestamp);
                } else {
                  setInternalExpandedDate(prev => (prev === row.date ? null : row.date));
                }
              }}
            />
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Single date row with optional hourly expansion
 */
function DailyDateRow({
  row,
  isExpanded,
  validatorIndex,
  blockProposals = [],
  getStatusAtTimestamp,
  selectedHourTimestamp,
  onHourSelect,
  onToggle,
}: {
  row: DailyRow;
  isExpanded: boolean;
  validatorIndex: number;
  blockProposals?: BlockProposalDataPoint[];
  getStatusAtTimestamp?: (validatorIndex: number, timestamp: number) => string | null;
  selectedHourTimestamp?: number | null;
  onHourSelect?: (hourTimestamp: number | null) => void;
  onToggle: () => void;
}): JSX.Element {
  return (
    <>
      <tr
        className={clsx(
          'cursor-pointer border-b border-border/30 transition-colors hover:bg-surface/50',
          isExpanded && 'bg-surface/30'
        )}
        onClick={onToggle}
      >
        <td className="px-3 py-1.5 font-mono text-foreground">
          <span className="flex items-center gap-1.5">
            {isExpanded ? (
              <ChevronDownIcon className="size-3 text-primary" />
            ) : (
              <ChevronRightIcon className="size-3 text-muted" />
            )}
            {row.date}
            {getStatusAtTimestamp &&
              (() => {
                const config = getStatusIconConfig(getStatusAtTimestamp(validatorIndex, row.timestamp + 86399));
                const Icon = config.icon;
                return (
                  <span className={clsx('ml-1', config.colorClass)} title={config.label}>
                    <Icon className="size-3.5" />
                  </span>
                );
              })()}
          </span>
        </td>
        <td className="px-3 py-1.5 text-right">{formatPercent(row.inclusionRate)}</td>
        <td className="px-3 py-1.5 text-right">{formatPercent(row.headCorrectRate, 98)}</td>
        <td className="px-3 py-1.5 text-right">{formatPercent(row.targetCorrectRate, 98)}</td>
        <td className="px-3 py-1.5 text-right">{formatPercent(row.sourceCorrectRate, 98)}</td>
        <td className="px-3 py-1.5 text-right text-foreground tabular-nums">
          {row.avgInclusionDistance !== null ? row.avgInclusionDistance.toFixed(2) : '-'}
        </td>
        <td className="px-3 py-1.5 text-right">
          {row.syncParticipationRate !== null ? (
            formatPercent(row.syncParticipationRate)
          ) : (
            <span className="text-muted">-</span>
          )}
        </td>
        <td className="px-3 py-1.5 text-right">{formatProposalCounts(row.proposals)}</td>
        <td className="px-3 py-1.5 text-right text-foreground tabular-nums">
          {row.balance !== null ? row.balance.toFixed(4) : '-'}
        </td>
      </tr>
      {isExpanded && (
        <HourlyBreakdownRows
          validatorIndex={validatorIndex}
          dayTimestamp={row.timestamp}
          blockProposals={blockProposals}
          getStatusAtTimestamp={getStatusAtTimestamp}
          selectedHourTimestamp={selectedHourTimestamp}
          onHourSelect={onHourSelect}
        />
      )}
    </>
  );
}
