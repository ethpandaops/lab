export interface RouteData {
  from: [number, number]; // [longitude, latitude]
  to: [number, number]; // [longitude, latitude]
  name?: string;
}

export interface PointData {
  name?: string;
  coords: [number, number]; // [longitude, latitude]
  value?: number; // Optional value for sizing the point
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
  mapColor?: string;
  roam?: boolean | 'scale' | 'move';
  animationDuration?: number;
  resetKey?: string | number; // When this changes, chart data is reset
}
