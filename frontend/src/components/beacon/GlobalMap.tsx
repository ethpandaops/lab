import { useMemo, useState, useEffect, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import { motion } from 'framer-motion'
import { feature } from 'topojson-client'
import { FeatureCollection, Geometry } from 'geojson'
import * as worldAtlas from 'world-atlas/countries-110m.json'
import { BlockDetailsOverlay } from './BlockDetailsOverlay'
import { formatNodeName } from '../../utils/format'
import { continentCoords, getNodeCoordinates } from '../../utils/coordinates'
import { geoEquirectangular } from 'd3-geo'
import { Card } from '../common/Card'

// Convert TopoJSON to GeoJSON
const geoData = feature(worldAtlas as any, (worldAtlas as any).objects.countries) as unknown as FeatureCollection<Geometry>

interface Node {
  name: string
  username: string
  geo: {
    city: string
    country: string
    continent: string
    latitude?: number
    longitude?: number
  }
}

interface BlockEvent {
  type: 'block_seen'
  time: number
  node: string
  source: 'p2p' | 'api'
}

interface GlobalMapProps {
  nodes: Record<string, Node>
  currentTime: number
  blockEvents: BlockEvent[]
  loading?: boolean
  isMissing?: boolean
  slot?: number
  proposer?: string
  proposerIndex?: number
  txCount?: number
  blockSize?: number
  baseFee?: number
  gasUsed?: number
  gasLimit?: number
  executionBlockNumber?: number
  hideDetails?: boolean
}

// Memoize node coordinate lookup
const useNodeCoordinates = (nodes: Record<string, Node>) => {
  return useMemo(() => {
    const coords = new Map<string, [number, number]>()
    
    Object.entries(nodes).forEach(([id, node]) => {
      const coordinates = getNodeCoordinates(
        node.geo.city,
        node.geo.country,
        node.geo.continent,
        node.geo.latitude,
        node.geo.longitude
      )

      if (coordinates && !coordinates.some(c => !isFinite(c))) {
        coords.set(id, coordinates)
      }
    })

    return coords
  }, [nodes]) // Only recompute when nodes change
}

// Memoize filtered block events
const useFilteredBlockEvents = (blockEvents: BlockEvent[]) => {
  return useMemo(() => 
    blockEvents.filter(event => 
      event.type === 'block_seen' && 
      (event.source === 'api' || event.source === 'p2p')
    ), [blockEvents]
  )
}

// Memoize markers
const useMarkers = (nodes: Record<string, Node>, nodeCoordinates: Map<string, [number, number]>, filteredBlockEvents: BlockEvent[], currentTime: number) => {
  return useMemo(() => {
    // First, create individual markers
    const individualMarkers = Object.entries(nodes).map(([id, node]) => {
      // Find the latest block event for this node
      const nodeEvents = filteredBlockEvents.filter(event => event.node === id)
      const latestEvent = nodeEvents.length > 0 ? nodeEvents[nodeEvents.length - 1] : null
      const hasSeenBlock = latestEvent && latestEvent.time <= currentTime

      // Get pre-computed coordinates
      const coordinates = nodeCoordinates.get(id)

      // Skip nodes with unknown locations or invalid coordinates
      if (!coordinates || coordinates.some(c => !isFinite(c))) {
        return null
      }

      return {
        id,
        coordinates,
        hasSeenBlock: hasSeenBlock || false, // Ensure hasSeenBlock is always boolean
        time: latestEvent?.time || 0,
        source: latestEvent?.source
      }
    }).filter((marker): marker is NonNullable<typeof marker> => marker !== null)

    // Group markers by coordinates
    const groupedMarkers = new Map<string, Array<{
      id: string;
      coordinates: [number, number];
      hasSeenBlock: boolean;
      time: number;
      source: 'p2p' | 'api' | undefined;
    }>>()

    individualMarkers.forEach(marker => {
      const coordKey = marker.coordinates.join(',')
      if (!groupedMarkers.has(coordKey)) {
        groupedMarkers.set(coordKey, [])
      }
      groupedMarkers.get(coordKey)?.push(marker)
    })

    // Convert grouped markers to final format
    return Array.from(groupedMarkers.entries()).map(([coordKey, markers]) => {
      const coordinates = markers[0].coordinates
      const hasMultipleNodes = markers.length > 1
      
      // Filter to only nodes that have seen the block
      const visibleMarkers = markers.filter(m => m.hasSeenBlock)
      
      return {
        coordinates,
        hasMultipleNodes,
        nodeCount: markers.length,
        visibleNodeCount: visibleMarkers.length,
        hasVisibleNodes: visibleMarkers.length > 0,
        // For first node detection
        nodeIds: markers.map(m => m.id),
        // For tooltip
        nodes: markers.map(m => ({
          id: m.id,
          hasSeenBlock: m.hasSeenBlock,
          time: m.time,
          source: m.source
        }))
      }
    })
  }, [nodes, nodeCoordinates, filteredBlockEvents, currentTime])
}

export function GlobalMap({ 
  nodes, 
  currentTime, 
  blockEvents, 
  loading, 
  isMissing,
  slot = 0,
  proposer = 'Unknown',
  proposerIndex,
  txCount = 0,
  blockSize,
  baseFee,
  gasUsed,
  gasLimit,
  executionBlockNumber,
  hideDetails = false
}: GlobalMapProps): JSX.Element {
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false)
  const [hoveredNode, setHoveredNode] = useState<{
    nodeIds: string[];
    nodeDetails: Array<{
      id: string;
      name: string;
      username: string;
      location: string;
      time: number;
      source: 'p2p' | 'api' | undefined;
      hasSeenBlock: boolean;
    }>;
    x: number;
    y: number;
  } | null>(null)

  // Use memoized values
  const nodeCoordinates = useNodeCoordinates(nodes)
  const filteredBlockEvents = useFilteredBlockEvents(blockEvents)
  const markers = useMarkers(nodes, nodeCoordinates, filteredBlockEvents, currentTime)

  // Reset tooltip when currentTime changes
  useEffect(() => {
    if (hoveredNode) {
      // Check if any of the hovered nodes are still visible
      const anyVisible = hoveredNode.nodeDetails.some(node => {
        const nodeEvents = filteredBlockEvents.filter(e => e.node === node.id)
        const latestEvent = nodeEvents.length > 0 ? nodeEvents[nodeEvents.length - 1] : null
        return latestEvent && latestEvent.time <= currentTime
      })

      if (!anyVisible) {
        setHoveredNode(null)
      }
    }
  }, [currentTime, filteredBlockEvents, hoveredNode])

  // Memoize pointer event handler
  const handlePointerEnter = useCallback((e: React.PointerEvent<SVGCircleElement | SVGGElement>, nodeIds: string[]) => {
    const nodeDetails = nodeIds.map(id => {
      const nodeData = nodes[id]
      const { user, node } = formatNodeName(nodeData.name)
      const location = [
        nodeData.geo.city,
        nodeData.geo.country,
        nodeData.geo.continent
      ].filter(Boolean).join(', ')

      // Find the latest block event for this node
      const nodeEvents = filteredBlockEvents.filter(event => event.node === id)
      const latestEvent = nodeEvents.length > 0 ? nodeEvents[nodeEvents.length - 1] : null
      const hasSeenBlock = latestEvent && latestEvent.time <= currentTime

      return {
        id,
        name: node,
        username: user,
        location,
        time: latestEvent?.time || 0,
        source: latestEvent?.source,
        hasSeenBlock: hasSeenBlock || false // Ensure hasSeenBlock is always boolean
      }
    })

    setHoveredNode({
      nodeIds,
      nodeDetails,
      x: 0,
      y: 0
    })
  }, [nodes, filteredBlockEvents, currentTime])

  // Tooltip component
  const TooltipComponent = ({ data }: { data: NonNullable<typeof hoveredNode> }) => {
    // Filter to only nodes that have seen the block
    const visibleNodes = data.nodeDetails.filter(node => node.hasSeenBlock)
    
    // Get location from first node (all nodes at same location have same location string)
    const location = visibleNodes.length > 0 ? visibleNodes[0].location : ''
    
    return (
      <div 
        style={{
          position: 'absolute',
          left: '50%',
          top: '20px',
          zIndex: 1000,
          transform: 'translateX(-50%)',
          pointerEvents: 'none'
        }}
        className="card card-secondary"
      >
        <div className="p-2 text-xs font-mono">
          {visibleNodes.length === 0 ? (
            <div className="text-tertiary">No nodes have seen the block yet</div>
          ) : (
            <>
              {/* Location header */}
              <div className="font-bold text-accent border-b border-subtle pb-1 mb-1">
                {location} 
                <span className="text-primary ml-1">({visibleNodes.length} {visibleNodes.length === 1 ? 'node' : 'nodes'})</span>
              </div>
              
              {/* Nodes list */}
              <div className="max-h-40 overflow-y-auto pr-1">
                <table className="w-full text-left">
                  <tbody>
                    {visibleNodes.map((node) => (
                      <tr key={node.id} className="border-b border-subtle/30 last:border-0">
                        <td className="py-1 pr-1">
                          <div className="font-medium text-primary">{node.username}</div>
                          <div className="text-tertiary text-[10px]">{node.name}</div>
                        </td>
                        <td className="py-1 pr-1 text-tertiary whitespace-nowrap text-right align-top">
                          {node.source} <span className="text-secondary">{(node.time/1000).toFixed(1)}s</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    )
  };

  if (loading || isMissing) {
    return (
      <div className="h-full relative">
        <ComposableMap
          className="h-full w-full"
          projection="geoEquirectangular"
          projectionConfig={{
            scale: 150,
            center: [0, 30],
          }}
          style={{
            width: "100%",
            height: "100%"
          }}
        >
          <defs>
            <radialGradient id="map-gradient" cx="50%" cy="50%" r="80%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="rgba(96, 165, 250, 0.05)" />
              <stop offset="50%" stopColor="rgba(168, 85, 247, 0.03)" />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
            </radialGradient>
          </defs>

          {/* Gradient background */}
          <rect x="-1000" y="-1000" width="2000" height="2000" fill="url(#map-gradient)" />

          <Geographies geography={geoData.features}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="rgba(255, 255, 255, 0.03)"
                  stroke="rgba(96, 165, 250, 0.3)"
                  strokeWidth={0.3}
                  style={{
                    default: { outline: 'none' },
                    hover: { outline: 'none' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>
        </ComposableMap>
        
        {/* Loading overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 backdrop-blur-sm bg-surface/10 ring-1 ring-inset ring-white/5 rounded-lg animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-r from-surface/0 via-surface/10 to-surface/0" />
          </div>
        </div>
        
        {/* Disclaimer */}
        <Card className="absolute bottom-1 left-1 px-1.5 py-0.5">
          <p className="text-[9px] font-mono text-tertiary">Data from nodes contributing to Xatu • Not representative of actual Ethereum network distribution</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full relative">
      <ComposableMap
        className="h-full w-full"
        projection="geoEquirectangular"
        projectionConfig={{
          scale: 150,
          center: [0, 30],
        }}
        style={{
          width: "100%",
          height: "100%"
        }}
      >
        <defs>
          <radialGradient id="map-gradient" cx="50%" cy="50%" r="80%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="rgba(96, 165, 250, 0.05)" />
            <stop offset="50%" stopColor="rgba(168, 85, 247, 0.03)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>
        </defs>

        {/* Gradient background */}
        <rect x="-1000" y="-1000" width="2000" height="2000" fill="url(#map-gradient)" />

        <Geographies geography={geoData.features}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="rgba(255, 255, 255, 0.03)"
                stroke="rgba(96, 165, 250, 0.3)"
                strokeWidth={0.3}
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>

        {markers.map(({ coordinates, hasMultipleNodes, nodeCount, visibleNodeCount, hasVisibleNodes, nodeIds, nodes: nodeData }) => {
          // Skip rendering if no nodes have seen the block
          if (!hasVisibleNodes) {
            return null
          }

          // Determine if any node at this location was first to see the block
          const isFirstLocation = nodeIds.some(nodeId => {
            const nodeEvents = filteredBlockEvents.filter(e => 
              e.node === nodeId && 
              e.time <= currentTime && 
              e.time > 0
            )
            
            if (nodeEvents.length === 0) return false
            
            // Get source of first event for this node
            const firstNodeEvent = nodeEvents.reduce((min, e) => e.time < min.time ? e : min, nodeEvents[0])
            const source = firstNodeEvent.source
            
            // Get all events for this source
            const allEventsForSource = filteredBlockEvents.filter(be => 
              be.source === source && 
              be.time <= currentTime && 
              be.time > 0
            )
            
            if (allEventsForSource.length === 0) return false

            const firstTime = Math.min(...allEventsForSource.map(e => e.time))
            return firstNodeEvent.time === firstTime
          })

          // Determine the dominant source (api or p2p) for visible nodes
          const apiCount = nodeData.filter(n => n.hasSeenBlock && n.source === 'api').length
          const p2pCount = nodeData.filter(n => n.hasSeenBlock && n.source === 'p2p').length
          const dominantSource = apiCount >= p2pCount ? 'api' : 'p2p'
          const color = dominantSource === 'api' ? 'rgb(96, 165, 250)' : 'rgb(168, 85, 247)'
          const glowColor = dominantSource === 'api' ? 'rgba(96, 165, 250, 0.3)' : 'rgba(168, 85, 247, 0.3)'
          
          const isHovered = hoveredNode?.nodeIds.some(id => nodeIds.includes(id)) || false
          
          // Calculate size and opacity based on node count
          // Scale size from 3 to 6 based on node count (capped at 10 nodes)
          const baseSize = 3
          const maxSizeIncrease = 3
          const sizeScale = Math.min(nodeCount, 10) / 10
          const size = baseSize + (maxSizeIncrease * sizeScale)
          
          // Scale opacity from 0.7 to 1 based on node count
          const minOpacity = 0.7
          const maxOpacity = 1
          const opacity = minOpacity + ((maxOpacity - minOpacity) * sizeScale)
          
          // Increase glow intensity based on node count
          const glowIntensity = isFirstLocation ? 8 + (nodeCount * 0.5) : 4 + (nodeCount * 0.3)
          
          return (
            <g key={coordinates.join(',')}>
              <Marker coordinates={coordinates}>
                {/* Outer glow for first nodes */}
                {isFirstLocation && (
                  <circle
                    r={size + 3}
                    fill="transparent"
                    stroke={glowColor}
                    strokeWidth={1}
                    className="animate-pulse-slow"
                  />
                )}
                
                {/* Main marker */}
                <circle
                  r={isHovered ? size + 1.5 : size}
                  fill={color}
                  fillOpacity={opacity}
                  stroke="rgb(var(--bg-base))"
                  strokeWidth={1}
                  className="drop-shadow-md cursor-pointer transition-all duration-150"
                  style={{
                    filter: `drop-shadow(0 0 ${glowIntensity}px ${color})`
                  }}
                  onPointerEnter={(e) => handlePointerEnter(e, nodeIds)}
                  onPointerLeave={() => setHoveredNode(null)}
                />
                
                {/* Subtle ring to indicate multiple nodes */}
                {hasMultipleNodes && (
                  <circle
                    r={size + 1}
                    fill="transparent"
                    stroke={color}
                    strokeWidth={0.5}
                    strokeOpacity={0.4}
                    className="pointer-events-none"
                  />
                )}
              </Marker>
            </g>
          )
        })}
      </ComposableMap>
      {hoveredNode && <TooltipComponent data={hoveredNode} />}
      {!hideDetails && (
        <BlockDetailsOverlay
          isCollapsed={isDetailsCollapsed}
          onToggleCollapse={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
          slot={slot}
          proposer={proposer}
          proposerIndex={proposerIndex}
          txCount={txCount}
          blockSize={blockSize}
          baseFee={baseFee}
          gasUsed={gasUsed}
          gasLimit={gasLimit}
          executionBlockNumber={executionBlockNumber}
        />
      )}
      
      {/* Disclaimer */}
      <Card className="absolute bottom-1 left-1 px-1.5 py-0.5">
        <p className="text-[9px] font-mono text-tertiary">Data from nodes contributing to Xatu • Not representative of actual Ethereum network distribution</p>
      </Card>
    </div>
  )
} 