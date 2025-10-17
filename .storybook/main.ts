import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@chromatic-com/storybook', '@storybook/addon-docs', '@storybook/addon-vitest', 'storybook/viewport'],
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
    // Update this to match your repository name
    if (process.env.NODE_ENV === 'production') {
      config.base = '/lab/'; // Change 'lab' to your actual repo name
    }
    return config;
  },
};
export default config;
