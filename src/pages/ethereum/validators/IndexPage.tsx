import type { JSX } from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import clsx from 'clsx';
import { MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { useValidatorsData, useValidatorResolver, useValidatorStatus } from './hooks';
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
} from './components';
import type { ThresholdValues, HeatmapMetric, ValidatorSelection } from './components';
import { generateValidatorReport } from './utils';

/** Search params for validators page */
interface ValidatorsSearch {
  indices?: string;
  from?: number;
  to?: number;
}

/**
 * Get default time range (last 7 days including today)
 */
function getDefaultTimeRange(): { from: number; to: number } {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const todayStart = Math.floor(now.getTime() / 1000);
  const from = todayStart - 7 * 86400;
  return { from, to: todayStart };
}

/**
 * Parse comma-separated URL string into a tag array
 */
function tagsFromUrl(indices?: string): string[] {
  return (indices ?? '').split(',').filter(Boolean);
}

/**
 * Validators performance analysis page
 *
 * Allows users to:
 * - Enter multiple validator indices
 * - Select a time range
 * - Configure pass/fail thresholds
 * - View aggregate and per-validator performance metrics
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate();
  const search = useSearch({ from: '/ethereum/validators/report' }) as ValidatorsSearch;

  // Initialize state from URL params or defaults
  const defaultRange = getDefaultTimeRange();
  const [tags, setTags] = useState<string[]>(() => tagsFromUrl(search.indices));
  const [timeRange, setTimeRange] = useState({
    from: search.from ?? defaultRange.from,
    to: search.to ?? defaultRange.to,
  });
  const [thresholds, setThresholds] = useState<ThresholdValues>(DEFAULT_THRESHOLDS);
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('inclusion');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [selection, setSelection] = useState<ValidatorSelection>({
    validatorIndex: null,
    dayTimestamp: null,
    hourTimestamp: null,
  });

  // Parse validator indices and pubkeys from tags
  const { valid: parsedIndices, pubkeys: parsedPubkeys } = parseValidatorIndices(tags);

  // Resolve mixed inputs (indices + pubkeys) into unified set
  const {
    resolvedIndices,
    validatorMap,
    isResolving,
    isResolved,
    error: resolverError,
    unresolvedPubkeys,
  } = useValidatorResolver(parsedIndices, parsedPubkeys, hasAnalyzed);

  // Fetch data when analyze is triggered and resolution is complete
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
  } = useValidatorsData(
    hasAnalyzed && isResolved ? resolvedIndices : [],
    hasAnalyzed && isResolved ? timeRange.from : 0,
    hasAnalyzed && isResolved ? timeRange.to : 0
  );

  // Fetch validator status transitions
  const {
    getStatusAtTimestamp,
    statusSummary,
    unknownValidators,
    isLoading: isStatusLoading,
  } = useValidatorStatus(hasAnalyzed && isResolved ? resolvedIndices : []);

  // Update URL when search params change
  const updateUrl = useCallback(
    (tagList: string[], from: number, to: number) => {
      const indices = tagList.join(',');
      void navigate({
        to: '/ethereum/validators/report',
        search: {
          indices: indices || undefined,
          from: from || undefined,
          to: to || undefined,
        } as ValidatorsSearch,
        replace: true,
      });
    },
    [navigate]
  );

  const hasValidInput = parsedIndices.length > 0 || parsedPubkeys.length > 0;

  // Handle analyze button click
  const handleAnalyze = useCallback(() => {
    if (!hasValidInput) return;
    setHasAnalyzed(true);
    updateUrl(tags, timeRange.from, timeRange.to);
  }, [hasValidInput, tags, timeRange, updateUrl]);

  // Handle tags change
  const handleTagsChange = useCallback(
    (newTags: string[]) => {
      setTags(newTags);
      setHasAnalyzed(false);
      if (newTags.length === 0) {
        updateUrl([], timeRange.from, timeRange.to);
      }
    },
    [timeRange, updateUrl]
  );

  // Handle time range change
  const handleTimeRangeChange = useCallback((from: number, to: number) => {
    setTimeRange({ from, to });
    setHasAnalyzed(false);
  }, []);

  // Track if we've done the initial mount check
  const hasInitialized = useRef(false);

  // Auto-analyze if URL has params on mount (only once)
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (search.indices) {
      const parsed = tagsFromUrl(search.indices);
      const { valid, pubkeys } = parseValidatorIndices(parsed);
      if (valid.length > 0 || pubkeys.length > 0) {
        setHasAnalyzed(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle download report
  const handleDownloadReport = useCallback(() => {
    if (!summary) return;

    const markdown = generateValidatorReport({
      validators,
      summary,
      thresholds,
      timeRange,
      url: window.location.href,
      blockProposals,
      validatorMap,
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validator-report-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [validators, summary, thresholds, timeRange, blockProposals, validatorMap]);

  return (
    <Container>
      <Header
        title="Validators"
        description="Analyze validator performance including attestation correctness, sync committee participation, and balance history"
      />

      <div className="mt-6 space-y-6">
        {/* Input section */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ValidatorInput
            tags={tags}
            onTagsChange={handleTagsChange}
            onSubmit={handleAnalyze}
            disabled={isResolving || isLoading}
          />
          <DateRangeSelector
            from={timeRange.from}
            to={timeRange.to}
            onChange={handleTimeRangeChange}
            disabled={isResolving || isLoading}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!hasValidInput || isResolving || isLoading || isStatusLoading}
            className={clsx(
              'flex items-center gap-2 rounded-xs border border-primary bg-primary/10 px-4 py-2 text-sm/6 font-medium text-primary',
              'transition-colors hover:bg-primary/20',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary/10'
            )}
          >
            <MagnifyingGlassIcon className="size-4" />
            {isResolving ? 'Resolving validators...' : isLoading ? 'Analyzing...' : 'Analyze'}
          </button>

          {hasAnalyzed && hasData && !isLoading && !isResolving && (
            <button
              type="button"
              onClick={handleDownloadReport}
              className={clsx(
                'flex items-center gap-2 rounded-xs border border-border bg-surface px-4 py-2 text-sm/6 font-medium text-foreground',
                'transition-colors hover:bg-muted/10'
              )}
            >
              <ArrowDownTrayIcon className="size-4" />
              Download Report
            </button>
          )}
        </div>

        {/* Resolver error */}
        {resolverError && (
          <div className="rounded-xs border border-danger/20 bg-danger/10 p-4 text-danger">
            Error resolving validators: {resolverError.message}
          </div>
        )}

        {/* Unresolved pubkeys warning */}
        {unresolvedPubkeys.length > 0 && (
          <div className="rounded-xs border border-warning/20 bg-warning/10 p-4 text-warning">
            <p className="font-medium">
              Could not resolve {unresolvedPubkeys.length} pubkey{unresolvedPubkeys.length !== 1 ? 's' : ''}:
            </p>
            <ul className="mt-1 list-inside list-disc text-sm">
              {unresolvedPubkeys.map(pk => (
                <li key={pk} className="font-mono">
                  {pk.slice(0, 10)}...{pk.slice(-8)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Unknown validators warning */}
        {unknownValidators.length > 0 && (
          <div className="rounded-xs border border-warning/20 bg-warning/10 p-4 text-warning">
            <p className="font-medium">
              {unknownValidators.length} validator{unknownValidators.length !== 1 ? 's' : ''} not found:
            </p>
            <ul className="mt-1 list-inside list-disc text-sm">
              {unknownValidators.map(idx => (
                <li key={idx} className="font-mono">
                  {idx}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Data error state */}
        {error && (
          <div className="rounded-xs border border-danger/20 bg-danger/10 p-4 text-danger">
            Error loading data: {error.message}
          </div>
        )}

        {/* Results section - only show if analyzed */}
        {hasAnalyzed && !error && !resolverError && (
          <>
            {/* Threshold configuration */}
            <ThresholdConfig values={thresholds} onChange={setThresholds} disabled={isResolving || isLoading} />

            {/* Performance summary */}
            <PerformanceSummary
              summary={summary}
              statusSummary={statusSummary}
              isStatusLoading={isStatusLoading}
              thresholds={thresholds}
              isLoading={isResolving || isLoading}
            />

            {/* Heatmap visualization */}
            {(hasData || statusSummary !== null) && (
              <ValidatorHeatmap
                data={attestationDaily}
                blockProposals={blockProposals}
                metric={heatmapMetric}
                onMetricChange={setHeatmapMetric}
                from={timeRange.from}
                to={timeRange.to}
                isLoading={isResolving || isLoading}
                validatorIndices={resolvedIndices}
                selection={selection}
                onCellSelect={setSelection}
                getStatusAtTimestamp={getStatusAtTimestamp}
              />
            )}

            {/* Validator table */}
            {isResolving || isLoading ? (
              <ValidatorsSkeleton />
            ) : hasData ? (
              <ValidatorTable
                validators={validators}
                attestationDaily={attestationDaily}
                balanceDaily={balanceDaily}
                syncCommitteeDaily={syncCommitteeDaily}
                blockProposals={blockProposals}
                validatorMap={validatorMap}
                from={timeRange.from}
                to={timeRange.to}
                getStatusAtTimestamp={getStatusAtTimestamp}
                selection={selection}
                onValidatorSelect={setSelection}
              />
            ) : (
              <div className="rounded-xs border border-border bg-surface p-8 text-center text-muted">
                No data available for the selected validators and time range.
              </div>
            )}
          </>
        )}

        {/* Initial state - show instructions */}
        {!hasAnalyzed && !isLoading && !isResolving && (
          <div className="rounded-xs border border-border bg-surface p-8 text-center">
            <p className="text-muted">
              Enter one or more validator indices or pubkeys and select a time range to analyze their performance.
            </p>
            <p className="mt-2 text-sm text-muted/70">
              Supports comma-separated, space-separated, or newline-separated validator indices and pubkeys.
            </p>
          </div>
        )}
      </div>
    </Container>
  );
}
