import { useMemo, useState, useEffect } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import { motion } from 'framer-motion'
import { feature } from 'topojson-client'
import { FeatureCollection, Geometry } from 'geojson'
import * as worldAtlas from 'world-atlas/countries-110m.json'
import lookup from 'country-code-lookup'
import { BlockDetailsOverlay } from './BlockDetailsOverlay'
import { formatNodeName } from '../../utils/format'

// Convert TopoJSON to GeoJSON
const geoData = feature(worldAtlas as any, (worldAtlas as any).objects.countries) as unknown as FeatureCollection<Geometry>

// Create a map of country names to coordinates
const countryCoords: Record<string, [number, number]> = {
  'United States': [-95.7129, 37.0902],
  'United Kingdom': [-3.4359, 55.3781],
  'Germany': [10.4515, 51.1657],
  'France': [2.2137, 46.2276],
  'Netherlands': [5.2913, 52.1326],
  'Finland': [25.7482, 61.9241],
  'Australia': [133.7751, -25.2744],
  'Singapore': [103.8198, 1.3521],
  'Japan': [138.2529, 36.2048],
  'Canada': [-106.3468, 56.1304],
  'Sweden': [18.6435, 60.1282],
  'Norway': [8.4689, 60.4720],
  'Switzerland': [8.2275, 46.8182],
  'Italy': [12.5674, 41.8719],
  'Spain': [-3.7492, 40.4637],
  'China': [104.1954, 35.8617],
  'India': [78.9629, 20.5937],
  'Brazil': [-51.9253, -14.2350],
  'South Africa': [22.9375, -30.5595],
  'New Zealand': [174.8860, -40.9006],
}

// Major tech hubs and cities where Ethereum nodes are commonly located
const cityCoords: Record<string, [number, number]> = {
  'London': [-0.1276, 51.5074],
  'New York': [-74.0059, 40.7128],
  'Tokyo': [139.6917, 35.6895],
  'Singapore': [103.8198, 1.3521],
  'Sydney': [151.2093, -33.8688],
  'Berlin': [13.4050, 52.5200],
  'Paris': [2.3522, 48.8566],
  'Amsterdam': [4.9041, 52.3676],
  'Helsinki': [24.9384, 60.1699],
  'Oslo': [10.7522, 59.9139],
  'Stockholm': [18.0686, 59.3293],
  'Vancouver': [-123.1207, 49.2827],
  'San Francisco': [-122.4194, 37.7749],
  'Seattle': [-122.3321, 47.6062],
  'Toronto': [-79.3832, 43.6532],
  'Montreal': [-73.5673, 45.5017],
  'Zurich': [8.5417, 47.3769],
  'Frankfurt': [8.6821, 50.1109],
  'Munich': [11.5820, 48.1351],
  'Vienna': [16.3738, 48.2082],
  'Prague': [14.4378, 50.0755],
  'Warsaw': [21.0122, 52.2297],
  'Madrid': [-3.7038, 40.4168],
  'Barcelona': [2.1734, 41.3851],
  'Milan': [9.1900, 45.4642],
  'Rome': [12.4964, 41.9028],
  'Dubai': [55.2708, 25.2048],
  'Seoul': [126.9780, 37.5665],
  'Hong Kong': [114.1694, 22.3193],
  'Shanghai': [121.4737, 31.2304],
  'Beijing': [116.4074, 39.9042],
  'Mumbai': [72.8777, 19.0760],
  'Bangalore': [77.5946, 12.9716],
  'Melbourne': [144.9631, -37.8136],
  'Brisbane': [153.0251, -27.4698],
  'Auckland': [174.7633, -36.8485],
  'Wellington': [174.7762, -41.2866],
  'Sao Paulo': [-46.6333, -23.5505],
  'Buenos Aires': [-58.3816, -34.6037],
  'Cape Town': [18.4241, -33.9249],
  'Johannesburg': [28.0473, -26.2041],
}

// Default coordinates for continents
const continentCoords: Record<string, [number, number]> = {
  NA: [-100, 40],    // North America
  SA: [-58, -20],    // South America
  EU: [15, 50],      // Europe
  AF: [20, 0],       // Africa
  AS: [100, 35],     // Asia
  OC: [135, -25],    // Oceania
}

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
    id: string;
    name: string;
    username: string;
    location: string;
    time: number;
    source: 'p2p' | 'api';
    x: number;
    y: number;
  } | null>(null)

  // Filter block events to only include block_seen events
  const filteredBlockEvents = useMemo(() => 
    blockEvents.filter(event => 
      event.type === 'block_seen' && 
      (event.source === 'api' || event.source === 'p2p')
    ), [blockEvents]
  )

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

  const handlePointerEnter = (e: React.PointerEvent<SVGCircleElement>, data: {
    id: string;
    name: string;
    username: string;
    location: string;
    time: number;
    source: 'p2p' | 'api';
  }) => {
    setHoveredNode({
      ...data,
      x: 0, // These aren't needed anymore but keeping for type compatibility
      y: 0
    });
  };

  const markers = useMemo(() => {
    return Object.entries(nodes).map(([id, node]) => {
      // Find the latest block event for this node
      const nodeEvents = filteredBlockEvents.filter(event => event.node === id)
      const latestEvent = nodeEvents.length > 0 ? nodeEvents[nodeEvents.length - 1] : null
      const hasSeenBlock = latestEvent && latestEvent.time <= currentTime

      // Try to get coordinates in order of specificity
      let coordinates: [number, number] | undefined

      // 1. Try exact coordinates if available
      if (node.geo.latitude && node.geo.longitude) {
        coordinates = [node.geo.longitude, node.geo.latitude]
      }
      // 2. Try city coordinates
      else if (node.geo.city && cityCoords[node.geo.city]) {
        coordinates = cityCoords[node.geo.city]
      }
      // 3. Try country coordinates
      else if (node.geo.country && countryCoords[node.geo.country]) {
        coordinates = countryCoords[node.geo.country]
      }
      // 4. Fall back to continent coordinates
      else if (node.geo.continent && continentCoords[node.geo.continent]) {
        coordinates = continentCoords[node.geo.continent]
      }

      // Skip nodes with unknown locations or invalid coordinates
      if (!coordinates || !Array.isArray(coordinates) || coordinates.some(c => !isFinite(c))) {
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
  }, [nodes, filteredBlockEvents, currentTime])

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
        projectionConfig={{
          scale: 180,
          center: [10, 15],
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