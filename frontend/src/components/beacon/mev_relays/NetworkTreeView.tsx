import React, { useMemo } from 'react';
import { ResponsiveNetwork } from '@nivo/network';
import { Card, CardBody } from '@/components/common/Card';
import { formatEther } from '@/utils/format';
import { Node, Proposer } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';

export interface NetworkTreeViewProps {
  bids: Array<{
    relayName: string;
    value: number;
    time: number;
    blockHash?: string;
    builderPubkey?: string;
    isWinning?: boolean;
  }>;
  currentTime: number; // in ms relative to slot start
  relayColors: Record<string, string>;
  winningBid?: {
    blockHash: string;
    value: number;
    relayName: string;
    builderPubkey?: string;
  } | null;
  slot?: number;
  proposer?: Proposer;
  proposerEntity?: string; // The entity of the proposer (not in Proposer proto)
  nodes?: Record<string, Node>;
}

export const NetworkTreeView: React.FC<NetworkTreeViewProps> = ({
  bids,
  currentTime,
  relayColors,
  winningBid,
  proposer,
  proposerEntity,
  nodes = {},
}) => {
  // Group bids by builder
  const buildersMap = useMemo(() => {
    const map: Record<
      string,
      Array<{
        relayName: string;
        value: number;
        time: number;
        blockHash?: string;
        isWinning?: boolean;
      }>
    > = {};

    bids.forEach(bid => {
      const builderKey = bid.builderPubkey || 'unknown';
      if (!map[builderKey]) {
        map[builderKey] = [];
      }
      map[builderKey].push(bid);
    });

    return map;
  }, [bids]);

  // Group bids by relay
  const relaysMap = useMemo(() => {
    const map: Record<
      string,
      Array<{
        builderPubkey?: string;
        value: number;
        time: number;
        blockHash?: string;
        isWinning?: boolean;
      }>
    > = {};

    bids.forEach(bid => {
      if (!map[bid.relayName]) {
        map[bid.relayName] = [];
      }
      map[bid.relayName].push(bid);
    });

    return map;
  }, [bids]);

  // Group nodes by continent for display
  const nodesByContinent = useMemo(() => {
    const continents: Record<string, Node[]> = {};

    Object.values(nodes).forEach(node => {
      if (!node.geo) return;

      const continent = node.geo.continent || 'Unknown';
      if (!continents[continent]) {
        continents[continent] = [];
      }
      continents[continent].push(node);
    });

    return continents;
  }, [nodes]);

  // Truncate string with ellipsis in the middle
  const truncateMiddle = (str: string, startChars = 6, endChars = 4) => {
    if (!str) return 'N/A';
    if (str.length <= startChars + endChars) return str;
    return `${str.substring(0, startChars)}...${str.substring(str.length - endChars)}`;
  };

  // Calculate the opacity based on time and role
  const calculateOpacity = (role: 'proposer' | 'relay' | 'builder' | 'node', time?: number) => {
    // Default opacity for each role before activation
    const defaultOpacity = 0.2;

    // No currentTime means we're in initial state
    if (currentTime <= 0) return defaultOpacity;

    // If specific time provided (for bids), use that
    if (time !== undefined) {
      return time <= currentTime ? 1 : defaultOpacity;
    }

    // Use the same activation logic as isActive
    return isActive(role) ? 1 : defaultOpacity;
  };

  // Get active status - determines if an item should show connection lines
  const isActive = (role: 'proposer' | 'relay' | 'builder' | 'node', time?: number) => {
    // If specific time provided, use that
    if (time !== undefined) {
      return time <= currentTime;
    }

    // Default to early activation for builders
    if (role === 'builder') return currentTime >= 0;

    // For other roles, use actual data timing when available
    if (bids.length > 0) {
      // For relay, activate when the first bid is seen
      if (role === 'relay') {
        const earliestBidTime = Math.min(...bids.map(bid => bid.time));
        return currentTime >= earliestBidTime;
      }

      // For proposer, activate when winningBid is seen
      if (role === 'proposer' && winningBid) {
        // Find the winning bid time
        const winningBidTime = bids.find(
          bid => bid.blockHash === winningBid.blockHash && bid.relayName === winningBid.relayName,
        )?.time;

        return currentTime >= (winningBidTime || 4000);
      }

      // For nodes, activate shortly after the proposer (when block propagates)
      if (role === 'node' && winningBid) {
        const winningBidTime = bids.find(
          bid => bid.blockHash === winningBid.blockHash && bid.relayName === winningBid.relayName,
        )?.time;

        return currentTime >= (winningBidTime ? winningBidTime + 1000 : 5000);
      }
    }

    // Fallback to sensible defaults if we don't have actual timings
    const fallbackTimes = {
      builder: 0, // Builders are active from the start
      relay: 2000, // Relays become active at ~2s
      proposer: 4000, // Proposer activates at ~4s
      node: 5000, // Nodes activate at ~5s
    };

    return currentTime >= fallbackTimes[role];
  };

  // Get top 10 builders by number of bids
  const topBuilders = useMemo(() => {
    const builders = Object.entries(buildersMap)
      .map(([key, bids]) => ({
        key,
        bids,
        totalValue: bids.reduce((sum, bid) => sum + bid.value, 0),
      }))
      .sort((a, b) => b.bids.length - a.bids.length)
      .slice(0, 10);

    return builders;
  }, [buildersMap]);

  // Prepare data for Nivo network
  const networkData = useMemo(() => {
    const nodes = [];
    const links = [];

    // Layer 1: Builders (top 10)
    topBuilders.forEach(builder => {
      const earliestBidTime = Math.min(...builder.bids.map(bid => bid.time));
      const isBuilderActive = isActive('builder', earliestBidTime);

      nodes.push({
        id: `builder-${builder.key}`,
        label: truncateMiddle(builder.key, 8, 6),
        color: '#e67e22',
        size: 12 + builder.bids.length / 2, // Size based on bid count
        opacity: calculateOpacity('builder', earliestBidTime),
        layer: 1,
        group: 'builder',
        bidCount: builder.bids.length,
        totalValue: builder.totalValue,
        isActive: isBuilderActive,
      });
    });

    // Layer 2: Relays (all)
    Object.entries(relaysMap).forEach(([relayName, relayBids]) => {
      const earliestBidTime = Math.min(...relayBids.map(bid => bid.time));
      const isRelayActive = isActive('relay', earliestBidTime);

      nodes.push({
        id: `relay-${relayName}`,
        label: relayName,
        color: relayColors[relayName] || '#888',
        size: 10 + relayBids.length / 4, // Size based on bid count
        opacity: calculateOpacity('relay', earliestBidTime),
        layer: 2,
        group: 'relay',
        bidCount: relayBids.length,
        isActive: isRelayActive,
      });

      // Add links from builders to relays for the relay's bids
      const relayBuilders = new Set(relayBids.map(bid => bid.builderPubkey || 'unknown'));
      topBuilders.forEach(builder => {
        if (relayBuilders.has(builder.key) && isRelayActive) {
          // Find if this relay-builder combo has a winning bid
          const hasWinningBid = relayBids.some(
            bid => bid.isWinning && bid.builderPubkey === builder.key && currentTime >= bid.time,
          );

          links.push({
            source: `builder-${builder.key}`,
            target: `relay-${relayName}`,
            distance: 80,
            opacity: hasWinningBid ? 1 : 0.2,
            color: hasWinningBid ? '#4ade80' : '#6b7280',
            width: hasWinningBid ? 3 : 1,
            isWinning: hasWinningBid,
          });
        }
      });
    });

    // Layer 3: Proposer
    if (proposer) {
      const isProposerActive = isActive('proposer');
      const validatorIndex = String(proposer.proposerValidatorIndex);

      nodes.push({
        id: 'proposer',
        label: `Proposer ${validatorIndex}${proposerEntity ? ` (${proposerEntity})` : ''}`,
        color: '#3498db',
        size: 12,
        opacity: calculateOpacity('proposer'),
        layer: 3,
        group: 'proposer',
        validatorIndex: validatorIndex,
        entity: proposerEntity,
        isActive: isProposerActive,
      });

      // Add links from relays to proposer
      if (isProposerActive && winningBid) {
        links.push({
          source: `relay-${winningBid.relayName}`,
          target: 'proposer',
          distance: 80,
          opacity: 1,
          color: '#4ade80',
          width: 3,
          isWinning: true,
        });
      }
    }

    // Layer 4: Nodes (one per continent)
    Object.entries(nodesByContinent).forEach(([continent, continentNodes]) => {
      if (continentNodes.length > 0) {
        const isNodeActive = isActive('node');
        nodes.push({
          id: `continent-${continent}`,
          label: `${continent} (${continentNodes.length} node${continentNodes.length > 1 ? 's' : ''})`,
          color: '#9b59b6',
          size: 10 + Math.min(continentNodes.length, 10),
          opacity: calculateOpacity('node'),
          layer: 4,
          group: 'node',
          continent,
          nodeCount: continentNodes.length,
          isActive: isNodeActive,
        });

        // Add links from proposer to continents if proposer is active
        if (isNodeActive && proposer) {
          links.push({
            source: 'proposer',
            target: `continent-${continent}`,
            distance: 80,
            opacity: 1,
            color: '#6b7280',
            width: 2,
            isWinning: false,
          });
        }
      }
    });

    return { nodes, links };
  }, [
    relayColors,
    relaysMap,
    topBuilders,
    proposer,
    winningBid,
    nodesByContinent,
    currentTime,
    proposerEntity,
    calculateOpacity,
    isActive,
  ]);

  return (
    <Card className="mb-4">
      <CardBody>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-sans font-bold text-primary">
            Ethereum Block Production Flow
          </h3>
          {winningBid && (
            <div className="text-sm text-success font-medium">
              Winning bid: {formatEther(winningBid.value)} ETH from {winningBid.relayName}
            </div>
          )}
        </div>

        <div className="flex mb-4">
          <div className="flex items-center gap-2 mr-4">
            <div className="w-3 h-3 rounded-full bg-[#e67e22]"></div>
            <span className="text-xs text-secondary">Builders</span>
          </div>
          <div className="flex items-center gap-2 mr-4">
            <div className="w-3 h-3 rounded-full bg-[#2ecc71]"></div>
            <span className="text-xs text-secondary">Relays</span>
          </div>
          <div className="flex items-center gap-2 mr-4">
            <div className="w-3 h-3 rounded-full bg-[#3498db]"></div>
            <span className="text-xs text-secondary">Proposer</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#9b59b6]"></div>
            <span className="text-xs text-secondary">Nodes</span>
          </div>
        </div>

        <div className="relative bg-surface/30 rounded-lg border border-subtle">
          {/* Layer Labels */}
          <div className="absolute top-0 bottom-0 left-0 flex flex-col justify-between p-3 text-xs text-tertiary z-10 pointer-events-none">
            <div className="pt-2 font-semibold">Builders</div>
            <div className="font-semibold">Relays</div>
            <div className="font-semibold">Proposer</div>
            <div className="pb-2 font-semibold">Nodes</div>
          </div>

          <div style={{ height: 400, paddingLeft: 60 }}>
            <ResponsiveNetwork
              data={networkData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              repulsivity={10}
              iterations={60}
              nodeColor="color"
              nodeBorderWidth={1}
              nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.8]] }}
              linkBlendMode="multiply"
              motionConfig="gentle"
            />
          </div>
        </div>

        <div className="text-xs text-tertiary mt-2">
          <p>
            This diagram shows the flow of block production in Ethereum. Components fade in as they
            become active in the slot.
          </p>
        </div>
      </CardBody>
    </Card>
  );
};

export default NetworkTreeView;
