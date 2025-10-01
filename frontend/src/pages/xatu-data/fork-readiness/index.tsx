import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Select } from '@/components/common/Select';
import useBeacon from '@/contexts/beacon';
import { formatNodeName } from '@/utils/format.ts';
import { Card, CardHeader, CardBody } from '@/components/common/Card';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import useNetwork from '@/contexts/network';
import useConfig from '@/contexts/config';
import { getRestApiClient } from '@/api';
import { useQuery } from '@tanstack/react-query';
import { transformNodeToContributor } from '@/utils/transformers';
import { NetworkSelector } from '@/components/common/NetworkSelector';
import { ChevronDown, ChevronUp } from 'lucide-react';

const SLOTS_PER_EPOCH = 32;

const CLIENT_METADATA: Record<string, { name: string; logo?: string }> = {
  prysm: { name: 'Prysm' },
  teku: { name: 'Teku' },
  lighthouse: { name: 'Lighthouse' },
  lodestar: { name: 'Lodestar' },
  nimbus: { name: 'Nimbus' },
  grandine: { name: 'Grandine', logo: 'jpg' },
  tysm: { name: 'Tysm', logo: 'jpg' },
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
  const [showActivatedForks, setShowActivatedForks] = useState(false);

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

    const network = config.ethereum.networks[selectedNetwork];
    if (!network?.forks?.consensus) {
      return [];
    }

    const nodes = nodesData.filter(n => selectedUser === 'all' || n.username === selectedUser);
    const clock = getBeaconClock(selectedNetwork);
    const currentEpoch = clock?.getCurrentEpoch() || 0;

    // Get all forks from consensus
    const availableForks = [];
    const consensusForks = network.forks.consensus;

    // Check for each fork type
    if (consensusForks.electra) {
      availableForks.push({ name: 'Electra', data: consensusForks.electra });
    }
    if (consensusForks.fusaka) {
      availableForks.push({ name: 'Fusaka', data: consensusForks.fusaka });
    }

    // If no forks, return empty
    if (availableForks.length === 0) {
      return [];
    }

    // Process each fork
    return (
      availableForks
        .map(fork => {
          const knownClientNames = Object.keys(fork.data.min_client_versions || {});

          // Process known clients
          const knownClientReadiness = Object.entries(fork.data.min_client_versions || {})
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
            .filter(client => client.totalNodes > 0); // Only show clients with nodes

          // Find and group unknown clients
          const unknownNodes = nodes.filter(n => !knownClientNames.includes(n.consensus_client));
          const unknownClientGroups = {};

          // Group unknown nodes by consensus_client
          unknownNodes.forEach(node => {
            if (!unknownClientGroups[node.consensus_client]) {
              unknownClientGroups[node.consensus_client] = [];
            }
            unknownClientGroups[node.consensus_client].push(node);
          });

          // Create readiness entries for unknown clients
          const unknownClientReadiness = Object.entries(unknownClientGroups).map(
            ([clientName, clientNodes]) => ({
              name: clientName,
              totalNodes: clientNodes.length,
              readyNodes: 0, // Unknown clients are never ready
              readyPercentage: 0, // Always 0% ready
              minVersion: 'Not configured',
              isUnknown: true, // Flag to identify unknown clients
              nodes: clientNodes.map(n => ({
                name: n.client_name,
                version: n.consensus_version,
                isReady: false, // Always not ready
              })),
            }),
          );

          // Combine and sort all clients (unknown clients always last)
          const clientReadiness = [...knownClientReadiness, ...unknownClientReadiness].sort(
            (a, b) => {
              // Unknown clients always come after known clients
              if (a.isUnknown && !b.isUnknown) return 1;
              if (!a.isUnknown && b.isUnknown) return -1;
              // Within the same category, sort by total nodes
              return b.totalNodes - a.totalNodes;
            },
          );

          const totalNodes = clientReadiness.reduce((acc, client) => acc + client.totalNodes, 0);
          const readyNodes = clientReadiness.reduce((acc, client) => acc + client.readyNodes, 0);

          // Calculate time until fork
          const forkEpoch = fork.data.epoch || 0;
          const epochsUntilFork = Number(forkEpoch) - Number(currentEpoch);
          const timeUntilFork = epochsUntilFork * SLOTS_PER_EPOCH * 12; // 12 seconds per slot

          return {
            name: fork.name,
            networkName: selectedNetwork,
            totalNodes,
            readyNodes,
            readyPercentage: totalNodes === 0 ? 100 : (readyNodes / totalNodes) * 100,
            clients: clientReadiness,
            forkEpoch,
            timeUntilFork,
            currentEpoch,
          };
        })
        // Sort forks: unactivated first, activated last
        .sort((a, b) => {
          const aActivated = a.timeUntilFork <= 0;
          const bActivated = b.timeUntilFork <= 0;

          if (aActivated === bActivated) {
            // If both are same status, sort by epoch (earlier first for upcoming, later first for activated)
            return aActivated ? b.forkEpoch - a.forkEpoch : a.forkEpoch - b.forkEpoch;
          }

          // Unactivated forks come first
          return aActivated ? 1 : -1;
        })
    );
  }, [nodesData, config, selectedUser, selectedNetwork, getBeaconClock]);

  // Separate activated and unactivated forks
  const unactivatedForks = readinessData.filter(fork => fork.timeUntilFork > 0);
  const activatedForks = readinessData.filter(fork => fork.timeUntilFork <= 0);

  if (error) {
    return <ErrorState message="Failed to load fork readiness data" error={error} />;
  }

  if (isLoading) {
    return <LoadingState message="Loading fork readiness data..." />;
  }

  if (!nodesData || !config) {
    return <LoadingState message="Processing fork readiness data..." />;
  }

  // Check if there are any forks available
  const hasForks =
    config?.ethereum?.networks[selectedNetwork]?.forks?.consensus &&
    (config.ethereum.networks[selectedNetwork].forks.consensus.electra ||
      config.ethereum.networks[selectedNetwork].forks.consensus.fusaka);

  if (!hasForks) {
    return (
      <div className="space-y-6">
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
      <Card className="relative z-10 card-primary overflow-visible">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div>
              <div className="flex items-baseline space-x-2 mb-0.5">
                <h2 className="text-xl sm:text-2xl font-sans font-bold text-primary">
                  Fork Readiness
                </h2>
                {unactivatedForks.length === 1 && (
                  <span className="text-base sm:text-lg font-mono text-accent">
                    {unactivatedForks[0].name}
                  </span>
                )}
                {unactivatedForks.length > 1 && (
                  <span className="text-base sm:text-lg font-mono text-accent">Multiple Forks</span>
                )}
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
            {/* Unactivated (upcoming) forks */}
            {unactivatedForks.map(fork => (
              <div key={fork.name} className="space-y-2">
                <Card className="card-secondary">
                  {/* Fork Header */}
                  <CardHeader className="border-b border-subtle/30">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-sans font-bold text-primary mb-0.5">
                          {fork.name} Fork
                        </h3>
                        <div className="text-xs sm:text-sm font-mono">
                          <span className="text-secondary">Overall readiness: </span>
                          <span className="text-primary font-bold">
                            {fork.readyPercentage.toFixed(1)}%
                          </span>
                          <span className="text-tertiary">
                            {' '}
                            ({fork.readyNodes}/{fork.totalNodes}{' '}
                            {fork.totalNodes === 1 ? 'node' : 'nodes'})
                          </span>
                        </div>
                      </div>
                      <div className="text-sm font-mono text-secondary">
                        {fork.timeUntilFork > 0 ? (
                          <div className="text-right">
                            <div className="text-accent text-base sm:text-lg font-medium mb-0.5">
                              {formatDistanceToNow(
                                new Date(Date.now() + fork.timeUntilFork * 1000),
                              )}
                            </div>
                            <div className="text-tertiary text-xs sm:text-sm">
                              until fork (epoch {fork.forkEpoch})
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
                        style={{ width: `${fork.readyPercentage}%` }}
                      />
                    </div>
                  </CardHeader>

                  {/* Client Grid */}
                  <CardBody className="bg-surface/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {fork.clients.map(client => (
                        <Card key={client.name} className="border border-subtle/10">
                          <CardBody>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <img
                                  src={`/clients/${client.name}.${CLIENT_METADATA[client.name]?.logo || 'png'}`}
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
                                    {client.isUnknown ? (
                                      <>
                                        <span className="text-warning">Not configured</span> · 0%
                                        ready ({client.readyNodes}/{client.totalNodes})
                                      </>
                                    ) : (
                                      <>
                                        min v{client.minVersion} ·{' '}
                                        {client.readyPercentage.toFixed(1)}% ready (
                                        {client.readyNodes}/{client.totalNodes})
                                      </>
                                    )}
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

            {/* Activated forks section */}
            {activatedForks.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowActivatedForks(!showActivatedForks)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 bg-surface/50 hover:bg-surface/70 rounded-lg border border-subtle/50 text-left transition-all duration-200"
                >
                  <span className="text-sm font-mono text-secondary flex-1">
                    Activated Forks ({activatedForks.length})
                  </span>
                  {showActivatedForks ? (
                    <ChevronUp className="w-4 h-4 text-tertiary" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-tertiary" />
                  )}
                </button>

                {showActivatedForks && (
                  <div className="mt-4 space-y-4">
                    {activatedForks.map(fork => (
                      <div key={fork.name} className="space-y-2 opacity-75">
                        <Card className="card-secondary">
                          {/* Fork Header */}
                          <CardHeader className="border-b border-subtle/30">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                              <div>
                                <h3 className="text-xl sm:text-2xl font-sans font-bold text-primary mb-0.5">
                                  {fork.name} Fork
                                </h3>
                                <div className="text-xs sm:text-sm font-mono">
                                  <span className="text-secondary">Overall readiness: </span>
                                  <span className="text-primary font-bold">
                                    {fork.readyPercentage.toFixed(1)}%
                                  </span>
                                  <span className="text-tertiary">
                                    {' '}
                                    ({fork.readyNodes}/{fork.totalNodes}{' '}
                                    {fork.totalNodes === 1 ? 'node' : 'nodes'})
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm font-mono text-secondary">
                                <div className="text-success text-base sm:text-lg font-medium">
                                  Fork activated
                                </div>
                                <div className="text-tertiary text-xs sm:text-sm">
                                  Epoch {fork.forkEpoch}
                                </div>
                              </div>
                            </div>

                            <div className="relative h-2 sm:h-3 bg-surface/30 rounded-full overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-accent/70 transition-all duration-500"
                                style={{ width: `${fork.readyPercentage}%` }}
                              />
                            </div>
                          </CardHeader>

                          {/* Client Grid */}
                          <CardBody className="bg-surface/40">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {fork.clients.map(client => (
                                <Card key={client.name} className="border border-subtle/10">
                                  <CardBody>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <img
                                          src={`/clients/${client.name}.${CLIENT_METADATA[client.name]?.logo || 'png'}`}
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
                                            {client.isUnknown ? (
                                              <>
                                                <span className="text-warning">Not configured</span>{' '}
                                                · 0% ready ({client.readyNodes}/{client.totalNodes})
                                              </>
                                            ) : (
                                              <>
                                                min v{client.minVersion} ·{' '}
                                                {client.readyPercentage.toFixed(1)}% ready (
                                                {client.readyNodes}/{client.totalNodes})
                                              </>
                                            )}
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
                                          const { user, node: nodeName } = formatNodeName(
                                            node.name,
                                          );
                                          return (
                                            <div
                                              key={idx}
                                              className="flex items-center justify-between text-xs font-mono py-0.5 px-1.5 rounded hover:bg-surface/40"
                                            >
                                              <div className="flex items-center space-x-2 min-w-0">
                                                <span className="text-tertiary truncate">
                                                  {user}
                                                </span>
                                                <span
                                                  className="text-primary truncate"
                                                  title={nodeName}
                                                >
                                                  {nodeName}
                                                </span>
                                              </div>
                                              <span
                                                className={`flex-shrink-0 ${node.isReady ? 'text-success' : 'text-error'}`}
                                                title={
                                                  node.isReady ? 'Ready for fork' : 'Needs update'
                                                }
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
                )}
              </div>
            )}
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
