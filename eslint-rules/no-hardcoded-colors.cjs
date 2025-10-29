/**
 * @fileoverview Ban hardcoded colors (hex, rgb, hsl) in Tailwind classes
 * @author Lab Team
 *
 * This rule prevents developers from using hardcoded color values in Tailwind
 * className strings. All colors should come from the semantic color tokens
 * defined in src/index.css.
 *
 * Examples of incorrect code:
 *   className="bg-[#ff0000]"
 *   className="text-[rgb(255,0,0)]"
 *   className="border-[hsl(0,100%,50%)]"
 *
 * Examples of correct code:
 *   className="bg-primary"
 *   className="text-danger"
 *   className="border-accent"
 */

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded colors in Tailwind classes',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      hardcodedHexColor:
        'Hardcoded hex color "{{value}}" detected. Use semantic color tokens from src/index.css instead (e.g., bg-primary, text-danger, border-accent).',
      hardcodedRgbColor:
        'Hardcoded RGB color "{{value}}" detected. Use semantic color tokens from src/index.css instead (e.g., bg-primary, text-danger, border-accent).',
      hardcodedHslColor:
        'Hardcoded HSL color "{{value}}" detected. Use semantic color tokens from src/index.css instead (e.g., bg-primary, text-danger, border-accent).',
    },
    schema: [],
  },

  create(context) {
    // Patterns to detect hardcoded colors in Tailwind arbitrary values
    const hexPattern = /\[#[0-9a-fA-F]{3,8}\]/g;
    const rgbPattern = /\[rgba?\([^)]+\)\]/g;
    const hslPattern = /\[hsla?\([^)]+\)\]/g;

    /**
     * Check if a string value contains hardcoded color values
     * @param {import('estree').Node} node - The AST node
     * @param {string} value - The string value to check
     */
    function checkForHardcodedColors(node, value) {
      // Check for hex colors
      const hexMatches = value.match(hexPattern);
      if (hexMatches) {
        hexMatches.forEach(match => {
          context.report({
            node,
            messageId: 'hardcodedHexColor',
            data: { value: match },
          });
        });
      }

      // Check for RGB colors
      const rgbMatches = value.match(rgbPattern);
      if (rgbMatches) {
        rgbMatches.forEach(match => {
          context.report({
            node,
            messageId: 'hardcodedRgbColor',
            data: { value: match },
          });
        });
      }

      // Check for HSL colors
      const hslMatches = value.match(hslPattern);
      if (hslMatches) {
        hslMatches.forEach(match => {
          context.report({
            node,
            messageId: 'hardcodedHslColor',
            data: { value: match },
          });
        });
      }
    }

    return {
      // Handle JSX className attributes
      JSXAttribute(node) {
        if (
          node.name.name === 'className' &&
          node.value &&
          node.value.type === 'Literal' &&
          typeof node.value.value === 'string'
        ) {
          checkForHardcodedColors(node, node.value.value);
        }

        // Handle template literals in className
        if (
          node.name.name === 'className' &&
          node.value &&
          node.value.type === 'JSXExpressionContainer' &&
          node.value.expression.type === 'TemplateLiteral'
        ) {
          node.value.expression.quasis.forEach(quasi => {
            checkForHardcodedColors(node, quasi.value.raw);
          });
        }
      },

      // Handle clsx/classnames/cn function calls
      CallExpression(node) {
        const functionName = node.callee.name;
        if (['clsx', 'classnames', 'cn', 'cva'].includes(functionName)) {
          node.arguments.forEach(arg => {
            if (arg.type === 'Literal' && typeof arg.value === 'string') {
              checkForHardcodedColors(arg, arg.value);
            }
            if (arg.type === 'TemplateLiteral') {
              arg.quasis.forEach(quasi => {
                checkForHardcodedColors(arg, quasi.value.raw);
              });
            }
          });
        }
      },
    };
  },
};
