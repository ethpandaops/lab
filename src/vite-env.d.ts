/// <reference types="vite/client" />

// Type declarations for echarts-gl selective imports
// echarts-gl doesn't provide individual module types, so we declare them here
// Using EChartsExtension from echarts/core as the proper type
declare module 'echarts-gl/charts' {
  import type { EChartsExtension } from 'echarts/core';
  export const Lines3DChart: EChartsExtension;
  export const Scatter3DChart: EChartsExtension;
  export const Map3DChart: EChartsExtension;
}

declare module 'echarts-gl/components' {
  import type { EChartsExtension } from 'echarts/core';
  export const GlobeComponent: EChartsExtension;
  export const Geo3DComponent: EChartsExtension;
  export const Grid3DComponent: EChartsExtension;
}
