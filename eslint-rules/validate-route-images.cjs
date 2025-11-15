/**
 * @fileoverview Validate that image files referenced in route meta tags exist
 * @author Lab Team
 *
 * This rule validates that all images referenced in og:image and twitter:image
 * meta tags within route files actually exist in the public directory.
 * Images should follow the convention: /images/[section]/[page-name].png
 *
 * Examples of incorrect code:
 *   { property: 'og:image', content: '/images/experiments/missing.png' }
 *
 * Examples of correct code:
 *   { property: 'og:image', content: '/images/xatu/contributors.png' }
 */

const fs = require('fs');
const path = require('path');

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate that image files referenced in route meta tags exist',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      missingImage:
        'Image "{{imagePath}}" does not exist. Create the file at "public{{imagePath}}" or update the image reference.',
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    // Only check files in src/routes directory
    if (!filename.includes('/src/routes/')) {
      return {};
    }

    // Get the project root directory (where public/ is located)
    const projectRoot = path.resolve(process.cwd());
    const publicDir = path.join(projectRoot, 'public');

    /**
     * Check if an image file exists in the public directory
     * @param {string} imagePath - Path like '/images/xatu/contributors.png'
     * @returns {boolean}
     */
    function imageExists(imagePath) {
      // Remove leading slash and join with public directory
      const relativePath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
      const fullPath = path.join(publicDir, relativePath);

      try {
        return fs.existsSync(fullPath);
      } catch {
        return false;
      }
    }

    return {
      // Match property assignment: property: 'og:image' or name: 'twitter:image'
      Property(node) {
        // Check if this is inside a route file's head function
        if (
          node.key &&
          node.key.type === 'Identifier' &&
          (node.key.name === 'property' || node.key.name === 'name') &&
          node.value &&
          node.value.type === 'Literal'
        ) {
          const metaName = node.value.value;

          // Check if this is an og:image or twitter:image property
          if (metaName === 'og:image' || metaName === 'twitter:image') {
            // Find the corresponding content property in the same object
            const parent = node.parent;
            if (parent && parent.type === 'ObjectExpression') {
              const contentProp = parent.properties.find(
                prop =>
                  prop.key &&
                  prop.key.type === 'Identifier' &&
                  prop.key.name === 'content' &&
                  prop.value &&
                  prop.value.type === 'Literal' &&
                  typeof prop.value.value === 'string'
              );

              if (contentProp) {
                const imagePath = contentProp.value.value;

                // Only check paths that start with /images/
                if (imagePath.startsWith('/images/')) {
                  if (!imageExists(imagePath)) {
                    context.report({
                      node: contentProp.value,
                      messageId: 'missingImage',
                      data: {
                        imagePath,
                      },
                    });
                  }
                }
              }
            }
          }
        }
      },
    };
  },
};
