import { defineConfig, type UserConfig } from '@hey-api/openapi-ts';

const OPENAPI_INPUT =
  process.env.OPENAPI_INPUT || 'https://cbt-api-mainnet.analytics.production.platform.ethpandaops.io/openapi.yaml';

const plugins = (zod: { compatibilityVersion?: 'mini' }): UserConfig['plugins'] => [
  {
    name: '@hey-api/client-fetch',
    runtimeConfigPath: '../utils/api-config.ts',
  },
  {
    name: 'zod',
    metadata: false,
    ...zod,
  },
  '@tanstack/react-query',
  {
    name: '@hey-api/sdk',
    validator: 'zod',
  },
];

// Generates src/api (the CBT tables) and src/lab-api (lab-backend's own routes): `pnpm generate:api`. Never edit
// either. Each gets its own client: NetworkProvider rewrites CBT paths to the current network, while lab-backend's
// paths name their network themselves.
export default defineConfig([
  {
    input: OPENAPI_INPUT,
    output: { path: 'src/api', postProcess: ['prettier'] },
    // The CBT schemas are megabytes, loaded with the pages that query them; zod/mini keeps them small
    plugins: plugins({ compatibilityVersion: 'mini' }),
  },
  {
    input: './openapi/lab-backend.yaml',
    output: { path: 'src/lab-api', postProcess: ['prettier'] },
    // The configuration is validated before the first render. Classic zod is in the entry chunk already; zod/mini there
    // would cost the CBT schema chunk 25 kB gzipped, as its minifier could no longer drop unused schemas.
    plugins: plugins({}),
  },
]);
