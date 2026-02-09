export interface SparklineProps {
  /** Data points to plot (nulls create gaps) */
  data: (number | null)[];
  /** Width in pixels @default 120 */
  width?: number;
  /** Height in pixels @default 24 */
  height?: number;
  /** Line color (CSS color string) */
  color?: string;
  /** Line width @default 1.5 */
  lineWidth?: number;
  /** Whether to show area fill under line @default false */
  showArea?: boolean;
  /** Area fill opacity @default 0.15 */
  areaOpacity?: number;
  /** Whether to smooth the line @default true */
  smooth?: boolean;
  /** Animation duration @default 0 */
  animationDuration?: number;
}
