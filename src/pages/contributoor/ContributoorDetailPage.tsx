import { Link, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fctNodeActiveLast24hServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { ClientLogo } from '@/components/ClientLogo';
import type { ContributorClassification } from './components/ContributoorCard';
import { getBorderColor, getClassificationLabel, getClassificationColor } from './components/ContributoorCard/utils';

export function ContributoorDetailPage(): JSX.Element {
  const { id } = useParams({ from: '/contributoor/$id' });

  // Query all three categories since we don't know which one the username belongs to
  const {
    data: pubData,
    error: pubError,
    isLoading: pubLoading,
  } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: {
        username_eq: id,
        meta_client_name_starts_with: 'pub-',
        page_size: 1000,
        order_by: 'last_seen_date_time DESC',
      },
    }),
  });

  const {
    data: corpData,
    error: corpError,
    isLoading: corpLoading,
  } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: {
        username_eq: id,
        meta_client_name_starts_with: 'corp-',
        page_size: 1000,
        order_by: 'last_seen_date_time DESC',
      },
    }),
  });

  const {
    data: ethData,
    error: ethError,
    isLoading: ethLoading,
  } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: {
        username_eq: id,
        meta_client_name_starts_with: 'ethpandaops',
        page_size: 1000,
        order_by: 'last_seen_date_time DESC',
      },
    }),
  });

  const isLoading = pubLoading || corpLoading || ethLoading;
  const error = pubError || corpError || ethError;

  // Combine all results from the three queries
  const allNodes = [
    ...(pubData?.fct_node_active_last_24h ?? []),
    ...(corpData?.fct_node_active_last_24h ?? []),
    ...(ethData?.fct_node_active_last_24h ?? []),
  ];

  const data = allNodes.length > 0 ? { fct_node_active_last_24h: allNodes } : null;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="text-secondary">Loading contributor details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          Error loading contributor: {error.message}
        </div>
        <Link to="/contributoor" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Back to all contributoors
        </Link>
      </div>
    );
  }

  const nodes = data?.fct_node_active_last_24h ?? [];

  if (nodes.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold text-primary">Contributoor not found</h1>
        <p className="mb-4 text-secondary">No active nodes found for &quot;{id}&quot; in the last 24 hours.</p>
        <Link to="/contributoor" className="text-blue-600 hover:underline">
          ← Back to all contributoors
        </Link>
      </div>
    );
  }

  const contributoor = nodes[0];
  const username = contributoor.username || id;
  const classification = (contributoor.classification || 'unclassified') as ContributorClassification;

  // Aggregate statistics
  const uniqueLocations = new Set(nodes.map(n => n.meta_client_geo_country).filter(Boolean));
  const uniqueConsensusClients = new Set(nodes.map(n => n.meta_consensus_implementation).filter(Boolean));

  const latestSeen = Math.max(...nodes.map(n => n.last_seen_date_time || 0));

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/contributoor" className="mb-6 inline-block text-blue-600 hover:underline">
        ← Back to all contributoors
      </Link>

      {/* Profile Header Card */}
      <Card className={`mb-6 border-l-4 ${getBorderColor(classification)}`}>
        <CardBody>
          <div className="flex-1">
            <h1 className="mb-2 text-3xl font-bold text-primary">{username}</h1>
            <p className={`text-lg font-medium ${getClassificationColor(classification)}`}>
              {getClassificationLabel(classification)}
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Statistics Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <h3 className="mb-2 text-sm font-semibold text-secondary">Active Nodes</h3>
            <p className="text-3xl font-bold text-primary">{nodes.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="mb-2 text-sm font-semibold text-secondary">Countries</h3>
            <p className="text-3xl font-bold text-primary">{uniqueLocations.size}</p>
          </CardBody>
        </Card>
        {uniqueConsensusClients.size > 0 && (
          <Card>
            <CardBody>
              <h3 className="mb-2 text-sm font-semibold text-secondary">Consensus Clients</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from(uniqueConsensusClients)
                  .filter((client): client is string => typeof client === 'string')
                  .map(client => (
                    <ClientLogo key={client} client={client} size={24} />
                  ))}
              </div>
            </CardBody>
          </Card>
        )}
        <Card>
          <CardBody>
            <h3 className="mb-2 text-sm font-semibold text-secondary">Last Seen</h3>
            <p className="text-sm text-secondary">{new Date(latestSeen * 1000).toLocaleString()}</p>
          </CardBody>
        </Card>
      </div>

      {/* All Nodes Table */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-primary">All Nodes ({nodes.length})</h2>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border bg-surface-secondary border-b text-left">
                  <th className="px-4 py-3 font-semibold text-primary">Location</th>
                  <th className="px-4 py-3 font-semibold text-primary">Implementation</th>
                  <th className="px-4 py-3 font-semibold text-primary">Consensus</th>
                  <th className="px-4 py-3 font-semibold text-primary">Consensus Version</th>
                  <th className="px-4 py-3 font-semibold text-primary">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {nodes.slice(0, 50).map((node, idx) => (
                  <tr key={idx} className="border-border hover:bg-surface-secondary border-b">
                    <td className="px-4 py-3 text-secondary">
                      {node.meta_client_geo_city && node.meta_client_geo_country ? (
                        <span>
                          {node.meta_client_geo_city}, {node.meta_client_geo_country}
                        </span>
                      ) : (
                        <span className="text-tertiary">Unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-tertiary">
                      {node.meta_client_implementation && node.meta_client_version
                        ? `${node.meta_client_implementation} ${node.meta_client_version}`
                        : node.meta_client_implementation || node.meta_client_version || '-'}
                    </td>
                    <td className="px-4 py-3 text-secondary">{node.meta_consensus_implementation || '-'}</td>
                    <td className="px-4 py-3 text-xs text-tertiary">{node.meta_consensus_version || '-'}</td>
                    <td className="px-4 py-3 text-xs text-tertiary">
                      {node.last_seen_date_time ? new Date(node.last_seen_date_time * 1000).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {nodes.length > 50 && (
              <div className="mt-4 text-center text-sm text-tertiary">Showing 50 of {nodes.length} nodes</div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
