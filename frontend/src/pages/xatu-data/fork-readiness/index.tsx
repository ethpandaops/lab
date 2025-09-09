import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Select } from '@/components/common/Select';
import useBeacon from '@/contexts/beacon';
import { formatNodeName } from '@/utils/format.ts';
import { Card, CardHeader, CardBody } from '@/components/common/Card';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { XatuCallToAction } from '@/components/xatu/XatuCallToAction';
import useNetwork from '@/contexts/network';
import useConfig from '@/contexts/config';
import { getRestApiClient } from '@/api';
import { useQuery } from '@tanstack/react-query';
import { transformNodeToContributor } from '@/utils/transformers';
import { NetworkSelector } from '@/components/common/NetworkSelector';

const SLOTS_PER_EPOCH = 32;

const CLIENT_METADATA: Record<string, { name: string }> = {
  prysm: { name: 'Prysm' },
  teku: { name: 'Teku' },
  lighthouse: { name: 'Lighthouse' },
  lodestar: { name: 'Lodestar' },
  nimbus: { name: 'Nimbus' },
  grandine: { name: 'Grandine' },
};

interface ForkNode {
  client_name: string;
  consensus_client: string;
  consensus_version: string;
  username: string;
}

function ForkReadiness() {
  const { config } = useConfig();
  const { getBeaconClock } = useBeacon();
  const { selectedNetwork, setSelectedNetwork } = useNetwork();
  const [selectedUser, setSelectedUser] = useState<string>('all');

  // Fetch nodes data using REST API
  const {
    data: nodesData,
    isLoading,
    error,
  } = useQuery<ForkNode[]>({
    queryKey: ['xatu-data-fork-readiness', selectedNetwork],
    queryFn: async () => {
      const client = await getRestApiClient();
      const response = await client.getNodes(selectedNetwork);
      // Transform nodes for selected network
      return response.nodes.map(node => ({
        client_name: node.client?.name || '',
        consensus_client: node.consensus?.implementation || '',
        consensus_version: node.consensus?.version || '',
        username: node.username || '',
      }));
    },
    enabled: !!selectedNetwork,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  // Get unique users from nodes data
  const users = useMemo(() => {
    if (!nodesData) return [];
    const uniqueUsers = [...new Set(nodesData.map(node => node.username))].filter(Boolean);
    return ['all', ...uniqueUsers.sort()];
  }, [nodesData]);

  const readinessData = useMemo(() => {
    if (!nodesData || !config) {
      return [];
    }

    if (!config?.ethereum?.networks[selectedNetwork]?.forks?.consensus?.electra) {
      return [];
    }

    const network = config.ethereum.networks[selectedNetwork];
    const nodes = nodesData.filter(n => selectedUser === 'all' || n.username === selectedUser);

    const clientReadiness = Object.entries(
      network.forks?.consensus?.electra?.minClientVersions || {},
    )
      .map(([clientName, minVersion]) => {
        const clientNodes = nodes.filter(n => n.consensus_client === clientName);
        const readyNodes = clientNodes.filter(n => {
          const currentVersion = n.consensus_version.replace('v', '');
          const minVersionParts = minVersion.split('.');
          const currentVersionParts = currentVersion.split('.');

          // Compare major version
          if (parseInt(currentVersionParts[0]) > parseInt(minVersionParts[0])) return true;
          if (parseInt(currentVersionParts[0]) < parseInt(minVersionParts[0])) return false;

          // Compare minor version
          if (parseInt(currentVersionParts[1]) > parseInt(minVersionParts[1])) return true;
          if (parseInt(currentVersionParts[1]) < parseInt(minVersionParts[1])) return false;

          // Compare patch version
          return parseInt(currentVersionParts[2]) >= parseInt(minVersionParts[2]);
        });

        return {
          name: clientName,
          totalNodes: clientNodes.length,
          readyNodes: readyNodes.length,
          readyPercentage:
            clientNodes.length === 0 ? 100 : (readyNodes.length / clientNodes.length) * 100,
          minVersion,
          nodes: clientNodes.map(n => ({
            name: n.client_name,
            version: n.consensus_version,
            isReady: readyNodes.includes(n),
          })),
        };
      })
      .filter(client => client.totalNodes > 0) // Only show clients with nodes
      .sort((a, b) => b.totalNodes - a.totalNodes);

    const totalNodes = clientReadiness.reduce((acc, client) => acc + client.totalNodes, 0);
    const readyNodes = clientReadiness.reduce((acc, client) => acc + client.readyNodes, 0);

    // Calculate time until fork
    const clock = getBeaconClock(selectedNetwork);
    const electraEpoch = network.forks?.consensus?.electra?.epoch || 0;
    const currentEpoch = clock?.getCurrentEpoch() || 0;
    const epochsUntilFork = Number(electraEpoch) - Number(currentEpoch);
    const timeUntilFork = epochsUntilFork * SLOTS_PER_EPOCH * 12; // 12 seconds per slot

    return [
      {
        name: selectedNetwork,
        totalNodes,
        readyNodes,
        readyPercentage: totalNodes === 0 ? 100 : (readyNodes / totalNodes) * 100,
        clients: clientReadiness,
        forkEpoch: electraEpoch,
        timeUntilFork,
        currentEpoch,
      },
    ];
  }, [nodesData, config, selectedUser, selectedNetwork, getBeaconClock]);

  if (error) {
    return <ErrorState message="Failed to load fork readiness data" error={error} />;
  }

  if (isLoading) {
    return <LoadingState message="Loading fork readiness data..." />;
  }

  if (!nodesData || !config) {
    return <LoadingState message="Processing fork readiness data..." />;
  }

  if (!config?.ethereum?.networks[selectedNetwork]?.forks?.consensus?.electra) {
    return (
      <div className="space-y-6">
        <XatuCallToAction />

        <Card className="relative z-10 card-primary overflow-visible">
          <CardBody className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-2xl font-sans font-bold text-primary mb-2">No Upcoming Forks</h2>
            <p className="text-sm font-mono text-secondary max-w-lg">
              There are no upcoming forks configured for {selectedNetwork}. Check back later for
              updates on future network upgrades.
            </p>
          </CardBody>
        </Card>

        {/* Data Note */}
        <div className="text-center py-4">
          <p className="text-xs font-mono text-tertiary">
            Note: This data represents only nodes sending data to the Xatu project and is not
            representative of the total network.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <XatuCallToAction />

      <Card className="relative z-10 card-primary overflow-visible">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div>
              <div className="flex items-baseline space-x-2 mb-0.5">
                <h2 className="text-xl sm:text-2xl font-sans font-bold text-primary">
                  Fork Readiness
                </h2>
                <span className="text-base sm:text-lg font-mono text-accent">Electra</span>
              </div>
              <span className="text-xs sm:text-sm font-mono text-secondary">
                Last updated{' '}
                <span
                  title={new Date().toISOString()}
                  className="cursor-help border-b border-dotted border-primary/50 hover:border-primary/70 transition-colors"
                >
                  {formatDistanceToNow(new Date(), { addSuffix: true })}
                </span>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-end gap-2">
              <div className="flex flex-col">
                <label className="block text-xs font-mono text-tertiary mb-1">Filter by User</label>
                <Select
                  value={selectedUser}
                  onChange={(value: string) => setSelectedUser(value)}
                  options={users.map(user => ({
                    label: user === 'all' ? 'All Users' : user,
                    value: user,
                  }))}
                  className="min-w-[180px]"
                />
              </div>
              <div className="flex flex-col">
                <label className="block text-xs font-mono text-tertiary mb-1">Network</label>
                <NetworkSelector
                  selectedNetwork={selectedNetwork}
                  onNetworkChange={network => setSelectedNetwork(network, 'ui')}
                  className="min-w-[140px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardBody>
          <div className="space-y-4">
            {readinessData.map(network => (
              <div key={network.name} className="space-y-2">
                <Card className="card-secondary">
                  {/* Network Header */}
                  <CardHeader className="border-b border-subtle/30">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-sans font-bold text-primary mb-0.5">
                          {network.name}
                        </h3>
                        <div className="text-xs sm:text-sm font-mono">
                          <span className="text-secondary">Overall readiness: </span>
                          <span className="text-primary font-bold">
                            {network.readyPercentage.toFixed(1)}%
                          </span>
                          <span className="text-tertiary">
                            {' '}
                            ({network.readyNodes}/{network.totalNodes}{' '}
                            {network.totalNodes === 1 ? 'node' : 'nodes'})
                          </span>
                        </div>
                      </div>
                      <div className="text-sm font-mono text-secondary">
                        {network.timeUntilFork > 0 ? (
                          <div className="text-right">
                            <div className="text-accent text-base sm:text-lg font-medium mb-0.5">
                              {formatDistanceToNow(
                                new Date(Date.now() + network.timeUntilFork * 1000),
                              )}
                            </div>
                            <div className="text-tertiary text-xs sm:text-sm">
                              until fork (epoch {network.forkEpoch})
                            </div>
                          </div>
                        ) : (
                          <div className="text-success text-base sm:text-lg font-medium">
                            Fork activated
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative h-2 sm:h-3 bg-surface/30 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-accent/70 transition-all duration-500"
                        style={{ width: `${network.readyPercentage}%` }}
                      />
                    </div>
                  </CardHeader>

                  {/* Client Grid */}
                  <CardBody className="bg-surface/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {network.clients.map(client => (
                        <Card key={client.name} className="border border-subtle/10">
                          <CardBody>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <img
                                  src={`/clients/${client.name}.png`}
                                  alt={`${client.name} logo`}
                                  className="w-5 h-5 sm:w-6 sm:h-6 object-contain opacity-90"
                                  onError={e => {
                                    const target = e.currentTarget;
                                    target.style.display = 'none';
                                  }}
                                />
                                <div>
                                  <div className="font-mono font-medium text-primary text-sm sm:text-base">
                                    {CLIENT_METADATA[client.name]?.name || client.name}
                                  </div>
                                  <div className="text-xs font-mono text-tertiary mt-0.5">
                                    min v{client.minVersion} · {client.readyPercentage.toFixed(1)}%
                                    ready ({client.readyNodes}/{client.totalNodes})
                                  </div>
                                </div>
                              </div>
                              <div className="relative w-6 h-6 sm:w-8 sm:h-8">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8 transform -rotate-90">
                                  <circle
                                    className="text-accent/20"
                                    strokeWidth="4"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="10"
                                    cx="12"
                                    cy="12"
                                  />
                                  <circle
                                    className="text-accent transition-all duration-500"
                                    strokeWidth="4"
                                    strokeDasharray={62.83} // 2 * pi * r
                                    strokeDashoffset={
                                      62.83 - (62.83 * client.readyPercentage) / 100
                                    }
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="10"
                                    cx="12"
                                    cy="12"
                                  />
                                </svg>
                              </div>
                            </div>

                            {client.nodes.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {client.nodes.map((node, idx) => {
                                  const { user, node: nodeName } = formatNodeName(node.name);
                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between text-xs font-mono py-0.5 px-1.5 rounded hover:bg-surface/40"
                                    >
                                      <div className="flex items-center space-x-2 min-w-0">
                                        <span className="text-tertiary truncate">{user}</span>
                                        <span className="text-primary truncate" title={nodeName}>
                                          {nodeName}
                                        </span>
                                      </div>
                                      <span
                                        className={`flex-shrink-0 ${node.isReady ? 'text-success' : 'text-error'}`}
                                        title={node.isReady ? 'Ready for fork' : 'Needs update'}
                                      >
                                        {node.version}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Data Note */}
      <div className="text-center py-4">
        <p className="text-xs font-mono text-tertiary">
          Note: This data represents only nodes sending data to the Xatu project and is not
          representative of the total network.
        </p>
      </div>
    </div>
  );
}

export default ForkReadiness;
