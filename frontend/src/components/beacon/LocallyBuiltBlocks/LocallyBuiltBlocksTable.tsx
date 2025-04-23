import { FC, useState } from 'react'
import { formatEther, formatBytes } from '../../../utils/format'
import { Card, CardBody } from '../../../components/common/Card'
import { LocallyBuiltBlock, LocallyBuiltSlotBlocks } from '../../../api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb'
import { Package, Clock, FileDown, DollarSign, FileText, Zap, Globe } from 'lucide-react'
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

  // Sort the data
  const sortedData = [...flattenedData].sort((a, b) => {
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
      <Card>
        <CardBody>
          <div className="animate-pulse">
            <div className="h-6 bg-active rounded w-1/4 mb-6"></div>
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-10 bg-active rounded"></div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-6">
            <p className="text-error font-mono">Error loading data. Please try again.</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (data.length === 0 || flattenedData.length === 0) {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-6">
            <p className="text-tertiary font-mono">No locally built blocks found.</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="ml-1 opacity-30">↓</span>
    return sortDirection === 'desc' 
      ? <span className="ml-1">↓</span>
      : <span className="ml-1">↑</span>
  }

  const SortHeader = ({ field, label, icon }: { field: string; label: string; icon?: React.ReactNode }) => (
    <th 
      className="text-left py-2 px-2 text-xs font-mono text-tertiary hover:text-primary cursor-pointer"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {icon && <span className="text-accent/70">{icon}</span>}
        {label}
        <SortIcon field={field} />
      </div>
    </th>
  )

  return (
    <Card>
      <CardBody>
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
                <th className="text-right py-2 px-2 text-xs font-mono text-tertiary">Version</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map(({ slotNumber, block }, index) => (
                <tr 
                  key={`${slotNumber}-${index}`}
                  className={clsx(
                    "border-b border-subtle/30 last:border-0 hover:bg-hover transition-colors cursor-pointer",
                  )}
                  onClick={() => onSelectBlock && onSelectBlock(block)}
                >
                  <td className="py-2 px-2 font-mono text-primary">
                    {slotNumber}
                    <div className="text-xs text-tertiary">
                      <FormattedTimestamp timestamp={block.slotStartDateTime} />
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-primary font-mono">{block.metadata?.metaClientName || 'Unknown'}</span>
                    </div>
                    <div className="text-xs text-tertiary font-mono">{block.metadata?.metaClientVersion || '-'}</div>
                  </td>
                  <td className="py-2 px-2 font-mono">
                    <div className="text-primary">{block.metadata?.metaClientGeoCountry || 'Unknown'}</div>
                    <div className="text-xs text-tertiary">{block.metadata?.metaClientGeoCity || '-'}</div>
                  </td>
                  <td className="py-2 px-2 font-mono">
                    <div className="text-primary">{formatBytes(block.blockTotalBytes)}</div>
                    <div className="text-xs text-tertiary">{formatBytes(block.blockTotalBytesCompressed)} compressed</div>
                  </td>
                  <td className="py-2 px-2 text-primary font-mono">
                    {block.executionPayloadTransactionsCount}
                  </td>
                  <td className="py-2 px-2 text-primary font-mono">
                    {formatEther(block.executionPayloadValue)}
                  </td>
                  <td className="py-2 px-2 text-primary font-mono">
                    {formatEther(block.consensusPayloadValue)}
                  </td>
                  <td className="py-2 px-2 text-right text-tertiary font-mono">
                    {block.blockVersion}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  )
} 