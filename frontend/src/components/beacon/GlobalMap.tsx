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

// Add a glowing line effect between first nodes
const GlowingLine = ({ start, end, color }: { start: [number, number], end: [number, number], color: string }) => (
  <motion.line
    x1={start[0]}
    y1={start[1]}
    x2={end[0]}
    y2={end[1]}
    stroke={color}
    strokeWidth={0.5}
    className="animate-glowing-line"
    initial={{ pathLength: 0, opacity: 0 }}
    animate={{ pathLength: 1, opacity: 1 }}
    transition={{ duration: 1.5, ease: "easeInOut" }}
  />
);

// Memoize node coordinate lookup
const useNodeCoordinates = (nodes: Record<string, Node>) => {
  return useMemo(() => {
    const coords = new Map<string, [number, number]>()
    
    Object.entries(nodes).forEach(([id, node]) => {
      let coordinates: [number, number] | undefined

      // 1. Try exact coordinates if available
      if (node.geo.latitude && node.geo.longitude) {
        coordinates = [node.geo.longitude, node.geo.latitude]
      }
      // 2. Try city/country coordinates
      else {
        coordinates = getNodeCoordinates(node.geo.city, node.geo.country)
      }
      // 3. Fall back to continent coordinates
      if (!coordinates && node.geo.continent) {
        coordinates = continentCoords[node.geo.continent]
      }

      if (coordinates && Array.isArray(coordinates) && !coordinates.some(c => !isFinite(c))) {
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
    return Object.entries(nodes).map(([id, node]) => {
      // Find the latest block event for this node
      const nodeEvents = filteredBlockEvents.filter(event => event.node === id)
      const latestEvent = nodeEvents.length > 0 ? nodeEvents[nodeEvents.length - 1] : null
      const hasSeenBlock = latestEvent && latestEvent.time <= currentTime

      // Get pre-computed coordinates
      const coordinates = nodeCoordinates.get(id)

      // Skip nodes with unknown locations
      if (!coordinates) {
        return null
      }

      return {
        id,
        coordinates,
        hasSeenBlock,
        time: latestEvent?.time || 0,
        source: latestEvent?.source
      }
    }).filter((marker): marker is NonNullable<typeof marker> => marker !== null)
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
  // Debug log initial props
  console.debug('GlobalMap received props:', {
    nodeCount: Object.keys(nodes).length,
    nodes: Object.values(nodes).map(n => ({
      name: n.name,
      city: n.geo.city,
      country: n.geo.country,
      hasCoords: Boolean(n.geo.latitude && n.geo.longitude)
    })),
    blockEventCount: blockEvents.length
  })

  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false)
  const [hoveredNode, setHoveredNode] = useState<{
    id: string;
    name: string;
    username: string;
    location: string;
    time: number;
    source: 'p2p' | 'api';
    x: number;
    y: number;
  } | null>(null)

  // Use memoized values
  const nodeCoordinates = useNodeCoordinates(nodes)
  const filteredBlockEvents = useFilteredBlockEvents(blockEvents)
  const markers = useMarkers(nodes, nodeCoordinates, filteredBlockEvents, currentTime)

  // Reset tooltip when currentTime changes or if the hovered node is no longer visible
  useEffect(() => {
    if (hoveredNode) {
      const nodeEvents = filteredBlockEvents.filter(e => e.node === hoveredNode.id)
      const latestEvent = nodeEvents.length > 0 ? nodeEvents[nodeEvents.length - 1] : null
      const hasSeenBlock = latestEvent && latestEvent.time <= currentTime

      if (!hasSeenBlock) {
        setHoveredNode(null)
      }
    }
  }, [currentTime, filteredBlockEvents, hoveredNode])

  // Memoize pointer event handler
  const handlePointerEnter = useCallback((e: React.PointerEvent<SVGCircleElement>, data: {
    id: string;
    name: string;
    username: string;
    location: string;
    time: number;
    source: 'p2p' | 'api';
  }) => {
    setHoveredNode({
      ...data,
      x: 0,
      y: 0
    });
  }, [])

  // Tooltip component
  const TooltipComponent = ({ data }: { data: NonNullable<typeof hoveredNode> }) => (
    <div 
      style={{
        position: 'absolute',
        left: '50%',
        top: '20px',
        zIndex: 1000,
        transform: 'translateX(-50%)',
        pointerEvents: 'none'
      }}
      className="backdrop-blur-md bg-surface/90 border border-subtle rounded-lg p-3 shadow-xl"
    >
      <div className="text-sm font-mono">
        <div className="font-bold text-accent">{data.name}</div>
        <div className="text-secondary">{data.username}</div>
        <div className="text-tertiary mt-1">{data.location}</div>
        <div className="text-tertiary mt-1">
          Saw block via {data.source} at {(data.time/1000).toFixed(2)}s
        </div>
      </div>
    </div>
  );

  if (loading || isMissing) {
    return (
      <div className="h-full relative">
        <div className="absolute inset-0 backdrop-blur-lg bg-surface/40 ring-1 ring-inset ring-white/5 rounded-lg animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-surface/0 via-surface/20 to-surface/0" />
        </div>
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

        {/* Draw glowing lines between first nodes */}
        {markers.map(({ id: fromId, coordinates: fromCoords, source: fromSource }) => {
          if (!fromCoords || !fromSource) return null

          // Find nodes that were first to see the block via their respective source (API/P2P)
          const nodeEvents = filteredBlockEvents.filter(e => 
            e.node === fromId && 
            e.time <= currentTime && 
            e.time > 0 && 
            e.source === fromSource
          )
          
          // Skip if no events
          if (nodeEvents.length === 0) return null

          // Get all events for this source
          const allEventsForSource = filteredBlockEvents.filter(be => 
            be.source === fromSource && 
            be.time <= currentTime && 
            be.time > 0
          )

          // Skip if no events for this source
          if (allEventsForSource.length === 0) return null

          const firstTime = Math.min(...allEventsForSource.map(e => e.time))
          const isFirstNode = nodeEvents.some(e => e.time === firstTime)

          if (!isFirstNode) return null

          // Find other first nodes to connect to
          return markers
            .filter(({ id: toId, coordinates: toCoords, source: toSource }) => {
              // Basic validation
              if (!toCoords || !toSource || toId === fromId || toSource !== fromSource) return false

              const toEvents = filteredBlockEvents.filter(e => 
                e.node === toId && 
                e.time <= currentTime && 
                e.time > 0 &&
                e.source === toSource
              )

              // Skip if no events
              if (toEvents.length === 0) return false

              return toEvents.some(e => e.time === firstTime)
            })
            .map(({ id: toId, coordinates: toCoords }) => (
              <GlowingLine
                key={`${fromId}-${toId}`}
                start={fromCoords}
                end={toCoords as [number, number]}
                color="rgba(96, 165, 250, 0.4)"
              />
            ))
        })}

        {markers.map(({ id, coordinates, hasSeenBlock, time, source }) => {
          // Skip rendering if node hasn't seen the block or has invalid data
          if (!hasSeenBlock || !coordinates || !source) {
            return null
          }

          const nodeEvents = filteredBlockEvents.filter(e => 
            e.node === id && 
            e.time <= currentTime && 
            e.time > 0 &&
            e.source === source
          )

          // Get all events for this source
          const allEventsForSource = filteredBlockEvents.filter(be => 
            be.source === source && 
            be.time <= currentTime && 
            be.time > 0
          )

          const firstTime = allEventsForSource.length > 0 ? Math.min(...allEventsForSource.map(e => e.time)) : null
          const isFirstNode = firstTime !== null && nodeEvents.some(e => e.time === firstTime)

          const nodeData = nodes[id]
          const { user, node } = formatNodeName(nodeData.name)
          const location = [
            nodeData.geo.city,
            nodeData.geo.country,
            nodeData.geo.continent
          ].filter(Boolean).join(', ')
          
          return (
            <g key={id}>
              {/* Base marker with glow */}
              <Marker coordinates={coordinates as [number, number]}>
                {isFirstNode && (
                  <circle
                    r={6}
                    fill="transparent"
                    stroke={source === 'api' ? 'rgba(96, 165, 250, 0.3)' : 'rgba(168, 85, 247, 0.3)'}
                    strokeWidth={1}
                    className="animate-pulse-slow"
                  />
                )}
                <circle
                  r={hoveredNode?.id === id ? 4.5 : 3}
                  fill={source === 'api' ? 'rgb(96, 165, 250)' : 'rgb(168, 85, 247)'}
                  stroke="rgb(var(--bg-base))"
                  strokeWidth={1}
                  className="drop-shadow-md cursor-pointer transition-all duration-150"
                  style={{
                    filter: `drop-shadow(0 0 ${isFirstNode ? '8px' : '4px'} ${source === 'api' ? 'rgb(96, 165, 250)' : 'rgb(168, 85, 247)'})`
                  }}
                  onPointerEnter={(e) => handlePointerEnter(e, {
                    id,
                    name: node,
                    username: user,
                    location,
                    time,
                    source: source || 'api'
                  })}
                  onPointerLeave={() => setHoveredNode(null)}
                />
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
      <div className="absolute bottom-1 left-1 backdrop-blur-sm bg-surface/60 rounded px-1.5 py-0.5">
        <p className="text-[9px] font-mono text-tertiary">Data from nodes contributing to Xatu • Not representative of actual Ethereum network distribution</p>
      </div>
    </div>
  )
} 