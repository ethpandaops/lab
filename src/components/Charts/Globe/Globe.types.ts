export interface LineData {
  /**
   * Start coordinates [longitude, latitude]
   */
  from: [number, number];
  /**
   * End coordinates [longitude, latitude]
   */
  to: [number, number];
  /**
   * Optional name/label
   */
  name?: string;
}

export interface PointData {
  /**
   * Point name/label
   */
  name: string;
  /**
   * Coordinates [longitude, latitude]
   */
  coord: [number, number];
  /**
   * Optional value for sizing or data representation
   */
  value?: number;
}

export interface GlobeChartProps {
  /**
   * Line data for 3D connections between coordinates
   */
  lines?: LineData[];
  /**
   * Point data for markers on the globe
   */
  points?: PointData[];
  /**
   * Chart title
   */
  title?: string;
  /**
   * Height of the chart in pixels
   * @default 600
   */
  height?: number | string;
  /**
   * Enable auto-rotation of the globe
   * @default true
   */
  autoRotate?: boolean;
  /**
   * Show animated trail effects on lines
   * @default true
   */
  showEffect?: boolean;
  /**
   * Base texture URL for the globe (earth surface)
   */
  baseTexture?: string;
  /**
   * Height/elevation texture URL for displacement mapping
   */
  heightTexture?: string;
  /**
   * Environment texture URL (starfield, etc.)
   */
  environment?: string;
  /**
   * Line color
   */
  lineColor?: string;
  /**
   * Point color
   */
  pointColor?: string;
}
