import type { JSX } from 'react';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Button } from '@/components/Elements/Button';
import { Alert } from '@/components/Feedback/Alert';
import { Badge } from '@/components/Elements/Badge';
import { useTableBounds } from '@/hooks/useBounds';
import { useValidatorsData, useValidatorResolver, useValidatorStatus, useValidatorIdentity } from './hooks';
import {
  ValidatorInput,
  parseValidatorIndices,
  DateRangeSelector,
  PerformanceSummary,
  ValidatorTable,
  ValidatorsSkeleton,
  ValidatorHeatmap,
  ValidatorIdentityCard,
  ValidatorSetCard,
  ValidatorBalance,
  ValidatorDuties,
  InspectSection,
} from './components';
import type { HeatmapMetric, ValidatorSelection, ValidatorState } from './components';

/** Search params for the inspect page; no `from` means all history */
interface InspectSearch {
  indices?: string;
  from?: number;
  to?: number;
}

const DAY = 86_400;
/** Ranges longer than this load one row per validator per week instead of per day */
const MAX_DAILY_RANGE_DAYS = 120;
/** Range shown when the URL has none */
const DEFAULT_RANGE_DAYS = 30;

const startOfDay = (ts: number): number => Math.floor(ts / DAY) * DAY;
/** Monday (UTC) of the week containing the day */
const mondayOf = (ts: number): number => ts - ((new Date(ts * 1000).getUTCDay() + 6) % 7) * DAY;
// Links can carry the list JSON-quoted (indices="1,2"), so quotes are dropped
const tagsFromUrl = (indices?: string): string[] => (indices ?? '').replace(/"/g, '').split(',').filter(Boolean);
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
  const performanceFloor =
    attestationBounds.data && proposalBounds.data
      ? startOfDay(Math.max(attestationBounds.data.min, proposalBounds.data.min))
      : undefined;

  const [tags, setTags] = useState<string[]>(() => tagsFromUrl(search.indices));
  const [range, setRange] = useState<{ from?: number; to?: number }>({ from: search.from, to: search.to });
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('inclusion');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [selection, setSelection] = useState<ValidatorSelection>({
    validatorIndex: null,
    dayTimestamp: null,
    hourTimestamp: null,
  });

  const today = startOfDay(Date.now() / 1000);
  const to = range.to ?? today;
  const from = range.from ?? to - DEFAULT_RANGE_DAYS * DAY;
  // Only a range that also ends today can skip listing its periods; an earlier end must cut rows off
  const allHistory = earliest !== undefined && from <= earliest && to >= today;
  const resolution = (to - from) / DAY > MAX_DAILY_RANGE_DAYS ? 'week' : 'day';
  // Weekly rows cover Monday to Sunday, so the data spans every week the range touches
  const dataFrom = resolution === 'week' ? mondayOf(from) : from;
  const dataTo = resolution === 'week' ? Math.min(today, mondayOf(to) + 6 * DAY) : to;

  const { valid: parsedIndices, pubkeys: parsedPubkeys } = useMemo(() => parseValidatorIndices(tags), [tags]);
  const {
    resolvedIndices,
    isResolving,
    isResolved,
    error: resolverError,
    unresolvedPubkeys,
  } = useValidatorResolver(parsedIndices, parsedPubkeys, hasAnalyzed);

  const ready = hasAnalyzed && isResolved;
  const {
    validators,
    summary,
    attestationDaily,
    balanceDaily,
    syncCommitteeDaily,
    blockProposals,
    isLoading,
    error,
    hasData,
    raw,
  } = useValidatorsData(ready ? resolvedIndices : [], ready ? dataFrom : 0, ready ? dataTo : 0, {
    resolution,
    allHistory,
  });

  const { getStatusAtTimestamp, unknownValidators } = useValidatorStatus(ready ? resolvedIndices : []);
  // Indices the chain has never seen are named in the alert below and left out of every view
  const knownIndices = useMemo(
    () => resolvedIndices.filter(i => !unknownValidators.includes(i)),
    [resolvedIndices, unknownValidators]
  );
  const { identities } = useValidatorIdentity(ready ? resolvedIndices : []);
  const identityList = useMemo(
    () => resolvedIndices.flatMap(i => identities.get(i) ?? []),
    [resolvedIndices, identities]
  );
  const pubkeys = new Map(identityList.map(v => [v.index, v.pubkey]));
  // dim_validator holds today's state; a range that ends earlier shows each validator as it was on its last day
  const endsEarlier = dataTo < today;
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
      });
    },
    [navigate]
  );

  const hasValidInput = parsedIndices.length > 0 || parsedPubkeys.length > 0;

  const handleAnalyze = useCallback(() => {
    if (!hasValidInput) return;
    setHasAnalyzed(true);
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

  // Range changes apply straight away once a set has been analysed
  const applyRange = useCallback(
    (next: { from?: number; to?: number }) => {
      setRange(next);
      setSelection({ validatorIndex: null, dayTimestamp: null, hourTimestamp: null });
      if (hasAnalyzed) updateUrl(tags, next);
    },
    [hasAnalyzed, tags, updateUrl]
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

  const busy = isResolving || isLoading;
  // Attestation and proposal tables start later than balances; the heatmap and table begin where they do
  const performanceFrom = performanceFloor !== undefined ? Math.max(dataFrom, performanceFloor) : dataFrom;
  const rangeMeta = (
    <span className="flex items-center gap-2">
      {formatDate(dataFrom)} – {formatDate(dataTo)}
      {resolution === 'week' && <Badge color="gray">Weekly</Badge>}
    </span>
  );
  const performanceNote =
    performanceFloor !== undefined && dataFrom < performanceFloor
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
          <>
            <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
              {identityList.length === 1 && (!endsEarlier || endStates) && (
                <ValidatorIdentityCard identity={identityList[0]} endState={endStates?.get(identityList[0].index)} />
              )}
              {identityList.length > 1 && (!endsEarlier || endStates) && (
                <ValidatorSetCard identities={identityList} endStates={endStates} />
              )}
              {hasData && !isLoading && (
                <ValidatorBalance
                  balances={raw.balance}
                  validatorIndices={knownIndices}
                  from={dataFrom}
                  to={dataTo}
                  allHistory={allHistory}
                  daysPerRow={resolution === 'week' ? 7 : 1}
                />
              )}
            </div>

            <InspectSection title="Performance" meta={rangeMeta} note={performanceNote}>
              <PerformanceSummary summary={summary} isLoading={busy} />
              <ValidatorHeatmap
                data={attestationDaily}
                blockProposals={blockProposals}
                metric={heatmapMetric}
                onMetricChange={setHeatmapMetric}
                from={performanceFrom}
                to={dataTo}
                stepDays={resolution === 'week' ? 7 : 1}
                onWeekSelect={weekStart => applyRange({ from: weekStart, to: weekStart + 6 * DAY })}
                isLoading={busy}
                validatorIndices={knownIndices}
                selection={selection}
                onCellSelect={setSelection}
                getStatusAtTimestamp={getStatusAtTimestamp}
              />
              {busy ? (
                <ValidatorsSkeleton />
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

            {hasData && !isLoading && (
              <ValidatorDuties indices={knownIndices} from={dataFrom} to={dataTo} proposals={raw.blockProposal} />
            )}
          </>
        )}
      </div>
    </Container>
  );
}
