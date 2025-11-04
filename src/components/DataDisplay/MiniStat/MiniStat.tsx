import type { JSX } from 'react';
import { getHealthColor } from '@/utils/health';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { MiniStatProps } from './MiniStat.types';

/**
 * MiniStat - A compact stat display with optional gauge and percentage
 *
 * Designed to fit inline with other information rows.
 * Can show a vertical gauge bar with percentage, or just display values without gauge.
 *
 * Layout variants:
 * - With secondary text: Label on top, optional gauge + value + secondary text below
 * - Without secondary text: Label and value in 2 rows
 *
 * @example
 * ```tsx
 * // With gauge and secondary text
 * <MiniStat
 *   label="Participation"
 *   value="31,050"
 *   secondaryText="/ 31,068 validators"
 *   percentage={99.94}
 *   showGauge
 * />
 *
 * // Without gauge (just values)
 * <MiniStat
 *   label="First Seen"
 *   value="0.25s"
 * />
 * ```
 */
export function MiniStat({
  label,
  value,
  secondaryText,
  percentage,
  color,
  showGauge = false,
}: MiniStatProps): JSX.Element {
  const themeColors = useThemeColors();

  // Determine color based on percentage if not provided (only when gauge is shown)
  const gaugeColor =
    showGauge && percentage !== undefined ? color || getHealthColor(percentage, themeColors) : undefined;

  // Render circular gauge SVG
  const renderCircularGauge = () => {
    if (!showGauge || percentage === undefined) return null;

    const size = 40;
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/20"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
        {/* Center percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] leading-none font-semibold text-foreground">{percentage.toFixed(0)}%</span>
        </div>
      </div>
    );
  };

  // When there's no secondary text, use 2-row layout with label moved down
  if (!secondaryText) {
    return (
      <div className="flex items-center gap-2">
        {renderCircularGauge()}

        {/* Stats content - 2 rows */}
        <div className="flex-1">
          <dt className="text-xs leading-tight font-medium text-muted">{label}</dt>
          <dd className="text-base leading-tight font-bold text-foreground">{value}</dd>
        </div>
      </div>
    );
  }

  // Default layout with secondary text
  return (
    <div>
      {/* Label */}
      <dt className="text-xs font-medium text-muted">{label}</dt>

      {/* Content with gauge on left, stats on right */}
      <dd className="mt-0.5 flex items-center gap-2">
        {renderCircularGauge()}

        {/* Stats content */}
        <div className="flex-1">
          {/* Value */}
          <div className="text-base leading-tight font-bold text-foreground">{value}</div>
          {/* Secondary text */}
          <div className="text-xs leading-tight text-muted">{secondaryText}</div>
        </div>
      </dd>
    </div>
  );
}
