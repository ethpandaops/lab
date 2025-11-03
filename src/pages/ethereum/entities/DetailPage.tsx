import { useParams } from '@tanstack/react-router';
import { useMemo } from 'react';

import { Alert } from '@/components/Feedback/Alert';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { ScrollAnchor } from '@/components/Navigation/ScrollAnchor';
import { useNetworkChangeRedirect } from '@/hooks/useNetworkChangeRedirect';
import { Route } from '@/routes/ethereum/entities/$entity';

import {
  AttestationRateChart,
  AttestationVolumeChart,
  BlockProposalChart,
  EntityBasicInfoCard,
  RecentActivityTable,
} from './components';
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
      {/* Basic Info Card */}
      <div className="mt-6">
        <ScrollAnchor id="entity-overview">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Entity Overview</h2>
        </ScrollAnchor>
        <EntityBasicInfoCard stats={data.stats} />
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <ScrollAnchor id="recent-activity">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Recent Activity</h2>
        </ScrollAnchor>
        <RecentActivityTable epochs={data.epochData} />
      </div>

      {/* Attestation Metrics - Grid Layout */}
      <div className="mt-8">
        <ScrollAnchor id="attestation-metrics">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Attestation Metrics</h2>
        </ScrollAnchor>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AttestationRateChart data={data.epochData} />
          <AttestationVolumeChart data={data.epochData} />
        </div>
      </div>

      {/* Block Proposals */}
      <div className="mt-8">
        <ScrollAnchor id="block-proposals">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Block Proposals</h2>
        </ScrollAnchor>
        <BlockProposalChart data={data.epochData} />
      </div>
    </Container>
  );
}
