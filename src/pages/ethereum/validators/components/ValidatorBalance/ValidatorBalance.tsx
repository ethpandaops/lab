import { type JSX, useState } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getDataVizColors } from '@/utils';
import type {
  FctBlockProposerByValidator,
  FctSyncCommitteeParticipationByValidatorDaily,
  FctValidatorBalanceDaily,
} from '@/api/types.gen';
import { formatDayLabel } from '../../mocks/overview';
import { estimateRewards } from '../../utils/rewards';
import { weekStartOf } from '../../utils/weekly';
import { MockBadge } from '../MockBadge';

interface ValidatorBalanceProps {
  balances: FctValidatorBalanceDaily[];
  sync: FctSyncCommitteeParticipationByValidatorDaily[];
  proposals: FctBlockProposerByValidator[];
  validatorIndices: number[];
  /** Days covered by each row: 1 for daily rows, 7 for weekly */
  daysPerRow: 1 | 7;
}

type View = 'balance' | 'rewards';

const MAX_BALANCE_LINES = 8;

const eth = (value: number, decimals = 4): string =>
  `${value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ETH`;

function Figure({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <p className="text-xs/5 font-medium text-muted">{label}</p>
      <p className="text-lg/7 font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
    </div>
  );
}

/**
 * Balance history, or estimated consensus rewards and withdrawals, for one or more validators.
 */
export function ValidatorBalance({
  balances,
  sync,
  proposals,
  validatorIndices,
  daysPerRow,
}: ValidatorBalanceProps): JSX.Element {
  const [view, setView] = useState<View>('balance');
  const themeColors = useThemeColors();
  const { CHART_CATEGORICAL_COLORS: palette } = getDataVizColors();
  const single = validatorIndices.length === 1;
  const period = daysPerRow === 7 ? 'week' : 'day';

  const balanceDays = [...new Set(balances.map(b => b.day_start_date ?? ''))].sort();
  const balanceLabels = balanceDays.map(formatDayLabel);
  // One validator: absolute balance. Several: change since the start of the range, so a 32 ETH
  // validator and a 2048 ETH one share a readable scale.
  const balanceSeries =
    validatorIndices.length <= MAX_BALANCE_LINES
      ? validatorIndices.map((idx, i) => {
          const byDay = new Map(
            balances.filter(b => b.validator_index === idx).map(b => [b.day_start_date, b.end_balance])
          );
          const base = balanceDays.map(d => byDay.get(d)).find(v => v != null) ?? 0;
          return {
            name: String(idx),
            data: balanceDays.map(d => {
              const v = byDay.get(d);
              if (v == null) return null;
              return Number(((single ? v : v - base) / 1e9).toFixed(5));
            }),
            color: palette[i % palette.length],
            showSymbol: false,
          };
        })
      : [
          {
            name: 'Balance change',
            data: (() => {
              const totals = balanceDays.map(
                d => balances.filter(b => b.day_start_date === d).reduce((a, b) => a + (b.end_balance ?? 0), 0) / 1e9
              );
              return totals.map(t => Number((t - totals[0]).toFixed(4)));
            })(),
            color: themeColors.primary,
            showSymbol: false,
          },
        ];

  const { days: rewardRows } = estimateRewards(balances, sync, proposals, daysPerRow === 7 ? weekStartOf : undefined);
  const totalReward = rewardRows.reduce((a, d) => a + d.attestationEth + d.syncEth + d.proposerEth, 0);
  const withdrawn = rewardRows.reduce((a, d) => a + d.withdrawnEth, 0);
  // Rewards over stake-time, so a validator whose balance grew (consolidations, top-ups) isn't
  // judged against its final balance for the whole range
  const stakeEthDays = balances.reduce((a, b) => {
    const rowDays =
      b.start_epoch !== undefined && b.end_epoch !== undefined
        ? ((b.end_epoch - b.start_epoch + 1) * 384) / 86_400
        : daysPerRow;
    return a + ((b.effective_balance ?? 0) / 1e9) * rowDays;
  }, 0);
  const apr = stakeEthDays ? (totalReward * 365) / stakeEthDays : 0;
  const rewardLabels = rewardRows.map(d => formatDayLabel(d.day));

  const title = view === 'rewards' ? `Rewards per ${period}` : single ? 'Balance' : 'Balance change';

  return (
    <PopoutCard
      title={title}
      anchorId="validator-balance"
      modalSize="full"
      headerActions={
        <div className="flex items-center gap-2">
          {view === 'rewards' && <MockBadge />}
          <SegmentedControl<View>
            options={[
              { value: 'balance', label: 'Balance' },
              { value: 'rewards', label: 'Rewards' },
            ]}
            value={view}
            onChange={setView}
            ariaLabel="Balance or rewards"
          />
        </div>
      }
    >
      {({ inModal }) =>
        view === 'balance' ? (
          <MultiLineChart
            series={balanceSeries}
            xAxis={{ type: 'category', labels: balanceLabels }}
            yAxis={{ name: 'ETH', min: single ? 'dataMin' : undefined, valueDecimals: 3 }}
            height={inModal ? 600 : 220}
            showLegend={!single}
            legendPosition="top"
            enableDataZoom={balanceDays.length > 120}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <Figure label="Consensus rewards" value={eth(totalReward)} />
              <Figure label="APR" value={`${(apr * 100).toFixed(2)}%`} />
              <Figure label="Withdrawn" value={eth(withdrawn)} />
            </div>
            <MultiLineChart
              series={[
                {
                  name: 'Attestations',
                  data: rewardRows.map(d => Number(Math.max(0, d.attestationEth).toFixed(6))),
                  color: palette[0],
                  stack: 'r',
                  seriesType: 'bar',
                },
                {
                  name: 'Proposals',
                  data: rewardRows.map(d => Number(d.proposerEth.toFixed(6))),
                  color: palette[7],
                  stack: 'r',
                  seriesType: 'bar',
                },
                {
                  name: 'Sync committee',
                  data: rewardRows.map(d => Number(d.syncEth.toFixed(6))),
                  color: palette[4],
                  stack: 'r',
                  seriesType: 'bar',
                },
                {
                  name: 'Penalties',
                  data: rewardRows.map(d => Number(Math.min(0, d.attestationEth).toFixed(6))),
                  color: themeColors.danger,
                  stack: 'r',
                  seriesType: 'bar',
                },
              ]}
              xAxis={{ type: 'category', labels: rewardLabels }}
              yAxis={{ name: 'ETH', valueDecimals: 4 }}
              height={inModal ? 600 : 160}
              showLegend
              legendPosition="top"
              enableDataZoom={rewardRows.length > 120}
            />
          </div>
        )
      }
    </PopoutCard>
  );
}
