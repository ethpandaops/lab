import { type JSX, useState } from 'react';
import clsx from 'clsx';
import { CubeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Popover, PopoverButton, PopoverPanel } from '@/components/Overlays/Popover';
import { EXPIRY_POLICIES, EXPIRY_TYPES, type ExpiryPolicy, type ExpiryType } from '../../hooks';

/** Display labels for expiry policies - short form for compact displays */
const POLICY_LABELS_SHORT: Record<ExpiryPolicy, string> = {
  '6m': '6m',
  '12m': '12m',
  '18m': '18m',
  '24m': '24m',
};

/** Display labels for expiry policies - full form for larger displays */
const POLICY_LABELS_FULL: Record<ExpiryPolicy, string> = {
  '6m': '6 months',
  '12m': '12 months',
  '18m': '18 months',
  '24m': '24 months',
};

/** Tooltip descriptions for types */
const TYPE_TOOLTIPS: Record<ExpiryType, { title: string; description: string }> = {
  slot: {
    title: 'Slot-based expiry',
    description:
      "Tracks each storage slot independently. A slot expires if it hasn't been accessed within the inactivity period. More aggressive pruning, finer control.",
  },
  contract: {
    title: 'Contract-based expiry',
    description:
      'Groups all slots by contract. If ANY slot is accessed, the entire contract stays active. Simpler but less aggressive.',
  },
};

/** Tooltips for each period */
const POLICY_TOOLTIPS: Record<ExpiryPolicy, string> = {
  '6m': 'Storage expires after 6 months of inactivity. Most aggressive pruning.',
  '12m': 'Storage expires after 12 months of inactivity.',
  '18m': 'Storage expires after 18 months of inactivity.',
  '24m': 'Storage expires after 24 months of inactivity. Most conservative.',
};

/** Type config with colors and icons */
const TYPE_CONFIG: Record<
  ExpiryType,
  {
    label: string;
    icon: typeof CubeIcon;
    textColor: string;
    selectedBg: string;
    selectedRing: string;
    hoverBg: string;
    rowHoverBg: string;
    cellBg: string;
    fillColor: string;
  }
> = {
  slot: {
    label: 'Slot',
    icon: CubeIcon,
    textColor: 'text-blue-600 dark:text-blue-400',
    selectedBg: 'bg-blue-500/25',
    selectedRing: 'ring-blue-500 dark:ring-blue-400',
    hoverBg: 'hover:bg-blue-500/20 dark:hover:bg-blue-500/25',
    rowHoverBg: 'bg-blue-500/10 dark:bg-blue-500/15',
    cellBg: 'bg-blue-500/10 dark:bg-blue-500/10',
    fillColor: 'bg-blue-500/30 dark:bg-blue-500/25',
  },
  contract: {
    label: 'Contract',
    icon: DocumentTextIcon,
    textColor: 'text-violet-600 dark:text-violet-400',
    selectedBg: 'bg-violet-500/25',
    selectedRing: 'ring-violet-500 dark:ring-violet-400',
    hoverBg: 'hover:bg-violet-500/20 dark:hover:bg-violet-500/25',
    rowHoverBg: 'bg-violet-500/10 dark:bg-violet-500/15',
    cellBg: 'bg-violet-500/10 dark:bg-violet-500/10',
    fillColor: 'bg-violet-500/30 dark:bg-violet-500/25',
  },
};

interface PolicyData {
  bytesPercent: number | null;
  slotsPercent: number | null;
}

interface PolicySelectorProps {
  /** Currently selected expiry type */
  selectedType: ExpiryType;
  /** Currently selected policy period */
  selectedPolicy: ExpiryPolicy;
  /** Callback when selection changes */
  onSelect: (type: ExpiryType, policy: ExpiryPolicy) => void;
  /** Savings data for each combination */
  savingsData: Record<ExpiryType, Record<ExpiryPolicy, PolicyData>>;
}

/**
 * Interactive policy selector displayed as a full-width grid matrix with hover effects and tooltips.
 * Users click cells to select a type + period combination.
 */
export function PolicySelector({
  selectedType,
  selectedPolicy,
  onSelect,
  savingsData,
}: PolicySelectorProps): JSX.Element {
  const [hoveredPolicy, setHoveredPolicy] = useState<ExpiryPolicy | null>(null);

  return (
    <div className="w-full">
      {/* Grid: 5 columns - row label + 4 policies */}
      <div className="grid grid-cols-[50px_repeat(4,1fr)] sm:grid-cols-[110px_repeat(4,1fr)] lg:grid-cols-[160px_repeat(4,1fr)]">
        {/* Header row */}
        {/* Empty corner cell */}
        <div className="border-r border-b border-border/30" />

        {/* Period headers with tooltips */}
        {EXPIRY_POLICIES.map((policy, idx) => {
          const isHovered = hoveredPolicy === policy;
          const isLastCol = idx === EXPIRY_POLICIES.length - 1;

          return (
            <div
              key={policy}
              className={clsx(
                'flex items-center justify-center border-b border-border/30 p-1.5 transition-colors sm:p-2.5 lg:p-5',
                !isLastCol && 'border-r',
                isHovered && 'bg-emerald-500/10 dark:bg-emerald-500/15'
              )}
              onMouseEnter={() => setHoveredPolicy(policy)}
              onMouseLeave={() => setHoveredPolicy(null)}
            >
              {/* Clickable label with popover */}
              <Popover className="relative">
                <PopoverButton
                  variant="blank"
                  className={clsx(
                    'cursor-pointer text-[10px] font-bold text-emerald-600 underline decoration-emerald-600/30 decoration-dotted underline-offset-2 transition-all hover:bg-transparent hover:decoration-emerald-600 sm:text-xs lg:text-sm dark:text-emerald-400 dark:decoration-emerald-400/30 dark:hover:bg-transparent dark:hover:decoration-emerald-400',
                    isHovered && 'scale-105'
                  )}
                >
                  <span className="lg:hidden">{POLICY_LABELS_SHORT[policy]}</span>
                  <span className="hidden lg:inline">{POLICY_LABELS_FULL[policy]}</span>
                </PopoverButton>
                <PopoverPanel anchor="bottom" className="w-52 p-2.5">
                  <p className="text-center text-xs text-muted">{POLICY_TOOLTIPS[policy]}</p>
                </PopoverPanel>
              </Popover>
            </div>
          );
        })}

        {/* Data rows */}
        {EXPIRY_TYPES.map((type, rowIdx) => {
          const config = TYPE_CONFIG[type];
          const Icon = config.icon;
          const isLastRow = rowIdx === EXPIRY_TYPES.length - 1;
          const tooltip = TYPE_TOOLTIPS[type];

          return (
            <div key={type} className="contents">
              {/* Row label with tooltip */}
              <div
                className={clsx(
                  'flex h-full items-center justify-center gap-1 border-r border-border/30 p-1.5 transition-colors sm:justify-start sm:gap-1.5 sm:p-3 lg:gap-2 lg:p-6',
                  !isLastRow && 'border-b',
                  config.hoverBg
                )}
              >
                {/* Icon tappable on mobile, icon + label on larger screens */}
                <Popover className="relative">
                  <PopoverButton
                    variant="blank"
                    className={clsx(
                      'flex cursor-pointer items-center gap-1 hover:bg-transparent sm:gap-1.5 sm:underline sm:decoration-dotted sm:underline-offset-2 lg:gap-2 dark:hover:bg-transparent',
                      config.textColor,
                      type === 'slot'
                        ? 'sm:decoration-blue-600/30 sm:hover:decoration-blue-600 dark:sm:decoration-blue-400/30 dark:sm:hover:decoration-blue-400'
                        : 'sm:decoration-violet-600/30 sm:hover:decoration-violet-600 dark:sm:decoration-violet-400/30 dark:sm:hover:decoration-violet-400'
                    )}
                  >
                    <Icon className={clsx('size-4 shrink-0 sm:size-3.5 lg:size-5', config.textColor)} />
                    <span className={clsx('hidden text-xs font-bold sm:inline lg:text-sm', config.textColor)}>
                      {config.label}
                    </span>
                  </PopoverButton>
                  <PopoverPanel anchor="bottom start" className="w-56 p-2.5">
                    <p className="text-xs/5 text-muted">
                      <span className={clsx('font-semibold', config.textColor)}>{tooltip.title}</span>
                      {' — '}
                      {tooltip.description}
                    </p>
                  </PopoverPanel>
                </Popover>
              </div>

              {/* Data cells */}
              {EXPIRY_POLICIES.map((policy, colIdx) => {
                const data = savingsData[type][policy];
                const isSelected = selectedType === type && selectedPolicy === policy;
                const hasData = data.bytesPercent !== null;
                const savingsPercent = Math.abs(data.bytesPercent ?? 0);
                const isLastCol = colIdx === EXPIRY_POLICIES.length - 1;

                return (
                  <button
                    key={policy}
                    onClick={() => hasData && onSelect(type, policy)}
                    disabled={!hasData}
                    className={clsx(
                      'relative flex cursor-pointer items-center justify-center overflow-hidden p-1.5 transition-all duration-150 sm:p-3 lg:p-6',
                      !isLastRow && 'border-b border-border/30',
                      !isLastCol && 'border-r border-border/30',
                      config.cellBg,
                      isSelected
                        ? ['ring-2 ring-inset', config.selectedRing]
                        : hasData
                          ? config.hoverBg
                          : 'cursor-default text-muted/30'
                    )}
                  >
                    {/* Battery fill background */}
                    {hasData && (
                      <div
                        className={clsx('absolute inset-y-0 left-0 transition-all duration-300', config.fillColor)}
                        style={{ width: `${Math.min(savingsPercent, 100)}%` }}
                      />
                    )}
                    {/* Content */}
                    <span className="relative">
                      {hasData ? (
                        <span
                          className={clsx(
                            'text-[11px] font-bold tabular-nums sm:text-sm lg:text-xl',
                            isSelected ? config.textColor : 'text-foreground/80'
                          )}
                        >
                          -{savingsPercent.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-sm text-muted/40">—</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
