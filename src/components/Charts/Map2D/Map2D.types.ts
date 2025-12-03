export interface RouteData {
  from: [number, number]; // [longitude, latitude]
  to: [number, number]; // [longitude, latitude]
  name?: string;
}

/** Node data for hover display */
export interface PointNodeData {
  nodeId: string; // Unique node identifier
  username?: string; // Node operator username
  timing: number; // Block timing in ms from slot start
  client?: string; // Client implementation name
  country?: string; // Country name for geo hover aggregation
}

export interface PointData {
  name?: string;
  coords: [number, number]; // [longitude, latitude]
  value?: number; // Optional value for sizing the point
  nodes?: PointNodeData[]; // All nodes at this location for tooltip display
}

export interface Map2DChartProps {
  routes?: RouteData[];
  points?: PointData[];
  title?: string;
  height?: number | string;
  showEffect?: boolean;
  lineColor?: string;
  pointColor?: string;
  pointSizeMultiplier?: number;
  roam?: boolean | 'scale' | 'move';
  resetKey?: string | number; // When this changes, chart data is reset
}
