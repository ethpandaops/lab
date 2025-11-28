import { defineConfig } from '@hey-api/openapi-ts';

const OPENAPI_INPUT =
  process.env.OPENAPI_INPUT || 'https://cbt-api-mainnet.analytics.production.platform.ethpandaops.io/openapi.yaml';

export default defineConfig({
  input: OPENAPI_INPUT,
  output: {
    path: 'src/api',
    format: 'prettier',
    lint: 'eslint',
  },
  plugins: [
    {
      name: '@hey-api/client-fetch',
      runtimeConfigPath: '../utils/api-config.ts',
    },
    {
      name: 'zod',
      compatibilityVersion: 'mini',
      metadata: false,
    },
    '@tanstack/react-query',
    {
      name: '@hey-api/sdk',
      validator: 'zod',
    },
  ],
});
