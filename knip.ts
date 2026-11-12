// Knip's Vite, Vitest and Storybook plugins find main.tsx, the test setups and
// the stories on their own. Its Tailwind and Storybook plugins also reduce CSS
// and MDX files to their imports (@import, @plugin, MDX import lines), so the
// stylesheets and docs pages listed in `project` count as importers.
//
// The knip script sets KNIP_DISABLE_RAW_TRANSFER: knip's parser otherwise
// reserves 6 GiB of address space, which Linux refuses on machines with less
// memory plus swap than that.
export default {
  entry: ['src/routes/**/*.tsx'],
  project: ['src/**/*.{ts,tsx,css,mdx}'],
  // Generated from the CBT and lab-backend OpenAPI specs; they export every
  // operation and type whether or not the app uses them.
  ignore: ['src/api/**', 'src/lab-api/**'],
  ignoreDependencies: [
    // CountryFlag loads the flag SVGs with import.meta.glob on a node_modules
    // path, which knip does not resolve to the package.
    'country-flag-icons',
    // commitlint has no script or hook; it is run by hand against
    // commitlint.config.js.
    '@commitlint/cli',
  ],
};
