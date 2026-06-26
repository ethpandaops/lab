import { type JSX, type ReactNode } from 'react';
import clsx from 'clsx';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { weiToEth } from '@/utils';
import type { ClientValidationRow } from '../../hooks/useSlotViewData/useSlotViewData.types';
import type { BlockDetailsData } from '../../hooks/useBlockDetailsData/useBlockDetailsData.types';

export interface MobileSlotStatsProps {
  clientValidation: ClientValidationRow[];
  propagationP90Ms: number | null;
  blockDetails: BlockDetailsData | null;
  blobCount: number;
  dataColumnBlobCount: number;
}

function formatEth(wei: string | null | undefined): string | null {
  if (!wei) return null;
  try {
    const eth = weiToEth(wei);
    if (!Number.isFinite(eth) || eth === 0) return null;
    return eth < 0.001 ? eth.toFixed(4) : eth.toFixed(3);
  } catch {
    return null;
  }
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  canonical: { label: 'Proposed', cls: 'border-success/40 bg-success/10 text-success' },
  orphaned: { label: 'Orphaned', cls: 'border-warning/40 bg-warning/10 text-warning' },
  missed: { label: 'Missed', cls: 'border-danger/40 bg-danger/10 text-danger' },
};

function Chip({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex shrink-0 items-baseline gap-1">
      <span className="text-[9px] tracking-wide text-muted/70 uppercase">{label}</span>
      <span className="font-mono text-xs font-semibold text-foreground tabular-nums">{children}</span>
    </div>
  );
}

/**
 * MobileSlotStats — a compact, horizontally-scrollable strip of the key live
 * slot metrics for the mobile layout (a condensed counterpart to the desktop
 * SlotHud).
 */
export function MobileSlotStats({
  clientValidation,
  propagationP90Ms,
  blockDetails,
  blobCount,
  dataColumnBlobCount,
}: MobileSlotStatsProps): JSX.Element {
  const fastest = clientValidation[0];
  const bd = blockDetails;
  const gasPct = bd?.gasUsed && bd?.gasLimit ? Math.round((bd.gasUsed / bd.gasLimit) * 100) : null;
  const mevEth = formatEth(bd?.mevValue);
  const blobs = dataColumnBlobCount || blobCount;
  const statusMeta = bd?.status ? STATUS_META[bd.status] : null;

  return (
    <div className="flex h-full items-center gap-3 overflow-x-auto px-3">
      {fastest && (
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[9px] tracking-wide text-muted/70 uppercase">Fast</span>
          <ClientLogo client={fastest.client} size={12} />
          <span className="font-mono text-xs font-semibold text-primary tabular-nums">{fastest.medianMs}ms</span>
        </div>
      )}
      <Chip label="p90">{propagationP90Ms !== null ? `${(propagationP90Ms / 1000).toFixed(2)}s` : '—'}</Chip>
      {mevEth && (
        <div className="flex shrink-0 items-baseline gap-1">
          <span className="text-[9px] tracking-wide text-muted/70 uppercase">MEV</span>
          <span className="font-mono text-xs font-semibold text-success tabular-nums">{mevEth} Ξ</span>
        </div>
      )}
      <Chip label="txs">{bd?.transactionCount != null ? bd.transactionCount.toLocaleString() : '—'}</Chip>
      <Chip label="gas">{gasPct !== null ? `${gasPct}%` : '—'}</Chip>
      <Chip label="blobs">{blobs > 0 ? blobs : '—'}</Chip>
      {statusMeta && (
        <span
          className={clsx(
            'shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
            statusMeta.cls
          )}
        >
          {statusMeta.label}
        </span>
      )}
    </div>
  );
}
