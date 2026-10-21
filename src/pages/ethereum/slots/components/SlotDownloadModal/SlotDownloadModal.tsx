import { type JSX, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownTrayIcon, ArrowPathIcon, CubeIcon, Square3Stack3DIcon } from '@heroicons/react/24/outline';
import { Dialog } from '@/components/Overlays/Dialog';
import { Button } from '@/components/Elements/Button';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { Alert } from '@/components/Feedback/Alert';
import { CopyToClipboard } from '@/components/Elements/CopyToClipboard';
import { fctBlockBlobHeadServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { getBlobDownloadUrl, getBlockDownloadUrl, type BlockDownloadFormat } from '@/utils';
import { SLOTS_PER_EPOCH } from '@/utils/beacon';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { useArchiveDownload } from './useArchiveDownload';
import type { SlotDownloadModalProps } from './SlotDownloadModal.types';

// A slot's blobs are only archived once it finalizes (~2 epochs behind head).
const FINALITY_LAG_SLOTS = 2 * SLOTS_PER_EPOCH;

type TabKey = 'block' | 'blobs';

function truncateHash(hash: string): string {
  if (hash.length <= 20) return hash;

  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

/**
 * Modal for downloading a slot's beacon block (as JSON or SSZ) and its blob
 * sidecars (as raw bytes). All downloads go through the lab download proxy, so
 * they save cleanly regardless of the upstream archives' headers.
 */
export function SlotDownloadModal({
  open,
  onClose,
  network,
  slot,
  slotStartDateTime,
  blockRoot,
}: SlotDownloadModalProps): JSX.Element {
  const [tab, setTab] = useState<TabKey>('block');
  const { pendingKey, error, download } = useArchiveDownload();

  // Blobs are not in the archive until the slot finalizes, so gate blob
  // downloads on finality (block downloads are available much sooner).
  const { slot: wallClockSlot } = useBeaconClock();
  const blobsArchived = wallClockSlot - slot >= FINALITY_LAG_SLOTS;

  // Fetch the slot's blob versioned hashes from the head table (real-time,
  // unlike dim_block_blob_submitter which lags behind the chain head).
  const { data: blobData, isLoading: blobsLoading } = useQuery({
    ...fctBlockBlobHeadServiceListOptions({
      query: { slot_start_date_time_eq: slotStartDateTime, page_size: 100 },
    }),
    enabled: open && slotStartDateTime > 0,
  });

  const versionedHashes = useMemo(
    () =>
      (blobData?.fct_block_blob_head ?? [])
        .slice()
        .sort((a, b) => (a.blob_index ?? 0) - (b.blob_index ?? 0))
        .map(row => row.versioned_hash)
        .filter((hash): hash is string => !!hash),
    [blobData]
  );

  const blockFormats: { format: BlockDownloadFormat; label: string }[] = [
    { format: 'json', label: 'JSON' },
    { format: 'ssz', label: 'SSZ' },
  ];

  return (
    <Dialog open={open} onClose={onClose} title={`Download Slot ${slot}`} size="lg">
      <div className="flex flex-col gap-4">
        {/* Tabs */}
        <SegmentedControl
          ariaLabel="Download type"
          value={tab}
          onChange={setTab}
          options={[
            {
              value: 'block',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <CubeIcon className="size-4" />
                  Block
                </span>
              ),
            },
            {
              value: 'blobs',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Square3Stack3DIcon className="size-4" />
                  Blobs
                  <span className="ml-1 rounded-xs bg-surface px-1.5 text-xs text-muted">{versionedHashes.length}</span>
                </span>
              ),
            },
          ]}
        />

        {error && <Alert variant="error" description={error} />}

        {/* Block tab */}
        {tab === 'block' &&
          (blockRoot ? (
            <div className="flex flex-col gap-2">
              {blockFormats.map(({ format, label }) => {
                const key = `block-${format}`;

                return (
                  <div
                    key={format}
                    className="flex items-center justify-between gap-4 rounded-sm border border-border bg-surface px-4 py-3"
                  >
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      rounded="sm"
                      disabled={pendingKey === key}
                      leadingIcon={
                        pendingKey === key ? <ArrowPathIcon className="animate-spin" /> : <ArrowDownTrayIcon />
                      }
                      onClick={() => download(key, getBlockDownloadUrl(network, slot, blockRoot, format))}
                    >
                      Download
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState message="No block was seen for this slot." />
          ))}

        {/* Blobs tab */}
        {tab === 'blobs' &&
          (blobsLoading ? (
            <EmptyState message="Loading blobs…" />
          ) : versionedHashes.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="max-h-80 overflow-y-auto">
                <div className="flex flex-col gap-2">
                  {versionedHashes.map((hash, index) => {
                    const key = `blob-${index}`;

                    return (
                      <div
                        key={hash}
                        className="flex items-center justify-between gap-3 rounded-sm border border-border bg-surface px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">Blob {index}</p>
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-mono text-xs text-muted">{truncateHash(hash)}</p>
                            <CopyToClipboard content={hash} successMessage="Versioned hash copied" />
                          </div>
                        </div>
                        <span title={blobsArchived ? undefined : 'Available once the slot finalizes (~13 min)'}>
                          <Button
                            variant="secondary"
                            size="sm"
                            rounded="sm"
                            nowrap
                            disabled={!blobsArchived || pendingKey === key}
                            leadingIcon={
                              pendingKey === key ? <ArrowPathIcon className="animate-spin" /> : <ArrowDownTrayIcon />
                            }
                            onClick={() => download(key, getBlobDownloadUrl(network, hash))}
                          >
                            {blobsArchived ? 'Download' : 'Pending'}
                          </Button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-muted">
                {blobsArchived
                  ? 'Raw blob bytes from the blob archive.'
                  : 'Blobs are archived once the slot finalizes (~13 min) — downloads will be available then.'}
              </p>
            </div>
          ) : (
            <EmptyState message="This slot has no blobs." />
          ))}
      </div>
    </Dialog>
  );
}

function EmptyState({ message }: { message: string }): JSX.Element {
  return (
    <div className="rounded-sm border border-border bg-surface px-4 py-8 text-center text-sm text-muted">{message}</div>
  );
}
