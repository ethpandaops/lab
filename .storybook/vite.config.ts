import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { msw } from 'msw/vite';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/**
 * Preview compilation only. MSW serves and emits its worker script;
 * preview.tsx starts the worker itself.
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), msw({ mode: 'worker-only' })],
  resolve: { alias: { '@': resolve(import.meta.dirname, '../src') } },
});
