import { type JSX, useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Container } from '@/components/Layout/Container';
import { Card } from '@/components/Layout/Card';
import { Header } from '@/components/Layout/Header';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { useNetwork } from '@/hooks/useNetwork';
import {
  fctBlockFastConfirmationByClientDailyServiceListOptions,
  fctBlockFastConfirmationByClientHourlyServiceListOptions,
  fctBlockFastConfirmationByNodeServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import {
  BlockField,
  ClientTable,
  ConfirmationDistribution,
  EpochDetail,
  FastConfirmationSkeleton,
  ScarList,
} from './components';
import { LATE_CONFIRMATION_MS, PAGE_SIZE, RECENT_BLOCK_HOURS } from './constants';
import { toClientDay, toObservation } from './fast-confirmation.api';
import { buildField, formatDurationMs, groupStallEpisodes, summarizeClients } from './fast-confirmation.utils';

function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Fast Confirmation page: every epoch a fast confirmation node has scored, and how soon
 * each block was safe to rely on compared to finality.
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/consensus/fast-confirmation' });
  const search = useSearch({ from: '/ethereum/consensus/fast-confirmation' });
  const { currentNetwork } = useNetwork();
  const genesis = currentNetwork?.genesis_time ?? 0;
  const nowSeconds = useMemo(() => Math.floor(Date.now() / 1000), []);

  const dailyQuery = useQuery({
    ...fctBlockFastConfirmationByClientDailyServiceListOptions({
      query: { day_start_date_like: '20%', order_by: 'day_start_date asc', page_size: PAGE_SIZE },
    }),
  });

  const clients = useMemo(
    () => summarizeClients((dailyQuery.data?.fct_block_fast_confirmation_by_client_daily ?? []).map(toClientDay)),
    [dailyQuery.data]
  );
  const client = clients.find(c => c.client === search.client) ?? clients[0];

  const hourlyQuery = useQuery({
    ...fctBlockFastConfirmationByClientHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: 1,
        meta_consensus_implementation_eq: client?.client,
        order_by: 'hour_start_date_time asc',
        page_size: PAGE_SIZE,
      },
    }),
    enabled: !!client,
  });

  const lateQuery = useQuery({
    ...fctBlockFastConfirmationByNodeServiceListOptions({
      query: {
        slot_start_date_time_gte: 1,
        meta_consensus_implementation_eq: client?.client,
        fast_confirmed_slot_start_diff_gte: LATE_CONFIRMATION_MS,
        order_by: 'slot_start_date_time asc',
        page_size: PAGE_SIZE,
      },
    }),
    enabled: !!client,
  });

  const recentQuery = useQuery({
    ...fctBlockFastConfirmationByNodeServiceListOptions({
      query: {
        slot_start_date_time_gte: nowSeconds - (RECENT_BLOCK_HOURS + 3) * 3600,
        order_by: 'slot_start_date_time desc',
        page_size: PAGE_SIZE,
      },
    }),
  });

  const late = useMemo(
    () => (lateQuery.data?.fct_block_fast_confirmation_by_node ?? []).map(toObservation),
    [lateQuery.data]
  );

  const field = useMemo(() => {
    const hours = (hourlyQuery.data?.fct_block_fast_confirmation_by_client_hourly ?? [])
      .filter(r => (r.slot_count ?? 0) > 0)
      .map(r => r.hour_start_date_time ?? 0);
    return buildField(genesis, hours, late);
  }, [genesis, hourlyQuery.data, late]);

  const episodes = useMemo(() => groupStallEpisodes(late), [late]);

  const selectedEpoch = useMemo(() => {
    if (search.epoch !== undefined && field.byEpoch.has(search.epoch)) return search.epoch;
    const worst = [...episodes].sort((a, b) => b.worstMs - a.worstMs)[0];
    return worst ? Math.floor(worst.startSlot / 32) : null;
  }, [search.epoch, field, episodes]);
  const selected = selectedEpoch !== null ? field.byEpoch.get(selectedEpoch) : undefined;

  const distribution = useMemo(() => {
    const rows = (recentQuery.data?.fct_block_fast_confirmation_by_node ?? []).map(toObservation);
    const newest = Math.max(0, ...rows.map(r => r.slotStartDateTime));
    const canonical = rows.filter(
      r => r.status === 'canonical' && r.slotStartDateTime > newest - RECENT_BLOCK_HOURS * 3600
    );
    return {
      fast: canonical.map(r => r.fastConfirmedMs).filter((v): v is number => v !== null),
      finalized: canonical.map(r => r.finalizedMs).filter((v): v is number => v !== null),
    };
  }, [recentQuery.data]);

  const setSearch = (next: { client?: string; epoch?: number }): void => {
    navigate({ search: prev => ({ ...prev, ...next }), replace: true });
  };

  const isLoading = dailyQuery.isLoading || hourlyQuery.isLoading || lateQuery.isLoading;
  const error = dailyQuery.error ?? hourlyQuery.error ?? lateQuery.error;

  return (
    <Container>
      <Header
        title="Fast Confirmation"
        description="How soon an Ethereum block is safe to rely on, block by block, compared with finality"
        showAccent={false}
      />

      {isLoading && <FastConfirmationSkeleton />}

      {error && (
        <Card rounded className="p-6">
          <p className="text-danger">Failed to load data: {error.message}</p>
        </Card>
      )}

      {!isLoading && !error && !client && (
        <Card rounded className="p-6">
          <p className="text-muted">No fast confirmation data for this network yet.</p>
        </Card>
      )}

      {!isLoading && client && (
        <div className="flex flex-col gap-6">
          <p className="max-w-4xl text-lg/8 text-foreground">
            Since {formatDay(client.since)}, our <span className="capitalize">{client.client}</span> node has fast
            confirmed <span className="font-semibold">{client.blocks.toLocaleString()}</span> blocks. Half of them were
            safe to rely on within <span className="font-semibold text-success">{formatDurationMs(client.fastMs)}</span>{' '}
            of their slot starting. Finality took{' '}
            <span className="font-semibold">{formatDurationMs(client.finalityMs)}</span>, which is{' '}
            <span className="font-semibold">{Math.round(client.speedup)} times</span> longer.{' '}
            {client.reverted === 0
              ? 'None of those confirmations was ever reverted.'
              : `${client.reverted} confirmed blocks were later reorged.`}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {clients.map(c => (
              <button
                key={c.client}
                type="button"
                onClick={() => setSearch({ client: c.client, epoch: undefined })}
                className={clsx(
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-all',
                  c.client === client.client
                    ? 'text-primary-foreground bg-primary ring-2 ring-primary/30'
                    : 'bg-surface text-muted ring-1 ring-border hover:bg-primary/10 hover:ring-primary/30'
                )}
              >
                <ClientLogo client={c.client} size={16} />
                {c.client}
              </button>
            ))}
          </div>

          <Card rounded>
            <div className="flex flex-col gap-4 p-6">
              <div>
                <h2 className="text-base font-semibold text-foreground">Every epoch since {formatDay(client.since)}</h2>
                <p className="text-sm text-muted">
                  One row per day (UTC), one column per epoch. Each cell is coloured by the slowest of its 32 blocks.
                  Click a cell to open its blocks.
                </p>
              </div>
              <BlockField field={field} selectedEpoch={selectedEpoch} onSelect={e => setSearch({ epoch: e.epoch })} />
              {selected && <EpochDetail epoch={selected} />}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card rounded>
              <div className="flex flex-col gap-3 p-6">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Scars</h2>
                  <p className="text-sm text-muted">
                    The worst runs of late confirmations. When conditions degrade, the rule waits instead of guessing,
                    and some blocks are only confirmed once they are final.
                  </p>
                </div>
                <ScarList episodes={episodes} selectedEpoch={selectedEpoch} onSelect={epoch => setSearch({ epoch })} />
              </div>
            </Card>
            <ConfirmationDistribution
              fastConfirmedMs={distribution.fast}
              finalizedMs={distribution.finalized}
              subtitle={`Every block in the last ${RECENT_BLOCK_HOURS} finalized hours, all clients`}
            />
          </div>

          <Card rounded>
            <div className="flex flex-col gap-3 p-6">
              <h2 className="text-base font-semibold text-foreground">By client</h2>
              <ClientTable
                clients={clients}
                selected={client.client}
                onSelect={c => setSearch({ client: c, epoch: undefined })}
              />
            </div>
          </Card>

          <Card rounded>
            <div className="grid gap-6 p-6 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-foreground">What it measures</h3>
                <p className="text-sm/6 text-muted">
                  The time from a block&apos;s slot starting until the node&apos;s fast confirmation rule marks it
                  confirmed, either directly or by confirming a later block built on top of it.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-foreground">Not the same as finality</h3>
                <p className="text-sm/6 text-muted">
                  Finality is an economic guarantee: reverting a finalized block burns at least a third of all stake.
                  Fast confirmation assumes votes arrive on time and less than a quarter of stake is adversarial.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-foreground">Where the data comes from</h3>
                <p className="text-sm/6 text-muted">
                  ethPandaOps sentries subscribe to the beacon node fast confirmation event, joined with canonical
                  blocks and finalized checkpoints.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Container>
  );
}
