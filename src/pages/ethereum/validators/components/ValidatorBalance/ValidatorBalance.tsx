import { type JSX, useState } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTableBounds } from '@/hooks/useBounds';
import { getDataVizColors } from '@/utils';
import type { FctValidatorBalanceDaily } from '@/api/types.gen';
import { useValidatorRewards } from '@/pages/ethereum/validators/hooks/useValidatorRewards';
import { formatDayLabel } from '@/pages/ethereum/validators/utils/overview';

interface ValidatorBalanceProps {
  balances: FctValidatorBalanceDaily[];
  validatorIndices: number[];
  /** Range start and end day (unix seconds, start of day UTC); the end day is included */
  from: number;
  to: number;
  /** Days covered by each row: 1 for daily rows, 7 for weekly (partial at either end of the range) */
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
  validatorIndices,
  from,
  to,
  daysPerRow,
}: ValidatorBalanceProps): JSX.Element {
  const [view, setView] = useState<View>('balance');
  const themeColors = useThemeColors();
  const { CHART_CATEGORICAL_COLORS: palette } = getDataVizColors();
  const single = validatorIndices.length === 1;
  const period = daysPerRow === 7 ? 'week' : 'day';

  const balanceDays = [...new Set(balances.map(b => b.day_start_date ?? ''))].sort();
  const balanceLabels = balanceDays.map(formatDayLabel);
  // Validators with no balance rows in the range get no line and no legend entry
  const withBalances = validatorIndices.filter(idx => balances.some(b => b.validator_index === idx));
  // One validator: absolute balance. Several: change since the start of the range, so a 32 ETH
  // validator and a 2048 ETH one share a readable scale.
  const balanceSeries =
    withBalances.length <= MAX_BALANCE_LINES
      ? withBalances.map((idx, i) => {
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
              const first = totals[0] ?? 0;
              return totals.map(t => Number((t - first).toFixed(4)));
            })(),
            color: themeColors.primary,
            showSymbol: false,
          },
        ];

  const rewards = useValidatorRewards({
    indices: validatorIndices,
    from,
    to,
    resolution: daysPerRow === 7 ? 'week' : 'day',
    enabled: view === 'rewards',
  });
  const rewardRows = rewards.periods;
  const totalReward = rewards.totalRewardEth;
  const withdrawn = rewards.withdrawnEth;
  // Rewards over stake-time, so a validator whose balance grew (consolidations, top-ups) isn't
  // judged against its final balance for the whole range. Only periods with reward data count.
  const rewardDays = new Set(rewardRows.map(r => r.day));
  const stakeEthDays = balances
    .filter(b => rewardDays.has(b.day_start_date ?? ''))
    .reduce((a, b) => {
      const rowDays =
        b.start_epoch !== undefined && b.end_epoch !== undefined
          ? ((b.end_epoch - b.start_epoch + 1) * 384) / 86_400
          : daysPerRow;
      return a + ((b.effective_balance ?? 0) / 1e9) * rowDays;
    }, 0);
  // Reward and withdrawal tables are still filling backwards; say where they start inside the range
  const rewardBounds = useTableBounds(
    daysPerRow === 7 ? 'fct_attestation_reward_by_validator_weekly' : 'fct_attestation_reward_by_validator_daily'
  );
  const eventBounds = useTableBounds('fct_validator_event');
  const startsAfter = (min: number | undefined): string | null =>
    min !== undefined && min > from
      ? new Date(min * 1000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : null;
  const rewardsStart = startsAfter(rewardBounds.data?.min);
  const withdrawalsStart = startsAfter(eventBounds.data?.min);
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
            {(rewardsStart || withdrawalsStart) && (
              <div className="-mt-2 text-xs/5 text-muted">
                {rewardsStart && <p>Reward data starts {rewardsStart}.</p>}
                {withdrawalsStart && <p>Withdrawal data starts {withdrawalsStart}.</p>}
              </div>
            )}
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
                  data: rewardRows.map(d => Number((-d.penaltiesEth).toFixed(6))),
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
