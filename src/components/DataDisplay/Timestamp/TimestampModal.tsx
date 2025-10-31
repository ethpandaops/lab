import { type JSX, useState, useCallback, useEffect } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Dialog } from '@/components/Overlays/Dialog';
import { useNetwork } from '@/hooks/useNetwork';
import { useInterval } from '@/hooks/useInterval';
import { formatTimestamp, getRelativeTime } from '@/utils/time';
import { timestampToSlot } from '@/pages/ethereum/live/utils/slot-time';
import { slotToEpoch } from '@/utils/beacon';
import { getAllDiscordFormats, DISCORD_STYLE_LABELS } from '@/utils/discord-timestamp';
import type { DiscordTimestampStyle } from '@/utils/discord-timestamp';
import type { TimestampModalContentProps } from './Timestamp.types';

interface TimestampModalProps extends TimestampModalContentProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal component that displays a timestamp in multiple formats
 *
 * Shows:
 * - Local and UTC timestamps (full)
 * - Unix timestamp
 * - Live-updating relative time
 * - Beacon chain slot and epoch (based on selected network)
 * - All Discord relative time formats
 */
export function TimestampModal({ open, onClose, timestamp }: TimestampModalProps): JSX.Element {
  return (
    <Dialog open={open} onClose={onClose} title="Timestamp Details" size="xl">
      <TimestampModalContent timestamp={timestamp} />
    </Dialog>
  );
}

/**
 * Content of the timestamp modal
 */
function TimestampModalContent({ timestamp }: TimestampModalContentProps): JSX.Element {
  const { currentNetwork } = useNetwork();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [liveRelativeTime, setLiveRelativeTime] = useState<string>(getRelativeTime(timestamp));

  // Update live relative time every second
  useEffect(() => {
    setLiveRelativeTime(getRelativeTime(timestamp));
  }, [timestamp]);

  useInterval(() => {
    setLiveRelativeTime(getRelativeTime(timestamp));
  }, 1000);

  // Calculate beacon chain values if genesis_time is available
  const beaconData = currentNetwork?.genesis_time
    ? {
        slot: timestampToSlot(timestamp, currentNetwork.genesis_time),
        epoch: slotToEpoch(timestampToSlot(timestamp, currentNetwork.genesis_time)),
      }
    : null;

  const handleCopy = useCallback((text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  // Format the timestamps
  const localTimestamp = formatTimestamp(timestamp, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  const utcTimestamp = new Date(timestamp * 1000).toUTCString();

  const discordFormats = getAllDiscordFormats(timestamp);

  const tabs = [
    { name: 'Standard', count: 4 },
    ...(beaconData && currentNetwork ? [{ name: 'Beacon Chain', count: 2 }] : []),
    { name: 'Discord', count: 7 },
  ];

  return (
    <TabGroup>
      <TabList className="flex gap-2 border-b border-border">
        {tabs.map(tab => (
          <Tab
            key={tab.name}
            className={({ selected }) =>
              clsx(
                'px-4 py-2.5 text-sm/6 font-medium transition-colors focus:outline-hidden',
                selected ? 'border-b-2 border-primary text-foreground' : 'text-muted hover:text-foreground'
              )
            }
          >
            {tab.name}
            <span className="text-2xs/3 ml-2 rounded-xs bg-background px-1.5 py-0.5 font-semibold">{tab.count}</span>
          </Tab>
        ))}
      </TabList>

      <TabPanels className="mt-4">
        {/* Standard Formats Panel */}
        <TabPanel>
          <div className="overflow-hidden rounded-sm border border-border">
            <table className="w-full">
              <tbody className="divide-y divide-border">
                <TimestampRow
                  label="Local Time"
                  value={localTimestamp}
                  onCopy={() => handleCopy(localTimestamp, 'local')}
                  isCopied={copiedField === 'local'}
                />
                <TimestampRow
                  label="UTC Time"
                  value={utcTimestamp}
                  onCopy={() => handleCopy(utcTimestamp, 'utc')}
                  isCopied={copiedField === 'utc'}
                />
                <TimestampRow
                  label="Unix Timestamp"
                  value={timestamp.toString()}
                  onCopy={() => handleCopy(timestamp.toString(), 'unix')}
                  isCopied={copiedField === 'unix'}
                />
                <TimestampRow
                  label="Relative Time"
                  value={liveRelativeTime}
                  onCopy={() => handleCopy(liveRelativeTime, 'relative')}
                  isCopied={copiedField === 'relative'}
                  isLive
                />
              </tbody>
            </table>
          </div>
        </TabPanel>

        {/* Beacon Chain Panel */}
        {beaconData && currentNetwork && (
          <TabPanel>
            <div className="mb-3 text-sm/6 text-muted">
              Network: <span className="font-semibold text-foreground">{currentNetwork.name}</span>
            </div>
            <div className="overflow-hidden rounded-sm border border-border">
              <table className="w-full">
                <tbody className="divide-y divide-border">
                  <TimestampRow
                    label="Slot"
                    value={beaconData.slot.toLocaleString()}
                    onCopy={() => handleCopy(beaconData.slot.toString(), 'slot')}
                    isCopied={copiedField === 'slot'}
                  />
                  <TimestampRow
                    label="Epoch"
                    value={beaconData.epoch.toLocaleString()}
                    onCopy={() => handleCopy(beaconData.epoch.toString(), 'epoch')}
                    isCopied={copiedField === 'epoch'}
                  />
                </tbody>
              </table>
            </div>
          </TabPanel>
        )}

        {/* Discord Formats Panel */}
        <TabPanel>
          <div className="overflow-hidden rounded-sm border border-border">
            <table className="w-full">
              <tbody className="divide-y divide-border">
                {(Object.entries(discordFormats) as [DiscordTimestampStyle, string][]).map(([style, value]) => (
                  <TimestampRow
                    key={style}
                    label={DISCORD_STYLE_LABELS[style]}
                    value={value}
                    onCopy={() => handleCopy(value, `discord-${style}`)}
                    isCopied={copiedField === `discord-${style}`}
                    badge={`<t:${timestamp}:${style}>`}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </TabPanel>
      </TabPanels>
    </TabGroup>
  );
}

interface TimestampRowProps {
  label: string;
  value: string;
  onCopy: () => void;
  isCopied: boolean;
  badge?: string;
  isLive?: boolean;
}

/**
 * Individual timestamp table row with copy button
 */
function TimestampRow({ label, value, onCopy, isCopied, badge, isLive }: TimestampRowProps): JSX.Element {
  return (
    <tr className="group bg-background transition-colors hover:bg-surface">
      <td className="w-48 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs/5 font-medium text-muted">{label}</span>
          {isLive && (
            <span className="text-2xs/3 flex items-center gap-1.5 rounded-xs bg-success/20 px-1.5 py-0.5 font-semibold text-success">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex size-1.5 rounded-full bg-success"></span>
              </span>
              LIVE
            </span>
          )}
        </div>
        {badge && !isLive && (
          <div className="mt-1">
            <span className="text-2xs/3 inline-block rounded-xs bg-accent/10 px-1.5 py-0.5 font-mono font-medium text-accent">
              {badge}
            </span>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="font-mono text-sm/6 break-all text-foreground">{value}</div>
      </td>
      <td className="w-16 px-4 py-3 text-right">
        <button
          type="button"
          onClick={onCopy}
          className={clsx(
            'rounded-xs p-2 transition-all',
            isCopied
              ? 'bg-success/20 text-success'
              : 'text-muted opacity-0 group-hover:opacity-100 hover:bg-border hover:text-foreground dark:hover:bg-muted/20'
          )}
          aria-label={`Copy ${label}`}
        >
          {isCopied ? <CheckIcon className="size-4" /> : <ClipboardDocumentIcon className="size-4" />}
        </button>
      </td>
    </tr>
  );
}
