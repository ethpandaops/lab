import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-docs',
    '@storybook/addon-vitest',
    '@storybook/addon-themes',
    'storybook/viewport',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  core: {
    builder: '@storybook/builder-vite',
    disableTelemetry: true,
  },
  staticDirs: ['../public'],
  viteFinal: async config => {
    // Set base path for GitHub Pages deployment
    // Use STORYBOOK_BASE_PATH env var, fallback to /lab/ for production builds
    const basePath = process.env.STORYBOOK_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/lab/' : '');
    config.base = basePath;

    // Pass the base path to the app via define
    config.define = {
      ...config.define,
      'import.meta.env.STORYBOOK_BASE_PATH': JSON.stringify(basePath),
    };

    return config;
  },
};
export default config;
