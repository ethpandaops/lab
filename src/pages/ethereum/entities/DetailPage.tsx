import { useParams } from '@tanstack/react-router';
import { useMemo } from 'react';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';

import { Alert } from '@/components/Feedback/Alert';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Tab } from '@/components/Navigation/Tab';
import { ScrollableTabs } from '@/components/Navigation/ScrollableTabs';
import { useNetworkChangeRedirect } from '@/hooks/useNetworkChangeRedirect';
import { useHashTabs } from '@/hooks/useHashTabs';
import { Route } from '@/routes/ethereum/entities/$entity';

import { AttestationRateChart, AttestationVolumeChart, EntityBasicInfoCard, RecentActivityTable } from './components';
import { EpochSlotsTable } from '../epochs/components';
import { useEntityDetailData } from './hooks';

/**
 * Entity detail page - comprehensive analysis of a single validator entity
 *
 * Shows:
 * - Basic entity statistics
 * - Attestation rate over time
 * - Attestation volume (attested vs missed)
 * - Block proposal history
 * - Recent activity table
 *
 * Validates entity parameter and handles errors
 */
export function DetailPage(): React.JSX.Element {
  const params = useParams({ from: '/ethereum/entities/$entity' });
  const context = Route.useRouteContext();

  // Redirect to entities index when network changes
  useNetworkChangeRedirect(context.redirectOnNetworkChange);

  // Decode entity name from URL parameter
  const entityName = useMemo(() => {
    try {
      return decodeURIComponent(params.entity);
    } catch {
      return null;
    }
  }, [params.entity]);

  // Fetch data for this entity
  const { data, isLoading, error } = useEntityDetailData(entityName ?? '');

  // Hash-based tab routing
  const { selectedIndex, onChange } = useHashTabs([
    { hash: 'recent', anchors: ['recent-activity'] },
    { hash: 'attestations', anchors: ['attestation-rate-chart', 'attestation-volume-chart'] },
    { hash: 'blocks', anchors: ['block-proposals'] },
  ]);

  // Handle invalid entity
  if (entityName === null) {
    return (
      <Container>
        <Header title="Invalid Entity" description="The entity parameter could not be decoded" />
        <Alert variant="error" title="Invalid Entity" description={`"${params.entity}" is not a valid entity name.`} />
      </Container>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Container>
        <Header title={entityName} description="Loading entity data..." />
        <LoadingContainer className="h-96" />
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container>
        <Header title={entityName} description="Error loading entity data" />
        <Alert variant="error" title="Error Loading Entity Data" description={error.message} />
      </Container>
    );
  }

  // No data state
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
      {/* Header */}
      <Header title={entityName} description="Validator entity analysis and metrics" />

      {/* Overview - Always visible */}
      <div className="mt-6">
        <EntityBasicInfoCard stats={data.stats} />
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <TabGroup selectedIndex={selectedIndex} onChange={onChange}>
          <ScrollableTabs>
            <Tab hash="recent">Recent</Tab>
            <Tab hash="attestations">Attestations</Tab>
            <Tab hash="blocks">Blocks</Tab>
          </ScrollableTabs>

          <TabPanels className="mt-6">
            {/* Recent Tab */}
            <TabPanel>
              <RecentActivityTable epochs={data.epochData} />
            </TabPanel>

            {/* Attestations Tab */}
            <TabPanel>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
