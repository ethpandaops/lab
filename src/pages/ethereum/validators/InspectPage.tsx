import type { JSX } from 'react';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import clsx from 'clsx';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { Button } from '@/components/Elements/Button';
import { Alert } from '@/components/Feedback/Alert';
import { Badge } from '@/components/Elements/Badge';
import { useTableBounds } from '@/hooks/useBounds';
import { completeBucketEnd } from '@/utils/time';
import { useValidatorsData, useValidatorResolver, useValidatorStatus, useValidatorIdentity } from './hooks';
import { activityEnd, weekSpan } from './utils/range';
import {
  ValidatorInput,
  parseValidatorIndices,
  DateRangeSelector,
  PerformanceSummary,
  ValidatorTable,
  DailyBreakdownTable,
  ValidatorsSkeleton,
  ValidatorHeatmap,
  NewValidatorsCard,
  ValidatorIdentityCard,
  ValidatorSetCard,
  ValidatorBalance,
  ValidatorDuties,
  InspectSection,
} from './components';
import type { HeatmapMetric, ValidatorSelection, ValidatorState } from './components';

/** Search params for the inspect page; no `from` means all history, no `to` the last complete day */
interface InspectSearch {
  indices?: string | number;
  from?: number;
  to?: number;
}

const DAY = 86_400;
/** Ranges longer than this load one row per validator per week instead of per day */
const MAX_DAILY_RANGE_DAYS = 120;

const startOfDay = (ts: number): number => Math.floor(ts / DAY) * DAY;
// Links can carry the list JSON-quoted (indices="1,2"), so quotes are dropped
const tagsFromUrl = (indices?: string | number): string[] =>
  String(indices ?? '')
    .replace(/"/g, '')
    .split(',')
    .filter(Boolean);
const formatDate = (ts: number): string =>
  new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/**
 * Inspect one or more validators: identity and balance, attestation performance, and individual duties.
 */
export function InspectPage(): JSX.Element {
  const navigate = useNavigate();
  const search = useSearch({ from: '/ethereum/validators/inspect' }) as InspectSearch;

  const balanceBounds = useTableBounds('fct_validator_balance_daily');
  const attestationBounds = useTableBounds('fct_attestation_vote_correctness_by_validator_daily');
  const proposalBounds = useTableBounds('fct_block_proposer_by_validator');
  const earliest = balanceBounds.data ? startOfDay(balanceBounds.data.min) : undefined;
  // Whole days, so the proposal read keeps its key while the bounds move within a day
  const proposalsFrom = proposalBounds.data ? startOfDay(proposalBounds.data.min) : undefined;
  const performanceFloor =
    attestationBounds.data && proposalBounds.data
      ? startOfDay(Math.max(attestationBounds.data.min, proposalBounds.data.min))
      : undefined;

  const [tags, setTags] = useState<string[]>(() => tagsFromUrl(search.indices));
  const [range, setRange] = useState<{ from?: number; to?: number }>({ from: search.from, to: search.to });
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('inclusion');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  // When Activity was last asked to run to now; reset with each range, so its requests stay the same in between
  const [activityNow, setActivityNow] = useState(() => Date.now());
  const [selection, setSelection] = useState<ValidatorSelection>({
    validatorIndex: null,
    dayTimestamp: null,
    hourTimestamp: null,
  });

  // Start of the last complete UTC day
  const lastDay = completeBucketEnd('day') - DAY;
  const to = range.to ?? lastDay;
  // Until the earliest day is known, an open start has no date; nothing loads before then
  const rangeFrom = range.from ?? earliest;
  const from = rangeFrom ?? to;
  const resolution = (to - from) / DAY > MAX_DAILY_RANGE_DAYS ? 'week' : 'day';
  // Rollups cover the range's days and never the day in progress; at weekly grain the days around the whole weeks
  // are added up into partial weeks
  const dataTo = Math.min(to, lastDay);
  // Per-slot Activity runs to now when the range ends on the last complete day
  const slotsEnd = activityEnd(to, activityNow);
  /** The days of a heatmap or breakdown week inside the range */
  const weekRange = (weekStart: number): { from: number; to: number } => {
    const [first, last] = weekSpan(weekStart, from, dataTo);
    return { from: first, to: last };
  };

  const { valid: parsedIndices, pubkeys: parsedPubkeys } = useMemo(() => parseValidatorIndices(tags), [tags]);
  const {
    resolvedIndices,
    isResolving,
    isResolved,
    error: resolverError,
    unresolvedPubkeys,
  } = useValidatorResolver(parsedIndices, parsedPubkeys, hasAnalyzed);

  // Attestation and proposal tables start later than balances; the heatmap and table begin where they do
  const performanceFrom = performanceFloor !== undefined ? Math.max(from, performanceFloor) : from;

  const ready = hasAnalyzed && isResolved && rangeFrom !== undefined && proposalsFrom !== undefined;
  const {
    validators,
    summary,
    attestationDaily,
    balanceDaily,
    syncCommitteeDaily,
    blockProposals,
    isLoading,
    isPlaceholderData,
    error,
    hasData,
    raw,
  } = useValidatorsData(ready ? resolvedIndices : [], ready ? from : 0, ready ? dataTo : 0, {
    resolution,
    slotsFrom: Math.max(from, proposalsFrom ?? from),
    slotsEnd,
    performanceFrom,
  });

  const { getStatusAtTimestamp, unknownValidators, latestStatus } = useValidatorStatus(ready ? resolvedIndices : []);
  // Indices the chain has never seen are named in the alert below and left out of every view
  const knownIndices = useMemo(
    () => resolvedIndices.filter(i => !unknownValidators.includes(i)),
    [resolvedIndices, unknownValidators]
  );
  const { identities, isLoading: identitiesLoading } = useValidatorIdentity(ready ? resolvedIndices : []);
  const identityList = useMemo(
    () => resolvedIndices.flatMap(i => identities.get(i) ?? []),
    [resolvedIndices, identities]
  );
  // Validators deposited after the daily dim_validator snapshot have only their status transitions so far
  const newValidators = identitiesLoading
    ? []
    : knownIndices.flatMap(i => (identities.has(i) ? [] : (latestStatus.get(i) ?? [])));
  const pubkeys = new Map(identityList.map(v => [v.index, v.pubkey]));
  // dim_validator holds the current state; a range that ends earlier shows each validator as it was on its last day
  const endsEarlier = dataTo < lastDay;
  const balanceAtEnd = new Map(validators.map(v => [v.validatorIndex, v.balance]));
  const endStates =
    endsEarlier && !isLoading
      ? new Map<number, ValidatorState>(
          resolvedIndices.map(i => {
            const b = balanceAtEnd.get(i);
            return [
              i,
              {
                status: b?.status ?? getStatusAtTimestamp(i, dataTo + DAY - 1) ?? 'unknown',
                slashed: b?.slashed ?? false,
                balanceEth: b?.endBalance ?? 0,
                effectiveBalanceEth: b?.effectiveBalance ?? 0,
              },
            ];
          })
        )
      : undefined;

  const updateUrl = useCallback(
    (tagList: string[], next: { from?: number; to?: number }) => {
      void navigate({
        to: '/ethereum/validators/inspect',
        search: prev => ({ ...prev, indices: tagList.join(',') || undefined, from: next.from, to: next.to }),
        replace: true,
        resetScroll: false,
      });
    },
    [navigate]
  );

  const hasValidInput = parsedIndices.length > 0 || parsedPubkeys.length > 0;

  const handleAnalyze = useCallback(() => {
    if (!hasValidInput) return;
    setHasAnalyzed(true);
    setActivityNow(Date.now());
    updateUrl(tags, range);
  }, [hasValidInput, tags, range, updateUrl]);

  const handleTagsChange = useCallback(
    (newTags: string[]) => {
      setTags(newTags);
      setHasAnalyzed(false);
      if (newTags.length === 0) updateUrl([], range);
    },
    [range, updateUrl]
  );

  // Range changes apply straight away once a set has been analysed; All leaves both ends open
  const applyRange = useCallback(
    (picked: { from: number; to: number }) => {
      const isAll = earliest !== undefined && picked.from <= earliest && picked.to === completeBucketEnd('day') - DAY;
      const next = isAll ? {} : picked;
      setRange(next);
      setActivityNow(Date.now());
      setSelection({ validatorIndex: null, dayTimestamp: null, hourTimestamp: null });
      if (hasAnalyzed) updateUrl(tags, next);
    },
    [earliest, hasAnalyzed, tags, updateUrl]
  );

  const handleRangeChange = useCallback(
    (nextFrom: number, nextTo: number) => applyRange({ from: nextFrom, to: nextTo }),
    [applyRange]
  );

  // Analyse straight away when the URL already names validators
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    const { valid, pubkeys } = parseValidatorIndices(tagsFromUrl(search.indices));
    if (valid.length > 0 || pubkeys.length > 0) setHasAnalyzed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = isResolving || isLoading || rangeFrom === undefined;
  const busy = loading || isPlaceholderData;
  const rangeMeta = (
    <span className="flex items-center gap-2">
      {formatDate(from)} – {formatDate(dataTo)}
      {resolution === 'week' && <Badge color="gray">Weekly</Badge>}
    </span>
  );
  const performanceNote =
    performanceFloor !== undefined && from < performanceFloor
      ? `Attestation and proposal data start ${formatDate(performanceFloor)}.`
      : undefined;

  return (
    <Container>
      <Header title="Inspect validators" description="Balances, duties and performance for one or more validators" />

      <div className="flex flex-col gap-3">
        <ValidatorInput tags={tags} onTagsChange={handleTagsChange} onSubmit={handleAnalyze} disabled={busy} />
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeSelector from={from} to={to} earliest={earliest} onChange={handleRangeChange} disabled={busy} />
          <div className="ml-auto flex items-center gap-2">
            {tags.length > 0 && (
              <Button variant="blank" size="sm" onClick={() => handleTagsChange([])} disabled={busy}>
                Clear
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<MagnifyingGlassIcon className="size-4" />}
              onClick={handleAnalyze}
              disabled={!hasValidInput || busy}
            >
              {isResolving ? 'Resolving…' : isLoading ? 'Loading…' : 'Analyze'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-10">
        {resolverError && (
          <Alert variant="error" title="Could not resolve validators" description={resolverError.message} />
        )}
        {error && <Alert variant="error" title="Could not load validator data" description={error.message} />}
        {unresolvedPubkeys.length > 0 && (
          <Alert
            variant="warning"
            title={`${unresolvedPubkeys.length} pubkey${unresolvedPubkeys.length === 1 ? '' : 's'} not found`}
            description={unresolvedPubkeys.map(pk => `${pk.slice(0, 10)}…${pk.slice(-8)}`).join(', ')}
          />
        )}
        {unknownValidators.length > 0 && (
          <Alert
            variant="warning"
            title={`${unknownValidators.length} validator${unknownValidators.length === 1 ? '' : 's'} not found`}
            description={unknownValidators.join(', ')}
          />
        )}

        {!hasAnalyzed && (
          <p className="rounded-sm border border-dashed border-border px-6 py-10 text-center text-sm text-muted">
            Enter validator indices or pubkeys and press Analyze. Paste a list separated by commas, spaces or new lines.
          </p>
        )}

        {hasAnalyzed && !error && !resolverError && knownIndices.length > 0 && (
          <div className={clsx('flex flex-col gap-10 transition-opacity', isPlaceholderData && 'opacity-60')}>
            <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
              {identityList.length === 1 && (!endsEarlier || endStates) && (
                <ValidatorIdentityCard identity={identityList[0]} endState={endStates?.get(identityList[0].index)} />
              )}
              {identityList.length > 1 && (!endsEarlier || endStates) && (
                <ValidatorSetCard identities={identityList} endStates={endStates} />
              )}
              {newValidators.length > 0 && <NewValidatorsCard statuses={newValidators} className="self-start" />}
              {hasData && (
                <ValidatorBalance
                  balances={raw.balance}
                  validatorIndices={knownIndices}
                  from={from}
                  to={dataTo}
                  daysPerRow={resolution === 'week' ? 7 : 1}
                />
              )}
            </div>

            <InspectSection title="Performance" meta={rangeMeta} note={performanceNote}>
              <PerformanceSummary summary={summary} isLoading={loading} />
              <ValidatorHeatmap
                data={attestationDaily}
                blockProposals={blockProposals}
                metric={heatmapMetric}
                onMetricChange={setHeatmapMetric}
                from={performanceFrom}
                to={dataTo}
                stepDays={resolution === 'week' ? 7 : 1}
                onWeekSelect={weekStart => applyRange(weekRange(weekStart))}
                isLoading={loading}
                validatorIndices={knownIndices}
                selection={selection}
                onCellSelect={setSelection}
                getStatusAtTimestamp={getStatusAtTimestamp}
              />
              {loading ? (
                <ValidatorsSkeleton />
              ) : hasData && knownIndices.length === 1 ? (
                // One validator: the cards above already summarise it, so only its day-by-day rows follow
                <Card title="Daily breakdown">
                  <DailyBreakdownTable
                    attestationData={attestationDaily}
                    balanceData={balanceDaily}
                    syncCommitteeData={syncCommitteeDaily}
                    blockProposals={blockProposals}
                    validatorIndex={knownIndices[0]}
                    from={performanceFrom}
                    to={dataTo}
                    stepDays={resolution === 'week' ? 7 : 1}
                    onWeekSelect={weekStart => {
                      applyRange(weekRange(weekStart));
                      setSelection({ validatorIndex: knownIndices[0], dayTimestamp: null, hourTimestamp: null });
                    }}
                    getStatusAtTimestamp={getStatusAtTimestamp}
                    selectedDayTimestamp={selection.dayTimestamp}
                    selectedHourTimestamp={selection.hourTimestamp}
                    onDaySelect={dayTs =>
                      setSelection({ validatorIndex: knownIndices[0], dayTimestamp: dayTs, hourTimestamp: null })
                    }
                    onHourSelect={hourTs =>
                      setSelection({
                        validatorIndex: knownIndices[0],
                        dayTimestamp: selection.dayTimestamp,
                        hourTimestamp: hourTs,
                      })
                    }
                  />
                </Card>
              ) : hasData ? (
                <ValidatorTable
                  validators={validators}
                  attestationDaily={attestationDaily}
                  balanceDaily={balanceDaily}
                  syncCommitteeDaily={syncCommitteeDaily}
                  blockProposals={blockProposals}
                  validatorMap={pubkeys}
                  from={performanceFrom}
                  to={dataTo}
                  stepDays={resolution === 'week' ? 7 : 1}
                  onWeekSelect={(validatorIndex, weekStart) => {
                    applyRange(weekRange(weekStart));
                    setSelection({ validatorIndex, dayTimestamp: null, hourTimestamp: null });
                  }}
                  getStatusAtTimestamp={getStatusAtTimestamp}
                  selection={selection}
                  onValidatorSelect={setSelection}
                />
              ) : (
                <p className="rounded-sm border border-dashed border-border px-6 py-10 text-center text-sm text-muted">
                  No data for these validators in this range.
                </p>
              )}
            </InspectSection>

            {hasData && (
              <ValidatorDuties indices={knownIndices} from={from} end={slotsEnd} proposals={raw.blockProposal} />
            )}
          </div>
        )}
      </div>
    </Container>
  );
}
