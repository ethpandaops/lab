import type { Plugin } from 'vite';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

interface HeadMeta {
  title?: string;
  name?: string;
  content?: string;
  charSet?: string;
  property?: string;
  httpEquiv?: string;
  itemProp?: string;
}

interface HeadLink {
  rel: string;
  href: string;
  type?: string;
  hreflang?: string;
}

interface HeadStyle {
  media?: string;
  children: string;
}

interface HeadScript {
  src?: string;
  children?: string;
}

interface HeadData {
  meta?: HeadMeta[];
  links?: HeadLink[];
  styles?: HeadStyle[];
  scripts?: HeadScript[];
}

interface RouteHeadData {
  meta?: HeadMeta[];
  links?: HeadLink[];
  styles?: HeadStyle[];
  scripts?: HeadScript[];
  raw: string;
}

interface HeadJsonOutput {
  [path: string]: RouteHeadData;
}

/**
 * Recursively find all .tsx files in a directory
 */
function findTsxFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      findTsxFiles(filePath, fileList);
    } else if (file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

/**
 * Extract a balanced object starting from a position by counting braces
 */
function extractBalancedObject(text: string, startPos: number): string {
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  let escaped = false;

  for (let i = startPos; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if ((char === '"' || char === "'" || char === '`') && !inString) {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === stringChar && inString) {
      inString = false;
      stringChar = '';
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        return text.substring(startPos, i + 1);
      }
    }
  }

  return '';
}

/**
 * Parse a head object from JavaScript object literal string to HeadData
 */
function parseHeadObject(headObjectText: string, env: Record<string, string> = {}): HeadData | null {
  try {
    // Remove single-line comments (// ...) - only match when preceded by whitespace, comma, or braces
    // This avoids matching // in URLs like "https://example.com"
    headObjectText = headObjectText.replace(/(^|[\s,{}[\]])(\/\/[^\n]*)/gm, '$1');

    // Remove multi-line comments (/* ... */)
    headObjectText = headObjectText.replace(/\/\*[\s\S]*?\*\//g, '');

    // Replace template literals with env variables: `${import.meta.env.VAR}` or `prefix ${import.meta.env.VAR} suffix`
    headObjectText = headObjectText.replace(/`([^`]*)`/g, (_match, content) => {
      let result = content;
      Object.entries(env).forEach(([key, value]) => {
        const envVarRegex = new RegExp(`\\$\\{import\\.meta\\.env\\.${key}\\}`, 'g');
        result = result.replace(envVarRegex, value);
      });
      return `"${result}"`;
    });

    // Replace standalone import.meta.env.VAR_NAME with actual values from Vite config
    Object.entries(env).forEach(([key, value]) => {
      const envVarRegex = new RegExp(`import\\.meta\\.env\\.${key}`, 'g');
      headObjectText = headObjectText.replace(envVarRegex, `"${value}"`);
    });

    // Remove trailing commas that would make JSON invalid
    headObjectText = headObjectText.replace(/,(\s*[}\]])/g, '$1');

    // Convert JavaScript object literal to JSON
    let jsonText = '';
    let inString = false;
    let stringChar = '';
    let i = 0;

    while (i < headObjectText.length) {
      const char = headObjectText[i];

      // Handle string delimiters
      if ((char === '"' || char === "'") && (i === 0 || headObjectText[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
          jsonText += '"'; // Always use double quotes in JSON
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
          jsonText += '"';
        } else {
          jsonText += char;
        }
        i++;
        continue;
      }

      // Inside a string, just copy characters
      if (inString) {
        jsonText += char;
        i++;
        continue;
      }

      // Outside strings, look for unquoted keys (word followed by colon)
      if (/\w/.test(char)) {
        let word = '';
        while (i < headObjectText.length && /\w/.test(headObjectText[i])) {
          word += headObjectText[i];
          i++;
        }

        // Check if this word is followed by a colon (making it a key)
        const afterWord = i;
        while (i < headObjectText.length && /\s/.test(headObjectText[i])) i++;

        if (headObjectText[i] === ':') {
          // It's a key, wrap it in quotes
          jsonText += `"${word}"`;
        } else {
          // Not a key, just output the word as-is
          jsonText += word;
          i = afterWord;
        }
        continue;
      }

      // Copy other characters as-is
      jsonText += char;
      i++;
    }

    // Parse as JSON
    const headData = JSON.parse(jsonText);

    return headData;
  } catch (error) {
    console.warn(`⚠️  Failed to parse head data:`, error);
    return null;
  }
}

/**
 * Convert HeadData to HTML string
 */
function headDataToHtml(head: HeadData): string {
  const parts: string[] = [];

  // Process meta tags
  if (head.meta) {
    for (const meta of head.meta) {
      if (meta.title) {
        parts.push(`<title>${meta.title}</title>`);
      } else if (meta.charSet) {
        parts.push(`<meta charset="${meta.charSet}" />`);
      } else {
        const attrs: string[] = [];
        if (meta.name) attrs.push(`name="${meta.name}"`);
        if (meta.property) attrs.push(`property="${meta.property}"`);
        if (meta.httpEquiv) attrs.push(`http-equiv="${meta.httpEquiv}"`);
        if (meta.itemProp) attrs.push(`itemprop="${meta.itemProp}"`);
        if (meta.content) attrs.push(`content="${meta.content}"`);
        if (attrs.length > 0) {
          parts.push(`<meta ${attrs.join(' ')} />`);
        }
      }
    }
  }

  // Process link tags
  if (head.links) {
    for (const link of head.links) {
      const attrs: string[] = [];
      if (link.rel) attrs.push(`rel="${link.rel}"`);
      if (link.type) attrs.push(`type="${link.type}"`);
      if (link.href) attrs.push(`href="${link.href}"`);
      if (link.hreflang) attrs.push(`hreflang="${link.hreflang}"`);
      parts.push(`<link ${attrs.join(' ')} />`);
    }
  }

  // Process style tags
  if (head.styles) {
    for (const style of head.styles) {
      const attrs = style.media ? ` media="${style.media}"` : '';
      parts.push(`<style${attrs}>${style.children}</style>`);
    }
  }

  // Process script tags
  if (head.scripts) {
    for (const script of head.scripts) {
      if (script.src) {
        parts.push(`<script src="${script.src}"></script>`);
      } else if (script.children) {
        parts.push(`<script>${script.children}</script>`);
      }
    }
  }

  if (parts.length === 0) return '';

  // First part has no indentation, subsequent parts have 4 spaces
  return (
    parts[0] +
    (parts.length > 1
      ? '\n' +
        parts
          .slice(1)
          .map(part => `    ${part}`)
          .join('\n')
      : '')
  );
}

/**
 * Extract head data from a route file by parsing the file content
 */
function extractHeadData(fileContent: string, env: Record<string, string> = {}): HeadData | null {
  // Check if head is a function reference like: head: getHeadData
  const functionRefMatch = fileContent.match(/head:\s*(\w+)(?![\w\s]*\()/);

  if (functionRefMatch) {
    // Extract the function name
    const functionName = functionRefMatch[1];

    // Find the function definition
    const functionDefMatch = fileContent.match(
      new RegExp(`function\\s+${functionName}\\s*\\(\\)\\s*\\{[\\s\\S]*?return\\s*\\{`)
    );

    if (functionDefMatch) {
      // Find the position where the return object starts
      const returnStartPos = functionDefMatch.index! + functionDefMatch[0].length - 1;

      // Extract the balanced return object
      const returnObjectText = extractBalancedObject(fileContent, returnStartPos);

      if (returnObjectText) {
        // Parse the return object
        return parseHeadObject(returnObjectText, env);
      }
    }
  }

  // Check if head is an inline arrow function like: head: () => ({ ... })
  const arrowFunctionMatch = fileContent.match(/head:\s*\(\)\s*=>\s*\(/);

  if (arrowFunctionMatch) {
    const returnStartPos = arrowFunctionMatch.index! + arrowFunctionMatch[0].length;

    // Find the opening brace inside the parentheses
    let bracePos = returnStartPos;
    while (bracePos < fileContent.length && fileContent[bracePos] !== '{') {
      bracePos++;
    }

    if (bracePos < fileContent.length) {
      const returnObjectText = extractBalancedObject(fileContent, bracePos);

      if (returnObjectText) {
        return parseHeadObject(returnObjectText, env);
      }
    }
  }

  // Check if head is an inline object literal: head: { ... }
  const inlineObjectMatch = fileContent.match(/head:\s*\{/);

  if (!inlineObjectMatch) {
    return null;
  }

  // Find the position where the head object starts
  const headStartPos = inlineObjectMatch.index! + inlineObjectMatch[0].length - 1;

  // Extract the balanced head object
  const headObjectText = extractBalancedObject(fileContent, headStartPos);

  if (!headObjectText) {
    return null;
  }

  // Parse the head object
  return parseHeadObject(headObjectText, env);
}

/**
 * Merge two HeadData objects, with route data taking precedence
 */
function mergeHeadData(root: HeadData | undefined, route: HeadData): HeadData {
  if (!root) return route;

  // Merge meta tags with deduplication
  const mergedMeta: HeadMeta[] = [];
  const seenKeys = new Set<string>();

  // Helper to create a unique key for a meta tag
  const getMetaKey = (meta: HeadMeta): string => {
    if (meta.title) return 'title';
    if (meta.charSet) return 'charset';
    if (meta.name) return `name:${meta.name}`;
    if (meta.property) return `property:${meta.property}`;
    if (meta.httpEquiv) return `httpEquiv:${meta.httpEquiv}`;
    if (meta.itemProp) return `itemProp:${meta.itemProp}`;
    return JSON.stringify(meta);
  };

  // First, add all route meta tags (they take precedence)
  if (route.meta) {
    for (const meta of route.meta) {
      const key = getMetaKey(meta);
      seenKeys.add(key);
      mergedMeta.push(meta);
    }
  }

  // Then add root meta tags only if they haven't been overridden
  if (root.meta) {
    for (const meta of root.meta) {
      const key = getMetaKey(meta);
      if (!seenKeys.has(key)) {
        mergedMeta.push(meta);
      }
    }
  }

  // For links, styles, and scripts, route ones override root ones with same key
  const mergedLinks: HeadLink[] = [];
  const seenLinkKeys = new Set<string>();

  if (route.links) {
    for (const link of route.links) {
      const key = `${link.rel}:${link.href}`;
      seenLinkKeys.add(key);
      mergedLinks.push(link);
    }
  }

  if (root.links) {
    for (const link of root.links) {
      const key = `${link.rel}:${link.href}`;
      if (!seenLinkKeys.has(key)) {
        mergedLinks.push(link);
      }
    }
  }

  return {
    meta: mergedMeta,
    links: mergedLinks,
    styles: [...(route.styles || []), ...(root.styles || [])],
    scripts: [...(route.scripts || []), ...(root.scripts || [])],
  };
}

/**
 * Generate head.json from all route files
 */
function generateHeadJson(rootDir: string, outputDir: string, env: Record<string, string> = {}): void {
  const routesDir = join(rootDir, 'src', 'routes');
  const routeFiles = findTsxFiles(routesDir);
  const headJsonOutput: HeadJsonOutput = {};
  let rootHeadData: HeadData | undefined;

  // First pass: extract root head data
  for (const routeFile of routeFiles) {
    const relativePath = relative(rootDir, routeFile);
    if (relativePath.includes('__root.tsx')) {
      const fileContent = readFileSync(routeFile, 'utf-8');
      const extracted = extractHeadData(fileContent, env);

      if (extracted) {
        rootHeadData = extracted;
        const raw = headDataToHtml(extracted);
        headJsonOutput['_default'] = {
          meta: extracted.meta,
          links: extracted.links,
          styles: extracted.styles,
          scripts: extracted.scripts,
          raw,
        };
      }
      break;
    }
  }

  // Second pass: process all routes and merge with root
  for (const routeFile of routeFiles) {
    try {
      const relativePath = relative(rootDir, routeFile);

      // Skip __root.tsx as we already processed it
      if (relativePath.includes('__root.tsx')) {
        continue;
      }

      const fileContent = readFileSync(routeFile, 'utf-8');
      const head = extractHeadData(fileContent, env);

      if (head) {
        // Determine the route path
        let path = relativePath.replace('src/routes', '').replace('.tsx', '').replace('/index', '');

        // Handle dynamic routes ($id -> :id)
        path = path.replace(/\$(\w+)/g, ':$1');

        // Ensure path starts with /
        if (!path.startsWith('/')) {
          path = '/' + path;
        }

        // Handle root route
        if (path === '' || path === '/') {
          path = '/';
        }

        // Merge with root head data
        const mergedHead = mergeHeadData(rootHeadData, head);
        const raw = headDataToHtml(mergedHead);

        // Store in key-value map
        headJsonOutput[path] = {
          meta: mergedHead.meta,
          links: mergedHead.links,
          styles: mergedHead.styles,
          scripts: mergedHead.scripts,
          raw,
        };
      }
    } catch (error) {
      console.error(`❌ Failed to process ${routeFile}:`, error);
      throw error;
    }
  }

  // Write to head.json in the build output directory
  const outputPath = join(outputDir, 'head.json');
  writeFileSync(outputPath, JSON.stringify(headJsonOutput, null, 2), 'utf-8');

  const routeCount = Object.keys(headJsonOutput).length;
  console.log(`✅ Generated head.json (${routeCount} routes)`);
}

/**
 * Vite plugin that generates head.json after the build completes
 */
export function generateHeadPlugin(): Plugin {
  let rootDir: string;
  let outputDir: string;
  let env: Record<string, string>;

  return {
    name: 'generate-head',
    apply: 'build', // Only run during production builds
    enforce: 'post', // Run after other plugins

    configResolved(config) {
      rootDir = config.root;
      outputDir = config.build.outDir;

      // Extract environment variables from Vite config
      env = {};

      // Get VITE_ prefixed env vars from config.env
      if (config.env) {
        Object.entries(config.env).forEach(([key, value]) => {
          if (key.startsWith('VITE_')) {
            env[key] = String(value);
          }
        });
      }

      // Also check config.define for import.meta.env.* definitions
      if (config.define) {
        Object.entries(config.define).forEach(([key, value]) => {
          const envMatch = key.match(/^['"]?import\.meta\.env\.(\w+)['"]?$/);
          if (envMatch) {
            const envKey = envMatch[1];
            // Remove quotes from the value if it's a JSON string
            let envValue = String(value);
            if (envValue.startsWith('"') && envValue.endsWith('"')) {
              envValue = JSON.parse(envValue);
            }
            env[envKey] = envValue;
          }
        });
      }
    },

    closeBundle() {
      try {
        generateHeadJson(rootDir, outputDir, env);
      } catch (error) {
        console.error('❌ Failed to generate head.json:', error);
        throw error;
      }
    },
  };
}
