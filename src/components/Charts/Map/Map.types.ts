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
   * @default '#333'
   */
  environment?: string;
  /**
   * Route line color
   */
  lineColor?: string;
  /**
   * Map base color
   * @default '#000'
   */
  mapColor?: string;
  /**
   * Camera viewing distance
   * @default 70
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
}
