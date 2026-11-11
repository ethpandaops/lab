import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tokenSource } from '@/styles/tokenSource';

// Storybook does not fail a build on a <Story of={…} /> that names no story,
// so each page's references are checked against its stories file here.

const pages = readdirSync(import.meta.dirname).filter(file => file.endsWith('.mdx'));
const read = (file: string): string => readFileSync(join(import.meta.dirname, file), 'utf8');

describe.each(pages)('%s', page => {
  it('shows only stories its stories file exports', () => {
    const shown = [...read(page).matchAll(/<Story of=\{Stories\.(\w+)\}/g)].map(m => m[1]);
    const file = page.replace(/\.mdx$/, '.stories.tsx');
    const exported = existsSync(join(import.meta.dirname, file))
      ? new Set([...read(file).matchAll(/^export const (\w+)/gm)].map(m => m[1]))
      : new Set<string>();
    for (const name of shown) expect(exported, `${page}: Stories.${name}`).toContain(name);
  });
});

describe('the Foundations pages', () => {
  // A token namespace no page shows is a token nobody can find; the Colours page lists every colour.
  it('show every token namespace in tokens.css', () => {
    const stories = readdirSync(import.meta.dirname)
      .filter(file => file.endsWith('.stories.tsx'))
      .map(read)
      .join('\n');
    const shown = new Set(['color', ...[...stories.matchAll(/namespace="([a-z-]+)"/g)].map(m => m[1])]);
    const namespaceOf = (key: string): string =>
      key.startsWith('font-weight-') ? 'font-weight' : (key.split('-')[0] ?? key);
    const namespaces = new Set([...tokenSource.theme.keys()].filter(key => key !== '*').map(namespaceOf));
    expect([...namespaces].filter(namespace => !shown.has(namespace))).toEqual([]);
  });
});
