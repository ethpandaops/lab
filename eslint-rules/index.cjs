/**
 * @fileoverview Custom ESLint rules for Lab project
 * @author Lab Team
 *
 * Styling rules (tokens, colours, arbitrary values) are config in eslint.styling.js.
 */

module.exports = {
  rules: {
    'validate-route-images': require('./validate-route-images.cjs'),
  },
};
