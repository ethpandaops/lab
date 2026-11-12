import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/Elements/Badge';
import { getLabelColor } from '@/pages/ethereum/contracts/utils';
import { expirySavings, storageSize, type ContractTop100Item } from '@/pages/ethereum/execution/state-expiry/hooks';

interface ContractRowProps {
  item: ContractTop100Item;
  /** Display index (1-based position in current sorted list) */
  index: number;
  /** Leave out the 1y/2y savings (when the expiry data is older than the current state) */
  hideSavings?: boolean;
}

/**
 * Format bytes to human-readable binary units (KiB, MiB, GiB, TiB)
 */
function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TiB`;
  }
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KiB`;
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
 * Table row for the top 100 contracts list (desktop view).
 * Displays index, contract name/address with category badge, owner, size, and expiry savings.
 */
export function ContractRow({ item, index, hideSavings = false }: ContractRowProps): JSX.Element {
  const { contract, expiry12m, expiry24m } = item;
  const { contract_address, contract_name, account_owner, labels, active_slots } = contract;

  const savings1y = hideSavings ? null : expirySavings(contract, expiry12m);
  const savings2y = hideSavings ? null : expirySavings(contract, expiry24m);

  return (
    <tr className="group transition-colors hover:bg-muted-30">
      {/* Index */}
      <td className="px-2 py-1.5 text-center whitespace-nowrap">
        <span className="flex size-5 items-center justify-center rounded-xs bg-primary-10 text-xs font-bold text-primary">
          {index}
        </span>
      </td>

      {/* Contract name/address with category badge */}
      <td className="max-w-62.5 px-2 py-1.5">
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
      <td className="max-w-30 px-2 py-1.5 whitespace-nowrap">
        <span className="block truncate text-xs text-muted">{account_owner ?? '—'}</span>
      </td>

      {/* Size (includes 65-byte key overhead per slot) */}
      <td className="px-2 py-1.5 text-right text-xs font-medium whitespace-nowrap text-muted tabular-nums">
        {formatBytes(storageSize(contract) ?? 0)}
      </td>

      {/* Slots */}
      <td className="px-2 py-1.5 text-right text-xs font-medium whitespace-nowrap text-muted tabular-nums">
        {formatSlots(active_slots ?? 0)}
      </td>

      {/* 1y Savings */}
      <td className="px-2 py-1.5 text-right text-xs font-semibold whitespace-nowrap tabular-nums">
        <span className={savings1y !== null ? 'text-success' : 'text-muted'}>
          {savings1y !== null ? `-${savings1y.toFixed(0)}%` : '—'}
        </span>
      </td>

      {/* 2y Savings */}
      <td className="px-2 py-1.5 text-right text-xs font-semibold whitespace-nowrap tabular-nums">
        <span className={savings2y !== null ? 'text-success' : 'text-muted'}>
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
export function ContractCard({ item, index, hideSavings = false }: ContractRowProps): JSX.Element {
  const { contract, expiry12m, expiry24m } = item;
  const { contract_address, contract_name, account_owner, labels, active_slots } = contract;

  const savings1y = hideSavings ? null : expirySavings(contract, expiry12m);
  const savings2y = hideSavings ? null : expirySavings(contract, expiry24m);

  return (
    <Link
      to="/ethereum/contracts/$address"
      params={{ address: contract_address ?? '' }}
      className="block border-b border-border-50 p-3 transition-colors hover:bg-muted-30"
    >
      <div className="flex items-start gap-3">
        {/* Index badge */}
        <div className="flex size-7 shrink-0 items-center justify-center rounded-xs bg-primary-10 text-sm font-bold text-primary">
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
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <div>
              <span className="text-muted">Size: </span>
              <span className="font-medium text-foreground tabular-nums">
                {formatBytes(storageSize(contract) ?? 0)}
              </span>
            </div>
            <div>
              <span className="text-muted">Slots: </span>
              <span className="font-medium text-foreground tabular-nums">{formatSlots(active_slots ?? 0)}</span>
            </div>
            <div>
              <span className="text-muted">1y: </span>
              <span className={savings1y !== null ? 'font-semibold text-success tabular-nums' : 'text-muted'}>
                {savings1y !== null ? `-${savings1y.toFixed(0)}%` : '—'}
              </span>
            </div>
            <div>
              <span className="text-muted">2y: </span>
              <span className={savings2y !== null ? 'font-semibold text-success tabular-nums' : 'text-muted'}>
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
