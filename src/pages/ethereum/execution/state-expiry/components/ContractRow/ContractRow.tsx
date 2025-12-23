import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import type { FctStorageSlotTop100ByBytes } from '@/api/types.gen';
import { Badge, type BadgeColor } from '@/components/Elements/Badge';

interface ContractRowProps {
  contract: FctStorageSlotTop100ByBytes;
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
 * Individual row for the top 100 contracts list.
 * Displays rank, contract name/address, account owner, usage category, and effective bytes.
 */
export function ContractRow({ contract }: ContractRowProps): JSX.Element {
  const { rank, contract_address, contract_name, account_owner, usage_category, effective_bytes } = contract;

  return (
    <Link
      to="/ethereum/contracts/$address"
      params={{ address: contract_address ?? '' }}
      className="group flex items-center gap-2 px-2 py-1.5 transition-colors hover:bg-muted/30"
    >
      {/* Rank badge */}
      <div className="flex size-5 shrink-0 items-center justify-center rounded-xs bg-primary/10 text-xs font-bold text-primary">
        {rank}
      </div>

      {/* Contract info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {contract_name ? (
            <span className="truncate text-sm text-foreground">{contract_name}</span>
          ) : (
            <span className="truncate font-mono text-sm text-foreground">{contract_address}</span>
          )}
          {usage_category && (
            <Badge color={getCategoryColor(usage_category)} size="small" variant="flat">
              {usage_category}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted">
          {contract_name && <span className="truncate font-mono">{contract_address}</span>}
          {account_owner && (
            <>
              {contract_name && <span className="shrink-0">·</span>}
              <span className="truncate">{account_owner}</span>
            </>
          )}
        </div>
      </div>

      {/* Bytes */}
      <div className="shrink-0 text-right text-xs font-medium text-muted tabular-nums">
        {formatBytes(effective_bytes ?? 0)}
      </div>
    </Link>
  );
}
