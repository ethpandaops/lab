import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Recursively find all .tsx files in a directory
 */
async function findTsxFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findTsxFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Vite plugin to validate that image files referenced in route meta tags exist.
 *
 * This plugin scans all route files for og:image and twitter:image meta tags,
 * extracts the image paths, and verifies that the corresponding files exist
 * in the public directory. If any images are missing, the build fails with
 * a clear error message.
 */
export function validateRouteImages(): Plugin {
  return {
    name: 'validate-route-images',
    async buildStart() {
      const publicDir = join(process.cwd(), 'public');
      const routesDir = join(process.cwd(), 'src', 'routes');

      // Find all route files
      const routeFiles = await findTsxFiles(routesDir);

      const missingImagesByPath = new Map<string, Set<string>>();
      const imageRegex =
        /(?:property|name):\s*['"](?:og:image|twitter:image)['"]\s*,\s*content:\s*['"](\/images\/[^'"]+)['"]/g;

      for (const routeFile of routeFiles) {
        const content = await fs.readFile(routeFile, 'utf-8');

        // Find all image references in this file
        const imagesInFile = new Set<string>();
        let match;
        while ((match = imageRegex.exec(content)) !== null) {
          const imagePath = match[1]; // e.g., '/images/ethereum/forks.png'
          imagesInFile.add(imagePath);
        }

        // Check each unique image in this file
        for (const imagePath of imagesInFile) {
          const fullImagePath = join(publicDir, imagePath);

          try {
            await fs.access(fullImagePath);
          } catch {
            // Image doesn't exist
            const relativeRoutePath = routeFile.replace(process.cwd() + '/', '');
            if (!missingImagesByPath.has(imagePath)) {
              missingImagesByPath.set(imagePath, new Set());
            }
            missingImagesByPath.get(imagePath)!.add(relativeRoutePath);
          }
        }
      }

      if (missingImagesByPath.size > 0) {
        const errorLines = ['\n❌ Route image validation failed!\n'];
        errorLines.push('The following images are referenced but do not exist:\n');

        for (const [imagePath, files] of missingImagesByPath) {
          errorLines.push(`\n  Missing: ${imagePath}`);
          errorLines.push('  Referenced in:');
          for (const file of files) {
            errorLines.push(`    • ${file}`);
          }
        }

        errorLines.push('\nPlease create the missing images in the public directory or remove the references.\n');

        throw new Error(errorLines.join('\n'));
      }

      console.log('✅ All route images validated successfully');
    },
  };
}
