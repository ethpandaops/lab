import { type JSX, useState, useCallback, useEffect } from 'react';
import { TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Tab } from '@/components/Navigation/Tab';
import { Dialog } from '@/components/Overlays/Dialog';
import { useNetwork } from '@/hooks/useNetwork';
import { useInterval } from '@/hooks/useInterval';
import { formatTimestamp, getRelativeTime } from '@/utils/time';
import { timestampToSlot, slotToTimestamp } from '@/pages/ethereum/live/utils/slot-time';
import { slotToEpoch, epochToTimestamp, SECONDS_PER_SLOT, SLOTS_PER_EPOCH } from '@/utils/beacon';
import { getAllDiscordFormats, DISCORD_STYLE_LABELS } from '@/utils/discord-timestamp';
import { NetworkIcon } from '@/components/Ethereum/NetworkIcon';
import { formatSlot, formatEpoch } from '@/utils/number';
import { Slot } from '@/components/Ethereum/Slot';
import { Epoch } from '@/components/Ethereum/Epoch';
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
export function TimestampModal({ open, onClose, timestamp, context }: TimestampModalProps): JSX.Element {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <div>
          <div className="text-lg/6 font-semibold text-foreground">Timestamp Details</div>
          {context && <div className="mt-1 text-sm/5 font-normal text-muted">{context}</div>}
        </div>
      }
      size="xl"
    >
      <TimestampModalContent timestamp={timestamp} context={context} />
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
  const [nestedModalTimestamp, setNestedModalTimestamp] = useState<number | null>(null);
  const [nestedModalContext, setNestedModalContext] = useState<string | undefined>(undefined);

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
        slotStart: slotToTimestamp(
          timestampToSlot(timestamp, currentNetwork.genesis_time),
          currentNetwork.genesis_time
        ),
        epochStart: epochToTimestamp(
          slotToEpoch(timestampToSlot(timestamp, currentNetwork.genesis_time)),
          currentNetwork.genesis_time
        ),
      }
    : null;

  // Calculate slot and epoch end times
  const slotEnd = beaconData ? beaconData.slotStart + SECONDS_PER_SLOT : null;
  const epochEnd = beaconData ? beaconData.epochStart + SLOTS_PER_EPOCH * SECONDS_PER_SLOT : null;

  const handleCopy = useCallback((text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const handleOpenNestedModal = useCallback((ts: number, ctx: string) => {
    setNestedModalTimestamp(ts);
    setNestedModalContext(ctx);
  }, []);

  const handleCloseNestedModal = useCallback(() => {
    setNestedModalTimestamp(null);
    setNestedModalContext(undefined);
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
    ...(beaconData && currentNetwork ? [{ name: 'Beacon Chain', count: 6 }] : []),
    { name: 'Discord', count: 7 },
  ];

  return (
    <>
      <TabGroup>
        <TabList className="flex gap-2 border-b border-border">
          {tabs.map(tab => (
            <Tab key={tab.name} badge={tab.count}>
              {tab.name}
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
          {beaconData && currentNetwork && slotEnd && epochEnd && (
            <TabPanel>
              <div className="mb-3 flex items-center gap-2 text-sm/6 text-muted">
                <NetworkIcon networkName={currentNetwork.name} className="size-5" />
                <span className="font-semibold text-foreground">{currentNetwork.display_name}</span>
              </div>
              <div className="overflow-hidden rounded-sm border border-border">
                <table className="w-full">
                  <tbody className="divide-y divide-border">
                    <LinkableRow
                      label="Slot"
                      onCopy={() => handleCopy(formatSlot(beaconData.slot), 'slot')}
                      isCopied={copiedField === 'slot'}
                    >
                      <Slot slot={beaconData.slot} />
                    </LinkableRow>
                    <ClickableTimestampRow
                      label="Slot Start"
                      timestamp={beaconData.slotStart}
                      context={`Slot ${formatSlot(beaconData.slot)}`}
                      onOpenModal={handleOpenNestedModal}
                    />
                    <ClickableTimestampRow
                      label="Slot End"
                      timestamp={slotEnd}
                      context={`Slot ${formatSlot(beaconData.slot)}`}
                      onOpenModal={handleOpenNestedModal}
                    />
                    <LinkableRow
                      label="Epoch"
                      onCopy={() => handleCopy(formatEpoch(beaconData.epoch), 'epoch')}
                      isCopied={copiedField === 'epoch'}
                    >
                      <Epoch epoch={beaconData.epoch} />
                    </LinkableRow>
                    <ClickableTimestampRow
                      label="Epoch Start"
                      timestamp={beaconData.epochStart}
                      context={`Epoch ${formatEpoch(beaconData.epoch)}`}
                      onOpenModal={handleOpenNestedModal}
                    />
                    <ClickableTimestampRow
                      label="Epoch End"
                      timestamp={epochEnd}
                      context={`Epoch ${formatEpoch(beaconData.epoch)}`}
                      onOpenModal={handleOpenNestedModal}
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
                      onCopy={() => handleCopy(`<t:${timestamp}:${style}>`, `discord-${style}`)}
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

      {/* Nested Modal */}
      {nestedModalTimestamp && (
        <TimestampModal
          open={true}
          onClose={handleCloseNestedModal}
          timestamp={nestedModalTimestamp}
          context={nestedModalContext}
        />
      )}
    </>
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
    <tr onClick={onCopy} className="group cursor-pointer bg-background transition-colors hover:bg-surface">
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
      <td className="py-3 pr-4 pl-8">
        <div className="font-mono text-sm/5 break-all text-muted">{value}</div>
      </td>
      <td className="w-16 px-4 py-3 text-right">
        <div
          className={clsx(
            'inline-flex rounded-xs p-2 transition-all',
            isCopied ? 'bg-success/20 text-success' : 'text-muted opacity-0 group-hover:opacity-100'
          )}
          aria-label={`Copy ${label}`}
        >
          {isCopied ? <CheckIcon className="size-4" /> : <ClipboardDocumentIcon className="size-4" />}
        </div>
      </td>
    </tr>
  );
}

interface ClickableTimestampRowProps {
  label: string;
  timestamp: number;
  context: string;
  onOpenModal: (timestamp: number, context: string) => void;
}

/**
 * Clickable timestamp row that opens a nested modal
 */
function ClickableTimestampRow({ label, timestamp, context, onOpenModal }: ClickableTimestampRowProps): JSX.Element {
  const formattedTime = formatTimestamp(timestamp, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <tr
      onClick={() => onOpenModal(timestamp, context)}
      className="group cursor-pointer bg-background transition-colors hover:bg-surface"
    >
      <td className="w-48 px-4 py-3">
        <span className="text-xs/5 font-medium text-muted">{label}</span>
      </td>
      <td className="py-3 pr-4 pl-8">
        <div className="font-mono text-sm/5 break-all text-primary underline decoration-dotted underline-offset-4">
          {formattedTime}
        </div>
      </td>
      <td className="w-16 px-4 py-3 text-right">
        <div className="inline-flex rounded-xs p-2 text-muted opacity-0 transition-all group-hover:opacity-100">
          <ClipboardDocumentIcon className="size-4" />
        </div>
      </td>
    </tr>
  );
}

interface LinkableRowProps {
  label: string;
  onCopy: () => void;
  isCopied: boolean;
  children: JSX.Element;
}

/**
 * Row with linkable component (Slot or Epoch) that includes copy functionality
 */
function LinkableRow({ label, onCopy, isCopied, children }: LinkableRowProps): JSX.Element {
  return (
    <tr className="group bg-background transition-colors hover:bg-surface">
      <td className="w-48 px-4 py-3">
        <span className="text-xs/5 font-medium text-muted">{label}</span>
      </td>
      <td className="py-3 pr-4 pl-8">
        <div className="font-mono text-sm/5 text-foreground">{children}</div>
      </td>
      <td className="w-16 px-4 py-3 text-right">
        <button
          onClick={onCopy}
          className={clsx(
            'inline-flex rounded-xs p-2 transition-all',
            isCopied ? 'bg-success/20 text-success' : 'text-muted opacity-0 group-hover:opacity-100'
          )}
          aria-label={`Copy ${label}`}
        >
          {isCopied ? <CheckIcon className="size-4" /> : <ClipboardDocumentIcon className="size-4" />}
        </button>
      </td>
    </tr>
  );
}
