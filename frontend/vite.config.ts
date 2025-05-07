import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tsconfigPaths(), tailwindcss()],
  server: {
    proxy: {
      // '/lab-data': {
      //   target: 'https://lab-api.primary.staging.platform.ethpandaops.io',
      //   changeOrigin: true,
      //   secure: false,
      // },
      '/lab-data': {
        target: 'http://localhost:8080',
      },
    },
  },
});
