import { useMemo, type JSX } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';

import { Stats } from '@/components/DataDisplay/Stats';
import { Entity } from '@/components/Ethereum/Entity';
import { Alert } from '@/components/Feedback/Alert';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { Card } from '@/components/Layout/Card';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { ScrollableTabs } from '@/components/Navigation/ScrollableTabs';
import { Tab } from '@/components/Navigation/Tab';
import { useNetworkChangeRedirect } from '@/hooks/useNetworkChangeRedirect';
import { useTabState } from '@/hooks/useTabState';
import { formatCompact, formatDayLabel } from '@/pages/ethereum/validators/utils/overview';
import { Route } from '@/routes/ethereum/entities/$entity';

import { EntityClients } from './components/EntityClients';
import { EntityProposals } from './components/EntityProposals';
import { EntityStakeChart } from './components';
import { EntitiesTable } from './components/EntitiesTable';
import { PerformanceStats } from './components/PerformanceStats';
import { PerformanceTrend } from './components/PerformanceTrend';
import { DETAIL_WINDOW_DAYS, DETAIL_WINDOW_OPTIONS, type DetailWindow } from './constants';
import { useEntityPerformance, useEntityPerformanceHistory, useEntityStake, useEntityStakeHistory } from './hooks';
import { countsOf, entityGroupOf, entityLabel, isEntityGroup } from './utils/groups';
import { formatPeriod, formatShare } from './utils/performance';

/** The window as text, for subtitles */
const WINDOW_TEXT: Record<DetailWindow, string> = {
  '7d': 'last 7 days',
  '30d': 'last 30 days',
  '90d': 'last 90 days',
  '1y': 'last year',
  all: 'all history',
};

/**
 * One entity: its size up top; then how it performs against the network, its stake over time, the blocks it
 * proposed and the clients it runs.
 */
export function DetailPage(): JSX.Element {
  const params = useParams({ from: '/ethereum/entities/$entity' });
  const { t } = Route.useSearch();
  const navigate = useNavigate({ from: '/ethereum/entities/$entity' });
  const context = Route.useRouteContext();

  useNetworkChangeRedirect(context.redirectOnNetworkChange);

  const entityName = useMemo(() => {
    try {
      return decodeURIComponent(params.entity);
    } catch {
      return null;
    }
  }, [params.entity]);
  const entity = entityName ?? '';

  const window: DetailWindow = t ?? '30d';
  const windowDays = DETAIL_WINDOW_DAYS[window];

  const group = isEntityGroup(entity);
  const parent = entityGroupOf(entity);
  const label = entityLabel(entity);
  const stake = useEntityStakeHistory(entity);
  const performance = useEntityPerformance(window);
  const own = countsOf(performance.entities, entity);
  // A group lists its operators, from the same stake snapshots as the overview
  const operators = useEntityStake(window, group);
  const members = useMemo(
    () => operators.entities.filter(e => entityGroupOf(e.entity) === entity),
    [operators.entities, entity]
  );
  const history = useEntityPerformanceHistory(entity, performance.start, performance.end);
  const performanceWindow =
    performance.start !== undefined && performance.end !== undefined
      ? formatPeriod(performance.start, performance.end)
      : '';

  const stakeDays = useMemo(() => {
    if (windowDays === null || stake.days.length === 0) return stake.days;
    const cutoff = new Date(Date.parse(`${stake.days[stake.days.length - 1].day}T00:00:00Z`) - windowDays * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return stake.days.filter(d => d.day > cutoff);
  }, [stake.days, windowDays]);

  const { selectedIndex, onChange } = useTabState([
    { id: 'performance' },
    { id: 'stake', anchors: ['entity-stake-chart'] },
    { id: 'blocks', anchors: ['block-proposals'] },
    { id: 'clients' },
  ]);

  const windowControl = (
    <SegmentedControl
      options={DETAIL_WINDOW_OPTIONS}
      value={window}
      onChange={value => navigate({ search: prev => ({ ...prev, t: value }), replace: true, resetScroll: false })}
      ariaLabel="Window"
    />
  );

  if (entityName === null) {
    return (
      <Container>
        <Header title="Invalid entity" />
        <Alert variant="error" title="Invalid entity" description={`"${params.entity}" is not a valid entity name.`} />
      </Container>
    );
  }

  if (stake.isLoading) {
    return (
      <Container>
        <Header title={label} />
        <LoadingContainer className="h-96" />
      </Container>
    );
  }

  if (stake.error) {
    return (
      <Container>
        <Header title={label} />
        <Alert variant="error" title="Could not load the entity" description={stake.error.message} />
      </Container>
    );
  }

  if (stake.days.length === 0) {
    return (
      <Container>
        <Header title={label} />
        <Alert variant="info" title="No validators for this entity" />
      </Container>
    );
  }

  const latest = stake.latest;

  return (
    <Container>
      <Card
        title={label}
        subtitle={
          <>
            {latest && `On ${formatDayLabel(latest.day)}`}
            {group &&
              members.length > 0 &&
              `, ${members.filter(m => m.validators > 0).length.toLocaleString()} operators`}
            {parent && (
              <>
                {', operator of '}
                <Entity entity={parent} label={entityLabel(parent)} className="text-primary" />
              </>
            )}
          </>
        }
      >
        <Stats
          gridClassName="grid grid-cols-2"
          stats={[
            { id: 'validators', name: 'Active validators', value: (latest?.validators ?? 0).toLocaleString() },
            {
              id: 'stake',
              name: 'Stake',
              value: latest ? `${formatCompact(latest.stakeEth)} ETH` : '-',
              subtitle: latest?.share != null ? `${formatShare(latest.share)} of all stake` : undefined,
            },
          ]}
        />
      </Card>

      <div className="mt-8">
        <TabGroup selectedIndex={selectedIndex} onChange={onChange}>
          <ScrollableTabs>
            <Tab>Performance</Tab>
            <Tab>Stake</Tab>
            <Tab>Blocks</Tab>
            <Tab>Clients</Tab>
          </ScrollableTabs>

          {/* At least a viewport tall, so a tab still loading does not shorten the page and lose the scroll position */}
          <TabPanels className="mt-6 min-h-screen">
            <TabPanel className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {windowControl}
                {performanceWindow && <span className="text-sm text-muted">Finalized chain, {performanceWindow}</span>}
              </div>
              {performance.error ? (
                <Alert variant="error" title="Could not load performance" description={performance.error.message} />
              ) : performance.isLoading ? (
                <LoadingContainer className="h-48 rounded-sm" />
              ) : !own ? (
                <Alert variant="info" title="No attestation duties or proposals in this window" />
              ) : (
                <PerformanceStats own={own} network={performance.network} />
              )}
              {own && (
                <PerformanceTrend
                  entity={label}
                  days={history.days}
                  own={history.entity}
                  network={history.network}
                  window={performanceWindow}
                  isLoading={history.isLoading}
                />
              )}
              {group && members.length > 0 && (
                <EntitiesTable
                  title="Operators"
                  entities={members}
                  totalStakeEth={operators.totalStakeEth}
                  performance={performance.entities}
                  network={performance.network}
                  stakeWindow={
                    operators.startDay && operators.latestDay
                      ? `${formatDayLabel(operators.startDay)} to ${formatDayLabel(operators.latestDay)}`
                      : ''
                  }
                  performanceWindow={performanceWindow}
                />
              )}
            </TabPanel>

            <TabPanel className="flex flex-col gap-4">
              <div className="self-start">{windowControl}</div>
              <EntityStakeChart days={stakeDays} window={WINDOW_TEXT[window]} />
            </TabPanel>

            <TabPanel>
              <EntityProposals entity={entityName} />
            </TabPanel>

            <TabPanel className="flex flex-col gap-4">
              <div className="self-start">{windowControl}</div>
              <EntityClients entity={entityName} days={windowDays} window={WINDOW_TEXT[window]} />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </Container>
  );
}
