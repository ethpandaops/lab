// esbuild compiles `import X from 'echarts-for-react/lib/core'` with node-style
// CJS interop (__toESM(..., 1)), so the default becomes the whole CJS exports
// object ({ default: EChartsReactCore, __esModule: true }) instead of the class.
// React then receives an object as an element type and throws. This shim
// imports the real CJS module (via the explicit .js path so the lib/core
// redirect in tsconfig.paths.json does not loop back here) and re-exports the
// actual component as a clean ESM default.
import mod from 'echarts-for-react/lib/core.js';

export default (mod && mod.default) || mod;
