import { FC } from 'react';
import { LocallyBuiltBlock } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';
import { Timestamp } from '@bufbuild/protobuf';
import { formatBytes, formatEther } from '@/utils/format.ts';
import {
  Package,
  Calendar,
  Hash,
  Cpu,
  Server,
  Globe,
  FileText,
  ArrowDownToLine,
  Gauge,
  DollarSign,
  Shield,
  Zap,
  Database,
  Activity,
} from 'lucide-react';

// Simple timestamp formatter as a replacement for ServerTimestamp
const FormattedTimestamp: FC<{ timestamp?: Timestamp }> = ({ timestamp }) => {
  if (!timestamp) return <span className="text-tertiary">-</span>;

  const date = timestamp.toDate();
  const relativeTime = getRelativeTimeStr(date);

  return <span title={date.toLocaleString()}>{relativeTime}</span>;
};

// Helper function to get relative time
const getRelativeTimeStr = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffSec < 5) {
    return 'just now';
  } else if (diffSec < 60) {
    return `${diffSec}s ago`;
  } else if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else if (diffHour < 24) {
    return `${diffHour}h ago`;
  } else if (diffDay < 30) {
    return `${diffDay}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Info Item component for consistent styling
interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subvalue?: React.ReactNode;
}

const InfoItem: FC<InfoItemProps> = ({ icon, label, value, subvalue }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2 mb-1">
      <div className="text-accent/80">{icon}</div>
      <h5 className="text-sm font-mono text-tertiary">{label}</h5>
    </div>
    <div className="pl-6 space-y-0.5">
      <div className="text-sm font-mono text-primary">{value}</div>
      {subvalue && <div className="text-xs font-mono text-tertiary">{subvalue}</div>}
    </div>
  </div>
);

interface LocallyBuiltBlocksDetailProps {
  block: LocallyBuiltBlock;
}

export const LocallyBuiltBlocksDetail: FC<LocallyBuiltBlocksDetailProps> = ({ block }) => {
  if (!block) {
    return null;
  }

  // Calculate total value directly
  const executionValue = block.executionPayloadValue ? Number(block.executionPayloadValue.toString()) : 0;
  const consensusValue = block.consensusPayloadValue ? Number(block.consensusPayloadValue.toString()) : 0;
  const totalValue = executionValue + consensusValue;

  // Calculate gas percentage
  const gasPercentage =
    Number(block.executionPayloadGasLimit) > 0
      ? ((Number(block.executionPayloadGasUsed) / Number(block.executionPayloadGasLimit)) * 100).toFixed(2)
      : '0.00';

  return (
    <div className="backdrop-blur-sm rounded-lg bg-surface/80">
      <div className="p-4 border-b border-subtle/30">
        <h3 className="text-xl font-sans font-bold text-primary">Block Details</h3>
        <div className="flex items-center gap-2 mt-1">
          <div className="text-xs font-mono px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/10">
            Slot {block.slot.toString()}
          </div>
          <div className="text-xs font-mono text-tertiary">
            <FormattedTimestamp timestamp={block.slotStartDateTime} />
          </div>
          <div className="text-xs font-mono px-2 py-0.5 rounded-full bg-surface/50 text-tertiary">
            {block.blockVersion}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Block Info */}
          <div className="space-y-6">
            <h4 className="text-lg font-sans font-bold text-accent mb-4">Block Information</h4>

            <div className="space-y-4">
              <InfoItem
                icon={<Calendar className="w-4 h-4" />}
                label="Slot"
                value={block.slot.toString()}
                subvalue={<FormattedTimestamp timestamp={block.slotStartDateTime} />}
              />

              <InfoItem icon={<Hash className="w-4 h-4" />} label="Block Version" value={block.blockVersion} />

              <InfoItem
                icon={<ArrowDownToLine className="w-4 h-4" />}
                label="Block Size"
                value={formatBytes(block.blockTotalBytes)}
                subvalue={`${formatBytes(block.blockTotalBytesCompressed)} compressed`}
              />

              <InfoItem
                icon={<FileText className="w-4 h-4" />}
                label="Transactions"
                value={block.executionPayloadTransactionsCount}
                subvalue={`${formatBytes(block.executionPayloadTransactionsTotalBytes)} total bytes`}
              />

              <InfoItem
                icon={<Gauge className="w-4 h-4" />}
                label="Gas Used / Limit"
                value={
                  <div className="flex items-center gap-2">
                    <span>
                      {block.executionPayloadGasUsed.toString()} / {block.executionPayloadGasLimit.toString()}
                    </span>
                    <div className="relative h-1.5 w-24 bg-surface/30 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-accent/70 rounded-full"
                        style={{ width: `${Math.min(parseFloat(gasPercentage), 100)}%` }}
                      />
                    </div>
                  </div>
                }
                subvalue={`${gasPercentage}% used`}
              />

              <InfoItem
                icon={<Database className="w-4 h-4" />}
                label="Execution Block Number"
                value={block.executionPayloadBlockNumber}
              />
            </div>
          </div>

          {/* Client Info */}
          <div className="space-y-6">
            <h4 className="text-lg font-sans font-bold text-accent mb-4">Client Information</h4>

            <div className="space-y-4">
              <InfoItem
                icon={<Package className="w-4 h-4" />}
                label="Client"
                value={block.metadata?.metaClientName || 'Unknown'}
                subvalue={block.metadata?.metaClientVersion}
              />

              <InfoItem
                icon={<Server className="w-4 h-4" />}
                label="Implementation"
                value={block.metadata?.metaClientImplementation || 'Unknown'}
              />

              <InfoItem
                icon={<Cpu className="w-4 h-4" />}
                label="Consensus"
                value={block.metadata?.metaConsensusImplementation || 'Unknown'}
                subvalue={block.metadata?.metaConsensusVersion}
              />

              <InfoItem
                icon={<Globe className="w-4 h-4" />}
                label="Location"
                value={
                  <div className="flex items-center gap-2">{block.metadata?.metaClientGeoCountry || 'Unknown'}</div>
                }
                subvalue={block.metadata?.metaClientGeoCity}
              />

              <InfoItem
                icon={<Activity className="w-4 h-4" />}
                label="Network"
                value={block.metadata?.metaClientImplementation || 'Unknown'}
              />
            </div>
          </div>

          {/* Value Info */}
          <div className="space-y-6">
            <h4 className="text-lg font-sans font-bold text-accent mb-4">Payload Values</h4>

            <div className="p-4 bg-surface/30 rounded-lg border border-subtle/20">
              <div className="space-y-4">
                <InfoItem
                  icon={<DollarSign className="w-4 h-4" />}
                  label="Execution Value"
                  value={
                    <div className="flex items-center gap-2">
                      <span>{formatEther(block.executionPayloadValue)}</span>
                      {executionValue > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface/50">
                          {((executionValue / totalValue) * 100).toFixed(2)}%
                        </span>
                      )}
                    </div>
                  }
                />

                <InfoItem
                  icon={<Shield className="w-4 h-4" />}
                  label="Consensus Value"
                  value={
                    <div className="flex items-center gap-2">
                      <span>{formatEther(block.consensusPayloadValue)}</span>
                      {consensusValue > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface/50">
                          {((consensusValue / totalValue) * 100).toFixed(2)}%
                        </span>
                      )}
                    </div>
                  }
                />

                <div className="pt-2 border-t border-subtle/20 mt-2">
                  <InfoItem
                    icon={<Zap className="w-4 h-4" />}
                    label="Total Value"
                    value={<div className="text-lg font-mono font-medium text-accent">{formatEther(totalValue)}</div>}
                  />
                </div>
              </div>
            </div>

            {/* Additional stats or visualizations could go here */}
            <div className="bg-surface/20 p-4 rounded-lg border border-subtle/10">
              <h5 className="text-sm font-mono font-medium text-primary mb-2">Block Context</h5>
              <p className="text-xs font-mono text-tertiary leading-relaxed">
                This block was built locally by a node running {block.metadata?.metaClientName || 'Unknown'}. It
                represents what the node would have proposed if selected as a block proposer for slot{' '}
                {block.slot.toString()}. This data is useful for comparing different client implementations and their
                transaction selection strategies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
