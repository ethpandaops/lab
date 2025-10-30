/**
 * @fileoverview Custom ESLint rules for Lab project
 * @author Lab Team
 *
 * This module exports custom ESLint rules that enforce color usage standards
 * in the Lab project. All colors should be defined in src/index.css using
 * the two-tier color architecture (primitive scales + semantic tokens).
 */

module.exports = {
  rules: {
    'no-hardcoded-colors': require('./no-hardcoded-colors.cjs'),
    'no-primitive-color-scales': require('./no-primitive-color-scales.cjs'),
  },
};
