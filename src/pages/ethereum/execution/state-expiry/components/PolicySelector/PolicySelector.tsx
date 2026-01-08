import { type JSX, useState } from 'react';
import clsx from 'clsx';
import { Popover, PopoverButton, PopoverPanel } from '@/components/Overlays/Popover';
import type { PolicySelectorProps } from './PolicySelector.types';

/**
 * Interactive policy selector displayed as a grid matrix with hover effects and tooltips.
 * Users click cells to select a type + period combination.
 *
 * @example
 * ```tsx
 * <PolicySelector
 *   selectedType="slot"
 *   selectedPolicy="12m"
 *   onSelect={(type, policy) => handleSelect(type, policy)}
 *   savingsData={savingsData}
 *   config={POLICY_CONFIG}
 * />
 * ```
 */
export function PolicySelector<TType extends string, TPolicy extends string>({
  selectedType,
  selectedPolicy,
  onSelect,
  savingsData,
  config,
  className,
}: PolicySelectorProps<TType, TPolicy>): JSX.Element {
  const [hoveredPolicy, setHoveredPolicy] = useState<TPolicy | null>(null);
  const { types, policies, typeConfig, policyConfig, typeTooltips } = config;

  return (
    <div className={clsx('w-full', className)}>
      {/* Grid: columns = row label + N policies */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `minmax(80px, auto) repeat(${policies.length}, 1fr)`,
        }}
      >
        {/* Header row */}
        {/* Empty corner cell */}
        <div className="border-r border-b border-border/30" />

        {/* Period headers with tooltips */}
        {policies.map((policy, idx) => {
          const policyConf = policyConfig[policy];
          const isHovered = hoveredPolicy === policy;
          const isLastCol = idx === policies.length - 1;

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
                  <span className="lg:hidden">{policyConf.shortLabel}</span>
                  <span className="hidden lg:inline">{policyConf.fullLabel}</span>
                </PopoverButton>
                <PopoverPanel anchor="bottom" className="w-52 p-2.5">
                  <p className="text-center text-xs text-muted">{policyConf.tooltip}</p>
                </PopoverPanel>
              </Popover>
            </div>
          );
        })}

        {/* Data rows */}
        {types.map((type, rowIdx) => {
          const typeConf = typeConfig[type];
          const Icon = typeConf.icon;
          const isLastRow = rowIdx === types.length - 1;
          const tooltip = typeTooltips[type];

          return (
            <div key={type} className="contents">
              {/* Row label with tooltip */}
              <div
                className={clsx(
                  'flex h-full items-center justify-center gap-1 border-r border-border/30 p-1.5 transition-colors sm:justify-start sm:gap-1.5 sm:p-3 lg:gap-2 lg:p-6',
                  !isLastRow && 'border-b',
                  typeConf.hoverBg
                )}
              >
                {/* Icon tappable on mobile, icon + label on larger screens */}
                <Popover className="relative">
                  <PopoverButton
                    variant="blank"
                    className={clsx(
                      'flex cursor-pointer items-center gap-1 hover:bg-transparent sm:gap-1.5 sm:underline sm:decoration-dotted sm:underline-offset-2 lg:gap-2 dark:hover:bg-transparent',
                      typeConf.textColor
                    )}
                  >
                    <Icon className={clsx('size-4 shrink-0 sm:size-3.5 lg:size-5', typeConf.textColor)} />
                    <span className={clsx('hidden text-xs font-bold sm:inline lg:text-sm', typeConf.textColor)}>
                      {typeConf.label}
                    </span>
                  </PopoverButton>
                  <PopoverPanel anchor="bottom start" className="w-56 p-2.5">
                    <p className="text-xs/5 text-muted">
                      <span className={clsx('font-semibold', typeConf.textColor)}>{tooltip.title}</span>
                      {' — '}
                      {tooltip.description}
                    </p>
                  </PopoverPanel>
                </Popover>
              </div>

              {/* Data cells */}
              {policies.map((policy, colIdx) => {
                const data = savingsData[type][policy];
                const isSelected = selectedType === type && selectedPolicy === policy;
                const hasData = data.bytesPercent !== null;
                const savingsPercent = Math.abs(data.bytesPercent ?? 0);
                const isLastCol = colIdx === policies.length - 1;

                return (
                  <button
                    key={policy}
                    type="button"
                    onClick={() => hasData && onSelect(type, policy)}
                    disabled={!hasData}
                    className={clsx(
                      'relative flex cursor-pointer items-center justify-center overflow-hidden p-1.5 transition-all duration-150 sm:p-3 lg:p-6',
                      !isLastRow && 'border-b border-border/30',
                      !isLastCol && 'border-r border-border/30',
                      typeConf.cellBg,
                      isSelected
                        ? ['ring-2 ring-inset', typeConf.selectedRing]
                        : hasData
                          ? typeConf.hoverBg
                          : 'cursor-default text-muted/30'
                    )}
                  >
                    {/* Battery fill background */}
                    {hasData && (
                      <div
                        className={clsx('absolute inset-y-0 left-0 transition-all duration-300', typeConf.fillColor)}
                        style={{ width: `${Math.min(savingsPercent, 100)}%` }}
                      />
                    )}
                    {/* Content */}
                    <span className="relative">
                      {hasData ? (
                        <span
                          className={clsx(
                            'text-[11px] font-bold tabular-nums sm:text-sm lg:text-xl',
                            isSelected ? typeConf.textColor : 'text-foreground/80'
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
