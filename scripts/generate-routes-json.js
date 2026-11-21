#!/usr/bin/env node
/**
 * Routes JSON Generator
 *
 * This script parses the TanStack Router route tree and generates a routes.json file
 * for programmatic access to Lab routes.
 *
 * Usage: node scripts/generate-routes-json.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const ROUTES_DIR = path.join(ROOT_DIR, 'src', 'routes');
const ROUTE_TREE_PATH = path.join(ROOT_DIR, 'src', 'routeTree.gen.ts');
const OUTPUT_PATH = path.join(ROOT_DIR, 'routes.json');

/**
 * Parse route tree file to extract route metadata
 */
function parseRouteTree() {
  const content = fs.readFileSync(ROUTE_TREE_PATH, 'utf-8');
  const routes = new Map();

  // Find the FileRoutesByPath interface
  const interfaceMatch = content.match(/interface FileRoutesByPath\s*\{([\s\S]*?)\n\}/);
  if (!interfaceMatch) {
    console.warn('Could not find FileRoutesByPath interface');
    return routes;
  }

  const interfaceContent = interfaceMatch[1];

  // Match each route entry - key is a quoted string followed by object literal
  // Pattern matches: '/path': { ... }
  const routePattern = /['"]([^'"]+)['"]\s*:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
  let match;

  while ((match = routePattern.exec(interfaceContent)) !== null) {
    const routeKey = match[1];
    const routeBody = match[2];

    // Extract properties from the route body
    const idMatch = routeBody.match(/id\s*:\s*['"]([^'"]*)['"]/);
    const pathMatch = routeBody.match(/path\s*:\s*['"]([^'"]*)['"]/);
    const fullPathMatch = routeBody.match(/fullPath\s*:\s*['"]([^'"]*)['"]/);
    const parentMatch = routeBody.match(/parentRoute\s*:\s*typeof\s+(\w+)/);

    if (fullPathMatch) {
      const fullPath = fullPathMatch[1];
      const routePath = pathMatch ? pathMatch[1] : fullPath;
      const routeId = idMatch ? idMatch[1] : routeKey;

      routes.set(fullPath, {
        id: routeId,
        path: routePath,
        fullPath: fullPath,
        parent: parentMatch ? parentMatch[1] : null,
        isIndex: routeId.endsWith('/'),
      });
    }
  }

  return routes;
}

/**
 * Extract description from a route file by looking for the content property in head.meta
 */
function extractDescription(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Look for description in head.meta array
    const descMatch = content.match(/name\s*:\s*['"]description['"]\s*,\s*content\s*:\s*['"]([^'"]+)['"]/);
    if (descMatch) {
      return descMatch[1];
    }

    // Alternative pattern with backticks (handle multiline)
    const descMatchBacktick = content.match(/name\s*:\s*['"]description['"]\s*,\s*content\s*:\s*`([^`]*)`/s);
    if (descMatchBacktick) {
      return descMatchBacktick[1]
        .replace(/\$\{[^}]+\}/g, '') // Remove template literals
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    }

    return '';
  } catch {
    return '';
  }
}

/**
 * Generate human-readable name from route path
 */
function generateName(fullPath, isIndex) {
  // Remove leading slash and split
  const parts = fullPath.replace(/^\//, '').split('/').filter(Boolean);

  if (parts.length === 0) {
    return 'Home';
  }

  // Get last meaningful part
  const lastPart = parts[parts.length - 1];

  // Handle index routes
  if (isIndex || lastPart === '') {
    if (parts.length <= 1) {
      return 'Overview';
    }
    const parentPart = parts[parts.length - 2];
    return formatSegment(parentPart);
  }

  // Handle parameter routes
  if (lastPart.startsWith('$')) {
    const paramName = lastPart.slice(1);
    const parentPart = parts.length > 1 ? parts[parts.length - 2] : '';
    if (parentPart) {
      return `${formatSegment(parentPart)} Detail`;
    }
    return `${formatSegment(paramName)} Detail`;
  }

  return formatSegment(lastPart);
}

/**
 * Format a route segment into a human-readable name
 */
function formatSegment(segment) {
  // Handle hyphenated names
  const words = segment.split('-').map(word => {
    // Capitalize first letter
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  return words.join(' ');
}

/**
 * Extract parameters from a route path
 */
function extractParameters(routePath) {
  const params = [];
  const parts = routePath.split('/');

  for (const part of parts) {
    if (part.startsWith('$')) {
      params.push(part.slice(1));
    }
  }

  return params;
}

/**
 * Get category from route path
 */
function getCategory(fullPath) {
  const parts = fullPath.replace(/^\//, '').split('/').filter(Boolean);
  return parts.length > 0 ? parts[0] : 'root';
}

/**
 * Find the actual file path for a route
 */
function findRouteFilePath(fullPath, isIndex, routeId) {
  // Convert fullPath to file path
  let filePath = fullPath;

  // Remove leading slash
  filePath = filePath.replace(/^\//, '');

  // Handle index routes
  if (isIndex || fullPath.endsWith('/')) {
    // For index routes, look for index.tsx in the directory
    const dirPath = path.join(ROUTES_DIR, filePath.replace(/\/$/, ''));
    if (fs.existsSync(path.join(dirPath, 'index.tsx'))) {
      return path.join(filePath.replace(/\/$/, ''), 'index.tsx');
    }
  }

  // Handle parameter routes - replace $param with $param.tsx
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1];

  if (fileName.startsWith('$')) {
    return `${filePath}.tsx`;
  }

  // Check if it's a directory with an index
  const dirPath = path.join(ROUTES_DIR, filePath);
  if (fs.existsSync(path.join(dirPath, 'index.tsx'))) {
    return path.join(filePath, 'index.tsx');
  }

  // Try .tsx extension
  if (fs.existsSync(path.join(ROUTES_DIR, `${filePath}.tsx`))) {
    return `${filePath}.tsx`;
  }

  // Try to reconstruct from routeId
  if (routeId && routeId !== '/') {
    const idParts = routeId.replace(/^\//, '').split('/').filter(Boolean);
    if (idParts.length > 0) {
      const reconstructed = idParts.join('/');
      if (fs.existsSync(path.join(ROUTES_DIR, `${reconstructed}.tsx`))) {
        return `${reconstructed}.tsx`;
      }
      if (fs.existsSync(path.join(ROUTES_DIR, reconstructed, 'index.tsx'))) {
        return path.join(reconstructed, 'index.tsx');
      }
    }
  }

  return filePath;
}

/**
 * Build parent route reference from fullPath
 */
function buildParentPath(fullPath, isIndex) {
  const parts = fullPath.replace(/^\//, '').split('/').filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  // Remove last part
  parts.pop();

  if (parts.length === 0) {
    return '/'; // Root is parent
  }

  // Build parent path
  const parentPath = '/' + parts.join('/');

  return parentPath;
}

/**
 * Check if a route has children by looking at other routes
 */
function hasChildren(fullPath, allPaths) {
  // Normalize path (ensure it doesn't end with / for comparison)
  const normalizedPath = fullPath.replace(/\/$/, '');

  for (const otherPath of allPaths) {
    if (otherPath === fullPath) continue;

    // Check if other path starts with this path + /
    const otherNormalized = otherPath.replace(/\/$/, '');
    if (otherNormalized.startsWith(normalizedPath + '/') && otherNormalized !== normalizedPath) {
      return true;
    }
  }

  return false;
}

/**
 * Main function to generate routes.json
 */
function generateRoutes() {
  console.log('🔍 Parsing route tree...');

  const routeTreeRoutes = parseRouteTree();
  const routes = [];
  const categories = new Set();

  // Get all full paths
  const allFullPaths = Array.from(routeTreeRoutes.keys());

  console.log(`   Found ${allFullPaths.length} routes in route tree`);

  for (const [fullPath, routeInfo] of routeTreeRoutes) {
    if (!routeInfo.fullPath) continue;

    const isIndex = routeInfo.isIndex || fullPath.endsWith('/');
    const routePath = routeInfo.path || fullPath;
    const filePath = findRouteFilePath(fullPath, isIndex, routeInfo.id);
    const absoluteFilePath = path.join(ROUTES_DIR, filePath);
    const description = extractDescription(absoluteFilePath);
    const category = getCategory(fullPath);
    categories.add(category);

    // Build parent path
    let parentPath = null;
    if (routeInfo.id && routeInfo.id !== '__root__' && routeInfo.id !== '/') {
      parentPath = buildParentPath(fullPath, isIndex);
    }

    const route = {
      path: routePath,
      fullPath: fullPath,
      name: generateName(fullPath, isIndex),
      description: description,
      parameters: extractParameters(routePath),
      parent: parentPath,
      isIndex: isIndex,
      id: routeInfo.id || fullPath,
      filePath: filePath,
      hasChildren: hasChildren(fullPath, allFullPaths),
      category: category,
    };

    routes.push(route);
  }

  // Sort routes by fullPath for consistency
  routes.sort((a, b) => a.fullPath.localeCompare(b.fullPath));

  const output = {
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    routes: routes,
    categories: Array.from(categories).sort(),
  };

  // Write output
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log(`✅ Generated routes.json with ${routes.length} routes`);
  console.log(`📁 Output: ${OUTPUT_PATH}`);
  console.log(`📂 Categories: ${Array.from(categories).sort().join(', ')}`);

  // Print some statistics
  const paramRoutes = routes.filter(r => r.parameters.length > 0);
  console.log(`🔢 Parameterized routes: ${paramRoutes.length}`);

  if (paramRoutes.length > 0) {
    console.log('   Examples:');
    paramRoutes.slice(0, 5).forEach(r => {
      console.log(`     - ${r.fullPath} (${r.parameters.join(', ')})`);
    });
  }
}

// Run the generator
try {
  generateRoutes();
} catch (error) {
  console.error('❌ Error generating routes:', error);
  process.exit(1);
}
