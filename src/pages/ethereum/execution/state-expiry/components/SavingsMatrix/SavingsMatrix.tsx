import { Fragment, type JSX } from 'react';
import clsx from 'clsx';
import { EXPIRY_POLICIES, type ExpiryPolicy, type ExpiryType } from '../../hooks';

/** Display labels for expiry policies */
const POLICY_LABELS: Record<ExpiryPolicy, string> = {
  '6m': '6 Month',
  '12m': '12 Month',
  '18m': '18 Month',
  '24m': '24 Month',
};

interface PolicyExpiryData {
  effectiveBytes: number | null;
  activeSlots: number | null;
}

interface SavingsMatrixProps {
  /** Current baseline bytes */
  currentBytes: number;
  /** Current baseline slots */
  currentSlots: number;
  /** Slot expiry data for each policy */
  slotExpiryData: Record<ExpiryPolicy, PolicyExpiryData>;
  /** Contract expiry data for each policy */
  contractExpiryData: Record<ExpiryPolicy, PolicyExpiryData>;
  /** Currently selected expiry type (for highlighting) */
  selectedExpiryType: ExpiryType;
  /** Currently selected policy (for highlighting) */
  selectedPolicy: ExpiryPolicy;
}

/**
 * Format bytes to human-readable format (GB, TB)
 */
function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1000) {
    return `${(gb / 1024).toFixed(4)} TB`;
  }
  return `${gb.toFixed(4)} GB`;
}

/**
 * Format storage slot count to human-readable format (M for millions, B for billions)
 */
function formatStorageSlotCount(count: number): string {
  if (count >= 1_000_000_000) {
    return `${(count / 1_000_000_000).toFixed(4)}B`;
  }
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(4)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(4)}K`;
  }
  return count.toFixed(0);
}

interface CellData {
  bytesSaved: number;
  bytesPercent: number;
  slotsSaved: number;
  slotsPercent: number;
  hasData: boolean;
}

/**
 * Calculate savings for a single cell
 */
function calculateCellData(currentBytes: number, currentSlots: number, policyData: PolicyExpiryData): CellData {
  if (policyData.effectiveBytes === null || policyData.activeSlots === null) {
    return {
      bytesSaved: 0,
      bytesPercent: 0,
      slotsSaved: 0,
      slotsPercent: 0,
      hasData: false,
    };
  }

  const bytesSaved = currentBytes - policyData.effectiveBytes;
  const bytesPercent = currentBytes > 0 ? (bytesSaved / currentBytes) * 100 : 0;
  const slotsSaved = currentSlots - policyData.activeSlots;
  const slotsPercent = currentSlots > 0 ? (slotsSaved / currentSlots) * 100 : 0;

  return {
    bytesSaved,
    bytesPercent,
    slotsSaved,
    slotsPercent,
    hasData: true,
  };
}

/**
 * Comparison matrix showing savings across all 8 combinations of expiry policies and types.
 * Highlights the currently selected combination.
 */
export function SavingsMatrix({
  currentBytes,
  currentSlots,
  slotExpiryData,
  contractExpiryData,
  selectedExpiryType,
  selectedPolicy,
}: SavingsMatrixProps): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        {/* Grid: 3 columns (row label + 2 expiry types) */}
        <div className="grid grid-cols-3 gap-1">
          {/* Header row */}
          <div className="p-2" /> {/* Empty corner cell */}
          <div className="p-2 text-center">
            <span className="text-sm font-semibold text-foreground">Slot Expiry</span>
          </div>
          <div className="p-2 text-center">
            <span className="text-sm font-semibold text-foreground">Contract Expiry</span>
          </div>
          {/* Data rows */}
          {EXPIRY_POLICIES.map(policy => {
            const slotData = calculateCellData(currentBytes, currentSlots, slotExpiryData[policy]);
            const contractData = calculateCellData(currentBytes, currentSlots, contractExpiryData[policy]);

            const isSlotSelected = selectedExpiryType === 'slot' && selectedPolicy === policy;
            const isContractSelected = selectedExpiryType === 'contract' && selectedPolicy === policy;

            return (
              <Fragment key={policy}>
                {/* Row label */}
                <div className="flex items-center p-2">
                  <span className="text-sm font-medium text-muted">{POLICY_LABELS[policy]}</span>
                </div>

                {/* Slot expiry cell */}
                <div
                  className={clsx(
                    'relative overflow-hidden border p-3 transition-all',
                    isSlotSelected ? 'border-primary ring-2 ring-primary' : 'border-border'
                  )}
                >
                  {/* Battery fill background */}
                  <div
                    className="absolute inset-0 bg-emerald-500/15 transition-all"
                    style={{ width: slotData.hasData ? `${Math.min(slotData.bytesPercent, 100)}%` : '0%' }}
                  />
                  {/* Content */}
                  <div className="relative">
                    {slotData.hasData ? (
                      <div className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold text-emerald-400 tabular-nums">
                            -{formatBytes(slotData.bytesSaved)}
                          </span>
                          <span className="bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-400 tabular-nums">
                            -{slotData.bytesPercent.toFixed(4)}%
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs text-muted tabular-nums">
                            -{formatStorageSlotCount(slotData.slotsSaved)} slots
                          </span>
                          <span className="text-xs text-muted tabular-nums">-{slotData.slotsPercent.toFixed(4)}%</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-muted">No data</div>
                    )}
                  </div>
                </div>

                {/* Contract expiry cell */}
                <div
                  className={clsx(
                    'relative overflow-hidden border p-3 transition-all',
                    isContractSelected ? 'border-primary ring-2 ring-primary' : 'border-border'
                  )}
                >
                  {/* Battery fill background */}
                  <div
                    className="absolute inset-0 bg-emerald-500/15 transition-all"
                    style={{ width: contractData.hasData ? `${Math.min(contractData.bytesPercent, 100)}%` : '0%' }}
                  />
                  {/* Content */}
                  <div className="relative">
                    {contractData.hasData ? (
                      <div className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold text-emerald-400 tabular-nums">
                            -{formatBytes(contractData.bytesSaved)}
                          </span>
                          <span className="bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-400 tabular-nums">
                            -{contractData.bytesPercent.toFixed(4)}%
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs text-muted tabular-nums">
                            -{formatStorageSlotCount(contractData.slotsSaved)} slots
                          </span>
                          <span className="text-xs text-muted tabular-nums">
                            -{contractData.slotsPercent.toFixed(4)}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-muted">No data</div>
                    )}
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
