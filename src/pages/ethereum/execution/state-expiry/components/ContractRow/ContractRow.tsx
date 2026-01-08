import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Badge, type BadgeColor } from '@/components/Elements/Badge';
import type { ContractTop100Item } from '../../hooks';

interface ContractRowProps {
  item: ContractTop100Item;
}

/** Map usage categories to badge colors */
const CATEGORY_COLORS: Record<string, BadgeColor> = {
  stablecoin: 'green',
  dex: 'blue',
  trading: 'indigo',
  defi: 'purple',
  nft: 'pink',
  bridge: 'yellow',
  lending: 'green',
  gaming: 'pink',
  infrastructure: 'gray',
  governance: 'indigo',
  oracle: 'yellow',
  layer2: 'blue',
};

/**
 * Get badge color for a usage category
 */
function getCategoryColor(category: string): BadgeColor {
  const normalized = category.toLowerCase().trim();
  return CATEGORY_COLORS[normalized] ?? 'gray';
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
 * Calculate savings percentage between base and expiry bytes
 */
function calculateSavings(baseBytes: number | undefined, expiryBytes: number | undefined): number | null {
  if (baseBytes === undefined || expiryBytes === undefined || baseBytes === 0) return null;
  return ((baseBytes - expiryBytes) / baseBytes) * 100;
}

/**
 * Table row for the top 100 contracts list (desktop view).
 * Displays rank, contract name/address with category badge, owner, size, and expiry savings.
 */
export function ContractRow({ item }: ContractRowProps): JSX.Element {
  const { contract, expiry12m, expiry24m } = item;
  const { rank, contract_address, contract_name, account_owner, labels, effective_bytes } = contract;

  // Calculate savings percentages
  const savings1y = calculateSavings(effective_bytes, expiry12m?.effective_bytes);
  const savings2y = calculateSavings(effective_bytes, expiry24m?.effective_bytes);

  return (
    <tr className="group transition-colors hover:bg-muted/30">
      {/* Rank */}
      <td className="px-2 py-1.5 text-center whitespace-nowrap">
        <Link
          to="/ethereum/contracts/$address"
          params={{ address: contract_address ?? '' }}
          className="flex size-5 items-center justify-center rounded-xs bg-primary/10 text-xs font-bold text-primary"
        >
          {rank}
        </Link>
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
              <Badge key={label} color={getCategoryColor(label)} size="small" variant="flat">
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

      {/* Size */}
      <td className="px-2 py-1.5 text-right text-xs font-medium whitespace-nowrap text-muted tabular-nums">
        {formatBytes(effective_bytes ?? 0)}
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
export function ContractCard({ item }: ContractRowProps): JSX.Element {
  const { contract, expiry12m, expiry24m } = item;
  const { rank, contract_address, contract_name, account_owner, labels, effective_bytes } = contract;

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
        {/* Rank badge */}
        <div className="flex size-7 shrink-0 items-center justify-center rounded-xs bg-primary/10 text-sm font-bold text-primary">
          {rank}
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
              <Badge key={label} color={getCategoryColor(label)} size="small" variant="flat">
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
              <span className="font-medium text-foreground tabular-nums">{formatBytes(effective_bytes ?? 0)}</span>
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
