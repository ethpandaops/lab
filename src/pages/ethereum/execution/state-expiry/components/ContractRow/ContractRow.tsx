import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/Elements/Badge';
import { getLabelColor } from '@/pages/ethereum/contracts/utils';
import type { ContractTop100Item } from '../../hooks';

/**
 * Key overhead per storage slot in geth's snapshot structure.
 * Each slot key = 1 (prefix) + 32 (account hash) + 32 (storage hash) = 65 bytes
 */
const SLOT_KEY_OVERHEAD_BYTES = 65;

interface ContractRowProps {
  item: ContractTop100Item;
  /** Display index (1-based position in current sorted list) */
  index: number;
}

/**
 * Format bytes to human-readable format (KB, MB, GB, TB)
 */
function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`;
  }
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

/**
 * Format slot count to human-readable format (K, M)
 */
function formatSlots(slots: number): string {
  if (slots >= 1_000_000) {
    return `${(slots / 1_000_000).toFixed(2)}M`;
  }
  if (slots >= 1_000) {
    return `${(slots / 1_000).toFixed(2)}K`;
  }
  return slots.toLocaleString();
}

/**
 * Calculate savings percentage between base and expiry bytes
 */
function calculateSavings(baseBytes: number | undefined, expiryBytes: number | undefined): number | null {
  if (baseBytes === undefined || expiryBytes === undefined || baseBytes === 0) return null;
  return ((baseBytes - expiryBytes) / baseBytes) * 100;
}

/**
 * Table row for the top 100 contracts list (desktop view).
 * Displays index, contract name/address with category badge, owner, size, and expiry savings.
 */
export function ContractRow({ item, index }: ContractRowProps): JSX.Element {
  const { contract, expiry12m, expiry24m } = item;
  const { contract_address, contract_name, account_owner, labels, effective_bytes, active_slots } = contract;

  // Calculate savings percentages
  const savings1y = calculateSavings(effective_bytes, expiry12m?.effective_bytes);
  const savings2y = calculateSavings(effective_bytes, expiry24m?.effective_bytes);

  return (
    <tr className="group transition-colors hover:bg-muted/30">
      {/* Index */}
      <td className="px-2 py-1.5 text-center whitespace-nowrap">
        <span className="flex size-5 items-center justify-center rounded-xs bg-primary/10 text-xs font-bold text-primary">
          {index}
        </span>
      </td>

      {/* Contract name/address with category badge */}
      <td className="max-w-[250px] px-2 py-1.5">
        <Link to="/ethereum/contracts/$address" params={{ address: contract_address ?? '' }} className="block">
          <span className="flex items-center gap-1.5">
            {contract_name ? (
              <span className="truncate text-sm text-foreground">{contract_name}</span>
            ) : (
              <span className="truncate font-mono text-sm text-foreground">{contract_address}</span>
            )}
            {labels?.map(label => (
              <Badge key={label} color={getLabelColor(label)} size="small" variant="flat">
                {label}
              </Badge>
            ))}
          </span>
          {contract_name && <span className="block truncate font-mono text-xs text-muted">{contract_address}</span>}
        </Link>
      </td>

      {/* Owner */}
      <td className="max-w-[120px] px-2 py-1.5 whitespace-nowrap">
        <span className="block truncate text-xs text-muted">{account_owner ?? '—'}</span>
      </td>

      {/* Size (includes 65-byte key overhead per slot) */}
      <td className="px-2 py-1.5 text-right text-xs font-medium whitespace-nowrap text-muted tabular-nums">
        {formatBytes((active_slots ?? 0) * SLOT_KEY_OVERHEAD_BYTES + (effective_bytes ?? 0))}
      </td>

      {/* Slots */}
      <td className="px-2 py-1.5 text-right text-xs font-medium whitespace-nowrap text-muted tabular-nums">
        {formatSlots(active_slots ?? 0)}
      </td>

      {/* 1y Savings */}
      <td className="px-2 py-1.5 text-right text-xs font-semibold whitespace-nowrap tabular-nums">
        <span className={savings1y !== null ? 'text-emerald-500' : 'text-muted'}>
          {savings1y !== null ? `-${savings1y.toFixed(0)}%` : '—'}
        </span>
      </td>

      {/* 2y Savings */}
      <td className="px-2 py-1.5 text-right text-xs font-semibold whitespace-nowrap tabular-nums">
        <span className={savings2y !== null ? 'text-emerald-500' : 'text-muted'}>
          {savings2y !== null ? `-${savings2y.toFixed(0)}%` : '—'}
        </span>
      </td>
    </tr>
  );
}

/**
 * Card layout for the top 100 contracts list (mobile view).
 * Displays contract info in a compact, stacked card format.
 */
export function ContractCard({ item, index }: ContractRowProps): JSX.Element {
  const { contract, expiry12m, expiry24m } = item;
  const { contract_address, contract_name, account_owner, labels, effective_bytes, active_slots } = contract;

  // Calculate savings percentages
  const savings1y = calculateSavings(effective_bytes, expiry12m?.effective_bytes);
  const savings2y = calculateSavings(effective_bytes, expiry24m?.effective_bytes);

  return (
    <Link
      to="/ethereum/contracts/$address"
      params={{ address: contract_address ?? '' }}
      className="block border-b border-border/50 px-3 py-3 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start gap-3">
        {/* Index badge */}
        <div className="flex size-7 shrink-0 items-center justify-center rounded-xs bg-primary/10 text-sm font-bold text-primary">
          {index}
        </div>

        {/* Contract info */}
        <div className="min-w-0 flex-1">
          {/* Name and labels */}
          <div className="flex flex-wrap items-center gap-1.5">
            {contract_name ? (
              <span className="font-medium text-foreground">{contract_name}</span>
            ) : (
              <span className="truncate font-mono text-sm text-foreground">{contract_address}</span>
            )}
            {labels?.slice(0, 2).map(label => (
              <Badge key={label} color={getLabelColor(label)} size="small" variant="flat">
                {label}
              </Badge>
            ))}
            {labels && labels.length > 2 && <span className="text-xs text-muted">+{labels.length - 2}</span>}
          </div>

          {/* Address (if we have a name) */}
          {contract_name && <div className="mt-0.5 truncate font-mono text-xs text-muted">{contract_address}</div>}

          {/* Stats row */}
          <div className="mt-2 flex items-center gap-4 text-xs">
            <div>
              <span className="text-muted">Size: </span>
              <span className="font-medium text-foreground tabular-nums">
                {formatBytes((active_slots ?? 0) * SLOT_KEY_OVERHEAD_BYTES + (effective_bytes ?? 0))}
              </span>
            </div>
            <div>
              <span className="text-muted">Slots: </span>
              <span className="font-medium text-foreground tabular-nums">{formatSlots(active_slots ?? 0)}</span>
            </div>
            <div>
              <span className="text-muted">1y: </span>
              <span className={savings1y !== null ? 'font-semibold text-emerald-500 tabular-nums' : 'text-muted'}>
                {savings1y !== null ? `-${savings1y.toFixed(0)}%` : '—'}
              </span>
            </div>
            <div>
              <span className="text-muted">2y: </span>
              <span className={savings2y !== null ? 'font-semibold text-emerald-500 tabular-nums' : 'text-muted'}>
                {savings2y !== null ? `-${savings2y.toFixed(0)}%` : '—'}
              </span>
            </div>
          </div>

          {/* Owner */}
          {account_owner && <div className="mt-1 text-xs text-muted">Owner: {account_owner}</div>}
        </div>
      </div>
    </Link>
  );
}
