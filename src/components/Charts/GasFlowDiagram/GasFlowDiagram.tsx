import { type JSX, useState } from 'react';
import { InformationCircleIcon, PlusIcon, MinusIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { GasFlowDiagramProps, GasType } from './GasFlowDiagram.types';
import { GAS_EXPLANATIONS } from './GasFlowDiagram.types';

/**
 * Format gas value with comma separators
 */
function formatGas(value: number): string {
  return value.toLocaleString();
}

/**
 * Format gas value in compact form (K/M)
 */
function formatGasCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toLocaleString();
}

/**
 * Tooltip component for gas explanations
 */
function GasInfoTooltip({ type, className }: { type: GasType; className?: string }): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const explanation = GAS_EXPLANATIONS[type];

  return (
    <div className={clsx('relative inline-block', className)}>
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className={clsx('opacity-60 transition-opacity hover:opacity-100', explanation.color.text)}
        aria-label={`Info about ${explanation.title}`}
      >
        <InformationCircleIcon className="size-3.5" />
      </button>

      {isVisible && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-xs border border-border bg-background p-3 shadow-lg">
          <div className="mb-1 text-sm font-medium text-foreground">{explanation.title}</div>
          <div className="text-xs text-muted">{explanation.description}</div>
          <div className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-r border-b border-border bg-background" />
        </div>
      )}
    </div>
  );
}

/**
 * Gas segment box component
 */
function GasSegment({
  type,
  value,
  showLabel,
  compact,
}: {
  type: GasType;
  value: number | null;
  showLabel: boolean;
  compact: boolean;
}): JSX.Element {
  const explanation = GAS_EXPLANATIONS[type];
  const displayValue = value !== null ? (compact ? formatGasCompact(value) : formatGas(value)) : 'N/A';

  if (compact) {
    return (
      <div className={clsx('flex items-center gap-1', explanation.color.text)}>
        <span className="font-mono text-sm">{displayValue}</span>
        <GasInfoTooltip type={type} />
      </div>
    );
  }

  return (
    <div className={clsx('rounded-xs border p-3', explanation.color.bg, explanation.color.border)}>
      {showLabel && (
        <div className="mb-1 flex items-center gap-1">
          <span className={clsx('text-xs', explanation.color.text)}>{explanation.title}</span>
          <GasInfoTooltip type={type} />
        </div>
      )}
      <div className={clsx('font-mono', compact ? 'text-sm' : 'text-lg', explanation.color.text)}>{displayValue}</div>
    </div>
  );
}

/**
 * GasFlowDiagram - Visual representation of gas calculation
 *
 * Shows the flow: Intrinsic + EVM - Refund = Receipt
 * with color-coded segments and explanatory tooltips.
 *
 * @example
 * ```tsx
 * <GasFlowDiagram
 *   intrinsicGas={21608}
 *   evmGas={761325}
 *   gasRefund={162000}
 *   receiptGas={620933}
 * />
 * ```
 */
export function GasFlowDiagram({
  intrinsicGas,
  evmGas,
  gasRefund,
  receiptGas,
  compact = false,
  showLabels = true,
  showFormula = true,
  className,
}: GasFlowDiagramProps): JSX.Element {
  if (compact) {
    return (
      <div className={clsx('flex flex-wrap items-center gap-2 text-sm', className)}>
        <GasSegment type="intrinsic" value={intrinsicGas} showLabel={false} compact />
        <PlusIcon className="size-3 text-muted" />
        <GasSegment type="evm" value={evmGas} showLabel={false} compact />
        <MinusIcon className="size-3 text-muted" />
        <GasSegment type="refund" value={gasRefund} showLabel={false} compact />
        <ArrowRightIcon className="size-3 text-muted" />
        <GasSegment type="receipt" value={receiptGas} showLabel={false} compact />
      </div>
    );
  }

  return (
    <div className={clsx('w-full', className)}>
      {/* Main flow diagram */}
      <div className="grid grid-cols-4 gap-3">
        <GasSegment type="intrinsic" value={intrinsicGas} showLabel={showLabels} compact={false} />
        <GasSegment type="evm" value={evmGas} showLabel={showLabels} compact={false} />
        <GasSegment type="refund" value={gasRefund} showLabel={showLabels} compact={false} />
        <GasSegment type="receipt" value={receiptGas} showLabel={showLabels} compact={false} />
      </div>

      {/* Operators between segments */}
      <div className="mt-2 grid grid-cols-4 gap-3">
        <div className="flex items-center justify-end pr-2">
          <PlusIcon className="size-4 text-muted" />
        </div>
        <div className="flex items-center justify-end pr-2">
          <MinusIcon className="size-4 text-muted" />
        </div>
        <div className="flex items-center justify-end pr-2">
          <ArrowRightIcon className="size-4 text-muted" />
        </div>
        <div />
      </div>

      {/* Formula */}
      {showFormula && (
        <div className="mt-3 text-center text-xs text-muted">
          {intrinsicGas !== null ? formatGas(intrinsicGas) : '?'} + {formatGas(evmGas)} - {formatGas(gasRefund)} ={' '}
          {formatGas(receiptGas)}
        </div>
      )}
    </div>
  );
}
