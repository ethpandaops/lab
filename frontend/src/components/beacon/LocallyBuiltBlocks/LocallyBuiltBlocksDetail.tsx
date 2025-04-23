import { FC } from 'react'
import { Card, CardBody } from '../../common/Card'
import { LocallyBuiltBlock } from '../../../api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb'
import { Timestamp } from '@bufbuild/protobuf'
import { formatBytes, formatEther } from '../../../utils/format'
import { Package, Calendar, Users, Hash, Cpu, Server, Globe, Map, MapPin, FileText, ArrowDownToLine, Fuel, Gauge } from 'lucide-react' // Added Fuel, Gauge

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

interface LocallyBuiltBlocksDetailProps {
  block: LocallyBuiltBlock
}

export const LocallyBuiltBlocksDetail: FC<LocallyBuiltBlocksDetailProps> = ({ block }) => {
  if (!block) {
    return null
  }

  // Calculate total value directly
  const executionValue = block.executionPayloadValue ? Number(block.executionPayloadValue.toString()) : 0
  const consensusValue = block.consensusPayloadValue ? Number(block.consensusPayloadValue.toString()) : 0
  const totalValue = executionValue + consensusValue

  return (
    <Card>
      <CardBody>
        <h3 className="text-xl font-sans font-bold text-primary mb-4">Block Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Block Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-sans font-bold text-accent mb-2">Block Information</h4>
            
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-accent/70" />
                  <h5 className="text-sm font-mono text-tertiary">Slot</h5>
                </div>
                <p className="text-sm font-mono text-primary pl-6">
                  {block.slot.toString()}
                  <span className="text-tertiary ml-2">
                    (<FormattedTimestamp timestamp={block.slotStartDateTime} />)
                  </span>
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Hash className="w-4 h-4 text-accent/70" />
                  <h5 className="text-sm font-mono text-tertiary">Block Version</h5>
                </div>
                <p className="text-sm font-mono text-primary pl-6">{block.blockVersion}</p>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDownToLine className="w-4 h-4 text-accent/70" />
                  <h5 className="text-sm font-mono text-tertiary">Block Size</h5>
                </div>
                <p className="text-sm font-mono text-primary pl-6">
                  {formatBytes(block.blockTotalBytes)}
                  <span className="text-tertiary ml-2">
                    ({formatBytes(block.blockTotalBytesCompressed)} compressed)
                  </span>
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-accent/70" />
                  <h5 className="text-sm font-mono text-tertiary">Transactions</h5>
                </div>
                <p className="text-sm font-mono text-primary pl-6">
                  {block.executionPayloadTransactionsCount}
                  <span className="text-tertiary ml-2">
                    ({formatBytes(block.executionPayloadTransactionsTotalBytes)})
                  </span>
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Gauge className="w-4 h-4 text-accent/70" />
                  <h5 className="text-sm font-mono text-tertiary">Gas Used / Limit</h5>
                </div>
                <p className="text-sm font-mono text-primary pl-6">
                  {block.executionPayloadGasUsed.toString()} / {block.executionPayloadGasLimit.toString()}
                  <span className="text-tertiary ml-2">
                    ({((Number(block.executionPayloadGasUsed) / Number(block.executionPayloadGasLimit || 1)) * 100).toFixed(2)}%)
                  </span>
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Fuel className="w-4 h-4 text-accent/70" />
                  <h5 className="text-sm font-mono text-tertiary">Exec Block Number</h5>
                </div>
                <p className="text-sm font-mono text-primary pl-6">
                  {block.executionPayloadBlockNumber}
                </p>
              </div>
            </div>
            
            <div className="space-y-3 pt-2">
              <h4 className="text-lg font-sans font-bold text-accent">Payload Values</h4>
              
              <div>
                <h5 className="text-sm font-mono text-tertiary mb-1">Execution Value</h5>
                <p className="text-sm font-mono text-primary pl-1">
                  {formatEther(block.executionPayloadValue)}
                </p>
              </div>
              
              <div>
                <h5 className="text-sm font-mono text-tertiary mb-1">Consensus Value</h5>
                <p className="text-sm font-mono text-primary pl-1">
                  {formatEther(block.consensusPayloadValue)}
                </p>
              </div>
              
              <div>
                <h5 className="text-sm font-mono text-tertiary mb-1">Total Value</h5>
                <p className="text-lg font-mono font-medium text-accent pl-1">
                  {formatEther(totalValue)}
                </p>
              </div>
            </div>
          </div>
          
          {/* Client Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-sans font-bold text-accent mb-2">Client Information</h4>
            
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-accent/70" />
                  <h5 className="text-sm font-mono text-tertiary">Client</h5>
                </div>
                <p className="text-sm font-mono text-primary pl-6">
                  {block.metadata?.metaClientName || 'Unknown'}
                  <span className="text-tertiary ml-2">
                    {block.metadata?.metaClientVersion}
                  </span>
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Server className="w-4 h-4 text-accent/70" />
                  <h5 className="text-sm font-mono text-tertiary">Implementation</h5>
                </div>
                <p className="text-sm font-mono text-primary pl-6">
                  {block.metadata?.metaClientImplementation || 'Unknown'}
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="w-4 h-4 text-accent/70" />
                  <h5 className="text-sm font-mono text-tertiary">Consensus</h5>
                </div>
                <p className="text-sm font-mono text-primary pl-6">
                  {block.metadata?.metaConsensusImplementation || 'Unknown'}
                  <span className="text-tertiary ml-2">
                    {block.metadata?.metaConsensusVersion}
                  </span>
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-accent/70" />
                  <h5 className="text-sm font-mono text-tertiary">Network</h5>
                </div>
                <p className="text-sm font-mono text-primary pl-6">
                  {block.metadata?.metaNetworkName || 'Unknown'}
                </p>
              </div>
            </div>
            
            <div className="space-y-3 pt-2">
              <h4 className="text-lg font-sans font-bold text-accent">Geographic Information</h4>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-accent/70" />
                  <h5 className="text-sm font-mono text-tertiary">Location</h5>
                </div>
                <p className="text-sm font-mono text-primary pl-6">
                  {block.metadata?.metaClientGeoCountry || 'Unknown'}
                  {block.metadata?.metaClientGeoCountryCode && (
                    <span className="text-tertiary ml-1">
                      ({block.metadata?.metaClientGeoCountryCode})
                    </span>
                  )}
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-accent/70" />
                  <h5 className="text-sm font-mono text-tertiary">City</h5>
                </div>
                <p className="text-sm font-mono text-primary pl-6">
                  {block.metadata?.metaClientGeoCity || 'Unknown'}
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Map className="w-4 h-4 text-accent/70" />
                  <h5 className="text-sm font-mono text-tertiary">Continent</h5>
                </div>
                <p className="text-sm font-mono text-primary pl-6">
                  {block.metadata?.metaClientGeoContinentCode || 'Unknown'}
                </p>
              </div>
              
              {(block.metadata?.metaClientGeoLatitude !== 0 || block.metadata?.metaClientGeoLongitude !== 0) && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-accent/70" />
                    <h5 className="text-sm font-mono text-tertiary">Coordinates</h5>
                  </div>
                  <p className="text-sm font-mono text-primary pl-6">
                    {block.metadata?.metaClientGeoLatitude}, {block.metadata?.metaClientGeoLongitude}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
} 