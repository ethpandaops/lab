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
  /**
   * Point size
   * @default 2
   */
  pointSize?: number;
  /**
   * Point opacity
   * @default 0.2
   */
  pointOpacity?: number;
  /**
   * Shading method for globe rendering
   * - 'lambert': Simple diffuse shading for matte surfaces (default)
   * - 'realistic': PBR-based rendering with metalness and roughness parameters
   * - 'color': Basic flat coloring for simple visualizations
   * @default 'lambert'
   */
  shading?: 'lambert' | 'realistic' | 'color';
  /**
   * Material roughness (0-1) when using realistic shading
   * Higher values create more matte/rough surfaces
   * @default 0.8
   */
  roughness?: number;
  /**
   * Material metalness (0-1) when using realistic shading
   * Higher values make surface more metallic
   * @default 0
   */
  metalness?: number;
  /**
   * Enable post-processing effects (SSAO, depth of field, etc.)
   * Enhances visual quality but requires more GPU resources
   * @default false
   */
  enablePostEffect?: boolean;
  /**
   * Enable temporal super sampling for anti-aliasing
   * Progressively enhances image quality when globe is static
   * @default true (when postEffect is enabled)
   */
  enableTemporalSuperSampling?: boolean;
  /**
   * Show atmospheric glow effect around the globe
   * @default false
   */
  showAtmosphere?: boolean;
  /**
   * Main light intensity (0-2)
   * @default 0.4
   */
  lightIntensity?: number;
  /**
   * Ambient light intensity (0-2)
   * @default 0.4
   */
  ambientLightIntensity?: number;
}
