import type { JSX, ReactNode } from 'react';

/**
 * Color variants for gas formula segments
 */
export type GasFormulaColor = 'blue' | 'purple' | 'green' | 'amber' | 'cyan';

/**
 * A segment in the gas formula (before the equals sign)
 */
export interface GasFormulaSegment {
  /** Display label for this segment */
  label: string;
  /** Numeric value */
  value: number;
  /** Color variant */
  color: GasFormulaColor;
  /** Optional tooltip element (e.g., GasTooltip) */
  tooltip?: ReactNode;
  /** Operator before this segment ('+' or '-'). First segment should not have an operator. */
  operator?: '+' | '-';
}

/**
 * The result segment (after the equals sign)
 */
export interface GasFormulaResult {
  /** Display label for the result */
  label: string;
  /** Numeric value */
  value: number;
  /** Optional tooltip element */
  tooltip?: ReactNode;
}

export interface GasFormulaProps {
  /** Array of segments before the equals sign */
  segments: GasFormulaSegment[];
  /** The result segment (after equals sign) */
  result: GasFormulaResult;
  /** Custom value formatter (defaults to toLocaleString) */
  formatter?: (value: number) => string;
}

/**
 * Get Tailwind classes for a color variant
 */
function getColorClasses(color: GasFormulaColor): { border: string; bg: string; text: string } {
  switch (color) {
    case 'blue':
      return { border: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-400' };
    case 'purple':
      return { border: 'border-purple-500/30', bg: 'bg-purple-500/5', text: 'text-purple-400' };
    case 'green':
      return { border: 'border-green-500/30', bg: 'bg-green-500/5', text: 'text-green-400' };
    case 'amber':
      return { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400' };
    case 'cyan':
      return { border: 'border-cyan-500/30', bg: 'bg-cyan-500/5', text: 'text-cyan-400' };
    default:
      return { border: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-400' };
  }
}

/**
 * Get text color for value based on segment color
 */
function getValueColor(color: GasFormulaColor): string {
  switch (color) {
    case 'blue':
      return 'text-blue-500';
    case 'purple':
      return 'text-purple-500';
    case 'green':
      return 'text-green-500';
    case 'amber':
      return 'text-amber-500';
    case 'cyan':
      return 'text-cyan-500';
    default:
      return 'text-blue-500';
  }
}

/**
 * Default value formatter
 */
function defaultFormatter(value: number): string {
  return value.toLocaleString();
}

/**
 * Gas formula visualization component.
 *
 * Displays a visual formula like: Intrinsic + EVM Execution - Refund = Receipt Gas
 * Used across Block, Transaction, and Call pages to show gas breakdowns.
 *
 * @example
 * // Transaction page
 * <GasFormula
 *   segments={[
 *     { label: 'Intrinsic', value: 21000, color: 'blue', tooltip: <GasTooltip type="intrinsic" /> },
 *     { label: 'EVM Execution', value: 50000, color: 'purple', operator: '+' },
 *     { label: 'Refund', value: 1000, color: 'green', operator: '-' },
 *   ]}
 *   result={{ label: 'Receipt Gas', value: 70000 }}
 * />
 */
export function GasFormula({ segments, result, formatter = defaultFormatter }: GasFormulaProps): JSX.Element {
  return (
    <>
      {/* Mobile: vertical stacked layout */}
      <div className="space-y-1.5 sm:hidden">
        {segments.map((segment, index) => {
          const colorClasses = getColorClasses(segment.color);
          const valueColor = getValueColor(segment.color);

          return (
            <div
              key={`mobile-segment-${index}`}
              className={`flex items-center justify-between rounded-xs border-l-2 ${colorClasses.border} ${colorClasses.bg} px-3 py-2`}
            >
              <div className="flex items-center gap-2">
                {segment.operator ? (
                  <span className="w-4 text-center text-sm font-medium text-muted">
                    {segment.operator === '-' ? '−' : '+'}
                  </span>
                ) : (
                  <span className="w-4" />
                )}
                <span className={`text-xs font-medium ${colorClasses.text}`}>{segment.label}</span>
                {segment.tooltip}
              </div>
              <span className={`font-mono text-sm font-semibold ${valueColor}`}>{formatter(segment.value)}</span>
            </div>
          );
        })}

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Result row */}
        <div className="flex items-center justify-between rounded-xs border-l-2 border-primary/40 bg-primary/5 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="w-4 text-center text-sm font-bold text-primary">=</span>
            <span className="text-xs font-medium text-primary">{result.label}</span>
            {result.tooltip}
          </div>
          <span className="font-mono text-sm font-semibold text-foreground">{formatter(result.value)}</span>
        </div>
      </div>

      {/* Desktop: horizontal formula layout */}
      <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-2">
        {segments.map((segment, index) => {
          const colorClasses = getColorClasses(segment.color);
          const valueColor = getValueColor(segment.color);

          return (
            <div key={`segment-${index}`} className="contents">
              {/* Operator (if not first segment) */}
              {segment.operator && (
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-lg font-medium text-muted">
                  {segment.operator === '-' ? '−' : '+'}
                </div>
              )}

              {/* Segment box */}
              <div
                className={`min-w-0 flex-1 basis-24 rounded-sm border ${colorClasses.border} ${colorClasses.bg} px-3 py-2.5 text-center`}
              >
                <div className={`flex items-center justify-center gap-1 text-xs ${colorClasses.text}`}>
                  {segment.label}
                  {segment.tooltip}
                </div>
                <div className={`font-mono text-xl font-semibold ${valueColor}`}>{formatter(segment.value)}</div>
              </div>
            </div>
          );
        })}

        {/* Equals sign */}
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-primary/50 bg-primary/10 text-lg font-bold text-primary">
          =
        </div>

        {/* Result box */}
        <div className="min-w-0 flex-1 basis-24 rounded-sm border-2 border-primary/40 bg-primary/5 px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-primary">
            {result.label}
            {result.tooltip}
          </div>
          <div className="font-mono text-xl font-semibold text-foreground">{formatter(result.value)}</div>
        </div>
      </div>
    </>
  );
}
