import { defineConfig, type UserConfig } from '@hey-api/openapi-ts';

const OPENAPI_INPUT =
  process.env.OPENAPI_INPUT || 'https://cbt-api-mainnet.analytics.production.platform.ethpandaops.io/openapi.yaml';

const plugins = (zod: { compatibilityVersion?: 'mini' }, validator: 'zod' | false): UserConfig['plugins'] => [
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
    validator,
  },
];

// Both output folders are in .prettierignore, which the 'prettier' preset reads, so format them reading .gitignore only
const prettier = {
  command: 'prettier',
  args: ['--ignore-unknown', '--write', '--ignore-path', '.gitignore', '{{path}}'],
};

// Generates src/api (the CBT tables) and src/lab-api (lab-backend's own routes): `pnpm generate:api`. Never edit
// either. Each gets its own client: NetworkProvider rewrites CBT paths to the current network, while lab-backend's
// paths name their network themselves.
export default defineConfig([
  {
    input: OPENAPI_INPUT,
    output: { path: 'src/api', postProcess: [prettier] },
    // The CBT schemas are megabytes, loaded with the pages that query them; zod/mini keeps them small
    plugins: plugins({ compatibilityVersion: 'mini' }, 'zod'),
  },
  {
    input: './openapi/lab-backend.yaml',
    output: { path: 'src/lab-api', postProcess: [prettier] },
    // Not validated: this spec is written by hand, and a field it gets wrong must not stop the app from loading. Its
    // few schemas use classic zod, which the entry chunk loads for the routes' search params anyway.
    plugins: plugins({}, false),
  },
]);
