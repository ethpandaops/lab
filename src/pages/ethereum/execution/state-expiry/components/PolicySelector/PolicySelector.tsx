import { Fragment, type JSX, useState } from 'react';
import clsx from 'clsx';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Popover, PopoverButton, PopoverPanel } from '@/components/Overlays/Popover';
import type { PolicySelectorProps } from './PolicySelector.types';

/**
 * Interactive policy selector displayed as a grid matrix with hover effects and tooltips.
 * Users click cells to select a type + period combination.
 * Shows current state as first column (merged cell) and resulting values in policy cells.
 */
export function PolicySelector<TType extends string, TPolicy extends string>({
  selectedType,
  selectedPolicy,
  onSelect,
  savingsData,
  config,
  currentBytes,
  currentSlots,
  formatBytes,
  formatSlots,
  className,
}: PolicySelectorProps<TType, TPolicy>): JSX.Element {
  const [hoveredPolicy, setHoveredPolicy] = useState<TPolicy | null>(null);
  const { types, policies, typeConfig, policyConfig, typeTooltips } = config;

  return (
    <div className={clsx('w-full', className)}>
      {/* Grid: columns = row label + current (merged) + N policies */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `minmax(80px, auto) minmax(120px, auto) repeat(${policies.length}, 1fr)`,
        }}
      >
        {/* Header row */}
        {/* Empty corner cell */}
        <div className="border-r border-b border-border/30" />

        {/* Current header */}
        <div className="flex items-center justify-center gap-1 border-r border-b border-border/30 p-1.5 sm:p-2 lg:p-2.5">
          <span className="text-[10px] font-bold text-muted sm:text-xs lg:text-sm">Current Contract Storage</span>
          <Popover className="relative">
            <PopoverButton
              variant="blank"
              iconOnly
              leadingIcon={
                <InformationCircleIcon className="size-3 text-muted/50 transition-colors hover:text-muted" />
              }
              className="p-0!"
            />
            <PopoverPanel anchor="bottom start" className="w-56 p-2.5">
              <p className="text-xs/5 text-muted">
                <span className="font-semibold text-foreground">Per-slot size</span> = 65 bytes (key overhead) + value
                bytes (leading zeros removed). Based on go-ethereum&apos;s snapshot structure.
              </p>
            </PopoverPanel>
          </Popover>
        </div>

        {/* Period headers with tooltips */}
        {policies.map((policy, idx) => {
          const policyConf = policyConfig[policy];
          const isHovered = hoveredPolicy === policy;
          const isLastCol = idx === policies.length - 1;

          return (
            <div
              key={policy}
              className={clsx(
                'flex items-center justify-center border-b border-border/30 p-1.5 transition-colors sm:p-2 lg:p-2.5',
                !isLastCol && 'border-r',
                isHovered && 'bg-emerald-500/10 dark:bg-emerald-500/15'
              )}
              onMouseEnter={() => setHoveredPolicy(policy)}
              onMouseLeave={() => setHoveredPolicy(null)}
            >
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

        {/* Current value cell - spans all type rows */}
        <div
          className="flex flex-col items-center justify-center border-r border-border/30 bg-muted/5 p-2 lg:p-4"
          style={{ gridColumn: 2, gridRow: `2 / ${2 + types.length}` }}
        >
          {currentBytes !== null && currentSlots !== null ? (
            <>
              <span className="text-xl font-bold text-foreground tabular-nums lg:text-2xl">
                {formatBytes(currentBytes)}
              </span>
              <span className="text-[10px] text-muted tabular-nums lg:text-xs">{formatSlots(currentSlots)} slots</span>
            </>
          ) : (
            <span className="text-sm text-muted/40">—</span>
          )}
        </div>

        {/* Data rows */}
        {types.map((type, rowIdx) => {
          const typeConf = typeConfig[type];
          const Icon = typeConf.icon;
          const isLastRow = rowIdx === types.length - 1;
          const tooltip = typeTooltips[type];

          return (
            <Fragment key={type}>
              {/* Row label with tooltip */}
              <div
                className={clsx(
                  'flex h-full items-center justify-center gap-1 border-r border-border/30 p-1.5 transition-colors sm:justify-start sm:gap-1.5 sm:p-2 lg:gap-2 lg:p-3',
                  !isLastRow && 'border-b',
                  typeConf.hoverBg
                )}
              >
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

              {/* Data cells - enhanced with percentage and resulting value */}
              {policies.map((policy, colIdx) => {
                const data = savingsData[type][policy];
                const isSelected = selectedType === type && selectedPolicy === policy;
                const hasData = data.bytesPercent !== null && data.afterBytes !== null;
                const savingsPercent = Math.abs(data.bytesPercent ?? 0);
                const isLastCol = colIdx === policies.length - 1;

                return (
                  <button
                    key={policy}
                    type="button"
                    onClick={() => hasData && onSelect(type, policy)}
                    disabled={!hasData}
                    style={{ gridColumn: 3 + colIdx }}
                    className={clsx(
                      'relative flex cursor-pointer flex-col items-center justify-center overflow-hidden p-1.5 transition-all duration-150 sm:p-2 lg:p-3',
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
                    <div className="relative flex flex-col items-center">
                      {hasData ? (
                        <>
                          {/* Primary: Percentage */}
                          <span
                            className={clsx(
                              'text-sm font-bold tabular-nums lg:text-lg',
                              isSelected ? typeConf.textColor : 'text-foreground/80'
                            )}
                          >
                            -{savingsPercent.toFixed(0)}%
                          </span>
                          {/* Secondary: Resulting value */}
                          <span
                            className={clsx(
                              'text-[10px] tabular-nums lg:text-xs',
                              isSelected ? typeConf.textColor : 'text-muted'
                            )}
                          >
                            → {formatBytes(data.afterBytes!)}
                          </span>
                          {/* Tertiary: Slots */}
                          {data.afterSlots !== null && (
                            <span
                              className={clsx(
                                'mt-0.5 text-[9px] tabular-nums lg:text-[10px]',
                                isSelected ? typeConf.textColor : 'text-muted'
                              )}
                            >
                              {formatSlots(data.afterSlots)} slots
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted/40">—</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
