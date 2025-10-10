import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'http://localhost:8080/openapi.yaml',
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
      metadata: true,
      name: 'zod',
    },
    '@tanstack/react-query',
    {
      name: '@hey-api/sdk',
      validator: 'zod',
    },
  ],
});
