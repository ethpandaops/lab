import type { Plugin } from 'vite';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

interface HeadMeta {
  title?: string;
  name?: string;
  content?: string;
  charSet?: string;
  property?: string;
}

interface HeadLink {
  rel: string;
  href: string;
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
function parseHeadObject(headObjectText: string): HeadData | null {
  try {
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

  return parts.join('');
}

/**
 * Extract head data from a route file by parsing the file content
 */
function extractHeadData(fileContent: string): HeadData | null {
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
        return parseHeadObject(returnObjectText);
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
        return parseHeadObject(returnObjectText);
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
  return parseHeadObject(headObjectText);
}

/**
 * Merge two HeadData objects, with route data taking precedence
 */
function mergeHeadData(root: HeadData | undefined, route: HeadData): HeadData {
  if (!root) return route;

  return {
    meta: [...(root.meta || []), ...(route.meta || [])],
    links: [...(root.links || []), ...(route.links || [])],
    styles: [...(root.styles || []), ...(route.styles || [])],
    scripts: [...(root.scripts || []), ...(route.scripts || [])],
  };
}

/**
 * Generate head.json from all route files
 */
function generateHeadJson(rootDir: string, outputDir: string): void {
  const routesDir = join(rootDir, 'src', 'routes');
  const routeFiles = findTsxFiles(routesDir);
  const headJsonOutput: HeadJsonOutput = {};
  let rootHeadData: HeadData | undefined;

  // First pass: extract root head data
  for (const routeFile of routeFiles) {
    const relativePath = relative(rootDir, routeFile);
    if (relativePath.includes('__root.tsx')) {
      const fileContent = readFileSync(routeFile, 'utf-8');
      const extracted = extractHeadData(fileContent);

      if (extracted) {
        rootHeadData = extracted;
        const raw = headDataToHtml(extracted);
        headJsonOutput['_root'] = {
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
      const head = extractHeadData(fileContent);

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

  return {
    name: 'generate-head',
    apply: 'build', // Only run during production builds
    enforce: 'post', // Run after other plugins

    configResolved(config) {
      rootDir = config.root;
      outputDir = config.build.outDir;
    },

    closeBundle() {
      try {
        generateHeadJson(rootDir, outputDir);
      } catch (error) {
        console.error('❌ Failed to generate head.json:', error);
        throw error;
      }
    },
  };
}
