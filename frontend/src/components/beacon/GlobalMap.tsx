import { useMemo } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import { motion } from 'framer-motion'
import { feature } from 'topojson-client'
import { FeatureCollection, Geometry } from 'geojson'
import * as worldAtlas from 'world-atlas/countries-110m.json'
import lookup from 'country-code-lookup'

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
}

export function GlobalMap({ nodes, currentTime, blockEvents, loading, isMissing }: GlobalMapProps): JSX.Element {
  const markers = useMemo(() => {
    return Object.entries(nodes).map(([id, node]) => {
      // Find the latest block event for this node
      const nodeEvents = blockEvents.filter(event => event.node === id)
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
      else {
        coordinates = continentCoords[node.geo.continent] || [0, 0]
      }

      return {
        id,
        coordinates,
        hasSeenBlock,
        time: latestEvent?.time || 0
      }
    })
  }, [nodes, blockEvents, currentTime])

  if (loading || isMissing) {
    return <div className="lg:col-span-9 h-96   animate-pulse backdrop-blur-md  -default" />
  }

  return (
    <div className="lg:col-span-9 h-96   overflow-hidden backdrop-blur-md  -default">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 160,
          center: [15, 35]
        }}
        style={{
          background: 'transparent',
          width: '100%',
          height: '100%'
        }}
      >
        <Geographies geography={geoData.features}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#1F2937"
                stroke="#374151"
                strokeWidth={0.5}
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>

        {markers.map(({ id, coordinates, hasSeenBlock, time }) => {
          // Find the latest events for this node
          const nodeEvents = blockEvents.filter(e => e.node === id && e.time <= currentTime)
          const latestApiEvent = nodeEvents.find(e => e.source === 'api')
          const latestP2pEvent = nodeEvents.find(e => e.source === 'p2p')

          // Check if this is the first node to see the block (for either API or P2P)
          const firstApiTime = Math.min(...blockEvents.filter(e => e.source === 'api' && e.time <= currentTime).map(e => e.time))
          const firstP2pTime = Math.min(...blockEvents.filter(e => e.source === 'p2p' && e.time <= currentTime).map(e => e.time))
          const isFirstApiNode = latestApiEvent && latestApiEvent.time === firstApiTime
          const isFirstP2pNode = latestP2pEvent && latestP2pEvent.time === firstP2pTime

          // Determine marker color based on seen status
          let markerColor = '#6B7280' // Default gray
          if (isFirstApiNode) {
            markerColor = 'rgb(59, 130, 246)' // Blue for first API node
          } else if (isFirstP2pNode) {
            markerColor = 'rgb(234, 179, 8)' // Yellow for first P2P node
          } else if (latestApiEvent) {
            markerColor = 'rgb(59, 130, 246)' // Blue for API seen
          } else if (latestP2pEvent) {
            markerColor = 'rgb(234, 179, 8)' // Yellow for P2P seen
          }
          
          return (
            <g key={id}>
              {/* Base marker */}
              <Marker coordinates={coordinates as [number, number]}>
                <circle
                  r={4}
                  fill={markerColor}
                  stroke="#374151"
                  strokeWidth={1}
                />
              </Marker>

              {/* Animated ping effect when block is seen */}
              {(latestApiEvent || latestP2pEvent) && (
                <Marker coordinates={coordinates as [number, number]}>
                  <motion.circle
                    r={4}
                    fill={markerColor}
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ scale: 3, opacity: 0 }}
                    transition={{
                      duration: 2,
                      ease: "easeOut",
                      repeat: 0
                    }}
                  />
                </Marker>
              )}
            </g>
          )
        })}
      </ComposableMap>
    </div>
  )
} 