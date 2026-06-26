import { type JSX, type ReactNode } from 'react';
import clsx from 'clsx';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { weiToEth, weiToGwei } from '@/utils';
import type { SlotHudProps } from './SlotHud.types';

const MAX_CLIENTS = 6;

function clampPct(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function secs(ms: number | null): string {
  return ms !== null ? `${(ms / 1000).toFixed(2)}s` : '—';
}

/** Abbreviate a hex id (pubkey / root) to its leading bytes. */
function shortHex(hex: string | null | undefined): string {
  return hex ? `${hex.slice(0, 8)}…` : '—';
}

/** Render a count, falling back to an em-dash when absent. */
function dash(n: number, format: (x: number) => ReactNode = String): ReactNode {
  return n > 0 ? format(n) : '—';
}

/** Wei (string) → compact ETH string (e.g. "0.0089"), or null when zero/invalid. */
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

/** Wei (string) → gwei number, or null when absent/invalid. */
function gweiOrNull(wei: string | null | undefined): number | null {
  if (!wei) return null;
  try {
    return weiToGwei(wei);
  } catch {
    return null;
  }
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  canonical: { label: 'Proposed', cls: 'border-success/40 bg-success/10 text-success' },
  orphaned: { label: 'Orphaned', cls: 'border-warning/40 bg-warning/10 text-warning' },
  missed: { label: 'Missed', cls: 'border-danger/40 bg-danger/10 text-danger' },
};

/** Fades content in once its data is active on the slot replay timeline. */
function Fade({
  active,
  className,
  children,
}: {
  active: boolean;
  className?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className={clsx('transition-opacity duration-700 ease-out', active ? 'opacity-100' : 'opacity-0', className)}>
      {children}
    </div>
  );
}

/** A dense section: a topic label over a tight stack of stats. */
function Section({
  title,
  accessory,
  className,
  children,
}: {
  title: string;
  accessory?: ReactNode;
  className?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div
      className={clsx('flex min-w-0 flex-col gap-1 border-l border-border px-3 first:border-l-0 first:pl-0', className)}
    >
      <div className="flex h-3.5 items-center gap-2">
        <span className="truncate text-[9px]/3 font-medium tracking-[0.16em] text-muted uppercase">{title}</span>
        {accessory}
      </div>
      {children}
    </div>
  );
}

/** A single label → value line within a section. `title` shows the full value on hover when truncated. */
function Row({ k, v, tone, title }: { k: string; v: ReactNode; tone?: string; title?: string }): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="shrink-0 text-[9px]/3 tracking-wide text-muted/60 uppercase">{k}</span>
      <span
        title={title}
        className={clsx('truncate font-mono text-[11px]/3 font-semibold tabular-nums', tone ?? 'text-foreground')}
      >
        {v}
      </span>
    </div>
  );
}

/**
 * SlotHud — a live dashboard strip of dense xatu-cbt sections for the consensus
 * Live page: the EL-client validation race (engine_newPayload, 7870 reference
 * nodes), block propagation, attestation timing, the MEV outcome and auction
 * depth, the execution payload and block status. Each section's data fades in
 * as it becomes active on the slot replay timeline.
 */
export function SlotHud({
  currentTime,
  clientValidation,
  proposerEntity,
  propagationMinMs,
  propagationP50Ms,
  propagationP90Ms,
  propagationMaxMs,
  propagationNodeCount,
  attestationFirstMs,
  attestationPeakMs,
  attestationExpected,
  blockDetails,
  auctionBuilders,
  auctionRelays,
  auctionBids,
  auctionTopRelay,
  auctionTopBidWei,
  blobCount,
  dataColumnBlobCount,
  className,
}: SlotHudProps): JSX.Element {
  // Reveal data only once the block has actually been seen on the network.
  const blockActive = propagationMinMs !== null && currentTime >= propagationMinMs;

  const clients = clientValidation.slice(0, MAX_CLIENTS);
  const bd = blockDetails;

  const gasPct = bd?.gasUsed && bd?.gasLimit ? clampPct((bd.gasUsed / bd.gasLimit) * 100) : null;
  const gasUsedM = bd?.gasUsed != null ? `${(bd.gasUsed / 1e6).toFixed(1)}M` : null;
  const baseGwei = gweiOrNull(bd?.baseFeePerGas);
  const mevEth = formatEth(bd?.mevValue);
  const topBidEth = formatEth(auctionTopBidWei);
  const blobs = dataColumnBlobCount || blobCount;
  const statusMeta = bd?.status ? STATUS_META[bd.status] : null;
  const blockType = bd ? (mevEth ? 'mev-boost' : 'self-built') : null;

  return (
    <div className={clsx('flex h-[96px] w-full items-stretch', className)}>
      {/* Validation race — 7870 reference nodes */}
      <Section title="Validation · 7870" className="flex-[1.3]">
        <div className="flex flex-col gap-px">
          {clients.map((row, i) => (
            <Fade
              key={row.client}
              active={propagationMinMs !== null && currentTime >= propagationMinMs + row.medianMs}
              className="flex items-center gap-1.5"
            >
              <ClientLogo client={row.client} size={11} />
              <span
                title={row.client}
                className={clsx('flex-1 truncate text-[10px]/3', i === 0 ? 'text-foreground' : 'text-muted')}
              >
                {row.client}
              </span>
              <span
                className={clsx(
                  'shrink-0 font-mono text-[10px]/3 tabular-nums',
                  i === 0 ? 'font-semibold text-primary' : 'text-muted'
                )}
              >
                {row.medianMs}ms
              </span>
            </Fade>
          ))}
        </div>
      </Section>

      {/* Propagation across the sentry network */}
      <Section title="Propagation" className="flex-1">
        <Fade active={blockActive} className="flex flex-col gap-px">
          <Row k="first" v={secs(propagationMinMs)} />
          <Row k="p50" v={secs(propagationP50Ms)} />
          <Row k="p90" v={secs(propagationP90Ms)} tone="text-primary" />
          <Row k="max" v={secs(propagationMaxMs)} />
          <Row k="nodes" v={dash(propagationNodeCount)} />
        </Fade>
      </Section>

      {/* Attestation arrival timing */}
      <Section title="Attestation" className="flex-1">
        <Fade active={blockActive} className="flex flex-col gap-px">
          <Row k="first" v={secs(attestationFirstMs)} />
          <Row k="peak" v={secs(attestationPeakMs)} />
          <Row k="expected" v={dash(attestationExpected, n => n.toLocaleString())} />
        </Fade>
      </Section>

      {/* MEV outcome */}
      <Section title="MEV" className="flex-1">
        <Fade active={blockActive} className="flex flex-col gap-px">
          <Row k="value" v={mevEth ? `${mevEth} Ξ` : '—'} tone={mevEth ? 'text-success' : 'text-muted'} />
          <Row k="via" v={bd?.mevRelays?.[0] ?? '—'} title={bd?.mevRelays?.join(', ') || undefined} />
          <Row k="builder" v={shortHex(bd?.builderPubkey)} title={bd?.builderPubkey ?? undefined} />
          <Row k="type" v={blockType ?? '—'} />
        </Fade>
      </Section>

      {/* MEV auction depth (populated even when self-built) */}
      <Section title="Auction" className="flex-1">
        <Fade active={blockActive} className="flex flex-col gap-px">
          <Row k="builders" v={dash(auctionBuilders)} />
          <Row k="relays" v={dash(auctionRelays)} />
          <Row k="bids" v={dash(auctionBids, n => n.toLocaleString())} />
          <Row k="best" v={topBidEth ? `${topBidEth} Ξ` : '—'} tone={topBidEth ? 'text-success' : undefined} />
          <Row k="top" v={auctionTopRelay ?? '—'} title={auctionTopRelay ?? undefined} />
        </Fade>
      </Section>

      {/* Execution payload */}
      <Section title="Execution" className="flex-1">
        <Fade active={blockActive} className="flex flex-col gap-px">
          <Row k="txns" v={bd?.transactionCount != null ? bd.transactionCount.toLocaleString() : '—'} />
          <Row k="gas" v={gasPct !== null ? `${gasPct.toFixed(0)}%` : '—'} />
          <Row k="used" v={gasUsedM ?? '—'} />
          <Row k="base" v={baseGwei !== null ? `${baseGwei.toFixed(2)} gw` : '—'} />
          <Row k="block" v={bd?.executionBlockNumber != null ? bd.executionBlockNumber.toLocaleString() : '—'} />
          <Row k="blobs" v={dash(blobs)} />
        </Fade>
      </Section>

      {/* Block */}
      <Section
        title="Block"
        className="flex-[0.9]"
        accessory={
          statusMeta ? (
            <Fade active={blockActive} className="ml-auto">
              <span
                className={clsx(
                  'inline-block rounded-sm border px-1.5 py-0 text-[9px]/3 font-semibold tracking-wide uppercase',
                  statusMeta.cls
                )}
              >
                {statusMeta.label}
              </span>
            </Fade>
          ) : undefined
        }
      >
        <Fade active={blockActive} className="flex flex-col gap-px">
          <Row k="fork" v={bd?.blockVersion || '—'} />
          <Row
            k="proposer"
            v={proposerEntity ?? (bd?.proposerIndex != null ? `#${bd.proposerIndex}` : '—')}
            tone={proposerEntity ? 'text-foreground' : 'text-muted'}
            title={proposerEntity ?? (bd?.proposerIndex != null ? `Validator #${bd.proposerIndex}` : undefined)}
          />
          <Row k="root" v={shortHex(bd?.blockRoot)} title={bd?.blockRoot ?? undefined} />
          <Row
            k="on time"
            v={bd?.wasOnTime === undefined ? '—' : bd.wasOnTime ? 'yes' : 'no'}
            tone={bd?.wasOnTime ? 'text-success' : 'text-foreground'}
          />
        </Fade>
      </Section>
    </div>
  );
}
