import { FC, useState } from 'react'
import { formatEther, formatBytes } from '../../../utils/format'
import { LocallyBuiltBlock, LocallyBuiltSlotBlocks } from '../../../api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb'
import { Package, Clock, FileDown, DollarSign, FileText, Zap, Globe, Search, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'
import { Timestamp } from '@bufbuild/protobuf'

// Simple timestamp formatter as a replacement for ServerTimestamp
const FormattedTimestamp: FC<{ timestamp?: Timestamp }> = ({ timestamp }) => {
  if (!timestamp) return <span className="text-tertiary">-</span>
  
  const date = timestamp.toDate()
  const relativeTime = getRelativeTimeStr(date)
  
  return <span title={date.toLocaleString()}>{relativeTime}</span>
}

// Helper function to get relative time
const getRelativeTimeStr = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)

  if (diffSec < 5) {
    return 'just now'
  } else if (diffSec < 60) {
    return `${diffSec}s ago`
  } else if (diffMin < 60) {
    return `${diffMin}m ago`
  } else if (diffHour < 24) {
    return `${diffHour}h ago`
  } else if (diffDay < 30) {
    return `${diffDay}d ago`
  } else {
    return date.toLocaleDateString()
  }
}

interface LocallyBuiltBlocksTableProps {
  data: LocallyBuiltSlotBlocks[]
  isLoading: boolean
  isError: boolean
  onSelectBlock?: (block: LocallyBuiltBlock) => void
}

export const LocallyBuiltBlocksTable: FC<LocallyBuiltBlocksTableProps> = ({ 
  data, 
  isLoading, 
  isError,
  onSelectBlock
}) => {
  const [sortField, setSortField] = useState<string>('slot')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [searchTerm, setSearchTerm] = useState<string>('')

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Flatten the data structure for sorting
  const flattenedData = data.flatMap(slotBlocks => 
    slotBlocks.blocks.map(block => ({
      slotNumber: slotBlocks.slot.toString(),
      block
    }))
  )

  // Filter data based on search term
  const filteredData = flattenedData.filter(item => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      item.slotNumber.includes(searchTerm) ||
      (item.block.metadata?.metaClientName?.toLowerCase() || '').includes(searchLower) ||
      (item.block.metadata?.metaClientGeoCountry?.toLowerCase() || '').includes(searchLower) ||
      (item.block.blockVersion?.toLowerCase() || '').includes(searchLower)
    )
  })

  // Sort the data
  const sortedData = [...filteredData].sort((a, b) => {
    let aExecValue, bExecValue, aConsValue, bConsValue;
    
    switch (sortField) {
      case 'slot':
        return sortDirection === 'asc' 
          ? parseInt(a.slotNumber) - parseInt(b.slotNumber) 
          : parseInt(b.slotNumber) - parseInt(a.slotNumber)
      case 'blockSize':
        return sortDirection === 'asc'
          ? a.block.blockTotalBytes - b.block.blockTotalBytes
          : b.block.blockTotalBytes - a.block.blockTotalBytes
      case 'execValue':
        aExecValue = Number(a.block.executionPayloadValue?.toString() || '0')
        bExecValue = Number(b.block.executionPayloadValue?.toString() || '0')
        return sortDirection === 'asc'
          ? aExecValue - bExecValue
          : bExecValue - aExecValue
      case 'consensusValue':
        aConsValue = Number(a.block.consensusPayloadValue?.toString() || '0')
        bConsValue = Number(b.block.consensusPayloadValue?.toString() || '0')
        return sortDirection === 'asc'
          ? aConsValue - bConsValue
          : bConsValue - aConsValue
      case 'txCount':
        return sortDirection === 'asc'
          ? a.block.executionPayloadTransactionsCount - b.block.executionPayloadTransactionsCount
          : b.block.executionPayloadTransactionsCount - a.block.executionPayloadTransactionsCount
      case 'client':
        return sortDirection === 'asc'
          ? (a.block.metadata?.metaClientName || '').localeCompare(b.block.metadata?.metaClientName || '')
          : (b.block.metadata?.metaClientName || '').localeCompare(a.block.metadata?.metaClientName || '')
      case 'country':
        return sortDirection === 'asc'
          ? (a.block.metadata?.metaClientGeoCountry || '').localeCompare(b.block.metadata?.metaClientGeoCountry || '')
          : (b.block.metadata?.metaClientGeoCountry || '').localeCompare(a.block.metadata?.metaClientGeoCountry || '')
      default:
        return 0
    }
  })

  if (isLoading) {
    return (
      <div>
        <div className="mb-4 flex">
          <div className="animate-pulse h-9 bg-active/40 rounded w-full"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-10 bg-active/30 rounded-t w-full"></div>
          <div className="space-y-1 mt-1">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-active/20 rounded flex">
                <div className="w-1/8 h-full bg-active/5 rounded-l"></div>
                <div className="flex-1"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg bg-surface/20 border border-error/20 p-6">
        <div className="text-center">
          <p className="text-error font-mono">Error loading data. Please try again.</p>
        </div>
      </div>
    )
  }

  if (data.length === 0 || flattenedData.length === 0) {
    return (
      <div className="rounded-lg bg-surface/20 border border-subtle p-6">
        <div className="text-center">
          <p className="text-tertiary font-mono">No locally built blocks found.</p>
        </div>
      </div>
    )
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null
    return sortDirection === 'desc' 
      ? <ChevronDown className="w-3.5 h-3.5" />
      : <ChevronUp className="w-3.5 h-3.5" />
  }

  const SortHeader = ({ field, label, icon }: { field: string; label: string; icon?: React.ReactNode }) => (
    <th 
      className="text-left py-2 px-3 text-xs font-mono text-tertiary hover:text-primary cursor-pointer transition-colors duration-200"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-accent/70">{icon}</span>}
        <span>{label}</span>
        <span className={sortField === field ? 'text-accent' : 'opacity-0'}>
          <SortIcon field={field} />
        </span>
      </div>
    </th>
  )

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-4 flex items-center relative">
        <div className="absolute left-3 text-tertiary">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by slot, client, location..."
          className="w-full pl-9 pr-4 py-2 rounded-md bg-surface/40 border border-subtle font-mono text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/50 transition-all"
        />
      </div>
      
      <div className="overflow-x-auto -mx-2">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-subtle">
              <SortHeader field="slot" label="Slot" icon={<Clock className="w-3 h-3" />} />
              <SortHeader field="client" label="Client" icon={<Package className="w-3 h-3" />} />
              <SortHeader field="country" label="Location" icon={<Globe className="w-3 h-3" />} />
              <SortHeader field="blockSize" label="Size" icon={<FileDown className="w-3 h-3" />} />
              <SortHeader field="txCount" label="Txns" icon={<FileText className="w-3 h-3" />} />
              <SortHeader field="execValue" label="Exec Value" icon={<DollarSign className="w-3 h-3" />} />
              <SortHeader field="consensusValue" label="Consensus Value" icon={<Zap className="w-3 h-3" />} />
              <th className="text-right py-2 px-3 text-xs font-mono text-tertiary">Version</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle/30">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-tertiary font-mono">
                  No results match your search criteria
                </td>
              </tr>
            ) : (
              sortedData.map(({ slotNumber, block }, index) => (
                <tr 
                  key={`${slotNumber}-${index}`}
                  className={clsx(
                    'hover:bg-surface/40 group transition-colors duration-150 cursor-pointer',
                    index % 2 === 0 ? 'bg-surface/10' : 'bg-transparent',
                  )}
                  onClick={() => onSelectBlock?.(block)}
                >
                  <td className="py-2.5 px-3 text-sm font-mono">
                    <div className="flex flex-col">
                      <span className="text-primary group-hover:text-accent transition-colors">{slotNumber}</span>
                      <span className="text-xs text-tertiary">
                        <FormattedTimestamp timestamp={block.slotStartDateTime} />
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-sm font-mono text-primary group-hover:text-accent transition-colors">
                    {block.metadata?.metaClientName || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-sm font-mono text-primary">
                    {block.metadata?.metaClientGeoCountry || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-sm font-mono text-primary">
                    {formatBytes(block.blockTotalBytes)}
                  </td>
                  <td className="py-2.5 px-3 text-sm font-mono text-primary">
                    {block.executionPayloadTransactionsCount}
                  </td>
                  <td className="py-2.5 px-3 text-sm font-mono text-primary">
                    {formatEther(block.executionPayloadValue)}
                  </td>
                  <td className="py-2.5 px-3 text-sm font-mono text-primary">
                    {formatEther(block.consensusPayloadValue)}
                  </td>
                  <td className="py-2.5 px-3 text-sm font-mono text-tertiary text-right">
                    {block.blockVersion}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination or Load More could be added here */}
        {sortedData.length > 0 && (
          <div className="mt-4 text-xs text-tertiary font-mono text-center">
            Showing {sortedData.length} of {flattenedData.length} blocks
          </div>
        )}
      </div>
    </div>
  )
} 