import { useParams, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import clsx from 'clsx';

import { Alert } from '@/components/Feedback/Alert';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Tab } from '@/components/Navigation/Tab';
import { ScrollableTabs } from '@/components/Navigation/ScrollableTabs';
import { useNetworkChangeRedirect } from '@/hooks/useNetworkChangeRedirect';
import { useTabState } from '@/hooks/useTabState';
import { Route } from '@/routes/ethereum/entities/$entity';

import {
  ActiveValidatorsChart,
  AttestationRateChart,
  AttestationVolumeChart,
  EntityBasicInfoCard,
  RecentActivityTable,
  ValidatorStatusChart,
} from './components';
import { EpochSlotsTable } from '../epochs/components';
import { useEntityDetailData, useEntityValidatorStatusData } from './hooks';
import { TIME_RANGE_CONFIG, TIME_PERIOD_OPTIONS, type TimePeriod } from './constants';

export function DetailPage(): React.JSX.Element {
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

  const timePeriod: TimePeriod = t ?? 'all';
  const config = TIME_RANGE_CONFIG[timePeriod];

  const { data, isLoading, error } = useEntityDetailData(entityName ?? '');
  const validatorStatus = useEntityValidatorStatusData(entityName ?? '', config.days);

  const { selectedIndex, onChange } = useTabState([
    { id: 'validators', anchors: ['active-validators-chart', 'validator-status-chart'] },
    { id: 'recent', anchors: ['recent-activity'] },
    { id: 'attestations', anchors: ['attestation-rate-chart', 'attestation-volume-chart'] },
    { id: 'blocks', anchors: ['block-proposals'] },
  ]);

  if (entityName === null) {
    return (
      <Container>
        <Header title="Invalid Entity" description="The entity parameter could not be decoded" />
        <Alert variant="error" title="Invalid Entity" description={`"${params.entity}" is not a valid entity name.`} />
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container>
        <Header title={entityName} description="Loading entity data..." />
        <LoadingContainer className="h-96" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header title={entityName} description="Error loading entity data" />
        <Alert variant="error" title="Error Loading Entity Data" description={error.message} />
      </Container>
    );
  }

  if (!data) {
    return (
      <Container>
        <Header title={entityName} description="No data available" />
        <Alert
          variant="info"
          title="No Data Available"
          description="No data was found for this entity. It may not exist or data may not be available."
        />
      </Container>
    );
  }

  return (
    <Container>
      {/* Unified entity header with stats */}
      <div className="animate-fade-in">
        <EntityBasicInfoCard
          stats={data.stats}
          activeValidatorCount={validatorStatus.data?.latestActiveCount}
          totalValidatorCount={validatorStatus.data?.latestTotalCount}
        />
      </div>

      {/* Tabbed content */}
      <div className="mt-8 animate-fade-in-delay">
        <TabGroup selectedIndex={selectedIndex} onChange={onChange}>
          <ScrollableTabs>
            <Tab>Validators</Tab>
            <Tab>Recent</Tab>
            <Tab>Attestations</Tab>
            <Tab>Blocks</Tab>
          </ScrollableTabs>

          <TabPanels className="mt-6">
            {/* Validators Tab */}
            <TabPanel>
              <div className="mb-6 flex flex-wrap items-center gap-1.5">
                {TIME_PERIOD_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => navigate({ search: prev => ({ ...prev, t: value }), replace: true })}
                    className={clsx(
                      'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                      timePeriod === value
                        ? 'text-primary-foreground bg-primary ring-2 ring-primary/30'
                        : 'bg-surface text-muted ring-1 ring-border hover:bg-primary/10 hover:ring-primary/30'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {validatorStatus.isLoading ? (
                <LoadingContainer className="h-96" />
              ) : validatorStatus.error ? (
                <Alert variant="error" title="Error" description={validatorStatus.error.message} />
              ) : (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 3xl:grid-cols-3 4xl:grid-cols-4">
                  <ActiveValidatorsChart data={validatorStatus.data} timePeriod={timePeriod} />
                  <ValidatorStatusChart data={validatorStatus.data} timePeriod={timePeriod} />
                </div>
              )}
            </TabPanel>

            {/* Recent Tab */}
            <TabPanel>
              <RecentActivityTable epochs={data.epochData} />
            </TabPanel>

            {/* Attestations Tab */}
            <TabPanel>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 3xl:grid-cols-3 4xl:grid-cols-4">
                <AttestationRateChart data={data.epochData} />
                <AttestationVolumeChart data={data.epochData} />
              </div>
            </TabPanel>

            {/* Blocks Tab */}
            <TabPanel>
              <EpochSlotsTable
                slots={data.slots}
                showSlotInEpoch={false}
                enableRealtimeHighlighting={false}
                sortOrder="desc"
              />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </Container>
  );
}
