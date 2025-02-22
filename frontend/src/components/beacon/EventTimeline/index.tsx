import { useEffect, useRef, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Settings, X, Box, Radio, Layers, Network } from 'lucide-react'
import { FaPlay, FaPause } from 'react-icons/fa'
import { useModal } from '../../../contexts/ModalContext'
import { formatNodeName } from '../../../utils/format'
import clsx from 'clsx'

interface Event {
  id: string
  timestamp: number
  type: string
  node: string
  location: string
  data: any
}

interface EventFilter {
  blocksApi: boolean
  blocksP2p: boolean
  blobsApi: boolean
  blobsP2p: boolean
  attestations: boolean
  username?: string
  node?: string
}

interface EventTimelineProps {
  events: Event[]
  loading?: boolean
  isCollapsed: boolean
  onToggleCollapse: () => void
  currentTime: number
  isPlaying: boolean
  onPlayPauseClick: () => void
  slot?: number
  onPreviousSlot: () => void
  onNextSlot: () => void
  isLive: boolean
  className?: string
}

function EventItem({ event, currentTime }: { event: Event; currentTime: number }) {
  const eventTime = event.timestamp / 1000
  const isActive = currentTime >= eventTime

  const getEventIcon = () => {
    switch (event.type) {
      case 'Block Seen (API)': return <Box className="w-3 h-3 text-cyan-400" />
      case 'Block Seen (P2P)': return <Network className="w-3 h-3 text-purple-400" />
      case 'Blob Seen (API)': return <Layers className="w-3 h-3 text-blue-400" />
      case 'Blob Seen (P2P)': return <Layers className="w-3 h-3 text-fuchsia-400" />
      case 'Attestation': return <Radio className="w-3 h-3 text-success" />
      default: return null
    }
  }

  const getEventColor = () => {
    switch (event.type) {
      case 'Block Seen (API)': return 'text-cyan-400'
      case 'Block Seen (P2P)': return 'text-purple-400'
      case 'Blob Seen (API)': return 'text-blue-400'
      case 'Blob Seen (P2P)': return 'text-fuchsia-400'
      case 'Attestation': return 'text-success'
      default: return 'text-primary'
    }
  }

  const getEventText = (event: Event) => {
    switch (event.type) {
      case 'Block Seen (API)':
      case 'Block Seen (P2P)':
        return 'Block'
      case 'Blob Seen (API)':
      case 'Blob Seen (P2P)':
        return `Blob ${event.data.index}`
      case 'Attestation':
        const validatorCount = event.node.split(' ')[0]
        return `${validatorCount} validators attested`
      default:
        return event.type
    }
  }

  return (
    <div className={clsx(
      'rounded bg-surface/40 text-[10px]',
      !isActive && 'opacity-50'
    )}>
      <div className="px-2 py-1 flex items-center gap-1.5 truncate">
        {getEventIcon()}
        <span className="font-medium truncate">
          <span className={getEventColor()}>{getEventText(event)}</span>
          {event.type !== 'Attestation' && (
            <>
              <span className="text-tertiary"> in </span>
              <span className="text-primary">{event.location}</span>
            </>
          )}
        </span>
        <span className="text-tertiary ml-auto shrink-0">
          {eventTime.toFixed(1)}s
        </span>
      </div>
    </div>
  )
}

function ConfigPanel({ 
  filters, 
  setFilters,
  events,
  onClose
}: { 
  filters: EventFilter
  setFilters: (filters: EventFilter) => void
  events: Event[]
  onClose: () => void
}) {
  // Create local state to track changes
  const [localFilters, setLocalFilters] = useState(filters)

  // Extract unique usernames and nodes from events
  const uniqueUsernames = useMemo(() => {
    const usernames = new Set<string>()
    events.forEach(event => {
      // Skip attestation events
      if (event.type === 'Attestation') return
      const { user } = formatNodeName(event.node)
      if (user) usernames.add(user)
    })
    return Array.from(usernames).sort()
  }, [events])

  const availableNodes = useMemo(() => {
    const nodes = new Set<string>()
    events.forEach(event => {
      // Skip attestation events
      if (event.type === 'Attestation') return
      const { user } = formatNodeName(event.node)
      if (user === localFilters.username) {
        nodes.add(event.node)
      }
    })
    return Array.from(nodes).sort()
  }, [events, localFilters.username])

  const handleChange = (key: keyof EventFilter, value?: any) => {
    const newFilters = {
      ...localFilters,
      [key]: typeof value !== 'undefined' ? value : !localFilters[key]
    }
    // Clear node selection when username changes
    if (key === 'username') {
      newFilters.node = undefined
    }
    setLocalFilters(newFilters)
    setFilters(newFilters)
  }

  return (
    <div className="p-4 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Event Filters</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-hover rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Username Filter */}
        <div className="space-y-2">
          <label className="text-xs text-tertiary">Filter by Username</label>
          <select
            value={localFilters.username || ''}
            onChange={(e) => handleChange('username', e.target.value || undefined)}
            className="w-full bg-surface border-subtle rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-accent"
          >
            <option value="">All Users</option>
            {uniqueUsernames.map(username => (
              <option key={username} value={username}>{username}</option>
            ))}
          </select>
        </div>

        {/* Node Filter - Only show if username is selected */}
        {localFilters.username && (
          <div className="space-y-2">
            <label className="text-xs text-tertiary">Filter by Node</label>
            <select
              value={localFilters.node || ''}
              onChange={(e) => handleChange('node', e.target.value || undefined)}
              className="w-full bg-surface border-subtle rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-accent"
            >
              <option value="">All Nodes</option>
              {availableNodes.map(node => {
                const { node: displayName } = formatNodeName(node)
                return (
                  <option key={node} value={node}>{displayName}</option>
                )
              })}
            </select>
          </div>
        )}

        <div className="border-t border-subtle my-4" />

        {/* Event Type Filters */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-2 hover:bg-surface/50 rounded-lg cursor-pointer transition-colors group">
            <input
              type="checkbox"
              checked={localFilters.blocksApi}
              onChange={() => handleChange('blocksApi')}
              className="mt-1 bg-surface border-subtle rounded cursor-pointer focus:ring-cyan-400 checked:bg-cyan-400 hover:border-cyan-400"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <Box className="w-4 h-4 text-cyan-400" />
                <span className="text-primary font-medium group-hover:text-cyan-400 transition-colors">Blocks (API)</span>
              </div>
              <div className="text-tertiary text-xs mt-0.5">Blocks seen by beacon nodes</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-2 hover:bg-surface/50 rounded-lg cursor-pointer transition-colors group">
            <input
              type="checkbox"
              checked={localFilters.blocksP2p}
              onChange={() => handleChange('blocksP2p')}
              className="mt-1 bg-surface border-subtle rounded cursor-pointer focus:ring-purple-400 checked:bg-purple-400 hover:border-purple-400"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <Network className="w-4 h-4 text-purple-400" />
                <span className="text-primary font-medium group-hover:text-purple-400 transition-colors">Blocks (P2P)</span>
              </div>
              <div className="text-tertiary text-xs mt-0.5">Blocks seen on the p2p network by sentry nodes</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-2 hover:bg-surface/50 rounded-lg cursor-pointer transition-colors group">
            <input
              type="checkbox"
              checked={localFilters.blobsApi}
              onChange={() => handleChange('blobsApi')}
              className="mt-1 bg-surface border-subtle rounded cursor-pointer focus:ring-blue-400 checked:bg-blue-400 hover:border-blue-400"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <Layers className="w-4 h-4 text-blue-400" />
                <span className="text-primary font-medium group-hover:text-blue-400 transition-colors">Blobs (API)</span>
              </div>
              <div className="text-tertiary text-xs mt-0.5">Blobs seen by beacon nodes</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-2 hover:bg-surface/50 rounded-lg cursor-pointer transition-colors group">
            <input
              type="checkbox"
              checked={localFilters.blobsP2p}
              onChange={() => handleChange('blobsP2p')}
              className="mt-1 bg-surface border-subtle rounded cursor-pointer focus:ring-fuchsia-400 checked:bg-fuchsia-400 hover:border-fuchsia-400"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <Layers className="w-4 h-4 text-fuchsia-400" />
                <span className="text-primary font-medium group-hover:text-fuchsia-400 transition-colors">Blobs (P2P)</span>
              </div>
              <div className="text-tertiary text-xs mt-0.5">Blobs seen on the p2p network</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-2 hover:bg-surface/50 rounded-lg cursor-pointer transition-colors group">
            <input
              type="checkbox"
              checked={localFilters.attestations}
              onChange={() => handleChange('attestations')}
              className="mt-1 bg-surface border-subtle rounded cursor-pointer focus:ring-success checked:bg-success hover:border-success"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <Radio className="w-4 h-4 text-success" />
                <span className="text-primary font-medium group-hover:text-success transition-colors">Attestations</span>
              </div>
              <div className="text-tertiary text-xs mt-0.5">Validator attestations</div>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}

export function EventTimeline({
  events,
  loading,
  isCollapsed,
  onToggleCollapse,
  currentTime,
  isPlaying,
  onPlayPauseClick,
  slot,
  onPreviousSlot,
  onNextSlot,
  isLive,
  className
}: EventTimelineProps): JSX.Element {
  const { showModal, hideModal } = useModal()
  const [filters, setFilters] = useState<EventFilter>(() => {
    const saved = localStorage.getItem('eventTimelineFilters')
    return saved ? JSON.parse(saved) : {
      blocksApi: true,
      blocksP2p: true,
      blobsApi: true,
      blobsP2p: true,
      attestations: true,
      node: undefined,
      username: undefined
    }
  })
  const timelineRef = useRef<HTMLDivElement>(null)
  const lastEventRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<number>()

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('eventTimelineFilters', JSON.stringify(filters))
  }, [filters])

  const sortedEvents = useMemo(() => {
    return events
      .filter(event => {
        // Filter by username if selected
        if (filters.username) {
          const { user } = formatNodeName(event.node)
          if (user !== filters.username) return false
        }

        // Filter by node if selected
        if (filters.node && event.node !== filters.node) {
          return false
        }

        // Filter by event type
        switch (event.type) {
          case 'Block Seen (API)': return filters.blocksApi
          case 'Block Seen (P2P)': return filters.blocksP2p
          case 'Blob Seen (API)': return filters.blobsApi
          case 'Blob Seen (P2P)': return filters.blobsP2p
          case 'Attestation': return filters.attestations
          default: return true
        }
      })
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [events, filters])

  // Auto scroll effect
  useEffect(() => {
    if (!timelineRef.current || loading || isCollapsed) return

    // Clear any pending scroll timeout
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current)
    }
    
    // Find the last active event element
    const activeEvents = sortedEvents.filter(event => currentTime >= event.timestamp / 1000)
    
    // Debounce scroll updates
    scrollTimeoutRef.current = window.setTimeout(() => {
      if (!timelineRef.current) return

      if (activeEvents.length > 0) {
        const lastActiveEventId = activeEvents[activeEvents.length - 1].id
        const lastActiveElement = timelineRef.current.querySelector(`[data-event-id="${lastActiveEventId}"]`)
        
        if (lastActiveElement) {
          // Get the container's height
          const containerHeight = timelineRef.current.clientHeight
          // Calculate offset to show some upcoming events (about 1/3 of the container height)
          const offset = containerHeight / 3
          
          // Get the element's position relative to the container
          const elementTop = lastActiveElement.getBoundingClientRect().top - timelineRef.current.getBoundingClientRect().top
          
          // Calculate the target scroll position
          const targetScroll = timelineRef.current.scrollTop + elementTop - offset
          
          // Smooth scroll to position
          timelineRef.current.scrollTo({
            top: targetScroll,
            behavior: isPlaying ? 'auto' : 'smooth'
          })
        }
      } else {
        // Snap back to top when no active events (slot finished)
        timelineRef.current.scrollTo({ top: 0, behavior: 'instant' })
      }
    }, isPlaying ? 50 : 0) // Small delay during playback, immediate during manual scrubbing

    // Cleanup timeout on unmount
    return () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [events, loading, isCollapsed, currentTime, sortedEvents, isPlaying])

  const handleFilterChange = (newFilters: EventFilter) => {
    setFilters(newFilters)
  }

  const handleOpenConfig = () => {
    showModal(
      <div className="flex flex-col h-[80vh] overflow-y-auto">
        <ConfigPanel
          filters={filters}
          setFilters={setFilters}
          events={events}
          onClose={hideModal}
        />
      </div>
    )
  }

  // Count distinct nodes from filtered events (excluding attestations)
  const nodeCount = useMemo(() => {
    const nodes = new Set<string>()
    sortedEvents.forEach(event => {
      if (event.type !== 'Attestation') {
        nodes.add(event.node)
      }
    })
    return nodes.size
  }, [sortedEvents])

  return (
    <div className={clsx(
      'h-full flex-shrink-0',
      'backdrop-blur-lg bg-surface/40 ring-1 ring-inset ring-white/5',
      'flex flex-col max-h-[calc(100vh-128px)]',
      'w-full md:w-[400px]'
    )}>
      {/* Header */}
      <div className="flex-none flex flex-col gap-2 p-4 pr-8 border-b border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium">Timeline</h2>
            <button
              onClick={handleOpenConfig}
              className="p-1 hover:bg-hover rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-mono text-2xl font-bold text-primary">
              {currentTime.toFixed(1)}
            </span>
            <span className="font-mono text-xs text-tertiary -mt-1">seconds</span>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={onPreviousSlot}
              className="w-8 h-8 rounded flex items-center justify-center bg-surface hover:bg-hover transition-all border border-text-muted touch-manipulation"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onPlayPauseClick}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-surface hover:bg-hover transition-all border border-text-muted touch-manipulation"
            >
              {isPlaying ? <FaPause className="w-3 h-3" /> : <FaPlay className="w-3 h-3 ml-0.5" />}
            </button>
            <button
              onClick={onNextSlot}
              disabled={isLive}
              className={clsx(
                'w-8 h-8 rounded flex items-center justify-center transition-all border touch-manipulation',
                isLive 
                  ? 'opacity-50 cursor-not-allowed bg-surface/50 border-text-muted/50' 
                  : 'bg-surface hover:bg-hover border-text-muted'
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Info */}
          <div className="text-[10px] font-mono text-tertiary">
            {filters.node ? (
              <span>Events from {formatNodeName(filters.node).user}'s {formatNodeName(filters.node).node}</span>
            ) : filters.username ? (
              <span>Events from {filters.username}'s nodes ({nodeCount})</span>
            ) : (
              <span>Events from all nodes ({nodeCount})</span>
            )}
          </div>
        </div>

        {/* Horizontal Timeline */}
        <div className="relative h-8">
          {/* Section backgrounds */}
          <div className="absolute inset-0 flex rounded-sm overflow-hidden">
            <div className="w-1/3 bg-accent/5" />
            <div className="w-1/3 bg-success/5" />
            <div className="w-1/3 bg-yellow-400/5" />
          </div>

          {/* Section labels */}
          <div className="absolute inset-0">
            <div className="flex h-full">
              <div className="w-1/3 flex items-center justify-center -mx-px">
                <span className="text-xs font-mono text-accent/80">Block</span>
              </div>
              <div className="w-1/3 flex items-center justify-center -mx-px">
                <span className="text-xs font-mono text-success/80">Attestation</span>
              </div>
              <div className="w-1/3 flex items-center justify-center -mx-px">
                <span className="text-xs font-mono text-yellow-400/80">Aggregation</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <div 
              className="absolute inset-y-0 bg-active transition-all duration-100"
              style={{ 
                left: `${(currentTime / 12) * 100}%`,
                width: '3px'
              }}
            />
          </div>

          {/* Time markers */}
          <div className="absolute inset-x-0 bottom-0 flex justify-between px-1">
            {[0, 4, 8, 12].map(time => (
              <div key={time} className="font-mono text-[10px] text-tertiary/50">
                {time}s
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event List */}
      <div ref={timelineRef} className="flex-1 min-h-0 md:max-h-none max-h-[30vh] overflow-y-auto scrollbar-hide w-full">
        <div className="p-4 space-y-0.5">
          {loading ? (
            <div className="space-y-1">
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i}
                  className="rounded bg-surface/40 animate-pulse"
                >
                  <div className="h-2 bg-surface/50 rounded w-full" />
                </div>
              ))}
            </div>
          ) : sortedEvents.length === 0 ? (
            <div className="text-[10px] text-tertiary">No events</div>
          ) : (
            sortedEvents.map((event, index) => (
              <div 
                key={event.id} 
                data-event-id={event.id}
                ref={index === sortedEvents.length - 1 ? lastEventRef : null}
              >
                <EventItem event={event} currentTime={currentTime} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
} 