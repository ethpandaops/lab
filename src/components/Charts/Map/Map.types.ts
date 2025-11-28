export interface RouteData {
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
   * Coordinates [longitude, latitude]
   */
  coords: [number, number];
  /**
   * Optional name/label
   */
  name?: string;
  /**
   * Optional value (affects point size)
   */
  value?: number;
}

export interface MapChartProps {
  /**
   * Route data for 3D flight paths between coordinates
   */
  routes?: RouteData[];
  /**
   * Point/scatter data for locations on the map
   */
  points?: PointData[];
  /**
   * Point color
   */
  pointColor?: string;
  /**
   * Point size
   * @default 4
   */
  pointSize?: number;
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
   * Show animated trail effects on routes
   * @default true
   */
  showEffect?: boolean;
  /**
   * Environment/background color
   * When not provided, defaults to theme-aware colors (zinc-900 for dark, zinc-100 for light)
   */
  environment?: string;
  /**
   * Route line color
   */
  lineColor?: string;
  /**
   * Map base color
   * When not provided, defaults to theme-aware colors (zinc-800 for dark, zinc-200 for light)
   */
  mapColor?: string;
  /**
   * Camera viewing distance
   * @default 120
   */
  distance?: number;
  /**
   * Camera angle (alpha)
   * @default 89
   */
  alpha?: number;
  /**
   * Region height/elevation
   * @default 0.5
   */
  regionHeight?: number;
  /**
   * Minimum camera distance (max zoom in)
   * @default 40
   */
  minDistance?: number;
  /**
   * Maximum camera distance (max zoom out)
   * @default 200
   */
  maxDistance?: number;
  /**
   * Whether to merge new options with existing chart (false) or replace entirely (true)
   * Set to false for better performance when updating frequently
   * @default false
   */
  /**
   * Whether to defer chart updates to next animation frame for better performance
   * @default true
   */
}
