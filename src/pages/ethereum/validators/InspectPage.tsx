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
  ThresholdConfig,
  DEFAULT_THRESHOLDS,
  ValidatorHeatmap,
  ValidatorIdentityCard,
  ValidatorSetCard,
  ValidatorBalance,
  ValidatorDuties,
  InspectSection,
} from './components';
import type { ThresholdValues, HeatmapMetric, ValidatorSelection } from './components';

/** Search params for the inspect page; no `from` means all history */
interface InspectSearch {
  indices?: string;
  from?: number;
  to?: number;
}

const DAY = 86_400;
/** Ranges longer than this load one row per validator per week instead of per day */
const MAX_DAILY_RANGE_DAYS = 120;

const startOfDay = (ts: number): number => Math.floor(ts / DAY) * DAY;
const tagsFromUrl = (indices?: string): string[] => (indices ?? '').split(',').filter(Boolean);
const formatDate = (ts: number): string =>
  new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/**
 * Inspect one or more validators: identity and balance, attestation performance against thresholds,
 * and individual duties.
 */
export function InspectPage(): JSX.Element {
  const navigate = useNavigate();
  const search = useSearch({ from: '/ethereum/validators/inspect' }) as InspectSearch;

  const balanceBounds = useTableBounds('fct_validator_balance_daily');
  const attestationBounds = useTableBounds('fct_attestation_vote_correctness_by_validator_daily');
  const earliest = balanceBounds.data ? startOfDay(balanceBounds.data.min) : undefined;
  const attestationFloor = attestationBounds.data ? startOfDay(attestationBounds.data.min) : undefined;

  const [tags, setTags] = useState<string[]>(() => tagsFromUrl(search.indices));
  const [range, setRange] = useState<{ from?: number; to?: number }>({ from: search.from, to: search.to });
  const [thresholds, setThresholds] = useState<ThresholdValues>(DEFAULT_THRESHOLDS);
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('inclusion');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [selection, setSelection] = useState<ValidatorSelection>({
    validatorIndex: null,
    dayTimestamp: null,
    hourTimestamp: null,
  });

  const to = range.to ?? startOfDay(Date.now() / 1000);
  const from = range.from ?? earliest;
  const allHistory = range.from === undefined;
  const resolution = from !== undefined && (to - from) / DAY > MAX_DAILY_RANGE_DAYS ? 'week' : 'day';

  const { valid: parsedIndices, pubkeys: parsedPubkeys } = useMemo(() => parseValidatorIndices(tags), [tags]);
  const {
    resolvedIndices,
    validatorMap,
    isResolving,
    isResolved,
    error: resolverError,
    unresolvedPubkeys,
  } = useValidatorResolver(parsedIndices, parsedPubkeys, hasAnalyzed);

  const ready = hasAnalyzed && isResolved && from !== undefined;
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
  } = useValidatorsData(ready ? resolvedIndices : [], ready ? from : 0, ready ? to : 0, { resolution, allHistory });

  const { getStatusAtTimestamp, unknownValidators } = useValidatorStatus(ready ? resolvedIndices : []);
  const { identities } = useValidatorIdentity(ready ? resolvedIndices : []);
  const identityList = useMemo(
    () => resolvedIndices.flatMap(i => identities.get(i) ?? []),
    [resolvedIndices, identities]
  );

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
    (nextFrom: number, nextTo: number) => {
      const isAll = earliest !== undefined && nextFrom <= earliest && nextTo === startOfDay(Date.now() / 1000);
      applyRange(isAll ? {} : { from: nextFrom, to: nextTo });
    },
    [earliest, applyRange]
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
  // Attestation tables start later than balances; the heatmap and table begin where they do
  const performanceFrom =
    from !== undefined && attestationFloor !== undefined ? Math.max(from, attestationFloor) : from;
  const rangeMeta =
    from !== undefined ? (
      <span className="flex items-center gap-2">
        {formatDate(from)} – {formatDate(to)}
        {resolution === 'week' && <Badge color="gray">Weekly</Badge>}
      </span>
    ) : undefined;
  const performanceNote =
    from !== undefined && attestationFloor !== undefined && from < attestationFloor
      ? `Attestation data starts ${formatDate(attestationFloor)}.`
      : undefined;

  return (
    <Container>
      <Header title="Inspect validators" description="Balances, duties and performance for one or more validators" />

      <div className="flex flex-col gap-3">
        <ValidatorInput tags={tags} onTagsChange={handleTagsChange} onSubmit={handleAnalyze} disabled={busy} />
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeSelector
            from={from ?? to}
            to={to}
            earliest={earliest}
            onChange={handleRangeChange}
            disabled={busy}
          />
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

        {hasAnalyzed && from === undefined && <ValidatorsSkeleton />}

        {hasAnalyzed && !error && !resolverError && from !== undefined && (
          <>
            <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
              {identityList.length === 1 && <ValidatorIdentityCard identity={identityList[0]} />}
              {identityList.length > 1 && <ValidatorSetCard identities={identityList} />}
              {hasData && !isLoading && (
                <ValidatorBalance
                  balances={raw.balance}
                  sync={raw.syncCommittee}
                  proposals={raw.blockProposal}
                  validatorIndices={resolvedIndices}
                  daysPerRow={resolution === 'week' ? 7 : 1}
                />
              )}
            </div>

            <InspectSection
              title="Performance"
              meta={rangeMeta}
              note={performanceNote}
              actions={<ThresholdConfig values={thresholds} onChange={setThresholds} disabled={busy} />}
            >
              <PerformanceSummary summary={summary} thresholds={thresholds} isLoading={busy} />
              <ValidatorHeatmap
                data={attestationDaily}
                blockProposals={blockProposals}
                metric={heatmapMetric}
                onMetricChange={setHeatmapMetric}
                from={performanceFrom ?? from}
                to={to}
                stepDays={resolution === 'week' ? 7 : 1}
                onWeekSelect={weekStart => applyRange({ from: weekStart, to: weekStart + 6 * DAY })}
                isLoading={busy}
                validatorIndices={resolvedIndices}
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
                  validatorMap={validatorMap}
                  from={performanceFrom ?? from}
                  to={to}
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
              <ValidatorDuties
                indices={resolvedIndices}
                from={from}
                to={to}
                proposals={raw.blockProposal}
                balances={raw.balance}
                sync={raw.syncCommittee}
                identities={identityList}
              />
            )}
          </>
        )}
      </div>
    </Container>
  );
}
